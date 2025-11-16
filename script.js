
const PHONE_NUMBER = '5519988822112';
const grid = document.getElementById('catalogGrid');
const search = document.getElementById('search');
const cat = document.getElementById('filterCat');

let products = [];
let cart = [];

// Detectar se estamos em cores.html (variável global set no cores.html)
const isColorsPage = typeof window.isColorsPage !== 'undefined' ? window.isColorsPage : false;
const dataFile = isColorsPage ? 'cores.json' : 'produtos.json';

// Helper: determina se uma cor deve ser considerada "Disponível".
// Tentamos suportar vários formatos usados em JSONs diferentes:
// - campo booleano `available`
// - campo `status` com string "Indisponível"/"Indisponivel"
// - campo `price` que contenha a palavra "indispon" quando indisponível
// Se não houver marcador explícito, tratamos como disponível (compatível com UI atual).
function isColorAvailable(p) {
    if (p == null) return false;
    if (Object.prototype.hasOwnProperty.call(p, 'available')) {
        const v = p.available;
        return v === true || v === 'true' || v === 1 || v === '1';
    }
    if (p.status) {
        const s = String(p.status).toLowerCase();
        return !(s.includes('indispon') || s.includes('indisponível') || s.includes('indisponivel'));
    }
    if (p.price != null) {
        const s = String(p.price).toLowerCase();
        return !s.includes('indispon');
    }
    // fallback: se não há price nem marker, considere disponível (mantém comportamento atual)
    return !Object.prototype.hasOwnProperty.call(p, 'price') || p.price === '' || p.price === null;
}

async function loadProducts() {
    try {
        const res = await fetch(dataFile);
        if (!res.ok) {
            throw new Error(`Erro ao carregar ${dataFile}: ${res.status}`);
        }
        products = await res.json();
        render();
    } catch (err) {
        console.error('Erro ao carregar produtos:', err);
        grid.innerHTML = '<p style="color: red; grid-column: 1/-1; text-align: center;">Erro ao carregar dados. Verifique o console.</p>';
    }
}

function render() {
    const term = search ? search.value.toLowerCase() : '';
    const c = cat ? cat.value : '';
    grid.innerHTML = '';
    // filtra primeiro
    const filtered = products.filter(p => {
        const matchTerm = p.name.toLowerCase().includes(term) || p.desc.toLowerCase().includes(term);
        const matchCat = !c || p.category === c;
        return matchTerm && matchCat;
    });

    // se estamos na página de cores, ordene colocando disponíveis antes das indisponíveis
    if (isColorsPage) {
        filtered.sort((a, b) => {
            const aa = isColorAvailable(a) ? 1 : 0;
            const bb = isColorAvailable(b) ? 1 : 0;
            if (aa === bb) return a.name.localeCompare(b.name);
            // quando aa > bb (a disponível, b não) queremos que a venha antes => retornar -1
            return aa > bb ? -1 : 1;
        });
    }

    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'card';

        // Prepare images array (support legacy `img` field)
        const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);

        // build carousel markup (compact for card)
        let carouselHtml = '';
        if (imgs.length > 0) {
            const first = imgs[0];
            carouselHtml = `
        <div class="carousel" data-product-id="${p.id}" data-index="0">
          <button class="prev">‹</button>
          <img src="${first}" alt="${p.name}">
          <button class="next">›</button>
        </div>`;
        }

        // mostrar disponibilidade em cards de cores, caso contrário mostrar material
        const chipText = isColorsPage ? (p.price || 'Disponível') : (p.material ? p.material.toUpperCase() : '');
        el.innerHTML = `
            ${carouselHtml}
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <div class="meta">
                <span class="chip">${chipText}</span>
                <button class="btn secondary" data-id="${p.id}">Ver</button>
            </div>`;

        // store images on element for quick access in the carousel controller
        el.__images = imgs;
        grid.appendChild(el);
    });
}

// Adicionar listeners apenas se os elementos existirem
if (search) search.addEventListener('input', render);
if (cat) cat.addEventListener('input', render);

// Controle de carrossel nos cards via event delegation
grid.addEventListener('click', (e) => {
    const btnPrev = e.target.closest('.carousel .prev');
    const btnNext = e.target.closest('.carousel .next');
    if (!btnPrev && !btnNext) return;

    // não deixe o clique propagar pra outros handlers (ex: abrir modal)
    e.stopPropagation();

    const carousel = e.target.closest('.carousel');
    if (!carousel) return;
    const card = carousel.closest('.card');
    const imgs = card && card.__images ? card.__images : [];
    if (!imgs || imgs.length === 0) return;

    let idx = parseInt(carousel.getAttribute('data-index') || '0', 10);
    if (btnPrev) {
        idx = (idx - 1 + imgs.length) % imgs.length;
    } else if (btnNext) {
        idx = (idx + 1) % imgs.length;
    }
    carousel.setAttribute('data-index', idx);
    const imgEl = carousel.querySelector('img');
    if (imgEl) imgEl.src = imgs[idx];
});

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalName = document.getElementById('modalName');
const modalDesc = document.getElementById('modalDesc');
const modalMat = document.getElementById('modalMat');
const modalSize = document.getElementById('modalSize');
const modalPrice = document.getElementById('modalPrice');
const modalHex = document.getElementById('modalHex');
const addToCartBtn = document.getElementById('addToCart');
let currentProduct = null;

const carouselImg = document.getElementById('carouselImg');
const prevBtn = document.querySelector('.carousel .prev');
const nextBtn = document.querySelector('.carousel .next');
let currentImageIndex = 0;

// Função para adicionar ao carrinho (aplica apenas em index.html e se o botão existir)
if (!isColorsPage && addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        cart.push(currentProduct);
        updateCartCount();
        renderCart();
        modal.classList.remove('show');
    });
}

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        document.body.classList.add('scrolled');
    } else {
        document.body.classList.remove('scrolled');
    }
});

document.addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const p = products.find(x => x.id === b.dataset.id);
    currentProduct = p;
    currentImageIndex = 0;
    modal.classList.add('show');

    // Se o produto tiver várias imagens
    if (p.images && p.images.length > 0) {
        carouselImg.src = p.images[0];
    } else {
        carouselImg.src = p.img; // compatível com produtos antigos
    }

    modalName.textContent = p.name;
    modalDesc.textContent = p.desc;

    // Exibir campos específicos conforme o tipo de item
    if (isColorsPage) {
        // Em cores.html
        if (modalHex) {
            modalHex.style.backgroundColor = p.hex || '#ddd';
            modalHex.parentElement.style.display = 'block';
        }
    } else {
        // Em index.html (produtos)
        if (modalHex) modalHex.parentElement.style.display = 'none';
    }

    modalPrice.textContent = p.price;

    // Botão ver mais/menos: só aparece se texto for longo e não estamos em cores.html
    const moreBtn = document.getElementById('moreBtn');
    if (moreBtn) {
        if (isColorsPage || !p.desc || p.desc.length < 120) {
            moreBtn.style.display = 'none';
        } else {
            moreBtn.style.display = 'inline-block';
        }
    }
});

// Navegação do carrossel
prevBtn.onclick = () => {
    if (!currentProduct.images) return;
    currentImageIndex = (currentImageIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
    carouselImg.src = currentProduct.images[currentImageIndex];
};

nextBtn.onclick = () => {
    if (!currentProduct.images) return;
    currentImageIndex = (currentImageIndex + 1) % currentProduct.images.length;
    carouselImg.src = currentProduct.images[currentImageIndex];
};


function updateCartCount() {
    document.getElementById('cartCount').textContent = cart.length;
}

document.getElementById('closeModal').onclick = () => modal.classList.remove('show');
modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };

// Carrinho modal (apenas em index.html)
if (!isColorsPage) {
    const cartModal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    const openCart = document.getElementById('openCart');
    const closeCart = document.getElementById('closeCart');

    openCart.onclick = () => {
        renderCart();
        cartModal.classList.add('show');
    };
    closeCart.onclick = () => cartModal.classList.remove('show');
    cartModal.onclick = e => { if (e.target === cartModal) cartModal.classList.remove('show'); };

    function renderCart() {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Seu carrinho está vazio.</p>';
            document.getElementById('cartTotal').textContent = '';
            return;
        }

        // Renderiza os itens
        cartItems.innerHTML = cart.map((p, i) => `
        <div class="cart-item" data-index="${i}" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:6px 0;">
          <span>${p.name}</span>
          <button class="remove-item" style="background:none;border:none;color:#f97316;cursor:pointer;">Remover</button>
        </div>
      `).join('');

        // Calcula e mostra o total
        const total = cart.reduce((sum, p) => sum + parseFloat(p.price.replace(/[^\d.-]/g, '')), 0);
        document.getElementById('cartTotal').textContent = `Total: R$ ${total.toFixed(2)}`;
    }

    // Adiciona escuta de eventos no container (event delegation)
    cartItems.addEventListener('click', e => {
        if (e.target.classList.contains('remove-item')) {
            const index = e.target.closest('.cart-item').dataset.index;
            cart.splice(index, 1);
            updateCartCount();
            renderCart();
        }
    });

    document.getElementById('sendCart').onclick = () => {
        if (cart.length === 0) return;
        const msg = "Olá! Gostaria de pedir os seguintes produtos:\n\n" +
            cart.map(p => `- ${p.name}`).join('\n');
        window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    };
}

// Controle de carrossel nos cards via event delegation
grid.addEventListener('click', (e) => {
    const btnPrev = e.target.closest('.carousel .prev');
    const btnNext = e.target.closest('.carousel .next');
    if (!btnPrev && !btnNext) return;

    // não deixe o clique propagar pra outros handlers (ex: abrir modal)
    e.stopPropagation();

    const carousel = e.target.closest('.carousel');
    if (!carousel) return;
    const card = carousel.closest('.card');
    const imgs = card && card.__images ? card.__images : [];
    if (!imgs || imgs.length === 0) return;

    let idx = parseInt(carousel.getAttribute('data-index') || '0', 10);
    if (btnPrev) {
        idx = (idx - 1 + imgs.length) % imgs.length;
    } else if (btnNext) {
        idx = (idx + 1) % imgs.length;
    }
    carousel.setAttribute('data-index', idx);
    const imgEl = carousel.querySelector('img');
    if (imgEl) imgEl.src = imgs[idx];
});

loadProducts();

const moreBtn = document.getElementById("moreBtn");

moreBtn.onclick = () => {
    modalDesc.classList.toggle("expanded");
    moreBtn.textContent = modalDesc.classList.contains("expanded")
        ? "Ver menos"
        : "Ver mais";
};

