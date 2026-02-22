import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const ASAAS_API_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_SECURITY_KEY = "1526105";

const loadingState = document.getElementById('loadingState');
const ordersContainer = document.getElementById('ordersContainer');
const emptyState = document.getElementById('emptyState');
const cpfCompradorInput = document.getElementById('novoCpfComprador');

let clienteLogado = null;
let pedidoEmPagamento = null;
let formaSelecionada = null;
let pollingPix = null;

// MEMÓRIA PARA O TICKET E POPUP: Guarda os pedidos globalmente
let pedidosCarregados = [];

// ==========================================
// 1. INICIALIZAÇÃO
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
        clienteLogado = sessao.usuario || sessao.cliente || sessao;
        const clienteId = clienteLogado.id || clienteLogado.cliente_id || sessao.id;

        if (!clienteId) throw new Error("ID do cliente não encontrado.");
        
        const headers = await getAuthHeaders();
        const url = `${API_CONFIG.baseUrl}/api/pedidos?cliente_id=${clienteId}`;
        const res = await fetch(url, { headers });
        
        if (!res.ok) throw new Error("A API rejeitou a conexão.");
        const data = await res.json();
        
        let pedidos = [];
        if (Array.isArray(data)) pedidos = data;
        else if (data && Array.isArray(data.data)) pedidos = data.data;
        else if (data && data.data && Array.isArray(data.data.pedidos)) pedidos = data.data.pedidos;

        if (pedidos.length === 0) {
            if(loadingState) loadingState.classList.add('hidden');
            if(emptyState) {
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
            }
            return;
        }

        // Salva na memória global para os pop-ups e tickets
        pedidosCarregados = pedidos.reverse();

        renderizarPedidos(pedidosCarregados); 

        // POP-UP PROATIVO (Avisa sobre compras pendentes)
        const pedidoPendente = pedidosCarregados.find(p => {
            const isCancelado = p.status_pedido === 'cancelado' || p.status_pagamento === 'estornado' || p.status_pagamento === 'recusado';
            const isAprovado = p.status_pagamento === 'aprovado' || p.status_pagamento === 'pago';
            return !isCancelado && !isAprovado;
        });
        
        if (pedidoPendente) {
            setTimeout(() => { window.abrirModalPendente(pedidoPendente); }, 800);
        }

    } catch (error) {
        if(loadingState) {
            loadingState.innerHTML = `
                <span class="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
                <h3 class="text-xl font-bold text-white text-center">Falha de comunicação</h3>
                <p class="text-sm text-gray-400 text-center max-w-sm mt-2">${error.message}</p>
                <button onclick="window.location.reload()" class="mt-6 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-gray-200">Tentar Novamente</button>
            `;
        }
    }
}

// ==========================================
// 2. RENDERIZAR LISTA DE COMPRAS E BOTÕES
// ==========================================
function renderizarPedidos(pedidos) {
    let html = '';

    pedidos.forEach(p => {
        const dataCriacao = p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recente';
        const total = parseFloat(p.total || 0).toFixed(2).replace('.', ',');
        
        const isCancelado = p.status_pedido === 'cancelado' || p.status_pagamento === 'estornado' || p.status_pagamento === 'recusado';
        const isPago = (p.status_pagamento === 'aprovado' || p.status_pagamento === 'pago' || p.status_pagamento === 'approved') && !isCancelado;
        const isAguardando = !isPago && !isCancelado;
        
        let statusCor = 'bg-gray-800 text-gray-300 border-gray-700';
        let statusTexto = 'Processando';
        
        if (isPago) {
            statusCor = 'bg-green-900/30 text-green-400 border-green-800';
            statusTexto = 'Pagamento Aprovado';
            if(p.status_pedido === 'em_separacao') statusTexto = 'Em Separação';
            if(p.status_pedido === 'enviado') statusTexto = 'Enviado';
            if(p.status_pedido === 'entregue') statusTexto = 'Entregue';
        } else if (isAguardando) {
            statusCor = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
            statusTexto = 'Aguardando Pagamento';
        } else if (isCancelado) {
            statusCor = 'bg-red-900/30 text-red-400 border-red-800';
            statusTexto = 'Cancelado';
        }

        let blocosAviso = '';
        let botoesAcao = '';

        if (isAguardando && p.pagamento_tipo === 'boleto') {
            blocosAviso += `<div class="mt-4 p-3 rounded bg-yellow-900/20 border border-yellow-800/50 text-xs text-yellow-500">
                ⚠️ <b>Aviso:</b> Você gerou um Boleto. A compensação no banco pode demorar <b>até 48 horas úteis</b>.
            </div>`;
        }

        if (isPago && p.tipo_entrega !== 'retirada' && p.endereco_cidade && p.endereco_cidade.toLowerCase().includes('cachoeiro')) {
            blocosAviso += `<div class="mt-4 p-3 rounded bg-blue-900/20 border border-blue-800/50 text-xs text-blue-400">
                🚚 <b>Entrega Especial:</b> A loja fará contacto via celular para agendar a entrega por motoboy (Débora).
            </div>`;
        }

        if (isAguardando) {
            let btnVerificar = '';
            if (p.pagamento_id_externo) {
                btnVerificar = `<button onclick="window.verificarStatusAsaas(${p.id}, '${p.pagamento_id_externo}')" class="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">sync</span> Verificar Pagamento</button>`;
            }

            botoesAcao += `
                <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="window.abrirModalPagamento(${p.id}, ${p.total})" class="bg-white text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">payments</span> Pagar Agora / Trocar Forma</button>
                    ${btnVerificar}
                    <button onclick="window.cancelarPedido(${p.id})" class="text-red-500 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 rounded transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">cancel</span> Cancelar (Devolver Estoque)</button>
                </div>
            `;
        }

        // TICKET DE RETIRADA CHAMA A NOVA FUNÇÃO QUE INJETA OS PRODUTOS
        if (isPago && p.tipo_entrega === 'retirada') {
            botoesAcao += `
                <div class="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="window.abrirComprovante(${p.id})" class="w-full bg-green-600 text-white px-4 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-green-500 transition-colors flex items-center justify-center gap-2 shadow-lg">
                        <span class="material-symbols-outlined text-[16px]">qr_code_scanner</span> Gerar Ticket de Retirada
                    </button>
                </div>
            `;
        }
        
        let displayMetodo = p.pagamento_tipo || 'Pendente';
        if (p.pagamento_id_externo && String(p.pagamento_id_externo).includes('GIFT')) {
            displayMetodo = 'Gift Card';
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
                
                <div class="mb-2">
                    <p class="text-xs text-gray-400">Total: <span class="text-white font-bold text-lg">R$ ${total}</span></p>
                    ${displayMetodo !== 'Pendente' ? `<p class="text-[10px] text-gray-500 uppercase">Método: ${displayMetodo}</p>` : ''}
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

function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/100/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image') || caminho.startsWith('http')) return caminho;
    if (caminho.length > 200) return `data:image/jpeg;base64,${caminho}`;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

// ==========================================
// 3. CANCELAMENTO (ESTOQUE)
// ==========================================
window.cancelarPedido = async function(pedidoId) {
    if (!confirm("Tem a certeza que deseja cancelar esta compra? O status será alterado e os produtos voltarão ao estoque.")) return;

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoId}/status-pedido`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pedido: 'cancelado', observacao: 'Cancelado pelo cliente' })
        });

        if (res.ok) {
            alert("Pedido cancelado com sucesso. O Estoque foi reposto.");
            window.location.reload(); 
        } else {
            alert("Não foi possível cancelar o pedido.");
        }
    } catch (e) {
        alert("Erro de rede ao tentar cancelar.");
    }
}

// ==========================================
// 4. COMPROVANTE DE RETIRADA COM FOTO E ITEM
// ==========================================
window.abrirComprovante = function(pedidoId) {
    // Procura o pedido completo na memória do script
    const pedido = pedidosCarregados.find(p => p.id === pedidoId);
    if (!pedido) return;

    const nomeCliente = clienteLogado.nome_completo || clienteLogado.nome;
    
    document.getElementById('compPedido').innerText = `#${pedidoId}`;
    document.getElementById('compCliente').innerText = nomeCliente;
    document.getElementById('qrRetirada').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BD_RETIRADA_PEDIDO_${pedidoId}`;
    
    // Constrói os itens comprados dentro do Ticket!
    let htmlItens = '';
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
            const nome = item.produto_nome || item.nome || "Peça Exclusiva";
            const qtd = item.quantidade || 1;
            const imgFinal = item.imagem || null;
            
            // Foto em miniatura para a atendente saber qual é a roupa
            const imgTag = imgFinal ? `<img src="${resolverImagem(imgFinal)}" class="w-10 h-14 object-cover rounded shadow-sm border border-gray-700">` : `<div class="w-10 h-14 bg-gray-800 rounded border border-gray-700"></div>`;
            
            htmlItens += `
                <div class="flex items-center gap-3 bg-[#111] p-2 rounded border border-gray-800 mb-1">
                    ${imgTag}
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-bold text-white truncate">${nome}</h4>
                        <p class="text-[10px] text-gray-500 uppercase mt-0.5">Quant: <b class="text-white">${qtd}x</b></p>
                    </div>
                </div>
            `;
        });
    } else {
        htmlItens = `<p class="text-xs text-gray-500 italic">Lista de produtos não disponível neste ticket.</p>`;
    }
    
    document.getElementById('compItens').innerHTML = htmlItens;

    document.getElementById('modalComprovante').classList.remove('hidden');
    document.getElementById('modalComprovante').classList.add('flex');
}

window.fecharModalComprovante = function() {
    document.getElementById('modalComprovante').classList.add('hidden');
    document.getElementById('modalComprovante').classList.remove('flex');
}

// ==========================================
// 5. BOTÃO MANUAL: VERIFICAR PAGAMENTO ASAAS
// ==========================================
window.verificarStatusAsaas = async function(pedidoId, idExterno) {
    try {
        const res = await fetch(`${ASAAS_API_BASE}/payment/status/${idExterno}`, { 
            headers: { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_SECURITY_KEY } 
        });
        const data = await res.json();
        
        if (data.success && data.paid) {
            const headers = await getAuthHeaders();
            await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoId}/status-pagamento`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_pagamento: 'aprovado' })
            });
            alert("O Banco confirmou o pagamento! O seu pedido foi atualizado e está pronto para separação.");
            window.location.reload();
        } else {
            alert("O pagamento ainda não foi compensado pelo banco.\n\nLembre-se: Boletos demoram até 48 horas úteis e PIX pode levar alguns minutos em horário de pico.");
        }
    } catch (e) {
        alert("Erro ao conectar com o banco. Tente novamente mais tarde.");
    }
}

// ==========================================
// 6. MÁQUINA DE RE-PAGAMENTO E ASAAS
// ==========================================
if(cpfCompradorInput) {
    cpfCompradorInput.addEventListener('input', function (e) {
        let v = e.target.value.replace(/\D/g,"");
        v = v.replace(/(\d{3})(\d)/,"$1.$2");
        v = v.replace(/(\d{3})(\d)/,"$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2");
        e.target.value = v;
    });
}

window.abrirModalPagamento = function(pedidoId, total) {
    pedidoEmPagamento = { id: pedidoId, total: total };
    document.getElementById('pagPedidoId').innerText = `#${pedidoId}`;
    document.getElementById('novoValorTotal').innerText = `R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
    
    if(clienteLogado && clienteLogado.cpf) {
        cpfCompradorInput.value = clienteLogado.cpf;
    }

    document.getElementById('novoFormCartao').classList.add('hidden');
    document.getElementById('novoFormGift').classList.add('hidden');
    document.getElementById('novoPixArea').classList.add('hidden');
    document.getElementById('novoBoletoArea').classList.add('hidden');
    
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
    
    if (metodo === 'credit' || metodo === 'debit') {
        document.getElementById('novoFormCartao').classList.remove('hidden');
        document.getElementById('novoFormCartao').classList.add('flex');
        
        if (metodo === 'debit') {
            document.getElementById('wrapperParcelas').classList.add('hidden');
        } else {
            document.getElementById('wrapperParcelas').classList.remove('hidden');
        }
    } else if (metodo === 'giftcard') {
        document.getElementById('novoFormGift').classList.remove('hidden');
        document.getElementById('novoFormGift').classList.add('flex');
    }
    
    document.getElementById('btnConfirmarNovoPagamento').classList.remove('hidden');
}

window.processarNovoPagamento = async function() {
    if (!formaSelecionada || !pedidoEmPagamento) return;
    
    const cpfLimpo = cpfCompradorInput.value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        alert("Preencha um CPF válido de 11 dígitos para autorizar o banco.");
        cpfCompradorInput.focus();
        return;
    }

    const btn = document.getElementById('btnConfirmarNovoPagamento');
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin align-middle mr-2">sync</span> Conectando...`;
    btn.disabled = true;

    try {
        let paymentIdExterno = null;
        const payloadAsaas = {
            amount: parseFloat(pedidoEmPagamento.total),
            name: clienteLogado.nome_completo || clienteLogado.nome,
            cpf: cpfLimpo,
            email: clienteLogado.email || 'cliente@boutiquediniz.com',
            description: `Boutique Diniz - Pagamento Pedido #${pedidoEmPagamento.id}`
        };

        const asaasHeaders = { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_SECURITY_KEY };

        if (formaSelecionada === 'pix') {
            const res = await fetch(`${ASAAS_API_BASE}/pay/pix`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadAsaas) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            
            await atualizarIDPagamentoNaAPI('aguardando', data.paymentId);
            exibirNovoPix(data);
            return; 

        } else if (formaSelecionada === 'boleto') {
            const res = await fetch(`${ASAAS_API_BASE}/pay/boleto`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadAsaas) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            
            await atualizarIDPagamentoNaAPI('aguardando', data.paymentId);
            exibirNovoBoleto(data);
            return;

        } else if (formaSelecionada === 'credit' || formaSelecionada === 'debit') {
            const num = document.getElementById('novoCcNumero').value.replace(/\D/g, '');
            const val = document.getElementById('novoCcValidade').value.split('/');
            const parcelas = formaSelecionada === 'credit' ? parseInt(document.getElementById('novoCcParcelas').value) : 1;

            const payloadCartao = {
                ...payloadAsaas,
                postalCode: '00000000', 
                addressNumber: '0',
                installments: parcelas,
                card: { holderName: document.getElementById('novoCcNome').value.toUpperCase(), number: num, expiryMonth: val[0], expiryYear: val[1].length===2 ? `20${val[1]}`:val[1], ccv: document.getElementById('novoCcCvv').value }
            };
            
            const endpoint = formaSelecionada === 'credit' ? '/pay/credit-card' : '/pay/debit-card';
            const res = await fetch(`${ASAAS_API_BASE}${endpoint}`, { method: 'POST', headers: asaasHeaders, body: JSON.stringify(payloadCartao) });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            
            paymentIdExterno = data.paymentId;

            if (formaSelecionada === 'debit' && data.authUrl) {
                await atualizarIDPagamentoNaAPI('aguardando', paymentIdExterno);
                alert("Você será redirecionado para o banco para autorizar o Débito.");
                window.location.href = data.authUrl;
                return;
            } else {
                await atualizarIDPagamentoNaAPI('aprovado', paymentIdExterno);
                alert("Pagamento Confirmado na hora!");
                window.location.reload();
            }

        } else if (formaSelecionada === 'giftcard') {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/resgatar`, {
                method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero: document.getElementById('novoGiftNumero').value, codigo_seguranca: document.getElementById('novoGiftCvv').value, valor: pedidoEmPagamento.total })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            
            await atualizarIDPagamentoNaAPI('aprovado', `GIFT-${data.data.id}`);
            alert("Gift Card validado e pagamento confirmado!");
            window.location.reload();
        }

    } catch (e) {
        alert("Aviso: " + e.message);
        btn.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">lock</span> Tentar Novamente`;
        btn.disabled = false;
    }
}

async function atualizarIDPagamentoNaAPI(status, idExternoGateway) {
    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoEmPagamento.id}/status-pagamento`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pagamento: status, pagamento_id_externo: idExternoGateway })
        });
    } catch (e) {}
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
                await atualizarIDPagamentoNaAPI('aprovado', dadosPix.paymentId);
                alert("PIX Recebido! Seu pedido está em separação.");
                window.location.reload();
            }
        } catch(e){}
    }, 5000);
}

function exibirNovoBoleto(dadosBoleto) {
    document.getElementById('pagFormularios').classList.add('hidden');
    document.getElementById('novoBoletoArea').classList.remove('hidden');
    document.getElementById('novoBoletoArea').classList.add('flex');
    document.getElementById('novoLinkBoleto').href = dadosBoleto.boletoUrl;
}

window.copiarNovoPix = function() {
    const ipt = document.getElementById("novoCopiaCola");
    ipt.select();
    document.execCommand("copy");
    alert("PIX Copiado com Sucesso!");
}

// LOGICA DO POP-UP PENDENTE 
window.abrirModalPendente = function(pedido) {
    document.getElementById('pendenteId').innerText = `#${pedido.id}`;
    document.getElementById('pendenteTotal').innerText = `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`;

    let htmlItens = '';
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
            const nome = item.produto_nome || item.nome || "Produto Exclusivo";
            const imgFinal = item.imagem || null;
            const qtd = item.quantidade || 1;
            
            let nomeFilial = "Matriz (Cachoeiro)";
            if (item.filial_nome) nomeFilial = item.filial_nome;
            else if (pedido.filial && pedido.filial.nome) nomeFilial = pedido.filial.nome;
            else if (pedido.filial_origem_id === 2) nomeFilial = "Filial Secundária";

            htmlItens += `
                <div class="flex items-center gap-3 bg-[#0a0a0a] border border-gray-800 p-2 rounded">
                    <div class="w-12 h-16 bg-[#111] rounded overflow-hidden flex-shrink-0">
                        <img src="${resolverImagem(imgFinal)}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 text-left min-w-0">
                        <h4 class="text-sm font-bold text-white truncate">${nome}</h4>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                            Qtd: ${qtd}x <br> 
                            <span class="text-yellow-600">📍 Local: ${nomeFilial}</span>
                        </p>
                    </div>
                </div>
            `;
        });
    } else {
        htmlItens = `<p class="text-xs text-gray-500 italic">Resumo de itens não disponível.</p>`;
    }

    document.getElementById('pendenteItens').innerHTML = htmlItens;

    const btnVerificar = document.getElementById('btnPendenteVerificar');
    const btnPagar = document.getElementById('btnPendentePagar');

    if (pedido.pagamento_id_externo) {
        btnVerificar.classList.remove('hidden');
        btnVerificar.onclick = () => window.verificarStatusAsaas(pedido.id, pedido.pagamento_id_externo);
    } else {
        btnVerificar.classList.add('hidden');
    }

    btnPagar.onclick = () => {
        window.fecharModalPendente();
        window.abrirModalPagamento(pedido.id, pedido.total);
    };

    document.getElementById('modalPendente').classList.remove('hidden');
    document.getElementById('modalPendente').classList.add('flex');
}

window.fecharModalPendente = function() {
    document.getElementById('modalPendente').classList.add('hidden');
    document.getElementById('modalPendente').classList.remove('flex');
}
