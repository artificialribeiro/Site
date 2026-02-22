import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const loadingState = document.getElementById('loadingState');
const produtoContainer = document.getElementById('produtoContainer');
const fotoPrincipal = document.getElementById('fotoPrincipal');
const galeriaThumbs = document.getElementById('galeriaThumbs');
const gridTamanhos = document.getElementById('gridTamanhos');
const gridCores = document.getElementById('gridCores');
const boxCores = document.getElementById('boxCores');
const btnComprar = document.getElementById('btnComprar');
const btnWhatsApp = document.getElementById('btnWhatsApp');
const toastMessage = document.getElementById('toastMessage');

let produtoAtual = null;
let variantesAtuais = [];
let varianteSelecionadaId = null;
let tamanhoSelecionado = null;

const urlParams = new URLSearchParams(window.location.search);
const produtoId = urlParams.get('produtoId');

if (!produtoId) {
    window.location.href = 'site.html'; 
} else {
    carregarDetalhesProduto();
    atualizarContadorCarrinhoUI();
}

function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/600x800/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image')) return caminho;
    if (caminho.length > 200 && /^[a-zA-Z0-9+/]+={0,2}$/.test(caminho)) return `data:image/jpeg;base64,${caminho}`;
    if (caminho.startsWith('http')) return caminho;
    if (caminho.startsWith('/')) return `${API_CONFIG.baseUrl}${caminho}`;
    return `${API_CONFIG.baseUrl}/${caminho}`;
}

async function carregarDetalhesProduto() {
    try {
        const headers = await getAuthHeaders();

        const resProduto = await fetch(`${API_CONFIG.baseUrl}/api/produtos/${produtoId}`, { headers });
        if (!resProduto.ok) throw new Error("Produto não encontrado");
        const jsonProduto = await resProduto.json();
        produtoAtual = jsonProduto.data;

        const resVariantes = await fetch(`${API_CONFIG.baseUrl}/api/produtos/${produtoId}/variantes`, { headers });
        if (resVariantes.ok) {
            const jsonVariantes = await resVariantes.json();
            variantesAtuais = jsonVariantes.data || [];
        }

        renderizarTela();
        atualizarSEO();
        
        if(window.MotorIA) window.MotorIA.registrarVisualizacao(produtoAtual);

        carregarRecomendacoesIA(headers);

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar o produto. Pode ter esgotado ou sido removido.");
        window.location.href = 'site.html';
    }
}

// --- UPSELL DA IA (RODAPÉ) ---
async function carregarRecomendacoesIA(headers) {
    if (!window.MotorIA) return;
    try {
        const res = await fetch(`${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=40`, { headers });
        const json = await res.json();
        const todosProdutos = json.data || [];
        
        const outrosProdutos = todosProdutos.filter(p => p.id !== parseInt(produtoId));
        const idsSugeridos = await window.MotorIA.obterRecomendacoesGroq(outrosProdutos);
        
        if (idsSugeridos && idsSugeridos.length > 0) {
            const recomendados = idsSugeridos.map(id => outrosProdutos.find(p => p.id === id)).filter(p => p); 

            if (recomendados.length > 0) {
                document.getElementById('sectionRecomendados').classList.remove('hidden');
                document.getElementById('recomendadosContainer').innerHTML = recomendados.map(p => criarCardProduto(p)).join('');
            }
        }
    } catch (error) {
        console.log("IA não gerou recomendações no momento.");
    }
}

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
        htmlImagens = `<img src="${resolverImagem(imgUnica)}" alt="${p.nome}" class="img-main-only w-full h-full object-cover rounded-t border-b border-gray-900">`;
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

window.redirecionarParaVitrine = function(tipo, valor) {
    if (tipo === 'produto') {
        let vistos = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
        vistos = vistos.filter(id => id !== valor);
        vistos.unshift(valor);
        if (vistos.length > 10) vistos.pop();
        localStorage.setItem('boutique_recent_views', JSON.stringify(vistos));
        window.location.href = `vitrine.botique.diniz.html?produtoId=${valor}`;
    } 
}

// --- RENDERIZAÇÃO DA VITRINE PRINCIPAL ---
function atualizarSEO() {
    document.title = `${produtoAtual.nome} | Boutique Diniz`;
    document.getElementById('seoTitle').setAttribute('content', `${produtoAtual.nome} - Boutique Diniz`);
    if (produtoAtual.descricao) {
        document.getElementById('seoDesc').setAttribute('content', produtoAtual.descricao.replace(/<[^>]*>?/gm, '').substring(0, 150));
    }
    if (produtoAtual.imagens && produtoAtual.imagens.length > 0) {
        document.getElementById('seoImage').setAttribute('content', resolverImagem(produtoAtual.imagens[0].base64 || produtoAtual.imagens[0].caminho));
    }
}

function renderizarTela() {
    document.getElementById('txtNome').innerText = produtoAtual.nome;
    document.getElementById('txtSku').innerText = `SKU: ${produtoAtual.sku || 'N/D'}`;
    document.getElementById('txtCategoria').innerText = produtoAtual.categoria ? produtoAtual.categoria.nome : 'Moda';
    document.getElementById('txtDescricao').innerHTML = produtoAtual.descricao || 'Nenhuma descrição detalhada disponível para este produto.';

    const filial = produtoAtual.filial_nome || 'Loja Principal'; 
    document.getElementById('txtUnidade').innerHTML = `📍 Disponível na unidade: <b class="text-white">${filial}</b>`;

    const precoFloat = parseFloat(produtoAtual.preco) || 0;
    const descFloat = parseFloat(produtoAtual.desconto_percent) || 0;
    document.getElementById('txtPrecoAtual').innerText = `R$ ${precoFloat.toFixed(2).replace('.', ',')}`;
    
    if (descFloat > 0) {
        const precoAntigo = precoFloat / (1 - (descFloat / 100));
        const txtAntigo = document.getElementById('txtPrecoAntigo');
        txtAntigo.innerText = `R$ ${precoAntigo.toFixed(2).replace('.', ',')}`;
        txtAntigo.classList.remove('hidden');

        const tagDesconto = document.getElementById('tagDesconto');
        tagDesconto.innerText = `-${descFloat}%`;
        tagDesconto.classList.remove('hidden');
    }

    renderizarImagens();
    renderizarFiltros();

    loadingState.classList.add('hidden');
    produtoContainer.classList.remove('hidden');
    produtoContainer.classList.add('flex');
}

function renderizarImagens() {
    const imagens = produtoAtual.imagens || [];
    if (imagens.length === 0) {
        fotoPrincipal.src = resolverImagem(null);
        return;
    }

    fotoPrincipal.src = resolverImagem(imagens[0].base64 || imagens[0].caminho);

    galeriaThumbs.innerHTML = imagens.map((img, index) => {
        const src = resolverImagem(img.base64 || img.caminho);
        const classeAtiva = index === 0 ? 'thumb-ativa' : 'opacity-60';
        return `
            <button onclick="window.mudarFotoPrincipal('${src}', this)" class="w-16 h-20 md:w-full md:h-24 flex-shrink-0 border-2 border-transparent hover:border-gray-500 rounded overflow-hidden transition-all ${classeAtiva} thumb-btn">
                <img src="${src}" class="w-full h-full object-cover bg-[#111]">
            </button>
        `;
    }).join('');
}

window.mudarFotoPrincipal = function(src, elemento) {
    fotoPrincipal.style.opacity = '0.5';
    setTimeout(() => {
        fotoPrincipal.src = src;
        fotoPrincipal.style.opacity = '1';
    }, 150);

    document.querySelectorAll('.thumb-btn').forEach(btn => {
        btn.classList.remove('thumb-ativa');
        btn.classList.add('opacity-60');
    });
    elemento.classList.add('thumb-ativa');
    elemento.classList.remove('opacity-60');
}

window.abrirLightbox = function() {
    document.getElementById('lightboxImg').src = fotoPrincipal.src;
    document.getElementById('modalLightbox').classList.remove('hidden');
    document.getElementById('modalLightbox').classList.add('flex');
}
window.fecharLightbox = function() {
    document.getElementById('modalLightbox').classList.add('hidden');
    document.getElementById('modalLightbox').classList.remove('flex');
    document.getElementById('lightboxImg').classList.remove('scale-[1.5]');
}

window.abrirGuiaMedidas = function() {
    document.getElementById('modalGuia').classList.remove('hidden');
    document.getElementById('modalGuia').classList.add('flex');
}
window.fecharGuiaMedidas = function() {
    document.getElementById('modalGuia').classList.add('hidden');
    document.getElementById('modalGuia').classList.remove('flex');
}

function renderizarFiltros() {
    if (variantesAtuais.length === 0) {
        gridTamanhos.innerHTML = `<span class="text-sm text-red-400">Produto esgotado na loja online.</span>`;
        btnComprar.innerText = "Esgotado";
        return;
    }

    const tamanhosUnicos = [...new Set(variantesAtuais.filter(v => v.estoque > 0).map(v => v.tamanho))];
    if (tamanhosUnicos.length === 0) {
        gridTamanhos.innerHTML = `<span class="text-sm text-red-400">Esgotado.</span>`;
        return;
    }

    gridTamanhos.innerHTML = tamanhosUnicos.map(tam => `
        <button onclick="window.selecionarTamanho('${tam}')" id="btn-tam-${tam}" class="btn-tamanho w-12 h-12 rounded border border-gray-700 flex items-center justify-center text-sm font-medium hover:border-white transition-colors bg-[#0a0a0a]">
            ${tam}
        </button>
    `).join('');
}

window.selecionarTamanho = function(tamanho) {
    tamanhoSelecionado = tamanho;
    varianteSelecionadaId = null; 

    document.querySelectorAll('.btn-tamanho').forEach(btn => {
        btn.classList.remove('variante-ativa');
        if(btn.id === `btn-tam-${tamanho}`) btn.classList.add('variante-ativa');
    });

    const coresDisponiveis = variantesAtuais.filter(v => v.tamanho === tamanho && v.estoque > 0);
    
    boxCores.classList.remove('hidden');
    gridCores.innerHTML = coresDisponiveis.map(v => `
        <button onclick="window.selecionarCor(${v.id}, '${v.cor}')" id="btn-cor-${v.id}" class="btn-cor px-4 py-2 rounded border border-gray-700 flex items-center justify-center text-sm font-medium hover:border-white transition-colors bg-[#0a0a0a]">
            ${v.cor}
        </button>
    `).join('');

    btnComprar.disabled = true;
    btnComprar.innerHTML = `<span class="material-symbols-outlined">palette</span> Selecione a Cor`;
}

window.selecionarCor = function(idVariante, nomeCor) {
    varianteSelecionadaId = idVariante;

    document.querySelectorAll('.btn-cor').forEach(btn => {
        btn.classList.remove('variante-ativa');
        if(btn.id === `btn-cor-${idVariante}`) btn.classList.add('variante-ativa');
    });

    btnComprar.disabled = false;
    btnComprar.innerHTML = `<span class="material-symbols-outlined">shopping_bag</span> Adicionar ao Carrinho`;
    
    if(window.MotorIA) window.MotorIA.registrarVisualizacao(produtoAtual, { tamanho: tamanhoSelecionado, cor: nomeCor });
}

function atualizarContadorCarrinhoUI() {
    setTimeout(() => {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.innerText = localStorage.getItem('boutique_cart_qty') || 0;
        }
    }, 500); 
}


// =========================================================================
// CORREÇÃO: ADICIONAR AO CARRINHO (BLINDADO CONTRA ERROS DE API E DE JSON)
// =========================================================================
btnComprar.addEventListener('click', async () => {
    if (!varianteSelecionadaId) return;

    // 1. Verifica se a pessoa está logada
    const sessaoCodificada = localStorage.getItem('boutique_diniz_session');
    if (!sessaoCodificada) {
        alert("Para comprar, por favor faça login na loja.");
        window.location.href = 'login.html'; 
        return;
    }

    let clienteId;
    try {
        const sessao = JSON.parse(atob(sessaoCodificada));
        clienteId = sessao.usuario.id;
    } catch(e) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Garante que os números enviados sejam Absolutos (Integers) e não Texto
    const payload = {
        cliente_id: parseInt(clienteId),
        produto_variante_id: parseInt(varianteSelecionadaId),
        quantidade: 1
    };

    btnComprar.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Processando...`;
    btnComprar.disabled = true;

    try {
        const baseHeaders = await getAuthHeaders();
        
        // 3. O SEGREDO ESTÁ AQUI: Força o servidor a entender que o envio é JSON!
        const cabecalhoProtegido = {
            ...baseHeaders,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const response = await fetch(`${API_CONFIG.baseUrl}/api/carrinho`, {
            method: 'POST',
            headers: cabecalhoProtegido,
            body: JSON.stringify(payload)
        });

        let data = {};
        try { data = await response.json(); } catch(e) {}

        // 4. Validação de Sucesso Absoluto
        if ((response.ok || response.status === 201) && data.success !== false) {
            
            toastMessage.classList.remove('translate-x-full');
            
            // Salva na memória do celular para a bolinha não sumir
            let qtdAtual = parseInt(localStorage.getItem('boutique_cart_qty') || 0);
            localStorage.setItem('boutique_cart_qty', qtdAtual + 1);
            atualizarContadorCarrinhoUI();

            setTimeout(() => {
                toastMessage.classList.add('translate-x-full');
                btnComprar.innerHTML = `<span class="material-symbols-outlined">shopping_bag</span> Adicionar ao Carrinho`;
                btnComprar.disabled = false;
            }, 3000);
            
        } else {
            // Se o servidor rejeitar, mostra o motivo REAL na tela (ex: "Sem estoque")
            const motivoErro = data.message || (data.error && data.error.message) || "Verifique se a sua conta está ativa.";
            alert(`Aviso do Carrinho:\n${motivoErro}`);
            
            btnComprar.innerHTML = `<span class="material-symbols-outlined">shopping_bag</span> Adicionar ao Carrinho`;
            btnComprar.disabled = false;
        }

    } catch (error) {
        console.error("Falha fatal no fetch do carrinho:", error);
        alert("O servidor da API falhou ou está indisponível no momento.");
        
        btnComprar.innerHTML = `<span class="material-symbols-outlined">shopping_bag</span> Adicionar ao Carrinho`;
        btnComprar.disabled = false;
    }
});

// --- COMPARTILHAR NO WHATSAPP ---
btnWhatsApp.addEventListener('click', () => {
    if (!produtoAtual) return;

    let urlParaCompartilhar = window.location.href;
    if (!urlParaCompartilhar.startsWith('http')) {
        urlParaCompartilhar = 'https://' + urlParaCompartilhar;
    }

    const preco = parseFloat(produtoAtual.preco).toFixed(2).replace('.', ',');
    const mensagem = `Olha que peça incrível na *Boutique Diniz*! 😍\n\n*${produtoAtual.nome}*\nPor apenas: R$ ${preco}\n\nConfira todos os detalhes e tamanhos aqui:\n👉 ${urlParaCompartilhar}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`, '_blank');
});
