import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const tituloCategoria = document.getElementById('tituloCategoria');
const contadorProdutos = document.getElementById('contadorProdutos');
const loadingState = document.getElementById('loadingState');
const produtosGrid = document.getElementById('produtosGrid');
const emptyState = document.getElementById('emptyState');

// ==========================================
// 1. O "CAPTURADOR" DA CATEGORIA NA URL
// ==========================================
// Exemplo: vitrine.categoria.html?categoriaId=5&nome=Vestidos
const urlParams = new URLSearchParams(window.location.search);
const categoriaIdParam = urlParams.get('categoriaId');
const nomeCategoria = urlParams.get('nome');

// Atualiza o Título da Página com o nome que veio da URL
if (nomeCategoria) {
    tituloCategoria.innerText = nomeCategoria;
    document.title = `${nomeCategoria} | Boutique Diniz`;
}

// Se alguém abrir a página sem enviar um ID, manda de volta para a Home
if (!categoriaIdParam) {
    window.location.href = 'site.html';
}

// ==========================================
// 2. INICIALIZAR A BUSCA
// ==========================================
carregarProdutosDaCategoria();

async function carregarProdutosDaCategoria() {
    try {
        const headers = await getAuthHeaders();
        
        // Busca os produtos (Puxamos uma lista grande e filtramos)
        const res = await fetch(`${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=100`, { headers });
        const data = await res.json();
        
        let produtos = data.data || [];

        // MAGIA DO FILTRO: Guarda apenas os produtos onde o ID da Categoria for igual ao ID da URL
        const produtosFiltrados = produtos.filter(p => p.categoria && p.categoria.id == categoriaIdParam);

        // Oculta o ícone de carregamento
        loadingState.classList.add('hidden');

        if (produtosFiltrados.length === 0) {
            // Se não houver roupas, mostra o aviso
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            contadorProdutos.innerText = '0 produtos';
        } else {
            // Se houver roupas, desenha o Grid
            contadorProdutos.innerText = `${produtosFiltrados.length} peças`;
            produtosGrid.innerHTML = produtosFiltrados.map(p => criarCardProduto(p)).join('');
            produtosGrid.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Erro ao carregar categoria:", error);
        loadingState.innerHTML = `<p class="text-red-500 font-bold">Falha de conexão com a loja.</p>`;
    }
}

// ==========================================
// 3. RESOLVEDOR DE IMAGENS (Igual ao site-logic.js)
// ==========================================
function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/300x400/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image')) return caminho;
    if (caminho.length > 200 && /^[a-zA-Z0-9+/=]+$/.test(caminho.replace(/\s/g, ''))) {
        return `data:image/jpeg;base64,${caminho}`;
    }
    if (caminho.startsWith('http')) return caminho;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

// ==========================================
// 4. DESENHADOR DE CARDS (Igual ao site-logic.js para manter o padrão)
// ==========================================
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
    <div class="product-card flex flex-col bg-[#050505] border border-gray-900 rounded-lg overflow-hidden cursor-pointer shadow-lg hover:border-gray-700 transition-colors group"
         onclick="window.redirecionarParaVitrine('produto', ${p.id})">
        <div class="relative w-full aspect-[3/4] bg-[#111] overflow-hidden">
            ${htmlImgs}
            ${desc > 0 ? `<div class="absolute top-2 right-2 bg-pink-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-wider z-20 rounded shadow shadow-pink-900/50">-${desc}%</div>` : ''}
        </div>
        <div class="p-3 md:p-4 flex flex-col gap-1">
            <span class="text-[9px] uppercase tracking-widest text-gray-500 truncate">${categNome}</span>
            <h3 class="text-sm font-light text-white truncate group-hover:text-pink-400 transition-colors">${p.nome}</h3>
            <div class="flex items-end gap-2 mt-1">
                <span class="text-base font-medium text-white">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                ${desc > 0 ? `<span class="text-xs text-gray-600 line-through mb-0.5">R$ ${precoOrig.replace('.', ',')}</span>` : ''}
            </div>
        </div>
    </div>`;
}

// ==========================================
// 5. NAVEGAÇÃO PARA O PRODUTO ÚNICO
// ==========================================
window.redirecionarParaVitrine = function(tipo, valor) {
    if (tipo === 'produto') {
        // Grava no histórico para a IA saber o que a cliente viu
        let vistos = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
        vistos = vistos.filter(id => id !== valor);
        vistos.unshift(valor);
        if (vistos.length > 10) vistos.pop();
        localStorage.setItem('boutique_recent_views', JSON.stringify(vistos));
        
        // Manda para a vitrine do produto final!
        window.location.href = `vitrine.botique.diniz.html?produtoId=${valor}`;
    }
};
