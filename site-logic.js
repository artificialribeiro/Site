import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

// Como o orquestrador do HTML já garantiu a ordem, podemos rodar direto:
inicializarLoja();

// --- RESOLVEDOR UNIVERSAL DE IMAGENS ---
function resolverImagem(caminhoDaImagem) {
    if (!caminhoDaImagem) return 'https://via.placeholder.com/300x400/111/fff?text=Sem+Foto';
    
    // Identifica se a API mandou a foto completa em Base64
    if (caminhoDaImagem.startsWith('data:image')) return caminhoDaImagem;
    if (caminhoDaImagem.length > 200 && /^[a-zA-Z0-9+/]+={0,2}$/.test(caminhoDaImagem)) {
        return `data:image/jpeg;base64,${caminhoDaImagem}`;
    }
    
    if (caminhoDaImagem.startsWith('http')) return caminhoDaImagem;
    if (caminhoDaImagem.startsWith('/')) return `${API_CONFIG.baseUrl}${caminhoDaImagem}`;
    
    return `${API_CONFIG.baseUrl}/${caminhoDaImagem}`;
}

// --- COMUNICAÇÃO CENTRAL COM A API ---
async function inicializarLoja() {
    try {
        const headers = await getAuthHeaders(); 

        // 1. Puxar Banners
        fetch(`${API_CONFIG.baseUrl}/api/banners?ativo=1`, { headers })
            .then(res => res.json())
            .then(data => renderizarBanners(data.data || []))
            .catch(e => console.log("Sem banners."));

        // 2. Puxar Categorias
        fetch(`${API_CONFIG.baseUrl}/api/categorias?page=1&pageSize=10`, { headers })
            .then(res => res.json())
            .then(data => renderizarCategorias(data.data || []))
            .catch(e => console.log("Sem categorias."));

        // 3. Puxar Produtos e Disparar Inteligência Artificial
        fetch(`${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=50`, { headers })
            .then(res => res.json())
            .then(data => {
                const produtos = data.data || [];
                renderizarMaiorDesconto(produtos);
                renderizarPorCategoria(produtos);
                renderizarVistosRecentemente(produtos);
                
                // Dispara o Motor IA da Groq com os produtos recebidos
                processarRecomendacoesIA(produtos);
            })
            .catch(e => console.error("Falha ao processar catálogo:", e));

    } catch (error) { 
        console.error("Falha de rede. Servidor da API offline?", error); 
    }
}

// --- PROCESSADOR DA INTELIGÊNCIA ARTIFICIAL ---
async function processarRecomendacoesIA(todosProdutos) {
    if (!window.MotorIA) return;

    try {
        const idsSugeridos = await window.MotorIA.obterRecomendacoesGroq(todosProdutos);
        
        if (idsSugeridos && idsSugeridos.length > 0) {
            const produtosRecomendados = idsSugeridos
                .map(id => todosProdutos.find(p => p.id === id))
                .filter(p => p); 

            const container = document.getElementById('recomendadosContainer');
            const section = document.getElementById('sectionRecomendados');
            
            if (produtosRecomendados.length > 0 && container && section) {
                section.classList.remove('hidden'); // Revela a seção mágica
                container.innerHTML = produtosRecomendados.map(p => criarCardProduto(p)).join('');
            }
        }
    } catch (error) {
        // Falha silenciosa: a tela da loja não quebra se a IA estiver sem sinal.
    }
}

// --- MOTORES DE RENDERIZAÇÃO DE CARROSSEL E VITRINE ---

function renderizarBanners(banners) {
    const container = document.getElementById('bannerContainer');
    if (!banners || banners.length === 0 || !container) return;
    
    container.innerHTML = banners.map(b => `
        <div class="w-full h-48 md:h-[400px] flex-shrink-0 snap-center relative cursor-pointer" onclick="redirecionarParaVitrine('banner', ${b.id})">
            <img src="${resolverImagem(b.imagem)}" alt="${b.titulo}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                <h2 class="text-3xl font-light text-white drop-shadow-lg font-logo">${b.titulo}</h2>
            </div>
        </div>
    `).join('');
}

function renderizarCategorias(categorias) {
    const container = document.getElementById('categoriasContainer');
    if (!categorias || categorias.length === 0 || !container) return;

    container.innerHTML = categorias.map(c => `
        <div class="flex flex-col items-center gap-3 cursor-pointer group snap-center flex-shrink-0 w-24" onclick="redirecionarParaVitrine('categoria', ${c.id})">
            <div class="w-20 h-20 rounded-full bg-[#111] border border-gray-800 p-1 group-hover:border-white transition-colors overflow-hidden flex items-center justify-center">
                ${c.imagem ? `<img src="${resolverImagem(c.imagem)}" alt="${c.nome}" class="w-full h-full object-cover rounded-full">` : `<span class="material-symbols-outlined text-gray-600 text-3xl">checkroom</span>`}
            </div>
            <span class="text-xs text-gray-400 group-hover:text-white text-center w-full truncate">${c.nome}</span>
        </div>
    `).join('');
}

function renderizarMaiorDesconto(produtos) {
    const container = document.getElementById('descontosContainer');
    if(!container) return;

    const comDesconto = produtos.filter(p => p.desconto_percent > 0).sort((a, b) => b.desconto_percent - a.desconto_percent).slice(0, 4);
    if(comDesconto.length > 0) {
        container.innerHTML = comDesconto.map(p => criarCardProduto(p)).join('');
    } else if (container.parentElement) {
        container.parentElement.classList.add('hidden');
    }
}

function renderizarPorCategoria(produtos) {
    const container = document.getElementById('produtosCategoriaContainer');
    if(!container) return;

    const amostra = produtos.slice(0, 4);
    if(amostra.length > 0 && amostra[0].categoria) {
        const tituloSecao = document.getElementById('nomeCategoriaDestaque');
        if(tituloSecao) tituloSecao.innerText = `Destaques em ${amostra[0].categoria.nome}`;
    }
    container.innerHTML = amostra.map(p => criarCardProduto(p)).join('');
}

function renderizarVistosRecentemente(todosProdutos) {
    const container = document.getElementById('recentesContainer');
    const section = document.getElementById('sectionRecentes');
    if (!container || !section) return;

    const historico = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
    if (historico.length === 0) return;

    const produtosVistos = historico.map(id => todosProdutos.find(p => p.id === id)).filter(p => p).slice(0,4);
    if (produtosVistos.length > 0) {
        section.classList.remove('hidden');
        container.innerHTML = produtosVistos.map(p => criarCardProduto(p)).join('');
    }
}

// --- CONSTRUTOR DO CARD DE PRODUTO ---
function criarCardProduto(p) {
    let htmlImagens = '';
    const precoFloat = parseFloat(p.preco) || 0;
    const descFloat = parseFloat(p.desconto_percent) || 0;
    const precoOriginal = descFloat > 0 ? (precoFloat / (1 - (descFloat/100))).toFixed(2) : precoFloat.toFixed(2);

    if (p.imagens && p.imagens.length > 1) {
        const img1 = p.imagens[0].base64 || p.imagens[0].caminho;
        const img2 = p.imagens[1].base64 || p.imagens[1].caminho;
        htmlImagens = `
            <img src="${resolverImagem(img1)}" alt="${p.nome}" class="img-main absolute inset-0 w-full h-full object-cover z-10 rounded-t border-b border-gray-900">
            <img src="${resolverImagem(img2)}" alt="${p.nome} Costas" class="img-hover absolute inset-0 w-full h-full object-cover z-0 rounded-t border-b border-gray-900">
        `;
    } else {
        const imgUnica = (p.imagens && p.imagens.length > 0) ? (p.imagens[0].base64 || p.imagens[0].caminho) : null;
        const urlFinal = imgUnica ? resolverImagem(imgUnica) : 'https://via.placeholder.com/300x400/111/fff?text=Sem+Foto';
        htmlImagens = `<img src="${urlFinal}" alt="${p.nome}" class="img-main-only w-full h-full object-cover rounded-t border-b border-gray-900">`;
    }
    
    return `
        <div class="product-card flex flex-col bg-[#050505] border border-gray-900 rounded overflow-hidden cursor-pointer shadow-lg hover:border-gray-700 transition-colors" onclick="redirecionarParaVitrine('produto', ${p.id})">
            <div class="relative w-full aspect-[3/4] bg-[#111] overflow-hidden">
                ${htmlImagens}
                ${descFloat > 0 ? `<div class="absolute top-2 right-2 bg-white text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wider z-20 rounded shadow">-${descFloat}%</div>` : ''}
            </div>
            <div class="p-4 flex flex-col gap-1">
                <span class="text-[10px] uppercase tracking-widest text-gray-500 truncate">${p.categoria ? p.categoria.nome : 'Moda'}</span>
                <h3 class="text-sm font-light text-white truncate hover:text-gray-300 transition-colors">${p.nome}</h3>
                <div class="flex items-end gap-2 mt-1">
                    <span class="text-lg font-medium text-white">R$ ${precoFloat.toFixed(2).replace('.', ',')}</span>
                    ${descFloat > 0 ? `<span class="text-xs text-gray-600 line-through mb-1">R$ ${precoOriginal.replace('.', ',')}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// --- SISTEMA DE NAVEGAÇÃO GLOBAL ---
window.redirecionarParaVitrine = function(tipo, valor) {
    if (tipo === 'produto') {
        let vistos = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
        vistos = vistos.filter(id => id !== valor);
        vistos.unshift(valor);
        if (vistos.length > 10) vistos.pop();
        localStorage.setItem('boutique_recent_views', JSON.stringify(vistos));
        
        window.location.href = `vitrine.botique.diniz.html?produtoId=${valor}`;
    } 
    else if (tipo === 'categoria') {
        window.location.href = `vitrine.botique.diniz.html?categoriaId=${valor}`;
    }
}
