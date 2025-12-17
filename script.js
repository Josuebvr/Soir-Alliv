
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
        // se a página foi carregada com ?product=ID, abrir esse produto
        try { checkUrlProduct(); } catch (e) { }
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

        // em vez do chip de material/preço, mostramos um botão de compartilhar
        const shareButtonHtml = `<button class="btn secondary" data-share-id="${p.id}">Compartilhar</button>`;

        el.innerHTML = `
            ${carouselHtml}
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <div class="meta">
                ${shareButtonHtml}
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
const quantityContainer = document.getElementById('quantityContainer');
const quantityInput = document.getElementById('quantityInput');
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
        // Usamos a quantidade apenas quando o produto permite (ex: moedas)
        let quantity = 1;
        if (quantityInput && currentProduct && currentProduct.id === 'p05') {
            quantity = parseInt(quantityInput.value) || 1;
        }
        // clonamos profundamente o produto para evitar referências compartilhadas
        let productToAdd;
        try {
            productToAdd = JSON.parse(JSON.stringify(currentProduct));
        } catch (e) {
            productToAdd = { ...currentProduct };
        }
        productToAdd.quantity = quantity;
        cart.push(productToAdd);
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
    // botão de compartilhar
    const shareBtn = e.target.closest('[data-share-id]');
    if (shareBtn) {
        const id = shareBtn.dataset.shareId;
        try {
            const u = new URL(window.location.href);
            u.searchParams.set('product', id);
            const url = u.toString();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => {
                    alert('Link copiado para a área de transferência:\n' + url);
                }).catch(() => {
                    prompt('Copie este link:', url);
                });
            } else {
                prompt('Copie este link:', url);
            }
        } catch (err) {
            const base = window.location.href.split('?')[0].split('#')[0];
            const url = base + '?product=' + encodeURIComponent(id);
            try { navigator.clipboard.writeText(url); alert('Link copiado:\n' + url); } catch (e) { prompt('Copie este link:', url); }
        }
        return;
    }

    const b = e.target.closest('[data-id]');
    if (!b) return;
    const p = products.find(x => x.id === b.dataset.id);
    if (!p) return;
    showProductModal(p);
});

// Mostra o modal e popula com os dados do produto (reutilizável)
function showProductModal(p) {
    if (!p) return;
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

    // Mostrar campo de quantidade para produtos que permitem (moedas)
    if (quantityContainer && quantityInput) {
        if (p.id === 'p05') { // produto de moedas
            quantityContainer.style.display = 'flex';
            quantityInput.value = '1';
        } else {
            quantityContainer.style.display = 'none';
            quantityInput.value = '1';
        }
    }

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
}

// Verifica a URL para ?product=ID e abre o modal correspondente
function checkUrlProduct() {
    try {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('product');
        if (!pid) return;
        const p = products.find(x => x.id === pid);
        if (p) showProductModal(p);
    } catch (e) { }
}


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

        cartItems.innerHTML = cart.map((p, i) => {
            const quantity = p.quantity || 1;
            const priceText = p.price.replace(/[^\d.-]/g, '');
            const priceNum = parseFloat(priceText) || 0;
            const subtotal = priceNum * quantity;
            const displayName = quantity > 1 ? `${p.name} (x${quantity})` : p.name;

            return `
                <div class="cart-item" data-index="${i}" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:6px 0;">
                    <div style="flex:1;">
                        <span>${displayName}</span>
                        <br><span style="font-size: 12px; color: #645f5fff;">Subtotal: R$ ${subtotal.toFixed(2)}</span>
                    </div>
                    <button class="remove-item" style="background:none;border:none;color:#f97316;cursor:pointer;">Remover</button>
                </div>`;
        }).join('');

        const total = cart.reduce((sum, p) => {
            const quantity = p.quantity || 1;
            const priceText = p.price.replace(/[^\d.-]/g, '');
            const priceNum = parseFloat(priceText) || 0;
            return sum + (priceNum * quantity);
        }, 0);
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
                cart.map(p => {
                    const quantity = p.quantity || 1;
                    if (quantity > 1) {
                        return `- ${quantity}x ${p.name}`;
                    }
                    return `- ${p.name}`;
                }).join('\n');
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


// -------------------------------
// Toggle do Hero (aba que oculta/mostra o hero)
// -------------------------------
const heroWrapper = document.getElementById('heroWrapper');
const heroToggleTab = document.getElementById('heroToggleTab');

function applyHeroState(collapsed) {
    if (!heroWrapper) return;
    if (collapsed) {
        heroWrapper.classList.add('collapsed');
    } else {
        heroWrapper.classList.remove('collapsed');
    }
    if (heroToggleTab) {
        // aria-expanded indica se está expandido
        heroToggleTab.setAttribute('aria-expanded', String(!collapsed));
        // quando colapsado (retido) deve apontar para baixo (▼);
        // quando aberto, apontar para cima (▲)
        heroToggleTab.textContent = collapsed ? '▼' : '▲';
    }
}

// Inicializa estado a partir do localStorage
try {
    const saved = localStorage.getItem('heroCollapsed');
    if (saved !== null) {
        applyHeroState(saved === 'true');
    }
} catch (err) {
    // se localStorage falhar, ignoramos
}

if (heroToggleTab) {
    heroToggleTab.addEventListener('click', () => {
        if (!heroWrapper) return;
        const isCollapsed = heroWrapper.classList.toggle('collapsed');
        applyHeroState(isCollapsed);
        try { localStorage.setItem('heroCollapsed', String(isCollapsed)); } catch (e) { }
        if (!isCollapsed) {
            // quando expandir, rolar para mostrar o hero por completo
            heroWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

