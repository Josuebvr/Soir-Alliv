
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
const carouselImg = document.getElementById('carouselImg');
const prevBtn = document.querySelector('.modal .carousel .prev');
const nextBtn = document.querySelector('.modal .carousel .next');
let currentProduct = null;
let currentImageIndex = 0;
// Elements for reviews
const reviewsListEl = document.getElementById('reviewsList');
const reviewFormEl = document.getElementById('reviewForm');
const reviewRatingEl = document.getElementById('reviewRating');
const reviewCommentEl = document.getElementById('reviewComment');
const reviewPhotosEl = document.getElementById('reviewPhotos');
const reviewPhotoPreviewEl = document.getElementById('reviewPhotoPreview');
const submitReviewBtn = document.getElementById('submitReview');

// util: chave do localStorage para reviews
function reviewsKey(productId) { return `reviews_${productId}`; }

// carrega avaliações do GitHub (ou localStorage como fallback)
async function loadReviews(productId) {
    try {
        const raw = localStorage.getItem(reviewsKey(productId));
        if (!raw) return [];
        return JSON.parse(raw) || [];
    } catch (e) { return []; }
}

// salva avaliações no GitHub (ou localStorage como fallback)
async function saveReviews(productId, reviews) {
    try {
        localStorage.setItem(reviewsKey(productId), JSON.stringify(reviews));
        // Tentar salvar no GitHub
        await saveReviewsToGitHub(productId, reviews);
    } catch (e) { }
}

// Obtém e memoriza o branch padrão do repositório, caso não especificado
let __ghDefaultBranch = null;
async function getGitHubBranch() {
    if (!GITHUB_CONFIG) return null;
    if (GITHUB_CONFIG.branch) return GITHUB_CONFIG.branch;
    if (__ghDefaultBranch) return __ghDefaultBranch;
    try {
        const infoUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`;
        const resp = await fetch(infoUrl, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (resp.ok) {
            const data = await resp.json();
            __ghDefaultBranch = data.default_branch || 'main';
            return __ghDefaultBranch;
        }
    } catch (e) {
        console.warn('Não foi possível obter o branch padrão do GitHub, assumindo main');
    }
    return 'main';
}

// Função auxiliar para ler arquivo do GitHub
async function readFileFromGitHub(filePath) {
    if (!window.GITHUB_CONFIG || !GITHUB_CONFIG.token) return null;
    try {
        const branch = await getGitHubBranch();
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });
        if (response.status === 404) return null;
        if (!response.ok) {
            let body = '';
            try { body = await response.text(); } catch (e) {}
            console.error('Falha ao ler do GitHub', response.status, body);
            return null;
        }
        return await response.text();
    } catch (e) {
        console.error('Erro ao ler do GitHub:', e);
        return null;
    }
}

// Função auxiliar para escrever arquivo no GitHub
async function writeFileToGitHub(filePath, content, message) {
    if (!window.GITHUB_CONFIG || !GITHUB_CONFIG.token) return false;
    try {
        const branch = await getGitHubBranch();
        const baseUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

        // Primeiro, tenta ler o arquivo existente para obter o SHA na ref correta
        let sha = null;
        try {
            const getResponse = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (getResponse.ok) {
                const data = await getResponse.json();
                sha = data.sha;
            }
        } catch (e) { }

        // Agora escreve o arquivo
        const body = {
            message: message || 'Atualizar comentários',
            content: btoa(unescape(encodeURIComponent(content))), // base64 encode
            branch
        };
        if (sha) body.sha = sha;

        const response = await fetch(baseUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errBody = '';
            try { errBody = await response.text(); } catch (e) {}
            console.error('Falha ao escrever no GitHub', response.status, errBody);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Erro ao escrever no GitHub:', e);
        return false;
    }
}

// Salva reviews em arquivo JSON no GitHub
async function saveReviewsToGitHub(productId, reviews) {
    if (!GITHUB_CONFIG || !GITHUB_CONFIG.token) return;
    try {
        // Lê arquivo existente
        const existing = await readFileFromGitHub('comentarios.json');
        let allReviews = {};
        if (existing) {
            allReviews = JSON.parse(existing);
        }

        allReviews[productId] = reviews;

        const content = JSON.stringify(allReviews, null, 2);
        const ok = await writeFileToGitHub('comentarios.json', content, `Novo comentário para produto ${productId}`);
        if (!ok) console.error('Não foi possível salvar no GitHub (veja logs acima)');
    } catch (e) {
        console.error('Erro ao salvar reviews no GitHub:', e);
    }
}

// Carrega reviews do GitHub (com fallback para localStorage)
async function loadReviewsFromGitHub(productId) {
    if (!GITHUB_CONFIG || !GITHUB_CONFIG.token) return loadReviews(productId);
    try {
        const content = await readFileFromGitHub('comentarios.json');
        if (content) {
            const allReviews = JSON.parse(content);
            return allReviews[productId] || [];
        }
    } catch (e) {
        console.error('Erro ao carregar reviews do GitHub:', e);
    }
    return loadReviews(productId);
}

// renderiza lista de reviews no modal
function renderReviews(productId) {
    if (!reviewsListEl) return;

    // Tenta carregar do GitHub primeiro
    loadReviewsFromGitHub(productId).then(reviews => {
        if (!reviews || reviews.length === 0) {
            reviewsListEl.innerHTML = '<p>Nenhuma avaliação ainda.</p>';
            return;
        }
        reviewsListEl.innerHTML = reviews.map(r => {
            const imgsHtml = (r.photos || []).map(src => `<img src="${src}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;">`).join('');
            const date = new Date(r.date).toLocaleString();
            return `
                <div class="review-item" style="border-bottom:1px solid #eee;padding:8px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>${r.name || 'Cliente'}</strong>
                        <span style="color:var(--muted);font-size:13px;">${date}</span>
                    </div>
                    <div style="margin:6px 0;color:var(--accent);">Nota: ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                    <div style="color:var(--muted);font-size:14px;margin-bottom:6px;">${(r.comment || '').replace(/\n/g, '<br>')}</div>
                    <div style="display:flex;gap:8px;">${imgsHtml}</div>
                </div>`;
        }).join('');
    }).catch(err => {
        console.error('Erro ao renderizar reviews:', err);
        reviewsListEl.innerHTML = '<p>Erro ao carregar avaliações.</p>';
    });
}

// preview de imagens selecionadas
function previewSelectedPhotos() {
    if (!reviewPhotoPreviewEl || !reviewPhotosEl) return;
    reviewPhotoPreviewEl.innerHTML = '';
    const files = reviewPhotosEl.files;
    if (!files) return;
    Array.from(files).slice(0, 6).forEach(file => {
        const fr = new FileReader();
        fr.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:8px;';
            reviewPhotoPreviewEl.appendChild(img);
        };
        fr.readAsDataURL(file);
    });
}

// submete avaliação (chamado pelo botão submit)
function handleSubmitReview() {
    if (!currentProduct) return alert('Produto não selecionado');
    const rating = parseInt(reviewRatingEl.value) || 5;
    const comment = reviewCommentEl.value || '';
    const files = reviewPhotosEl.files;

    console.log('handleSubmitReview chamado');
    console.log('Produto:', currentProduct.id);
    console.log('Rating:', rating);
    console.log('Comment:', comment);
    console.log('Files:', files ? files.length : 0);

    // Se houver fotos, converter para base64; senão, salvar diretamente
    if (files && files.length > 0) {
        const readers = Array.from(files).slice(0, 6).map(file => new Promise(resolve => {
            const fr = new FileReader();
            fr.onload = e => resolve(e.target.result); // base64 data URL
            fr.readAsDataURL(file);
        }));
        Promise.all(readers).then(results => {
            saveReviewWithPhotos(results);
        }).catch(() => alert('Erro ao processar imagens'));
    } else {
        saveReviewWithPhotos([]);
    }

    function saveReviewWithPhotos(photos) {
        const r = { rating, comment, photos, date: Date.now(), name: '' };
        const arr = loadReviews(currentProduct.id);
        arr.unshift(r);

        // Salva localmente
        saveReviews(currentProduct.id, arr);

        // Renderiza
        renderReviews(currentProduct.id);

        // Limpa formulário
        reviewCommentEl.value = '';
        reviewPhotosEl.value = '';
        reviewPhotoPreviewEl.innerHTML = '';
    }
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

    // renderizar avaliações para este produto
    try { renderReviews(p.id); } catch (e) { }
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

// Handler para botão "Adicionar ao Carrinho"
if (addToCartBtn) {
    addToCartBtn.onclick = () => {
        if (!currentProduct) return;
        let quantity = 1;
        if (quantityInput && currentProduct.id === 'p05') {
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
    };
}

// Handler para botão "Enviar avaliação"
if (submitReviewBtn) {
    submitReviewBtn.onclick = handleSubmitReview;
}

// Handler para preview de fotos do review
if (reviewPhotosEl) {
    reviewPhotosEl.addEventListener('change', previewSelectedPhotos);
}


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

