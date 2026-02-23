import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

inicializarLoja();

// ─── RESOLVEDOR DE IMAGENS (base64 ou caminho) ───
function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/300x400/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image')) return caminho;
    if (caminho.length > 200 && /^[a-zA-Z0-9+/=]+$/.test(caminho.replace(/\s/g, ''))) {
        return `data:image/jpeg;base64,${caminho}`;
    }
    if (caminho.startsWith('http')) return caminho;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

// ─── RESOLUÇÃO DE IMAGEM DE CATEGORIA ───
// A API retorna imagem_base64 ou logo_base64 — usa a melhor disponível
function resolverImagemCategoria(cat) {
    if (cat.imagem_base64) return cat.imagem_base64;
    if (cat.logo_base64)   return cat.logo_base64;
    if (cat.imagem)        return resolverImagem(cat.imagem);
    if (cat.logo_caminho)  return resolverImagem(cat.logo_caminho);
    return null;
}

// ─── INICIALIZAÇÃO CENTRAL ───
async function inicializarLoja() {
    try {
        const headers = await getAuthHeaders();

        // 1. Banners
        fetch(`${API_CONFIG.baseUrl}/api/carrossel/ativos`, { headers })
            .then(r => r.json())
            .then(d => renderizarBanners(d.data || []))
            .catch(() => fetch(`${API_CONFIG.baseUrl}/api/banners?ativo=1`, { headers })
                .then(r => r.json())
                .then(d => renderizarBanners(d.data || []))
                .catch(() => {}));

        // 2. Categorias (busca detalhes individuais para garantir base64)
        fetch(`${API_CONFIG.baseUrl}/api/categorias?page=1&pageSize=20`, { headers })
            .then(r => r.json())
            .then(async d => {
                let cats = d.data || [];
                // Busca detalhes de cada categoria para pegar imagem_base64
                const catsCompletas = await Promise.all(cats.map(async cat => {
                    try {
                        const r = await fetch(`${API_CONFIG.baseUrl}/api/categorias/${cat.id}`, { headers });
                        const dd = await r.json();
                        return (dd.success && dd.data) ? dd.data : cat;
                    } catch { return cat; }
                }));
                renderizarCategorias(catsCompletas.filter(c => c.ativo !== 0));
            })
            .catch(() => {});

        // 3. Produtos
        fetch(`${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=60`, { headers })
            .then(r => r.json())
            .then(d => {
                const produtos = d.data || [];
                renderizarMaiorDesconto(produtos);
                renderizarProdutosPorCategoria(produtos);
                renderizarVistosRecentemente(produtos);
                renderizarNovidades(produtos);
                processarRecomendacoesIA(produtos);
            })
            .catch(e => console.error('Falha no catálogo:', e));

    } catch (e) {
        console.error('Falha de rede:', e);
    }
}

// ─── IA: RECOMENDAÇÕES ───
async function processarRecomendacoesIA(todos) {
    if (!window.MotorIA) return;
    try {
        const ids = await window.MotorIA.obterRecomendacoesGroq(todos);
        if (!ids || ids.length === 0) return;
        const recomendados = ids.map(id => todos.find(p => p.id === id)).filter(Boolean);
        const container = document.getElementById('recomendadosContainer');
        const section   = document.getElementById('sectionRecomendados');
        if (recomendados.length > 0 && container && section) {
            section.classList.remove('hidden');
            container.innerHTML = recomendados.map(p => criarCardProduto(p)).join('');
        }
    } catch {}
}

// ─── BANNERS ───
function renderizarBanners(banners) {
    const container = document.getElementById('bannerContainer');
    if (!banners.length || !container) return;
    container.innerHTML = banners.map(b => {
        const imgSrc = b.imagem_base64 || resolverImagem(b.imagem_caminho || b.imagem);
        const link   = b.link || `vitrine.categoria.html`;
        return `
        <div class="w-full h-48 md:h-[400px] flex-shrink-0 snap-center relative cursor-pointer overflow-hidden rounded-xl"
             onclick="window.location.href='${link}'">
            <img src="${imgSrc}" alt="${b.titulo || 'Banner'}"
                 class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 md:p-10">
                <h2 class="text-2xl md:text-4xl font-light text-white drop-shadow-lg font-logo">${b.titulo || ''}</h2>
            </div>
        </div>`;
    }).join('');
}

// ─── CATEGORIAS ───
function renderizarCategorias(categorias) {
    const container = document.getElementById('categoriasContainer');
    if (!categorias.length || !container) return;

    container.innerHTML = `<div class="flex gap-5 pb-1">` + categorias.map(c => {
        const imgSrc = resolverImagemCategoria(c);
        const nomeSlug = encodeURIComponent(c.nome);
        return `
        <div class="flex flex-col items-center gap-2.5 cursor-pointer group snap-center flex-shrink-0 w-24"
             onclick="window.irParaCategoria(${c.id}, '${c.nome.replace(/'/g,"\\'")}')">
            <div class="w-20 h-20 rounded-full bg-[#111] border border-gray-800 p-0.5 group-hover:border-white transition-all duration-200 overflow-hidden flex items-center justify-center relative">
                ${imgSrc
                    ? `<img src="${imgSrc}" alt="${c.nome}" class="w-full h-full object-cover rounded-full"
                           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                    : ''}
                <span class="material-symbols-outlined text-gray-600 text-3xl ${imgSrc ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center">checkroom</span>
            </div>
            <div class="flex items-center gap-0.5">
                <span class="text-[11px] text-gray-400 group-hover:text-white text-center truncate max-w-[80px] transition-colors">${c.nome}</span>
                <span class="material-symbols-outlined text-[12px] text-gray-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">chevron_right</span>
            </div>
        </div>`;
    }).join('') + `</div>`;
}

// Navega para vitrine.categoria.html com id e nome
window.irParaCategoria = function(id, nome) {
    const slug = encodeURIComponent(nome);
    window.location.href = `vitrine.categoria.html?categoriaId=${id}&nome=${slug}`;
};

// ─── OFERTAS COM DESCONTO ───
function renderizarMaiorDesconto(produtos) {
    const container = document.getElementById('descontosContainer');
    const section   = document.getElementById('sectionDescontos');
    if (!container) return;

    const comDesconto = produtos
        .filter(p => parseFloat(p.desconto_percent) > 0)
        .sort((a, b) => b.desconto_percent - a.desconto_percent)
        .slice(0, 8);

    if (comDesconto.length > 0) {
        container.innerHTML = comDesconto.map(p => criarCardProduto(p)).join('');
    } else {
        section?.classList.add('hidden');
    }
}

// ─── PRODUTOS AGRUPADOS POR CATEGORIA ───
function renderizarProdutosPorCategoria(produtos) {
    const wrapper = document.getElementById('produtosPorCategoriaContainer');
    if (!wrapper) return;

    // Agrupa produtos por categoria
    const grupos = {};
    produtos.forEach(p => {
        const nomeCat = p.categoria?.nome || 'Outros';
        const idCat   = p.categoria?.id || 0;
        if (!grupos[nomeCat]) grupos[nomeCat] = { id: idCat, nome: nomeCat, produtos: [] };
        grupos[nomeCat].produtos.push(p);
    });

    // Renderiza cada grupo com título + seta + grid
    let html = '';
    Object.values(grupos).forEach(grupo => {
        const amostra = grupo.produtos.slice(0, 4);
        const slug    = encodeURIComponent(grupo.nome);
        html += `
        <div class="mb-16">
            <div class="flex items-center justify-between mb-6 border-b border-gray-900 pb-3">
                <h2 class="text-lg font-light text-white">${grupo.nome}</h2>
                <button onclick="window.irParaCategoria(${grupo.id}, '${grupo.nome.replace(/'/g,"\\'")}')
                " class="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors group">
                    Ver tudo <span class="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                ${amostra.map(p => criarCardProduto(p)).join('')}
            </div>
        </div>`;
    });

    wrapper.innerHTML = html;
}

// ─── VISTOS RECENTEMENTE ───
function renderizarVistosRecentemente(todos) {
    const container = document.getElementById('recentesContainer');
    const section   = document.getElementById('sectionRecentes');
    if (!container || !section) return;

    const historico = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
    if (!historico.length) return;

    const vistos = historico.map(id => todos.find(p => p.id === id)).filter(Boolean).slice(0, 4);
    if (vistos.length > 0) {
        section.classList.remove('hidden');
        container.innerHTML = vistos.map(p => criarCardProduto(p)).join('');
    }
}

// ─── NOVIDADES (fallback geral) ───
function renderizarNovidades(produtos) {
    const container = document.getElementById('produtosCategoriaContainer');
    const titulo    = document.getElementById('nomeCategoriaDestaque');
    if (!container) return;

    const amostra = produtos.slice(0, 4);
    if (amostra.length > 0 && amostra[0].categoria) {
        if (titulo) titulo.textContent = `Destaques em ${amostra[0].categoria.nome}`;
    }
    container.innerHTML = amostra.map(p => criarCardProduto(p)).join('');
}

// ─── CARD DE PRODUTO ───
function criarCardProduto(p) {
    const preco       = parseFloat(p.preco) || 0;
    const desc        = parseFloat(p.desconto_percent) || 0;
    const precoOrig   = desc > 0 ? (preco / (1 - desc / 100)).toFixed(2) : preco.toFixed(2);
    const categNome   = p.categoria?.nome || 'Moda';

    let htmlImgs = '';
    if (p.imagens && p.imagens.length > 1) {
        const i1 = resolverImagem(p.imagens[0].base64 || p.imagens[0].imagem_base64 || p.imagens[0].caminho);
        const i2 = resolverImagem(p.imagens[1].base64 || p.imagens[1].imagem_base64 || p.imagens[1].caminho);
        htmlImgs = `
            <img src="${i1}" alt="${p.nome}" class="img-main absolute inset-0 w-full h-full object-cover z-10">
            <img src="${i2}" alt="${p.nome} — verso" class="img-hover absolute inset-0 w-full h-full object-cover z-0">`;
    } else {
        const src = (p.imagens?.length > 0)
            ? resolverImagem(p.imagens[0].base64 || p.imagens[0].imagem_base64 || p.imagens[0].caminho)
            : 'https://via.placeholder.com/300x400/111/fff?text=Sem+Foto';
        htmlImgs = `<img src="${src}" alt="${p.nome}" class="img-main-only w-full h-full object-cover">`;
    }

    return `
    <div class="product-card flex flex-col bg-[#050505] border border-gray-900 rounded-lg overflow-hidden cursor-pointer shadow-lg hover:border-gray-700 transition-colors"
         onclick="window.redirecionarParaVitrine('produto', ${p.id})">
        <div class="relative w-full aspect-[3/4] bg-[#111] overflow-hidden">
            ${htmlImgs}
            ${desc > 0 ? `<div class="absolute top-2 right-2 bg-white text-black text-[9px] font-bold px-2 py-1 uppercase tracking-wider z-20 rounded shadow">-${desc}%</div>` : ''}
        </div>
        <div class="p-3 md:p-4 flex flex-col gap-1">
            <span class="text-[9px] uppercase tracking-widest text-gray-600 truncate">${categNome}</span>
            <h3 class="text-sm font-light text-white truncate">${p.nome}</h3>
            <div class="flex items-end gap-2 mt-1">
                <span class="text-base font-medium text-white">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                ${desc > 0 ? `<span class="text-xs text-gray-600 line-through mb-0.5">R$ ${precoOrig.replace('.', ',')}</span>` : ''}
            </div>
        </div>
    </div>`;
}

// ─── NAVEGAÇÃO GLOBAL ───
window.redirecionarParaVitrine = function(tipo, valor) {
    if (tipo === 'produto') {
        let vistos = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
        vistos = vistos.filter(id => id !== valor);
        vistos.unshift(valor);
        if (vistos.length > 10) vistos.pop();
        localStorage.setItem('boutique_recent_views', JSON.stringify(vistos));
        window.location.href = `vitrine.botique.diniz.html?produtoId=${valor}`;
    } else if (tipo === 'categoria') {
        window.location.href = `vitrine.categoria.html?categoriaId=${valor}`;
    }
};
