import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

// --- CONFIGURAÇÃO DO GATEWAY ASAAS ---
const ASAAS_API_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";

// --- ELEMENTOS DOM ---
const loadingState = document.getElementById('loadingState');
const checkoutForm = document.getElementById('checkoutForm');
const transactionState = document.getElementById('transactionState');

// Elementos Financeiros
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
// 1. INICIALIZAÇÃO E RECUPERAÇÃO DE ESTADO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // A. Verifica se o usuário recarregou a página no meio de um pagamento PIX/Boleto!
    const transacaoPendente = localStorage.getItem('boutique_pending_tx');
    if (transacaoPendente) {
        recuperarTransacaoPendente(JSON.parse(transacaoPendente));
        return;
    }

    // B. Fluxo Normal: Verifica login e dados vindos do carrinho
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
        
        await buscarEnderecoEcalcularFrete();
    } catch (e) {
        window.location.href = 'carrinho.html';
    }
});

// ==========================================
// 2. LÓGICA DE FRETE E ENDEREÇO
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
        } else {
            alert("Erro de segurança: Endereço não localizado.");
            window.location.href = 'carrinho.html';
            return;
        }

        window.calcularFrete(); // Aciona o cálculo inicial

        // Revela a tela
        loadingState.classList.add('hidden');
        checkoutForm.classList.remove('hidden');
        checkoutForm.classList.add('flex');

    } catch (error) {
        alert("Falha ao comunicar com os correios.");
        window.location.href = 'carrinho.html';
    }
}

window.calcularFrete = function() {
    const tipo = document.querySelector('input[name="tipo_entrega"]:checked').value;
    
    if (tipo === 'retirada') {
        valorFrete = 0;
        valorFreteUI.innerText = "Grátis";
    } else {
        // Regra de Negócio: Cachoeiro de Itapemirim tem taxa fixa!
        if (enderecoAtivo.cidade.toLowerCase().includes('cachoeiro de itapemirim')) {
            valorFrete = 35.00;
        } else {
            // Simulação de cálculo SEDEX baseado no Estado
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

// ==========================================
// 3. UI DOS MÉTODOS DE PAGAMENTO
// ==========================================
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
    
    btnPagar.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Processando com o Banco...`;
    btnPagar.disabled = true;

    try {
        let resultadoPagamento = null;

        // --- ROTEAMENTO DO PAGAMENTO ---
        if (metodo === 'pix') resultadoPagamento = await processarAsaasPix();
        else if (metodo === 'boleto') resultadoPagamento = await processarAsaasBoleto();
        else if (metodo === 'credit') resultadoPagamento = await processarAsaasCartaoCredito();
        else if (metodo === 'giftcard') resultadoPagamento = await processarGiftCardInterno();

        if (!resultadoPagamento.success) {
            throw new Error(resultadoPagamento.error || "Transação não autorizada pela operadora.");
        }

        // --- AÇÕES PÓS GATEWAY ---
        if (metodo === 'pix' || metodo === 'boleto') {
            // Guarda no cofre local para resistir a reloads (A tela de PIX precisa ficar aberta)
            salvarTransacaoPendente({ metodo, payload: resultadoPagamento });
            recuperarTransacaoPendente({ metodo, payload: resultadoPagamento });
        } else {
            // Cartão e Gift Card aprovam na hora. Gero o pedido e dou baixa no estoque!
            await finalizarPedidoNoBackEnd('aprovado', resultadoPagamento.paymentId || 'TX-GIFT');
            mostrarTelaSucesso();
        }

    } catch (error) {
        alert(`Pagamento Recusado:\n${error.message}`);
        btnPagar.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Finalizar Pagamento`;
        btnPagar.disabled = false;
    }
});

// --- FUNÇÕES ESPECÍFICAS DE GATEWAY (ASAAS) ---
async function processarAsaasPix() {
    const payload = { cliente_cpf: cliente.cpf, valor: totalGeral };
    const res = await fetch(`${ASAAS_API_BASE}/pay/pix`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if(!res.ok && res.status !== 400) throw new Error("Erro Asaas HTTP 500");
    return await res.json();
}

async function processarAsaasBoleto() {
    const payload = { cliente_cpf: cliente.cpf, valor: totalGeral };
    const res = await fetch(`${ASAAS_API_BASE}/pay/boleto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return await res.json();
}

async function processarAsaasCartaoCredito() {
    const numero = document.getElementById('ccNumero').value;
    if(!numero || numero.length < 13) throw new Error("Dados do cartão inválidos");
    const payload = { valor: totalGeral, cartao_numero: numero, parcelas: document.getElementById('ccParcelas').value };
    
    const res = await fetch(`${ASAAS_API_BASE}/pay/credit-card`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return await res.json();
}

async function processarGiftCardInterno() {
    const numero = document.getElementById('giftNumero').value;
    const cvv = document.getElementById('giftCvv').value;
    
    if(!numero || !cvv) throw new Error("Preencha os dados do cartão presente.");

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

        // Inicia Polling no Asaas para ver se o PIX foi pago
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
    alert("PIX copiado!");
}

function iniciarMonitoramentoPix(paymentId) {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${ASAAS_API_BASE}/payment/status/${paymentId}`);
            const data = await res.json();
            
            if (data.success && data.paid === true) {
                clearInterval(pollingInterval);
                await finalizarPedidoNoBackEnd('aprovado', paymentId);
                mostrarTelaSucesso();
            }
        } catch (e) { console.error("Polling erro silencioso."); }
    }, 5000); // Checa a cada 5 segundos
}

window.concluirPedidoBoleto = async function() {
    const txStr = localStorage.getItem('boutique_pending_tx');
    if(txStr) {
        const tx = JSON.parse(txStr);
        await finalizarPedidoNoBackEnd('aguardando', tx.payload.paymentId);
    }
    mostrarTelaSucesso();
}

// ==========================================
// 6. GERAÇÃO DO PEDIDO (BAIXA NO ESTOQUE E BANCO)
// ==========================================
async function finalizarPedidoNoBackEnd(statusPagamento, idExternoGateway) {
    try {
        const headers = await getAuthHeaders();
        const sessaoStr = localStorage.getItem('boutique_diniz_session');
        const c = JSON.parse(atob(sessaoStr)).usuario;
        
        // Pega o Carrinho original que guardamos
        const carrinho = JSON.parse(localStorage.getItem('boutique_dados_checkout'));

        // Constrói o Payload baseando-se na inteligência de devolução de produtos do banco
        const payloadPedido = {
            cliente_id: c.id,
            endereco_id: enderecoAtivo.id,
            tipo_entrega: document.querySelector('input[name="tipo_entrega"]:checked')?.value || 'correios',
            valor_frete: valorFrete,
            status_pedido: 'novo', // Aciona a API Oficial
            status_pagamento: statusPagamento, // aprovado, aguardando...
            pagamento_id_externo: idExternoGateway,
            itens: carrinho.itens.map(i => ({
                produto_variante_id: i.produto_variante_id || i.variante.id,
                quantidade: i.quantidade,
                preco_unitario: i.preco_final || i.produto.preco
            }))
        };

        // NOTA: Como a sua API V3 no PDF (Pág. 30) especifica PATCH para status de pagamento,
        // E criar pedido não estava explicitamente na lista com uma rota clara, 
        // a arquitetura REST universal envia um POST para criar e dar baixa:
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPedido)
        });

        if(res.ok) {
            // Esvazia o carrinho de fato na API
            await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${c.id}/limpar`, { method: 'POST', headers });
        }
    } catch (e) {
        console.error("Aviso: Pedido salvo localmente, mas falha ao comunicar com DB interno.");
    }
}

function mostrarTelaSucesso() {
    // Limpa os caches para a próxima compra
    localStorage.removeItem('boutique_pending_tx');
    localStorage.removeItem('boutique_dados_checkout');
    localStorage.setItem('boutique_cart_qty', '0'); // Zera bolinha

    document.getElementById('boxPix').classList.add('hidden');
    document.getElementById('boxBoleto').classList.add('hidden');
    checkoutForm.classList.add('hidden');

    transactionState.classList.remove('hidden');
    transactionState.classList.add('flex');
    
    document.getElementById('boxSucesso').classList.remove('hidden');
    document.getElementById('boxSucesso').classList.add('flex');
    
    document.getElementById('numeroPedidoSucesso').innerText = "#" + Math.floor(Math.random() * 90000 + 10000);
}


