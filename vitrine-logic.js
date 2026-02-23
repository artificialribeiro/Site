import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

// ─── REFS ───
const loadingState    = document.getElementById('loadingState');
const produtoContainer= document.getElementById('produtoContainer');
const fotoPrincipal   = document.getElementById('fotoPrincipal');
const galeriaThumbs   = document.getElementById('galeriaThumbs');
const gridTamanhos    = document.getElementById('gridTamanhos');
const gridCores       = document.getElementById('gridCores');
const boxCores        = document.getElementById('boxCores');
const btnComprar      = document.getElementById('btnComprar');
const btnWhatsApp     = document.getElementById('btnWhatsApp');
const toastMsg        = document.getElementById('toastMsg');

// ─── ESTADO ───
let produtoAtual         = null;
let variantesAtuais      = [];
let varianteSelecionadaId= null;
let tamanhoSelecionado   = null;

const urlParams = new URLSearchParams(window.location.search);
const produtoId = urlParams.get('produtoId');

if (!produtoId) {
    window.location.href = 'site.html';
} else {
    carregarProduto();
    sincronizarCarrinho();
}

// ─── IMAGEM: resolve base64 ou caminho ───
function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/600x800/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image')) return caminho;
    if (caminho.length > 200 && /^[a-zA-Z0-9+/=\s]+$/.test(caminho)) return `data:image/jpeg;base64,${caminho.replace(/\s/g,'')}`;
    if (caminho.startsWith('http')) return caminho;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

// ─── CARREGAR PRODUTO ───
async function carregarProduto() {
    try {
        const headers = await getAuthHeaders();

        // Produto
        const rProd = await fetch(`${API_CONFIG.baseUrl}/api/produtos/${produtoId}`, { headers });
        if (!rProd.ok) throw new Error('Produto não encontrado');
        const jProd = await rProd.json();
        produtoAtual = jProd.data;

        // Variantes
        const rVar = await fetch(`${API_CONFIG.baseUrl}/api/produtos/${produtoId}/variantes`, { headers });
        if (rVar.ok) {
            const jVar = await rVar.json();
            variantesAtuais = jVar.data || [];
        }

        renderizarTela();
        atualizarSEO();

        if (window.MotorIA) window.MotorIA.registrarVisualizacao(produtoAtual);

        // IA: recomendações da mesma categoria
        carregarRecomendacoesIA(headers);

    } catch (e) {
        console.error(e);
        alert('Erro ao carregar o produto. Pode ter sido removido.');
        window.location.href = 'site.html';
    }
}

// ─── RENDERIZAR TELA ───
function renderizarTela() {
    document.getElementById('txtNome').textContent     = produtoAtual.nome;
    document.getElementById('txtSku').textContent      = `SKU: ${produtoAtual.sku || 'N/D'}`;
    document.getElementById('txtCategoria').textContent= produtoAtual.categoria?.nome || 'Moda';
    document.getElementById('txtDescricao').innerHTML  = produtoAtual.descricao || 'Sem descrição detalhada.';

    // Preço
    const preco = parseFloat(produtoAtual.preco) || 0;
    const desc  = parseFloat(produtoAtual.desconto_percent) || 0;

    document.getElementById('txtPrecoAtual').textContent = `R$ ${preco.toFixed(2).replace('.', ',')}`;

    if (desc > 0) {
        const precoAnt = preco / (1 - desc / 100);
        const el = document.getElementById('txtPrecoAntigo');
        el.textContent = `R$ ${precoAnt.toFixed(2).replace('.', ',')}`;
        el.classList.remove('hidden');

        const tag = document.getElementById('tagDesconto');
        tag.textContent = `-${desc}%`;
        tag.classList.remove('hidden');
    }

    renderizarImagens();
    renderizarVariantes();

    loadingState.classList.add('hidden');
    produtoContainer.classList.remove('hidden');
    produtoContainer.classList.add('flex', 'flex-col');
}

// ─── IMAGENS E THUMBS ───
function renderizarImagens() {
    const imgs = produtoAtual.imagens || [];
    if (!imgs.length) { fotoPrincipal.src = resolverImagem(null); return; }

    fotoPrincipal.src = resolverImagem(imgs[0].base64 || imgs[0].imagem_base64 || imgs[0].caminho);

    galeriaThumbs.innerHTML = imgs.map((img, i) => {
        const src = resolverImagem(img.base64 || img.imagem_base64 || img.caminho);
        return `<button class="tb ${i === 0 ? 'on' : ''} w-[60px] h-[76px] md:w-full md:h-[84px]"
                        onclick="window.mudarFoto('${src}', this)">
                    <img src="${src}" class="w-full h-full object-cover">
                </button>`;
    }).join('');
}

window.mudarFoto = function(src, el) {
    fotoPrincipal.style.opacity = '0.4';
    setTimeout(() => {
        fotoPrincipal.src = src;
        fotoPrincipal.style.opacity = '1';
    }, 140);
    document.querySelectorAll('.tb').forEach(b => b.classList.remove('on'));
    el.classList.add('on');
};

// ─── LIGHTBOX ───
window.abrirLightbox = function() {
    document.getElementById('lightboxImg').src = fotoPrincipal.src;
    const ml = document.getElementById('modalLightbox');
    ml.classList.remove('hidden');
    ml.classList.add('flex');
};
window.fecharLightbox = function() {
    const ml = document.getElementById('modalLightbox');
    ml.classList.add('hidden');
    ml.classList.remove('flex');
    document.getElementById('lightboxImg').classList.remove('scale-150', 'cursor-zoom-out');
    document.getElementById('lightboxImg').classList.add('cursor-zoom-in');
};

// ─── GUIA MEDIDAS ───
window.abrirGuiaMedidas = function() {
    const m = document.getElementById('modalGuia');
    m.classList.remove('hidden'); m.classList.add('flex');
};
window.fecharGuiaMedidas = function() {
    const m = document.getElementById('modalGuia');
    m.classList.add('hidden'); m.classList.remove('flex');
};

// ─── VARIANTES ───
function renderizarVariantes() {
    if (!variantesAtuais.length) {
        gridTamanhos.innerHTML = `<span class="text-xs text-red-500">Produto esgotado.</span>`;
        btnComprar.disabled = true;
        btnComprar.innerHTML = `<span class="material-symbols-outlined text-[18px]">block</span> Esgotado`;
        return;
    }

    // Tamanhos com estoque
    const tams = [...new Set(variantesAtuais.filter(v => v.estoque > 0).map(v => v.tamanho))];
    const tamSemEstoque = [...new Set(variantesAtuais.filter(v => v.estoque <= 0).map(v => v.tamanho))].filter(t => !tams.includes(t));

    gridTamanhos.innerHTML = [
        ...tams.map(t => `<button class="bv w-12 h-12 flex items-center justify-center" onclick="window.selecionarTamanho('${t}')" id="bt-${t}">${t}</button>`),
        ...tamSemEstoque.map(t => `<button class="bv off w-12 h-12 flex items-center justify-center" disabled>${t}</button>`)
    ].join('');
}

window.selecionarTamanho = function(tam) {
    tamanhoSelecionado = tam;
    varianteSelecionadaId = null;

    document.querySelectorAll('.bv-tam').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('[id^="bt-"]').forEach(b => {
        b.classList.remove('on');
        if (b.id === `bt-${tam}`) b.classList.add('on');
    });

    const cores = variantesAtuais.filter(v => v.tamanho === tam && v.estoque > 0);
    boxCores.classList.remove('hidden');
    gridCores.innerHTML = cores.map(v =>
        `<button class="bv px-5 py-2.5 flex items-center gap-2" onclick="window.selecionarCor(${v.id}, '${v.cor}')" id="bc-${v.id}">${v.cor}</button>`
    ).join('');

    btnComprar.disabled = true;
    btnComprar.innerHTML = `<span class="material-symbols-outlined text-[18px]">palette</span> Selecione a Cor`;
};

window.selecionarCor = function(id, cor) {
    varianteSelecionadaId = id;
    document.querySelectorAll('[id^="bc-"]').forEach(b => {
        b.classList.remove('on');
        if (b.id === `bc-${id}`) b.classList.add('on');
    });
    btnComprar.disabled = false;
    btnComprar.innerHTML = `<span class="material-symbols-outlined text-[18px]">shopping_bag</span> Adicionar ao Carrinho`;
    if (window.MotorIA) window.MotorIA.registrarVisualizacao(produtoAtual, { tamanho: tamanhoSelecionado, cor });
};

// ─── ADICIONAR AO CARRINHO ───
btnComprar.addEventListener('click', async () => {
    if (!varianteSelecionadaId) return;

    const sessao = localStorage.getItem('boutique_diniz_session');
    if (!sessao) { alert('Para comprar, faça login na loja.'); window.location.href = 'login.html'; return; }

    let clienteId;
    try { clienteId = JSON.parse(atob(sessao)).usuario.id; }
    catch { window.location.href = 'login.html'; return; }

    btnComprar.innerHTML = `<span class="material-symbols-outlined spin-icon text-[18px]">sync</span> Processando...`;
    btnComprar.disabled = true;

    try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${API_CONFIG.baseUrl}/api/carrinho`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                cliente_id: parseInt(clienteId),
                produto_variante_id: parseInt(varianteSelecionadaId),
                quantidade: 1
            })
        });

        let data = {};
        try { data = await resp.json(); } catch {}

        if ((resp.ok || resp.status === 201) && data.success !== false) {
            // Toast
            toastMsg.classList.add('show');
            setTimeout(() => toastMsg.classList.remove('show'), 3200);

            // Contador
            const qtd = parseInt(localStorage.getItem('boutique_cart_qty') || 0);
            localStorage.setItem('boutique_cart_qty', qtd + 1);
            sincronizarCarrinho();

            setTimeout(() => {
                btnComprar.innerHTML = `<span class="material-symbols-outlined text-[18px]">shopping_bag</span> Adicionar ao Carrinho`;
                btnComprar.disabled = false;
            }, 3000);
        } else {
            const erro = data.message || data?.error?.message || 'Verifique sua conta.';
            alert(`Aviso:\n${erro}`);
            btnComprar.innerHTML = `<span class="material-symbols-outlined text-[18px]">shopping_bag</span> Adicionar ao Carrinho`;
            btnComprar.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert('Servidor indisponível. Tente novamente.');
        btnComprar.innerHTML = `<span class="material-symbols-outlined text-[18px]">shopping_bag</span> Adicionar ao Carrinho`;
        btnComprar.disabled = false;
    }
});

// ─── COMPARTILHAR WHATSAPP ───
btnWhatsApp.addEventListener('click', () => {
    if (!produtoAtual) return;
    let url = window.location.href;
    if (!url.startsWith('http')) url = 'https://' + url;
    const preco = parseFloat(produtoAtual.preco).toFixed(2).replace('.', ',');
    const msg = `Olha que peça incrível na *Boutique Diniz*! 🖤\n\n*${produtoAtual.nome}*\nPor apenas: R$ ${preco}\n\nVeja todos os detalhes e tamanhos:\n👉 ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
});

// ─── SEO ───
function atualizarSEO() {
    document.title = `${produtoAtual.nome} | Boutique Diniz`;
    document.getElementById('seoTitle').content = `${produtoAtual.nome} - Boutique Diniz`;
    if (produtoAtual.descricao) {
        document.getElementById('seoDesc').content = produtoAtual.descricao.replace(/<[^>]*>/g, '').slice(0, 155);
    }
    const img = produtoAtual.imagens?.[0];
    if (img) document.getElementById('seoImage').content = resolverImagem(img.base64 || img.caminho);
}

// ─── CONTADOR CARRINHO ───
function sincronizarCarrinho() {
    setTimeout(() => {
        const el = document.getElementById('cartCount');
        if (el) el.textContent = localStorage.getItem('boutique_cart_qty') || 0;
    }, 500);
}

// ─── IA: RECOMENDAÇÕES POR CATEGORIA ───
async function carregarRecomendacoesIA(headers) {
    try {
        // Busca produtos da mesma categoria do produto atual
        const categoriaId = produtoAtual?.categoria?.id;
        const categoriaNome = produtoAtual?.categoria?.nome || 'Moda';

        const url = categoriaId
            ? `${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=40&categoria_id=${categoriaId}`
            : `${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=40`;

        const res  = await fetch(url, { headers });
        const json = await res.json();
        const todos = (json.data || []).filter(p => p.id !== parseInt(produtoId));

        if (!todos.length) return;

        let recomendados = [];

        // Tenta usar a IA da Groq
        if (window.MotorIA) {
            try {
                const ids = await window.MotorIA.obterRecomendacoesGroq(todos);
                if (ids?.length) {
                    recomendados = ids.map(id => todos.find(p => p.id === id)).filter(Boolean);
                }
            } catch {}
        }

        // Fallback: se a IA não retornar, usa os 4 primeiros da mesma categoria
        if (!recomendados.length) {
            recomendados = todos.slice(0, 4);
        }

        if (recomendados.length > 0) {
            const section = document.getElementById('sectionRecomendados');
            const container = document.getElementById('recomendadosContainer');
            const subtitulo = document.getElementById('iaSubtitulo');

            section.classList.remove('hidden');
            if (subtitulo) subtitulo.textContent = `Peças da coleção de ${categoriaNome} que combinam com você`;
            container.innerHTML = recomendados.map(p => criarCard(p)).join('');
        }
    } catch (e) {
        // IA silenciosa — não quebra a página
    }
}

// ─── CARD DE PRODUTO (RECOMENDAÇÃO) ───
function criarCard(p) {
    const preco = parseFloat(p.preco) || 0;
    const desc  = parseFloat(p.desconto_percent) || 0;
    const orig  = desc > 0 ? (preco / (1 - desc / 100)).toFixed(2) : preco.toFixed(2);

    let htmlImg = '';
    if (p.imagens?.length > 1) {
        const i1 = resolverImagem(p.imagens[0].base64 || p.imagens[0].imagem_base64 || p.imagens[0].caminho);
        const i2 = resolverImagem(p.imagens[1].base64 || p.imagens[1].imagem_base64 || p.imagens[1].caminho);
        htmlImg = `<img src="${i1}" alt="${p.nome}" class="im absolute inset-0 w-full h-full object-cover z-10">
                   <img src="${i2}" alt="${p.nome}" class="ih absolute inset-0 w-full h-full object-cover z-0">`;
    } else {
        const src = p.imagens?.length
            ? resolverImagem(p.imagens[0].base64 || p.imagens[0].imagem_base64 || p.imagens[0].caminho)
            : resolverImagem(null);
        htmlImg = `<img src="${src}" alt="${p.nome}" class="ims w-full h-full object-cover">`;
    }

    return `
    <div class="pc border border-[#151515]" onclick="window.irParaProduto(${p.id})">
        <div class="relative w-full aspect-[3/4] bg-[#0a0a0a] overflow-hidden">
            ${htmlImg}
            ${desc > 0 ? `<span class="absolute top-2 right-2 bg-white text-black text-[9px] font-black px-2 py-1 uppercase tracking-wider z-20 rounded-full shadow">-${desc}%</span>` : ''}
        </div>
        <div class="p-3.5 flex flex-col gap-0.5">
            <span class="text-[9px] uppercase tracking-widest text-[#333] truncate">${p.categoria?.nome || 'Moda'}</span>
            <h3 class="text-sm font-light text-white truncate">${p.nome}</h3>
            <div class="flex items-end gap-2 mt-1.5">
                <span class="text-base font-medium text-white">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                ${desc > 0 ? `<span class="text-xs text-[#333] line-through mb-0.5">R$ ${orig.replace('.', ',')}</span>` : ''}
            </div>
        </div>
    </div>`;
}

// ─── NAVEGAR PARA OUTRO PRODUTO ───
window.irParaProduto = function(id) {
    let v = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
    v = [parseInt(produtoId), ...v.filter(x => x !== parseInt(produtoId))].slice(0, 10);
    localStorage.setItem('boutique_recent_views', JSON.stringify(v));
    window.location.href = `vitrine.botique.diniz.html?produtoId=${id}`;
};
