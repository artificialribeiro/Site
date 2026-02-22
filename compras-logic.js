import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const ASAAS_API_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_SECURITY_KEY = "1526105";

const loadingState = document.getElementById('loadingState');
const ordersContainer = document.getElementById('ordersContainer');
const emptyState = document.getElementById('emptyState');

let clienteLogado = null;
let pedidoEmPagamento = null;
let formaSelecionada = null;
let pollingPix = null;

// ==========================================
// 1. INICIALIZAÇÃO E BUSCA INTELIGENTE
// ==========================================
carregarHistorico(); 

async function carregarHistorico() {
    const sessaoStr = localStorage.getItem('boutique_diniz_session');
    if (!sessaoStr) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessao = JSON.parse(atob(sessaoStr));
        
        // EXTRATOR UNIVERSAL DE ID (Não importa como a API salvou o login, ele acha o ID)
        clienteLogado = sessao.usuario || sessao.cliente || sessao;
        const clienteId = clienteLogado.id || clienteLogado.cliente_id || sessao.id;

        if (!clienteId) throw new Error("ID do cliente não encontrado na sessão.");
        
        const headers = await getAuthHeaders();
        
        // Chamada Exata conforme Documentação da API V3
        const url = `${API_CONFIG.baseUrl}/api/pedidos?cliente_id=${clienteId}`;
        const res = await fetch(url, { headers });
        
        if (!res.ok) throw new Error("A API rejeitou a conexão.");
        
        const data = await res.json();
        
        // Extrator Universal de Array de Pedidos
        let pedidos = [];
        if (Array.isArray(data)) pedidos = data;
        else if (data && Array.isArray(data.data)) pedidos = data.data;
        else if (data && data.data && Array.isArray(data.data.pedidos)) pedidos = data.data.pedidos;

        if (pedidos.length === 0) {
            if(loadingState) loadingState.classList.add('hidden');
            if(emptyState) {
                const pInfo = emptyState.querySelector('p');
                if(pInfo) pInfo.innerText = `Nenhum pedido localizado para o cliente #${clienteId}.`;
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
            }
            return;
        }

        renderizarPedidos(pedidos.reverse()); 

    } catch (error) {
        console.error(error);
        if(loadingState) {
            loadingState.innerHTML = `
                <span class="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
                <h3 class="text-xl font-bold text-white text-center">Falha de comunicação</h3>
                <p class="text-sm text-gray-400 text-center max-w-sm mt-2">${error.message}</p>
                <button onclick="window.location.reload()" class="mt-6 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-gray-200 transition-colors">Tentar Novamente</button>
            `;
        }
    }
}

// ==========================================
// 2. RENDERIZAR LISTA DE COMPRAS
// ==========================================
function renderizarPedidos(pedidos) {
    let html = '';

    pedidos.forEach(p => {
        const dataCriacao = p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recente';
        const total = parseFloat(p.total || 0).toFixed(2).replace('.', ',');
        
        let statusCor = 'bg-gray-800 text-gray-300 border-gray-700';
        let statusTexto = 'Processando';
        
        if (p.status_pagamento === 'pago' || p.status_pagamento === 'approved') {
            statusCor = 'bg-green-900/30 text-green-400 border-green-800';
            statusTexto = 'Pagamento Aprovado';
            if(p.status_pedido === 'em_separacao') statusTexto = 'Em Separação';
            if(p.status_pedido === 'enviado') statusTexto = 'Enviado';
            if(p.status_pedido === 'entregue') statusTexto = 'Entregue';
        } else if (p.status_pagamento === 'aguardando' || p.status_pagamento === 'pending' || p.status_pedido === 'novo') {
            statusCor = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
            statusTexto = 'Aguardando Pagamento';
        } else if (p.status_pedido === 'cancelado' || p.status_pagamento === 'estornado') {
            statusCor = 'bg-red-900/30 text-red-400 border-red-800';
            statusTexto = 'Cancelado';
        }

        let blocosAviso = '';
        let botoesAcao = '';
        const isAguardando = (p.status_pagamento === 'aguardando' || p.status_pagamento === 'pending' || p.status_pedido === 'novo') && p.status_pedido !== 'cancelado';
        const isPago = (p.status_pagamento === 'pago' || p.status_pagamento === 'approved') && p.status_pedido !== 'cancelado';

        if (isAguardando && p.pagamento_tipo === 'boleto') {
            blocosAviso += `<div class="mt-4 p-3 rounded bg-yellow-900/20 border border-yellow-800/50 text-xs text-yellow-500">
                ⚠️ <b>Aviso:</b> Você escolheu Boleto. A compensação no banco pode demorar até 48 horas úteis.
            </div>`;
        }

        if (isPago && p.tipo_entrega !== 'retirada' && p.endereco_cidade && p.endereco_cidade.toLowerCase().includes('cachoeiro')) {
            blocosAviso += `<div class="mt-4 p-3 rounded bg-blue-900/20 border border-blue-800/50 text-xs text-blue-400">
                🚚 <b>Entrega Especial:</b> A loja fará contato via celular para agendar a entrega por motoboy (Débora).
            </div>`;
        }

        if (isAguardando) {
            botoesAcao += `
                <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="window.abrirModalPagamento(${p.id}, ${p.total})" class="bg-white text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors">Pagar Agora / Trocar Forma</button>
                    <button onclick="window.cancelarPedido(${p.id})" class="text-red-500 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 rounded transition-colors">Cancelar Compra</button>
                </div>
            `;
        }

        if (isPago && p.tipo_entrega === 'retirada') {
            botoesAcao += `
                <div class="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="window.abrirComprovante(${p.id}, '${clienteLogado.nome_completo || clienteLogado.nome}')" class="w-full bg-green-600 text-white px-4 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[16px]">qr_code_scanner</span> Gerar Ticket de Retirada
                    </button>
                </div>
            `;
        }

        html += `
            <div class="bg-[#050505] border border-gray-900 rounded-lg p-6 shadow-lg relative overflow-hidden transition-colors hover:border-gray-700">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Pedido #${p.id}</p>
                        <p class="text-sm font-bold text-white">${dataCriacao}</p>
                    </div>
                    <div class="border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-center ${statusCor}">
                        ${statusTexto}
                    </div>
                </div>
                
                <div class="mb-4">
                    <p class="text-xs text-gray-400">Total: <span class="text-white font-bold text-lg">R$ ${total}</span></p>
                    ${p.pagamento_tipo ? `<p class="text-[10px] text-gray-500 uppercase">Método original: ${p.pagamento_tipo}</p>` : ''}
                </div>

                ${blocosAviso}
                ${botoesAcao}
            </div>
        `;
    });

    if(loadingState) loadingState.classList.add('hidden');
    if(ordersContainer) {
        ordersContainer.innerHTML = html;
        ordersContainer.classList.remove('hidden');
        ordersContainer.classList.add('flex');
    }
}

// ==========================================
// 3. CANCELAMENTO COM DEVOLUÇÃO DE ESTOQUE
// ==========================================
window.cancelarPedido = async function(pedidoId) {
    if (!confirm("Tem certeza que deseja cancelar esta compra? Os itens retornarão ao estoque.")) return;

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoId}/status-pedido`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pedido: 'cancelado', observacao: 'Cancelado pelo cliente' })
        });

        if (res.ok) {
            alert("Pedido cancelado com sucesso.");
            window.location.reload(); 
        } else {
            alert("Não foi possível cancelar o pedido.");
        }
    } catch (e) {
        alert("Erro de rede ao tentar cancelar.");
    }
}

// ==========================================
// 4. COMPROVANTE DE RETIRADA FÍSICA
// ==========================================
window.abrirComprovante = function(pedidoId, nomeCliente) {
    document.getElementById('compPedido').innerText = `#${pedidoId}`;
    document.getElementById('compCliente').innerText = nomeCliente;
    document.getElementById('qrRetirada').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BD_RETIRADA_PEDIDO_${pedidoId}`;
    
    document.getElementById('modalComprovante').classList.remove('hidden');
    document.getElementById('modalComprovante').classList.add('flex');
}

window.fecharModalComprovante = function() {
    document.getElementById('modalComprovante').classList.add('hidden');
    document.getElementById('modalComprovante').classList.remove('flex');
}

// ==========================================
// 5. ALTERAÇÃO DE FORMA DE PAGAMENTO E ASAAS
// ==========================================
window.abrirModalPagamento = function(pedidoId, total) {
    pedidoEmPagamento = { id: pedidoId, total: total };
    document.getElementById('pagPedidoId').innerText = `#${pedidoId}`;
    document.getElementById('novoValorTotal').innerText = `R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
    
    document.getElementById('novoFormCartao').classList.add('hidden');
    document.getElementById('novoFormGift').classList.add('hidden');
    document.getElementById('novoPixArea').classList.add('hidden');
    document.getElementById('pagFormularios').classList.remove('hidden');
    document.getElementById('btnConfirmarNovoPagamento').classList.add('hidden');
    formaSelecionada = null;
    if(pollingPix) clearInterval(pollingPix);

    document.getElementById('modalPagamento').classList.remove('hidden');
    document.getElementById('modalPagamento').classList.add('flex');
}

window.fecharModalPagamento = function() {
    document.getElementById('modalPagamento').classList.add('hidden');
    document.getElementById('modalPagamento').classList.remove('flex');
    if(pollingPix) clearInterval(pollingPix);
}

window.selecionarNovaForma = function(metodo) {
    formaSelecionada = metodo;
    document.getElementById('novoFormCartao').classList.add('hidden');
    document.getElementById('novoFormGift').classList.add('hidden');
    
    if (metodo === 'credit') {
        document.getElementById('novoFormCartao').classList.remove('hidden');
        document.getElementById('novoFormCartao').classList.add('flex');
    } else if (metodo === 'giftcard') {
        document.getElementById('novoFormGift').classList.remove('hidden');
        document.getElementById('novoFormGift').classList.add('flex');
    }
    
    document.getElementById('btnConfirmarNovoPagamento').classList.remove('hidden');
}

window.processarNovoPagamento = async function() {
    if (!formaSelecionada || !pedidoEmPagamento) return;
    
    const btn = document.getElementById('btnConfirmarNovoPagamento');
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Validando...`;
    btn.disabled = true;

    try {
        let paymentIdExterno = null;
        const payloadAsaas = {
            amount: parseFloat(pedidoEmPagamento.total),
            name: clienteLogado.nome_completo || clienteLogado.nome,
            cpf: clienteLogado.cpf,
            email: clienteLogado.email || 'cliente@boutiquediniz.com',
            description: `Boutique Diniz - Pagamento Pedido #${pedidoEmPagamento.id}`
        };

        const asaasHeaders = { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_SECURITY_KEY };

        if (formaSelecionada === 'pix') {
            const res = await fetch(`${ASAAS_API_BASE}/pay/pix`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadAsaas) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            exibirNovoPix(data);
            return; 
        } else if (formaSelecionada === 'credit') {
            const num = document.getElementById('novoCcNumero').value.replace(/\D/g, '');
            const val = document.getElementById('novoCcValidade').value.split('/');
            const payloadCartao = {
                ...payloadAsaas,
                postalCode: '00000000', 
                addressNumber: '0',
                installments: parseInt(document.getElementById('novoCcParcelas').value),
                card: { holderName: document.getElementById('novoCcNome').value.toUpperCase(), number: num, expiryMonth: val[0], expiryYear: val[1].length===2 ? `20${val[1]}`:val[1], ccv: document.getElementById('novoCcCvv').value }
            };
            const res = await fetch(`${ASAAS_API_BASE}/pay/credit-card`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadCartao) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            paymentIdExterno = data.paymentId;
        } else if (formaSelecionada === 'giftcard') {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/resgatar`, {
                method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero: document.getElementById('novoGiftNumero').value, codigo_seguranca: document.getElementById('novoGiftCvv').value, valor: pedidoEmPagamento.total })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            paymentIdExterno = `GIFT-${data.data.id}`;
        }

        await confirmarPagamentoNoBanco('pago', paymentIdExterno);

    } catch (e) {
        alert("Aviso: " + e.message);
        btn.innerHTML = `Tentar Novamente`;
        btn.disabled = false;
    }
}

function exibirNovoPix(dadosPix) {
    document.getElementById('pagFormularios').classList.add('hidden');
    document.getElementById('novoPixArea').classList.remove('hidden');
    document.getElementById('novoPixArea').classList.add('flex');

    let qrSrc = dadosPix.pix.qrCodeImage || "";
    if (qrSrc && !qrSrc.startsWith('data:image') && !qrSrc.startsWith('http')) qrSrc = 'data:image/png;base64,' + qrSrc;
    
    document.getElementById('novoQrPix').src = qrSrc;
    document.getElementById('novoCopiaCola').value = dadosPix.pix.copyPaste;

    pollingPix = setInterval(async () => {
        try {
            const res = await fetch(`${ASAAS_API_BASE}/payment/status/${dadosPix.paymentId}`, { headers: { 'X-Security-Key': ASAAS_SECURITY_KEY } });
            const d = await res.json();
            if (d.success && d.paid === true) {
                clearInterval(pollingPix);
                await confirmarPagamentoNoBanco('pago', dadosPix.paymentId);
            }
        } catch(e){}
    }, 5000);
}

window.copiarNovoPix = function() {
    const ipt = document.getElementById("novoCopiaCola");
    ipt.select();
    document.execCommand("copy");
    alert("PIX Copiado!");
}

async function confirmarPagamentoNoBanco(status, idExterno) {
    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoEmPagamento.id}/status-pagamento`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pagamento: status, pagamento_id_externo: idExterno })
        });
        alert("Pagamento Confirmado! A loja já foi notificada.");
        window.location.reload();
    } catch (e) {
        alert("Erro de comunicação ao atualizar o status do pedido.");
    }
}
