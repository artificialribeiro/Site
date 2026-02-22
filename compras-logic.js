
import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const ASAAS_API_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_SECURITY_KEY = "1526105"; [span_2](start_span)[span_3](start_span)// Chave Mestra[span_2](end_span)[span_3](end_span)

const loadingState = document.getElementById('loadingState');
const ordersContainer = document.getElementById('ordersContainer');
const emptyState = document.getElementById('emptyState');

let clienteLogado = null;
let pedidoEmPagamento = null;
let formaSelecionada = null;
let pollingPix = null;

function boot() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', carregarHistorico);
    } else {
        carregarHistorico();
    }
}
boot();

async function carregarHistorico() {
    const sessaoStr = localStorage.getItem('boutique_diniz_session');
    if (!sessaoStr) {
        window.location.href = 'login.html';
        return;
    }

    try {
        clienteLogado = JSON.parse(atob(sessaoStr)).usuario;
        
        const headers = await getAuthHeaders();
        [span_4](start_span)// Busca os pedidos oficiais da API V3[span_4](end_span)
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos?cliente_id=${clienteLogado.id}`, { headers });
        
        if (!res.ok) throw new Error("Falha na API");
        const data = await res.json();
        
        const pedidos = Array.isArray(data) ? data : (data.data || []);

        if (pedidos.length === 0) {
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            return;
        }

        renderizarPedidos(pedidos.reverse()); // Mais recentes primeiro

    } catch (error) {
        console.error(error);
        if(loadingState) loadingState.innerHTML = `<p class="text-red-500">Erro ao carregar histórico. Verifique a conexão.</p>`;
    }
}

function renderizarPedidos(pedidos) {
    let html = '';

    pedidos.forEach(p => {
        const dataCriacao = new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        const total = parseFloat(p.total || 0).toFixed(2).replace('.', ',');
        
        // --- TRADUTOR DE STATUS VISUAL ---
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

        // --- REGRAS DE NEGÓCIO DA LOJA ---
        let blocosAviso = '';
        let botoesAcao = '';
        const isAguardando = (p.status_pagamento === 'aguardando' || p.status_pagamento === 'pending' || p.status_pedido === 'novo') && p.status_pedido !== 'cancelado';
        const isPago = (p.status_pagamento === 'pago' || p.status_pagamento === 'approved') && p.status_pedido !== 'cancelado';

        // 1. Regra do Boleto (48h)
        if (isAguardando && p.pagamento_tipo === 'boleto') {
            blocosAviso += `<div class="mt-4 p-3 rounded bg-yellow-900/20 border border-yellow-800/50 text-xs text-yellow-500">
                ⚠️ <b>Atenção:</b> Você escolheu Boleto. A compensação pode demorar até 48 horas úteis após o pagamento.
            </div>`;
        }

        // 2. Regra de Entrega Cachoeiro (Débora)
        if (isPago && p.tipo_entrega !== 'retirada' && p.endereco_cidade && p.endereco_cidade.toLowerCase().includes('cachoeiro')) {
            blocosAviso += `<div class="mt-4 p-3 rounded bg-blue-900/20 border border-blue-800/50 text-xs text-blue-400">
                🚚 <b>Entrega Especial:</b> O seu pedido será enviado via motoboy. A loja (Débora) fará contacto para agendar a entrega.
            </div>`;
        }

        // 3. Botões de Ação
        if (isAguardando) {
            botoesAcao += `
                <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="abrirModalPagamento(${p.id}, ${p.total})" class="bg-white text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors">Pagar Agora / Mudar Forma</button>
                    <button onclick="cancelarPedido(${p.id})" class="text-red-500 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 rounded transition-colors">Cancelar Compra</button>
                </div>
            `;
        }

        // 4. Botão de Retirada (Ticket)
        if (isPago && p.tipo_entrega === 'retirada') {
            botoesAcao += `
                <div class="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="abrirComprovante(${p.id}, '${clienteLogado.nome_completo || clienteLogado.nome}')" class="w-full bg-green-600 text-white px-4 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[16px]">qr_code_scanner</span> Gerar Comprovante de Retirada
                    </button>
                </div>
            `;
        }

        // Renderiza o Card do Pedido
        html += `
            <div class="bg-[#050505] border border-gray-900 rounded-lg p-6 shadow-lg relative overflow-hidden transition-colors hover:border-gray-700">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Pedido #${p.id}</p>
                        <p class="text-sm font-bold text-white">${dataCriacao}</p>
                    </div>
                    <div class="border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusCor}">
                        ${statusTexto}
                    </div>
                </div>
                
                <div class="mb-4">
                    <p class="text-xs text-gray-400">Total: <span class="text-white font-bold text-lg">R$ ${total}</span></p>
                    ${p.pagamento_tipo ? `<p class="text-[10px] text-gray-500 uppercase">Método: ${p.pagamento_tipo}</p>` : ''}
                </div>

                ${blocosAviso}
                ${botoesAcao}
            </div>
        `;
    });

    loadingState.classList.add('hidden');
    ordersContainer.innerHTML = html;
    ordersContainer.classList.remove('hidden');
    ordersContainer.classList.add('flex');
}

// ==========================================
// CANCELAMENTO DE PEDIDO (RETORNO AO STOCK)
// ==========================================
window.cancelarPedido = async function(pedidoId) {
    if (!confirm("Tem a certeza que deseja cancelar esta compra? Os itens serão devolvidos ao estoque.")) return;

    try {
        const headers = await getAuthHeaders();
        
        [span_5](start_span)// Altera o status do pedido para "cancelado" na API Oficial[span_5](end_span)
        // O backend da Estúdio Atlas deve processar a devolução ao estoque através deste gatilho.
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoId}/status-pedido`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pedido: 'cancelado', observacao: 'Cancelado pelo cliente no painel' })
        });

        if (res.ok) {
            alert("Pedido cancelado com sucesso. O estoque foi atualizado.");
            window.location.reload(); // Recarrega para atualizar a interface
        } else {
            alert("Não foi possível cancelar o pedido. Tente novamente.");
        }
    } catch (e) {
        alert("Erro de comunicação ao tentar cancelar.");
    }
}

// ==========================================
// COMPROVANTE DE RETIRADA
// ==========================================
window.abrirComprovante = function(pedidoId, nomeCliente) {
    document.getElementById('compPedido').innerText = `#${pedidoId}`;
    document.getElementById('compCliente').innerText = nomeCliente;
    
    // Atualiza o QR Code com dados reais
    document.getElementById('qrRetirada').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BD_RETIRADA_PEDIDO_${pedidoId}`;

    document.getElementById('modalComprovante').classList.remove('hidden');
    document.getElementById('modalComprovante').classList.add('flex');
}

window.fecharModalComprovante = function() {
    document.getElementById('modalComprovante').classList.add('hidden');
    document.getElementById('modalComprovante').classList.remove('flex');
}

// ==========================================
// ALTERAR FORMA DE PAGAMENTO / PAGAR AGORA
// ==========================================
window.abrirModalPagamento = function(pedidoId, total) {
    pedidoEmPagamento = { id: pedidoId, total: total };
    document.getElementById('pagPedidoId').innerText = `#${pedidoId}`;
    document.getElementById('novoValorTotal').innerText = `R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
    
    // Reseta visual
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

// MOTOR DE RE-PAGAMENTO ASAAS E INTERNAL
window.processarNovoPagamento = async function() {
    if (!formaSelecionada || !pedidoEmPagamento) return;
    
    const btn = document.getElementById('btnConfirmarNovoPagamento');
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Processando...`;
    btn.disabled = true;

    try {
        let paymentIdExterno = null;
        let tipoPagamentoRegistro = formaSelecionada;

        const payloadAsaas = {
            amount: parseFloat(pedidoEmPagamento.total),
            name: clienteLogado.nome_completo || clienteLogado.nome,
            cpf: clienteLogado.cpf,
            email: clienteLogado.email || 'cliente@boutiquediniz.com',
            description: `Boutique Diniz - Repagamento Pedido #${pedidoEmPagamento.id}`
        };

        const asaasHeaders = { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_SECURITY_KEY };

        if (formaSelecionada === 'pix') {
            const res = await fetch(`${ASAAS_API_BASE}/pay/pix`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadAsaas) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            
            exibirNovoPix(data);
            return; // Interrompe para o cliente ler o QR. O Polling fará o fechamento.

        } else if (formaSelecionada === 'credit') {
            const num = document.getElementById('novoCcNumero').value.replace(/\D/g, '');
            const val = document.getElementById('novoCcValidade').value.split('/');
            const payloadCartao = {
                ...payloadAsaas,
                postalCode: '00000000', // Preenchimento genérico para bypass se não tivermos aqui
                addressNumber: '0',
                installments: parseInt(document.getElementById('novoCcParcelas').value),
                card: {
                    holderName: document.getElementById('novoCcNome').value.toUpperCase(),
                    number: num, expiryMonth: val[0], expiryYear: val[1].length===2 ? `20${val[1]}`:val[1],
                    ccv: document.getElementById('novoCcCvv').value
                }
            };
            const res = await fetch(`${ASAAS_API_BASE}/pay/credit-card`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadCartao) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            paymentIdExterno = data.paymentId;

        } else if (formaSelecionada === 'giftcard') {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/resgatar`, {
                method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero: document.getElementById('novoGiftNumero').value,
                    codigo_seguranca: document.getElementById('novoGiftCvv').value,
                    valor: pedidoEmPagamento.total
                })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            paymentIdExterno = `GIFT-${data.data.id}`;
        }

        // Se chegou aqui (Cartão ou Gift), está pago! [span_6](start_span)Atualiza o banco oficial[span_6](end_span)
        await confirmarPagamentoNoBanco('pago', paymentIdExterno);

    } catch (e) {
        alert("Falha no pagamento: " + e.message);
        btn.innerHTML = `Tentar Novamente`;
        btn.disabled = false;
    }
}

// LOGICA DE TELA DO NOVO PIX
function exibirNovoPix(dadosPix) {
    document.getElementById('pagFormularios').classList.add('hidden');
    document.getElementById('novoPixArea').classList.remove('hidden');
    document.getElementById('novoPixArea').classList.add('flex');

    let qrSrc = dadosPix.pix.qrCodeImage || "";
    if (qrSrc && !qrSrc.startsWith('data:image') && !qrSrc.startsWith('http')) qrSrc = 'data:image/png;base64,' + qrSrc;
    
    document.getElementById('novoQrPix').src = qrSrc;
    document.getElementById('novoCopiaCola').value = dadosPix.pix.copyPaste;

    // Fica vigiando o Asaas até a pessoa pagar o PIX
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
            body: JSON.stringify({
                status_pagamento: status,
                pagamento_id_externo: idExterno
            })
        });
        alert("Pagamento Confirmado! O seu pedido já vai ser preparado.");
        window.location.reload();
    } catch (e) {
        alert("Pagamento aprovado, mas erro ao atualizar painel. Contate o suporte.");
    }
}

