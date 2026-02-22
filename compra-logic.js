import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

// --- CONFIGURAÇÃO DO GATEWAY ASAAS ---
const ASAAS_API_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_SECURITY_KEY = "1526105"; [span_6](start_span)// Chave de segurança exigida pelo Worker[span_6](end_span)

// --- ELEMENTOS DOM ---
const loadingState = document.getElementById('loadingState');
const checkoutForm = document.getElementById('checkoutForm');
const transactionState = document.getElementById('transactionState');
const listaItensCompra = document.getElementById('listaItensCompra');

const txtEnderecoDestino = document.getElementById('txtEnderecoDestino');
const valorFreteUI = document.getElementById('valorFreteUI');
const resumoSubtotal = document.getElementById('resumoSubtotal');
const resumoFrete = document.getElementById('resumoFrete');
const resumoTotal = document.getElementById('resumoTotal');
const qtdItens = document.getElementById('qtdItens');
const btnPagar = document.getElementById('btnPagar');

// --- ESTADO GLOBAL DA COMPRA ---
let cliente = null;
let enderecoAtivo = null;
let dadosCarrinho = null;
let valorFrete = 0;
let totalGeral = 0;
let pollingInterval = null;

// ==========================================
// 1. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const transacaoPendente = localStorage.getItem('boutique_pending_tx');
    if (transacaoPendente) {
        const txData = JSON.parse(transacaoPendente);
        cliente = JSON.parse(atob(localStorage.getItem('boutique_diniz_session'))).usuario;
        dadosCarrinho = JSON.parse(localStorage.getItem('boutique_dados_checkout'));
        recuperarTransacaoPendente(txData);
        return;
    }

    const sessaoStr = localStorage.getItem('boutique_diniz_session');
    const carrinhoStr = localStorage.getItem('boutique_dados_checkout');

    if (!sessaoStr || !carrinhoStr) {
        window.location.href = 'carrinho.html';
        return;
    }

    try {
        const sessao = JSON.parse(atob(sessaoStr));
        dadosCarrinho = JSON.parse(carrinhoStr);
        cliente = sessao.usuario;
        
        renderizarItensDoPedido();
        await buscarEnderecoEcalcularFrete();
    } catch (e) {
        window.location.href = 'carrinho.html';
    }
});

// ==========================================
// 2. RENDERIZAR OS ITENS (Visualização)
// ==========================================
function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/100/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image') || caminho.startsWith('http')) return caminho;
    if (caminho.length > 200) return `data:image/jpeg;base64,${caminho}`;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

function renderizarItensDoPedido() {
    if (!dadosCarrinho || !dadosCarrinho.itens) return;

    let htmlItens = '';
    dadosCarrinho.itens.forEach(item => {
        const qtd = item.quantidade || 1;
        const variante = item.produto_variante || item.variante || item || {};
        const produto = variante.produto || item.produto || item || {};
        
        const nome = produto.nome || item.produto_nome || "Peça Exclusiva";
        const tamanho = variante.tamanho || item.tamanho || "N/D";
        const cor = variante.cor || item.cor || "N/D";
        const preco = parseFloat(produto.preco || item.preco || 0);
        
        let imgFinal = (produto.imagens && produto.imagens.length > 0) 
            ? (produto.imagens[0].base64 || produto.imagens[0].caminho) 
            : item.imagem;

        htmlItens += `
            <div class="flex items-center gap-4 bg-[#0a0a0a] border border-gray-800 p-2 rounded">
                <div class="w-12 h-16 bg-[#111] rounded overflow-hidden flex-shrink-0">
                    <img src="${resolverImagem(imgFinal)}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-white truncate">${nome}</h4>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Tam: ${tamanho} | Cor: ${cor}</p>
                </div>
                <div class="text-right pr-2">
                    <p class="text-xs text-gray-400">${qtd}x</p>
                    <p class="text-sm font-bold text-green-400">R$ ${preco.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>
        `;
    });
    listaItensCompra.innerHTML = htmlItens;
}

// ==========================================
// 3. LÓGICA DE FRETE E ENDEREÇO
// ==========================================
async function buscarEnderecoEcalcularFrete() {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${cliente.id}/enderecos`, { headers });
        const dados = await res.json();
        
        let enderecos = [];
        if (Array.isArray(dados)) enderecos = dados;
        else if (dados.data) enderecos = Array.isArray(dados.data) ? dados.data : [dados.data];

        enderecoAtivo = enderecos.find(e => e.principal) || enderecos[0];

        if (enderecoAtivo) {
            txtEnderecoDestino.innerText = `${enderecoAtivo.rua}, ${enderecoAtivo.numero} - ${enderecoAtivo.cidade}/${enderecoAtivo.estado}`;
        }

        window.calcularFrete(); 

        loadingState.classList.add('hidden');
        checkoutForm.classList.remove('hidden');
        checkoutForm.classList.add('flex');

    } catch (error) {
        alert("Falha ao comunicar com a base de endereços.");
    }
}

window.calcularFrete = function() {
    const tipo = document.querySelector('input[name="tipo_entrega"]:checked').value;
    
    if (tipo === 'retirada') {
        valorFrete = 0;
        valorFreteUI.innerText = "Grátis";
    } else {
        if (enderecoAtivo.cidade.toLowerCase().includes('cachoeiro de itapemirim')) {
            valorFrete = 35.00;
        } else {
            const fretesBase = { 'ES': 25, 'RJ': 30, 'SP': 35, 'MG': 40 };
            valorFrete = fretesBase[enderecoAtivo.estado] || 65.00;
        }
        valorFreteUI.innerText = `R$ ${valorFrete.toFixed(2).replace('.', ',')} (Sedex)`;
    }
    atualizarResumoValores();
}

function atualizarResumoValores() {
    qtdItens.innerText = dadosCarrinho.itens.reduce((acc, item) => acc + (item.quantidade || 1), 0);
    resumoSubtotal.innerText = `R$ ${dadosCarrinho.subtotal.toFixed(2).replace('.', ',')}`;
    resumoFrete.innerText = valorFrete === 0 ? 'Grátis' : `R$ ${valorFrete.toFixed(2).replace('.', ',')}`;
    
    totalGeral = dadosCarrinho.subtotal + valorFrete;
    resumoTotal.innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

window.alternarFormularioPagamento = function() {
    const metodo = document.querySelector('input[name="metodo_pagamento"]:checked').value;
    
    document.getElementById('formCartao').classList.add('hidden');
    document.getElementById('formGiftCard').classList.add('hidden');

    if (metodo === 'credit') {
        document.getElementById('formCartao').classList.remove('hidden');
        document.getElementById('formCartao').classList.add('flex');
    } else if (metodo === 'giftcard') {
        document.getElementById('formGiftCard').classList.remove('hidden');
        document.getElementById('formGiftCard').classList.add('flex');
    }
}

// ==========================================
// 4. MOTOR DO GATEWAY ASAAS & INTERNAL API
// ==========================================
btnPagar.addEventListener('click', async () => {
    const metodo = document.querySelector('input[name="metodo_pagamento"]:checked').value;
    
    btnPagar.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Processando Pagamento...`;
    btnPagar.disabled = true;

    try {
        let resultadoPagamento = null;

        [span_7](start_span)[span_8](start_span)// Construção do Payload Base com Nomenclatura EXATA do Asaas (name, amount, cpf, email)[span_7](end_span)[span_8](end_span)
        const payloadBaseAsaas = {
            amount: parseFloat(totalGeral.toFixed(2)),
            name: cliente.nome_completo || cliente.nome || "Cliente Boutique Diniz",
            cpf: cliente.cpf,
            email: cliente.email || 'cliente@boutiquediniz.com',
            description: `Boutique Diniz - Pedido de ${cliente.nome_completo || cliente.nome}`
        };

        if (metodo === 'pix') resultadoPagamento = await processarAsaasPix(payloadBaseAsaas);
        else if (metodo === 'boleto') resultadoPagamento = await processarAsaasBoleto(payloadBaseAsaas);
        else if (metodo === 'credit') resultadoPagamento = await processarAsaasCartaoCredito(payloadBaseAsaas);
        else if (metodo === 'giftcard') resultadoPagamento = await processarGiftCardInterno();

        if (!resultadoPagamento.success) {
            throw new Error(resultadoPagamento.error || "Transação não autorizada pela operadora.");
        }

        // --- PÓS-PAGAMENTO ---
        if (metodo === 'pix' || metodo === 'boleto') {
            await finalizarPedidoNoBackEnd('aguardando', resultadoPagamento.paymentId);
            salvarTransacaoPendente({ metodo, payload: resultadoPagamento });
            recuperarTransacaoPendente({ metodo, payload: resultadoPagamento });
        } else {
            await finalizarPedidoNoBackEnd('aprovado', resultadoPagamento.paymentId || 'TX-GIFT');
            mostrarTelaSucesso();
        }

    } catch (error) {
        alert(`Pagamento Recusado:\n${error.message}`);
        btnPagar.innerHTML = `<span class="material-symbols-outlined">lock</span> Finalizar Pagamento`;
        btnPagar.disabled = false;
    }
});

// --- COMUNICAÇÕES COM WORKER DO ASAAS (Com a chave de segurança obrigatória) ---

function getAsaasHeaders() {
    return {
        'Content-Type': 'application/json',
        [span_9](start_span)'X-Security-Key': ASAAS_SECURITY_KEY // Header oficial documentado pelo gateway[span_9](end_span)
    };
}

async function processarAsaasPix(payloadBase) {
    const res = await fetch(`${ASAAS_API_BASE}/pay/pix`, {
        method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payloadBase)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Erro Asaas HTTP 500");
    return data;
}

async function processarAsaasBoleto(payloadBase) {
    const res = await fetch(`${ASAAS_API_BASE}/pay/boleto`, {
        method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payloadBase)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Erro ao gerar boleto.");
    return data;
}

async function processarAsaasCartaoCredito(payloadBase) {
    const numero = document.getElementById('ccNumero').value.replace(/\D/g, ''); // Limpa espaços do número
    const nome = document.getElementById('ccNome').value;
    const validade = document.getElementById('ccValidade').value;
    const cvv = document.getElementById('ccCvv').value;
    const parcelas = document.getElementById('ccParcelas').value;

    if(!numero || !nome || !validade || !cvv) throw new Error("Preencha todos os dados do cartão.");

    // Tratamento Inteligente da Validade (MM/AA para MM e AAAA)
    const partesValidade = validade.split('/');
    if(partesValidade.length !== 2) throw new Error("Validade inválida. Use MM/AA");
    const expiryMonth = partesValidade[0];
    const expiryYear = partesValidade[1].length === 2 ? `20${partesValidade[1]}` : partesValidade[1];

    [span_10](start_span)// Payload Específico de Cartão do Asaas[span_10](end_span)
    const payloadCartao = {
        ...payloadBase,
        postalCode: enderecoAtivo.cep.replace(/\D/g, ''),
        addressNumber: enderecoAtivo.numero,
        installments: parseInt(parcelas),
        card: {
            holderName: nome.toUpperCase(),
            number: numero,
            expiryMonth: expiryMonth,
            expiryYear: expiryYear,
            ccv: cvv
        }
    };
    
    const res = await fetch(`${ASAAS_API_BASE}/pay/credit-card`, {
        method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payloadCartao)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Cartão Recusado.");
    return data;
}

async function processarGiftCardInterno() {
    const numero = document.getElementById('giftNumero').value;
    const cvv = document.getElementById('giftCvv').value;
    if(!numero || !cvv) throw new Error("Preencha os dados do Cartão Presente.");

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/resgatar`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: numero, codigo_seguranca: cvv, valor: totalGeral })
    });

    const data = await res.json();
    if(res.ok && data.success) return { success: true, paymentId: `GIFT-${data.data.id}` };
    else throw new Error(data.message || "Saldo insuficiente ou cartão inválido.");
}

// ==========================================
// 5. RESILIÊNCIA E COFRE LOCAL (PIX/BOLETO)
// ==========================================
function salvarTransacaoPendente(dados) {
    localStorage.setItem('boutique_pending_tx', JSON.stringify(dados));
}

function recuperarTransacaoPendente(tx) {
    checkoutForm.classList.add('hidden');
    transactionState.classList.remove('hidden');
    transactionState.classList.add('flex');
    loadingState.classList.add('hidden');

    if (tx.metodo === 'pix') {
        document.getElementById('boxPix').classList.remove('hidden');
        document.getElementById('boxPix').classList.add('flex');
        
        document.getElementById('qrCodePix').src = tx.payload.pix.qrCodeImage;
        document.getElementById('copiaColaPix').value = tx.payload.pix.copyPaste;

        iniciarMonitoramentoPix(tx.payload.paymentId);

    } else if (tx.metodo === 'boleto') {
        document.getElementById('boxBoleto').classList.remove('hidden');
        document.getElementById('boxBoleto').classList.add('flex');
        document.getElementById('linkBoleto').href = tx.payload.boletoUrl;
    }
}

window.copiarPix = function() {
    const copyText = document.getElementById("copiaColaPix");
    copyText.select();
    document.execCommand("copy");
    alert("Código PIX copiado! Cole na aplicação do seu banco.");
}

function iniciarMonitoramentoPix(paymentId) {
    if (pollingInterval) clearInterval(pollingInterval);
    
    [span_11](start_span)// Rota de status precisa de autenticação via X-Security-Key[span_11](end_span)
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${ASAAS_API_BASE}/payment/status/${paymentId}`, { headers: getAsaasHeaders() });
            const data = await res.json();
            
            if (data.success && data.paid === true) {
                clearInterval(pollingInterval);
                await atualizarStatusPedidoInterno('aprovado');
                mostrarTelaSucesso();
            }
        } catch (e) {}
    }, 5000); 
}

window.concluirPedidoBoleto = function() {
    mostrarTelaSucesso();
}

// ==========================================
// 6. GERAÇÃO DO PEDIDO E LIMPEZA
// ==========================================
async function finalizarPedidoNoBackEnd(statusPagamento, idExternoGateway) {
    try {
        const headers = await getAuthHeaders();
        const headersJson = { ...headers, 'Content-Type': 'application/json' };
        
        const payloadPedido = {
            cliente_id: cliente.id,
            endereco_id: enderecoAtivo.id,
            tipo_entrega: document.querySelector('input[name="tipo_entrega"]:checked')?.value || 'correios',
            valor_frete: valorFrete,
            status_pedido: 'novo', 
            status_pagamento: statusPagamento, 
            pagamento_id_externo: idExternoGateway,
            itens: dadosCarrinho.itens.map(i => ({
                produto_variante_id: i.produto_variante_id || (i.variante ? i.variante.id : i.id),
                quantidade: i.quantidade,
                preco_unitario: i.preco_final || i.produto.preco || i.preco
            }))
        };

        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos`, {
            method: 'POST',
            headers: headersJson,
            body: JSON.stringify(payloadPedido)
        });

        if(res.ok) {
            const dataPedido = await res.json();
            if (dataPedido.data && dataPedido.data.id) {
                localStorage.setItem('boutique_last_order_id', dataPedido.data.id);
            }

            await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${cliente.id}/limpar`, { 
                method: 'POST', 
                headers: headersJson 
            });
            
            localStorage.setItem('boutique_cart_qty', '0'); 
        }
    } catch (e) {
        console.error("Falha ao salvar pedido no servidor:", e);
    }
}

async function atualizarStatusPedidoInterno(novoStatus) {
    try {
        const pedidoId = localStorage.getItem('boutique_last_order_id');
        if(!pedidoId) return;

        const headers = await getAuthHeaders();
        await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoId}/status-pagamento`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pagamento: novoStatus })
        });
    } catch (e) {}
}

function mostrarTelaSucesso() {
    localStorage.removeItem('boutique_pending_tx');
    localStorage.removeItem('boutique_dados_checkout');
    
    document.getElementById('boxPix').classList.add('hidden');
    document.getElementById('boxBoleto').classList.add('hidden');
    checkoutForm.classList.add('hidden');

    transactionState.classList.remove('hidden');
    transactionState.classList.add('flex');
    
    document.getElementById('boxSucesso').classList.remove('hidden');
    document.getElementById('boxSucesso').classList.add('flex');
    
    const idSorte = localStorage.getItem('boutique_last_order_id') || Math.floor(Math.random() * 90000 + 10000);
    document.getElementById('numeroPedidoSucesso').innerText = "#" + idSorte;
}
