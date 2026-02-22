import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const cartGrid = document.getElementById('cartGrid');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const btnLimparCarrinho = document.getElementById('btnLimparCarrinho');
const txtSubtotal = document.getElementById('txtSubtotal');
const txtTotal = document.getElementById('txtTotal');
const btnFinalizarCompra = document.getElementById('btnFinalizarCompra');
const modalEndereco = document.getElementById('modalEndereco');
const formEndereco = document.getElementById('formEndereco');

let clienteId = null;
let itensCarrinho = [];
let clienteTemEndereco = false;
let subtotalGlobal = 0; 

document.addEventListener('DOMContentLoaded', () => {
    iniciarCarrinho();
});

function iniciarCarrinho() {
    const sessaoCodificada = localStorage.getItem('boutique_diniz_session');
    if (!sessaoCodificada) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessao = JSON.parse(atob(sessaoCodificada));
        clienteId = parseInt(sessao.usuario.id);
        carregarDadosSimultaneos();
    } catch (e) {
        window.location.href = 'login.html';
    }
}

function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/150/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image')) return caminho;
    if (caminho.length > 200 && /^[a-zA-Z0-9+/]+={0,2}$/.test(caminho)) return `data:image/jpeg;base64,${caminho}`;
    if (caminho.startsWith('http')) return caminho;
    if (caminho.startsWith('/')) return `${API_CONFIG.baseUrl}${caminho}`;
    return `${API_CONFIG.baseUrl}/${caminho}`;
}

// --- COMUNICAÇÃO COM AS APIs ---
async function carregarDadosSimultaneos() {
    try {
        const headers = await getAuthHeaders();
        
        let resCarrinho = await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${clienteId}`, { headers }).catch(() => null);
        if (!resCarrinho || resCarrinho.status === 404) {
            resCarrinho = await fetch(`${API_CONFIG.baseUrl}/api/carrinho`, { headers }).catch(() => null);
        }

        const promiseEndereco = fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, { headers });
        const resEndereco = await promiseEndereco.catch(() => null);

        if (resCarrinho && resCarrinho.ok) {
            const dataCarrinho = await resCarrinho.json();
            if (Array.isArray(dataCarrinho)) itensCarrinho = dataCarrinho;
            else if (dataCarrinho.data && Array.isArray(dataCarrinho.data)) itensCarrinho = dataCarrinho.data;
            else if (dataCarrinho.data && Array.isArray(dataCarrinho.data.itens)) itensCarrinho = dataCarrinho.data.itens;
            else if (dataCarrinho.itens && Array.isArray(dataCarrinho.itens)) itensCarrinho = dataCarrinho.itens;
            else itensCarrinho = []; 
        }

        if (resEndereco && resEndereco.ok) {
            const dataEnd = await resEndereco.json();
            let enderecos = [];
            if (Array.isArray(dataEnd)) enderecos = dataEnd;
            else if (dataEnd.data && Array.isArray(dataEnd.data)) enderecos = dataEnd.data;
            
            clienteTemEndereco = enderecos.length > 0;
        }

        renderizarCarrinho();

    } catch (error) {
        console.error("Erro na comunicação:", error);
        if(loadingState) loadingState.classList.add('hidden');
    }
}

// --- RENDERIZAÇÃO DO CARRINHO ---
function renderizarCarrinho() {
    if(loadingState) loadingState.classList.add('hidden');

    if (itensCarrinho.length === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        if(cartGrid) cartGrid.classList.add('hidden');
        if(btnLimparCarrinho) btnLimparCarrinho.classList.add('hidden');
        
        localStorage.setItem('boutique_cart_qty', '0');
        atualizarBolinhaCabecalho();
        return;
    }

    if(emptyState) emptyState.classList.add('hidden');
    if(cartGrid) {
        cartGrid.classList.remove('hidden');
        cartGrid.classList.add('grid');
    }
    if(btnLimparCarrinho) {
        btnLimparCarrinho.classList.remove('hidden');
        btnLimparCarrinho.classList.add('flex');
    }

    subtotalGlobal = 0; 
    let htmlItens = '';
    let totalItens = 0;

    itensCarrinho.forEach(item => {
        const idItemCarrinho = item.id || item.carrinho_id;
        const qtd = parseInt(item.quantidade) || 1;
        totalItens += qtd;
        
        const variante = item.produto_variante || item.variante || item || {};
        const produto = variante.produto || item.produto || item || {};
        
        const nome = produto.nome || item.produto_nome || item.nome || "Peça Exclusiva";
        const tamanho = variante.tamanho || item.variante_tamanho || item.tamanho || "N/D";
        const cor = variante.cor || item.variante_cor || item.cor || "N/D";
        
        const precoOriginal = parseFloat(produto.preco || item.preco || 0);
        const desconto = parseFloat(produto.desconto_percent || item.desconto_percent || 0);
        const precoFinal = desconto > 0 ? precoOriginal * (1 - (desconto/100)) : precoOriginal;
        
        subtotalGlobal += (precoFinal * qtd);

        let imgFinal = null;
        if (produto.imagens && produto.imagens.length > 0) {
            imgFinal = produto.imagens[0].base64 || produto.imagens[0].caminho;
        } else if (item.imagem) {
            imgFinal = item.imagem;
        }

        htmlItens += `
            <div class="flex flex-col sm:flex-row gap-4 bg-[#050505] border border-gray-900 rounded-lg p-4 relative transition-colors hover:border-gray-700">
                <div class="w-24 h-32 bg-[#111] rounded overflow-hidden flex-shrink-0 cursor-pointer" onclick="window.location.href='vitrine.botique.diniz.html?produtoId=${produto.id || ''}'">
                    <img src="${resolverImagem(imgFinal)}" alt="${nome}" class="w-full h-full object-cover">
                </div>
                
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start pr-8">
                            <h3 class="font-medium text-white text-sm md:text-base">${nome}</h3>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Tamanho: <span class="text-white">${tamanho}</span> | Cor: <span class="text-white">${cor}</span></p>
                    </div>
                    
                    <div class="flex justify-between items-end mt-4">
                        <div class="flex items-center bg-[#111] border border-gray-800 rounded">
                            <button onclick="window.alterarQuantidade(${idItemCarrinho}, ${qtd - 1})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">-</button>
                            <span class="w-8 text-center text-sm font-medium text-white">${qtd}</span>
                            <button onclick="window.alterarQuantidade(${idItemCarrinho}, ${qtd + 1})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">+</button>
                        </div>
                        <div class="text-right">
                            ${desconto > 0 ? `<div class="text-[10px] text-gray-600 line-through">R$ ${precoOriginal.toFixed(2).replace('.', ',')}</div>` : ''}
                            <div class="font-bold text-green-400">R$ ${precoFinal.toFixed(2).replace('.', ',')}</div>
                        </div>
                    </div>
                </div>

                <button onclick="window.removerItem(${idItemCarrinho})" class="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors" title="Remover item">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>
        `;
    });

    if(cartItemsContainer) cartItemsContainer.innerHTML = htmlItens;
    
    const valorFormatado = `R$ ${subtotalGlobal.toFixed(2).replace('.', ',')}`;
    if(txtSubtotal) txtSubtotal.innerText = valorFormatado;
    if(txtTotal) txtTotal.innerText = valorFormatado; 

    localStorage.setItem('boutique_cart_qty', totalItens);
    atualizarBolinhaCabecalho();
}

function atualizarBolinhaCabecalho() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.innerText = localStorage.getItem('boutique_cart_qty') || 0;
    }
}

// --- FUNÇÕES DE INTERAÇÃO (PUT E DELETE) ---
window.alterarQuantidade = async function(itemId, novaQuantidade) {
    if (novaQuantidade < 1) {
        window.removerItem(itemId);
        return;
    }
    
    try {
        const baseHeaders = await getAuthHeaders();
        const headersJson = { ...baseHeaders, 'Content-Type': 'application/json', 'Accept': 'application/json' };

        const res = await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${itemId}`, {
            method: 'PUT',
            headers: headersJson,
            body: JSON.stringify({ quantidade: parseInt(novaQuantidade) })
        });

        let data = {};
        try { data = await res.json(); } catch(e){}
        
        if (res.ok || res.status === 200) {
            carregarDadosSimultaneos(); 
        } else {
            const erro = data.message || "Estoque insuficiente.";
            alert(`Aviso: ${erro}`);
        }
    } catch (e) {
        alert("Erro ao atualizar quantidade. Verifique a sua conexão.");
    }
}

window.removerItem = async function(itemId) {
    if(!confirm("Deseja remover este look do carrinho?")) return;

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${itemId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (res.ok || res.status === 200) {
            carregarDadosSimultaneos();
        } else {
            alert("Não foi possível remover o item.");
        }
    } catch (e) {
        alert("Falha de rede ao tentar remover.");
    }
}

if(btnLimparCarrinho) {
    btnLimparCarrinho.addEventListener('click', async () => {
        if(!confirm("Tem certeza que deseja esvaziar todo o carrinho?")) return;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${clienteId}/limpar`, {
                method: 'POST',
                headers: headers
            });

            if (res.ok || res.status === 200) {
                itensCarrinho = [];
                renderizarCarrinho();
            }
        } catch (e) {}
    });
}

// --- TRANSFERÊNCIA E SALVAMENTO DE MORADA ---
function prepararDadosParaCompra() {
    const dadosCheckout = {
        itens: itensCarrinho,
        subtotal: subtotalGlobal,
        cliente_id: clienteId
    };
    localStorage.setItem('boutique_dados_checkout', JSON.stringify(dadosCheckout));
}

if(btnFinalizarCompra) {
    btnFinalizarCompra.addEventListener('click', () => {
        prepararDadosParaCompra(); 

        if (!clienteTemEndereco) {
            modalEndereco.classList.remove('hidden');
            modalEndereco.classList.add('flex');
        } else {
            window.location.href = 'botique.diniz.compra.html'; 
        }
    });
}

window.fecharModalEndereco = function() {
    modalEndereco.classList.add('hidden');
    modalEndereco.classList.remove('flex');
}

// ==========================================
// INTEGRAÇÃO VIACEP (PREENCHIMENTO AUTOMÁTICO)
// ==========================================
const inputCep = document.getElementById('cep');
if (inputCep) {
    // Formata o CEP ao digitar (00000-000)
    inputCep.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
        e.target.value = valor;
    });

    // Procura os dados quando tira o foco do campo
    inputCep.addEventListener('blur', async (e) => {
        const cepLimpo = e.target.value.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            
            // Efeito visual de carregamento
            document.getElementById('rua').value = "A procurar...";
            document.getElementById('bairro').value = "A procurar...";
            document.getElementById('cidade').value = "A procurar...";
            document.getElementById('estado').value = "..";

            try {
                const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                const dados = await res.json();

                if (!dados.erro) {
                    document.getElementById('rua').value = dados.logradouro || '';
                    document.getElementById('bairro').value = dados.bairro || '';
                    document.getElementById('cidade').value = dados.localidade || '';
                    document.getElementById('estado').value = dados.uf || '';
                    
                    // Move o foco automaticamente para a cliente colocar apenas o número
                    document.getElementById('numero').focus();
                } else {
                    alert("Código Postal (CEP) não encontrado.");
                    limparCamposEndereco();
                }
            } catch (err) {
                alert("Falha de rede ao procurar o CEP.");
                limparCamposEndereco();
            }
        }
    });
}

function limparCamposEndereco() {
    document.getElementById('rua').value = "";
    document.getElementById('bairro').value = "";
    document.getElementById('cidade').value = "";
    document.getElementById('estado').value = "";
}

// Envio do formulário com a morada preenchida
if(formEndereco) {
    formEndereco.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            cep: document.getElementById('cep').value,
            tipo: document.getElementById('tipoEndereco').value,
            rua: document.getElementById('rua').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complemento').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value.toUpperCase(),
            principal: true
        };

        const btnSalvar = document.getElementById('btnSalvarEndereco');
        btnSalvar.innerText = "A guardar...";
        btnSalvar.disabled = true;

        try {
            const baseHeaders = await getAuthHeaders();
            
            const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, {
                method: 'POST',
                headers: { ...baseHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok || res.status === 201) {
                clienteTemEndereco = true;
                window.fecharModalEndereco();
                prepararDadosParaCompra(); 
                alert("Morada guardada com sucesso! A redirecionar para o pagamento...");
                window.location.href = 'botique.diniz.compra.html';
            } else {
                const data = await res.json();
                alert(data.message || "Erro ao guardar morada.");
                btnSalvar.innerText = "Guardar Endereço";
                btnSalvar.disabled = false;
            }
        } catch (error) {
            alert("Falha de rede ao tentar guardar a morada.");
            btnSalvar.innerText = "Guardar Endereço";
            btnSalvar.disabled = false;
        }
    });
}
