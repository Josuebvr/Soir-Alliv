
// Número de telefone usado para envio do pedido via WhatsApp
const PHONE_NUMBER = '5519988822112';

// Elementos do DOM principais
const grid = document.getElementById('catalogGrid');
const search = document.getElementById('search');
const cat = document.getElementById('filterCat');

// Estado da aplicação em memória
let products = [];
let cart = [];

// Detecta se estamos na página de cores (variável pode ser definida em window)
const isColorsPage = typeof window.isColorsPage !== 'undefined' ? window.isColorsPage : false;
const dataFile = isColorsPage ? 'cores.json' : 'produtos.json';

/*
 * isColorAvailable(p)
 * - Verifica se uma cor/produto está disponível.
 * - Aceita múltiplas propriedades de entrada: 'available', 'status', 'price'.
 * - Retorna true quando parece estar disponível, false caso contrário.
 */
function isColorAvailable(p) {
    if (p == null) return false;

    // Preferência pela propriedade explícita 'available'
    if (Object.prototype.hasOwnProperty.call(p, 'available')) {
        const v = p.available;
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    // Se existir 'status' checamos por palavras relacionadas a indisponibilidade
    if (p.status) {
        const s = String(p.status).toLowerCase();
        return !(s.includes('indispon') || s.includes('indisponível') || s.includes('indisponivel'));
    }

    // Se preço contém indicação de indisponibilidade
    if (p.price != null) {
        const s = String(p.price).toLowerCase();
        return !s.includes('indispon');
    }

    // Caso não haja propriedade 'price', tratamos como disponível por padrão
    return !Object.prototype.hasOwnProperty.call(p, 'price') || p.price === '' || p.price === null;
}


/*
 * loadProducts()
 * - Faz o fetch do arquivo JSON (produtos ou cores) e popula 'products'.
 * - Em caso de erro, registra no console e mostra mensagem na grid.
 */
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
        if (grid) {
            grid.innerHTML = '<p style="color: red; grid-column: 1/-1; text-align: center;">Erro ao carregar dados. Verifique o console.</p>';
        }
    }
}


/*
 * render()
 * - Renderiza os produtos filtrados na grade.
 * - Aplica filtro de busca e categoria.
 * - Em páginas de cores, ordena para mostrar disponíveis primeiro.
 */
function render() {
    const term = search ? search.value.toLowerCase() : '';
    const c = cat ? cat.value : '';

    if (!grid) return;
    grid.innerHTML = '';

    const filtered = products.filter(p => {
        const matchTerm = (p.name || '').toLowerCase().includes(term) || (p.desc || '').toLowerCase().includes(term);
        const matchCat = !c || p.category === c;
        return matchTerm && matchCat;
    });

    // Em páginas de cores, queremos ordenar por disponibilidade e nome
    if (isColorsPage) {
        filtered.sort((a, b) => {
            const aa = isColorAvailable(a) ? 1 : 0;
            const bb = isColorAvailable(b) ? 1 : 0;
            if (aa === bb) return a.name.localeCompare(b.name);
            return aa > bb ? -1 : 1;
        });
    }

    // Construção dos cards
    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'card';

        // imagens: preferimos array 'images', caso contrário suportamos 'img' único
        const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);

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

        const chipText = isColorsPage ? (p.price || 'Disponível') : (p.material ? p.material.toUpperCase() : '');

        el.innerHTML = `
            ${carouselHtml}
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <div class="meta">
                <span class="chip">${chipText}</span>
                <button class="btn secondary" data-id="${p.id}">Ver</button>
            </div>`;

        // Guardamos as imagens no elemento para uso posterior (navegação do carrossel)
        el.__images = imgs;
        grid.appendChild(el);
    });
}


// --------------------------------------------------------------------------------
// Ligações de eventos: busca/categoria
// --------------------------------------------------------------------------------
if (search) search.addEventListener('input', render);
if (cat) cat.addEventListener('input', render);


/*
 * Evento delegado para navegação do carrossel dentro da grade de produtos.
 * - Obs: este bloco existe na versão original e foi mantido para preservar
 *   o comportamento (há um bloco idêntico mais abaixo também).
 */
grid.addEventListener('click', (e) => {
    const btnPrev = e.target.closest('.carousel .prev');
    const btnNext = e.target.closest('.carousel .next');
    if (!btnPrev && !btnNext) return;

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


// --------------------------------------------------------------------------------
// Modal: elementos e comportamento
// --------------------------------------------------------------------------------
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

// Controles do carrossel dentro do modal
const carouselImg = document.getElementById('carouselImg');
const prevBtn = document.querySelector('.carousel .prev');
const nextBtn = document.querySelector('.carousel .next');
let currentImageIndex = 0;

// Botão "Adicionar ao carrinho" (apenas para páginas que não são de cores)
if (!isColorsPage && addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        cart.push(currentProduct);
        updateCartCount();
        renderCart();
        modal.classList.remove('show');
    });
}


// Adiciona classe no body quando scrolled (efeito visual)
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        document.body.classList.add('scrolled');
    } else {
        document.body.classList.remove('scrolled');
    }
});


/*
 * Clique em um botão 'Ver' (delegado): abre o modal e popula detalhes do produto.
 * - Busca o produto por data-id e preenche nome, descrição, imagens e preço.
 */
document.addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const p = products.find(x => x.id === b.dataset.id);
    currentProduct = p;
    currentImageIndex = 0;
    if (modal) modal.classList.add('show');

    if (p.images && p.images.length > 0) {
        if (carouselImg) carouselImg.src = p.images[0];
    } else {
        if (carouselImg) carouselImg.src = p.img;
    }

    if (modalName) modalName.textContent = p.name;
    if (modalDesc) modalDesc.textContent = p.desc;

    if (isColorsPage) {
        if (modalHex) {
            modalHex.style.backgroundColor = p.hex || '#ddd';
            modalHex.parentElement.style.display = 'block';
        }
    } else {
        if (modalHex) modalHex.parentElement.style.display = 'none';
    }

    if (modalPrice) modalPrice.textContent = p.price;

    const moreBtn = document.getElementById('moreBtn');
    if (moreBtn) {
        moreBtn.textContent = 'Ver mais';
        modalDesc.classList.remove('expanded');

        // Deferimos a checagem de truncamento para o próximo ciclo de evento
        setTimeout(() => {
            const isTextTruncated = modalDesc.scrollHeight > modalDesc.clientHeight;
            if (isColorsPage || !isTextTruncated) {
                moreBtn.style.display = 'none';
            } else {
                moreBtn.style.display = 'inline-block';
            }
        }, 0);
    }
});


// Navegação do carrossel dentro do modal (prev/next)
if (prevBtn) {
    prevBtn.onclick = () => {
        if (!currentProduct || !currentProduct.images) return;
        currentImageIndex = (currentImageIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
        if (carouselImg) carouselImg.src = currentProduct.images[currentImageIndex];
    };
}

if (nextBtn) {
    nextBtn.onclick = () => {
        if (!currentProduct || !currentProduct.images) return;
        currentImageIndex = (currentImageIndex + 1) % currentProduct.images.length;
        if (carouselImg) carouselImg.src = currentProduct.images[currentImageIndex];
    };
}


/*
 * updateCartCount()
 * - Atualiza o contador de itens do carrinho exibido na UI.
 */
function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = cart.length;
}


// Fechar modal via botão ou clique fora
const closeModalBtn = document.getElementById('closeModal');
if (closeModalBtn) closeModalBtn.onclick = () => modal.classList.remove('show');
if (modal) modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };


/*
 * Bloco de carrinho (apenas em páginas que não são de cores)
 * - define renderCart, handlers de abrir/fechar, enviar pedido.
 */
if (!isColorsPage) {
    const cartModal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    const openCart = document.getElementById('openCart');
    const closeCart = document.getElementById('closeCart');

    if (openCart) {
        openCart.onclick = () => {
            renderCart();
            if (cartModal) cartModal.classList.add('show');
        };
    }
    if (closeCart) closeCart.onclick = () => cartModal.classList.remove('show');
    if (cartModal) cartModal.onclick = e => { if (e.target === cartModal) cartModal.classList.remove('show'); };

    /*
     * renderCart()
     * - Renderiza o conteúdo do carrinho dentro do modal.
     */
    function renderCart() {
        if (!cartItems) return;

        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Seu carrinho está vazio.</p>';
            const totalEl = document.getElementById('cartTotal');
            if (totalEl) totalEl.textContent = '';
            return;
        }

        cartItems.innerHTML = cart.map((p, i) => `
        <div class="cart-item" data-index="${i}" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:6px 0;">
          <span>${p.name}</span>
          <button class="remove-item" style="background:none;border:none;color:#f97316;cursor:pointer;">Remover</button>
        </div>
      `).join('');

        const total = cart.reduce((sum, p) => sum + parseFloat(p.price.replace(/[^\d.-]/g, '')), 0);
        const totalEl = document.getElementById('cartTotal');
        if (totalEl) totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;
    }

    // Remover item do carrinho (evento delegado)
    if (cartItems) {
        cartItems.addEventListener('click', e => {
            if (e.target.classList.contains('remove-item')) {
                const index = e.target.closest('.cart-item').dataset.index;
                cart.splice(index, 1);
                updateCartCount();
                renderCart();
            }
        });
    }

    // Enviar carrinho por WhatsApp
    const sendCartBtn = document.getElementById('sendCart');
    if (sendCartBtn) {
        sendCartBtn.onclick = () => {
            if (cart.length === 0) return;
            const msg = "Olá! Gostaria de pedir os seguintes produtos:\n\n" +
                cart.map(p => `- ${p.name}`).join('\n');
            window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
        };
    }
}


/*
 * Nota: o bloco abaixo é outra instância do mesmo handler de navegação do
 * carrossel presente anteriormente na versão original. Mantido intencionalmente
 * para preservar exatamente o comportamento atual da página.
 */
grid.addEventListener('click', (e) => {
    const btnPrev = e.target.closest('.carousel .prev');
    const btnNext = e.target.closest('.carousel .next');
    if (!btnPrev && !btnNext) return;

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


// Inicializa carregamento dos produtos
loadProducts();


// Botão "Ver mais" dentro do modal (expande/contrai descrição)
const moreBtn = document.getElementById("moreBtn");
if (moreBtn) {
    moreBtn.onclick = () => {
        if (!modalDesc) return;
        modalDesc.classList.toggle("expanded");
        moreBtn.textContent = modalDesc.classList.contains("expanded")
            ? "Ver menos"
            : "Ver mais";
    };
}

