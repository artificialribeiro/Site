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
let pedidosCarregados = [];

// ==========================================
// 1. INICIALIZAÇÃO E BUSCA NA API
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

        // 1. Lista resumida de pedidos
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos?cliente_id=${clienteId}&page_size=50`, { headers });
        if (!res.ok) throw new Error("A API rejeitou a conexão.");
        const data = await res.json();

        let pedidosResumo = [];
        if (Array.isArray(data)) pedidosResumo = data;
        else if (data && Array.isArray(data.data)) pedidosResumo = data.data;
        else if (data && data.data && Array.isArray(data.data.pedidos)) pedidosResumo = data.data.pedidos;

        if (pedidosResumo.length === 0) {
            if (loadingState) loadingState.classList.add('hidden');
            if (emptyState) { emptyState.classList.remove('hidden'); emptyState.classList.add('flex'); }
            return;
        }

        // 2. Busca detalhes completos de cada pedido em paralelo (traz itens, rastreio, endereço)
        const pedidosCompletos = await Promise.all(
            pedidosResumo.map(p =>
                fetch(`${API_CONFIG.baseUrl}/api/pedidos/${p.id}`, { headers })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => (d && d.success && d.data) ? d.data : p)
                    .catch(() => p)
            )
        );

        // 3. Para cada item de cada pedido, busca a imagem do produto (base64)
        //    Agrupa por produto_id para não repetir chamadas
        const produtoIds = new Set();
        pedidosCompletos.forEach(p => {
            if (p.itens) p.itens.forEach(item => {
                const pid = item.produto_id || item.produto?.id;
                if (pid) produtoIds.add(pid);
            });
        });

        // Busca todos os produtos únicos em paralelo e monta um mapa id → imagem base64
        const imagemPorProduto = {};
        await Promise.all([...produtoIds].map(async pid => {
            try {
                const r = await fetch(`${API_CONFIG.baseUrl}/api/produtos/${pid}`, { headers });
                if (!r.ok) return;
                const d = await r.json();
                if (d && d.success && d.data) {
                    const imgs = d.data.imagens || [];
                    // Pega a imagem de ordem 1 (principal), ou a primeira disponível
                    const principal = imgs.sort((a, b) => (a.ordem || 99) - (b.ordem || 99))[0];
                    if (principal) {
                        // Pode vir como base64 puro ou caminho
                        if (principal.imagem_base64) {
                            imagemPorProduto[pid] = principal.imagem_base64; // já tem o data:image/...;base64,...
                        } else if (principal.caminho) {
                            imagemPorProduto[pid] = principal.caminho; // caminho relativo
                        }
                    }
                }
            } catch (e) {}
        }));

        // 4. Injeta a imagem em cada item dos pedidos
        pedidosCompletos.forEach(p => {
            if (p.itens) p.itens.forEach(item => {
                const pid = item.produto_id || item.produto?.id;
                if (pid && imagemPorProduto[pid] && !item.imagem) {
                    item.imagem = imagemPorProduto[pid];
                }
            });
        });

        // Ordena do mais recente pro mais antigo
        pedidosCarregados = pedidosCompletos.sort((a, b) =>
            new Date(b.criado_em || 0) - new Date(a.criado_em || 0)
        );

        renderizarPedidos(pedidosCarregados);

        // 5. Pop-up proativo de pedido pendente
        const pedidoPendente = pedidosCarregados.find(p => {
            const isCancelado = p.status_pedido === 'cancelado' || p.status_pagamento === 'estornado' || p.status_pagamento === 'recusado';
            const isAprovado  = p.status_pagamento === 'aprovado' || p.status_pagamento === 'pago' || p.status_pagamento === 'approved';
            return !isCancelado && !isAprovado;
        });
        if (pedidoPendente) setTimeout(() => { window.abrirModalPendente(pedidoPendente); }, 800);

    } catch (error) {
        if (loadingState) {
            loadingState.innerHTML = `
                <span class="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
                <h3 class="text-xl font-bold text-white text-center">Falha de comunicação</h3>
                <p class="text-sm text-gray-400 text-center max-w-sm mt-2">${error.message}</p>
                <button onclick="window.location.reload()" class="mt-6 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-gray-200">Tentar Novamente</button>
            `;
        }
    }
}

function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/100/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image') || caminho.startsWith('http')) return caminho;
    if (caminho.length > 200) return `data:image/jpeg;base64,${caminho}`;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

// ==========================================
// 2. RENDERIZAR CARTÕES DE PEDIDO
// ==========================================
function labelMetodo(tipo, idExterno) {
    if (idExterno && String(idExterno).includes('GIFT')) return 'Gift Card';
    const mapa = { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito', boleto: 'Boleto', credit: 'Cartão de Crédito', debit: 'Cartão de Débito', giftcard: 'Gift Card', dinheiro: 'Dinheiro' };
    return mapa[tipo] || tipo || '';
}

function resolverImagemItem(item) {
    // 1. já tem imagem injetada (base64 ou caminho)
    const raw = item.imagem || item.imagem_url || item.imagem_base64 || '';
    if (raw) {
        if (raw.startsWith('data:image')) return raw;
        if (raw.startsWith('http'))       return raw;
        if (raw.length > 200)             return `data:image/jpeg;base64,${raw}`;
        return `${API_CONFIG.baseUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
    }
    return null; // sem imagem — exibe ícone
}

function renderizarPedidos(pedidos) {
    let html = '';

    pedidos.forEach(p => {
        const dataCriacao = p.criado_em
            ? new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Recente';
        const total = parseFloat(p.total || 0).toFixed(2).replace('.', ',');

        const isCancelado = p.status_pedido === 'cancelado' || p.status_pagamento === 'estornado' || p.status_pagamento === 'recusado';
        const isPago      = (p.status_pagamento === 'aprovado' || p.status_pagamento === 'pago' || p.status_pagamento === 'approved') && !isCancelado;
        const isAguardando = !isPago && !isCancelado;
        const isRetirada   = p.tipo_entrega === 'retirada';

        // Detecta Cachoeiro de Itapemirim no endereço de entrega
        const endCidade = p.endereco_cidade
            || (p.endereco_entrega && p.endereco_entrega.cidade)
            || (p.endereco && p.endereco.cidade)
            || '';
        const isCachoeiro = endCidade.toLowerCase().includes('cachoeiro');

        // Status badge
        let statusCor = 'bg-gray-800 text-gray-300 border-gray-700';
        let statusTexto = 'Processando'; let statusIcone = 'sync';
        if (isPago) {
            statusCor = 'bg-green-900/30 text-green-400 border-green-800';
            statusTexto = 'Pagamento Aprovado'; statusIcone = 'check_circle';
            if (p.status_pedido === 'em_separacao') { statusTexto = 'Em Separação';  statusIcone = 'inventory_2'; }
            if (p.status_pedido === 'enviado')       { statusTexto = 'Enviado';       statusIcone = 'local_shipping'; }
            if (p.status_pedido === 'entregue')      { statusTexto = 'Entregue';      statusIcone = 'mark_email_read'; }
        } else if (isAguardando) {
            statusCor = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
            statusTexto = 'Aguardando Pagamento'; statusIcone = 'schedule';
        } else if (isCancelado) {
            statusCor = 'bg-red-900/30 text-red-400 border-red-800';
            statusTexto = 'Cancelado'; statusIcone = 'cancel';
        }

        // Badge entrega
        const entregaBadge = isRetirada
            ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-purple-700 text-purple-400 bg-purple-900/20 px-3 py-1.5 rounded-full"><span class="material-symbols-outlined text-[13px]">storefront</span> Retirada na Loja</span>`
            : `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-gray-700 text-gray-400 bg-[#0a0a0a] px-3 py-1.5 rounded-full"><span class="material-symbols-outlined text-[13px]">local_shipping</span> Envio</span>`;

        // ── ITENS COM FOTO ──
        let itensHtml = '';
        if (p.itens && p.itens.length > 0) {
            itensHtml = `<div class="mt-4 mb-2 flex flex-col gap-2">
                <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Produtos neste pedido</p>`;
            p.itens.forEach(item => {
                const nome     = item.produto_nome || item.nome || 'Produto';
                const qtd      = item.quantidade || 1;
                const tam      = item.tamanho ? ` · Tam: <b class="text-gray-200">${item.tamanho}</b>` : '';
                const cor      = item.cor      ? ` · Cor: <b class="text-gray-200">${item.cor}</b>`    : '';
                const vlrUnit  = parseFloat(item.preco_final || item.preco_unit || 0);
                const vlrTotal = parseFloat(item.total_item  || (vlrUnit * qtd) || 0);
                const imgSrc   = resolverImagemItem(item);

                const imgTag = imgSrc
                    ? `<img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                    : '';
                const iconTag = `<span class="material-symbols-outlined text-gray-600 text-2xl m-auto" style="${imgSrc ? 'display:none' : 'display:flex'}">checkroom</span>`;

                itensHtml += `
                    <div class="flex items-center gap-3 bg-[#0a0a0a] border border-gray-800 rounded-lg p-3">
                        <div class="w-14 h-18 flex-shrink-0 bg-[#111] rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center" style="min-width:56px;height:72px;">
                            ${imgTag}${iconTag}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-white leading-snug">${nome}</p>
                            <p class="text-[11px] text-gray-500 mt-1">Qtd: <b class="text-gray-300">${qtd}x</b>${tam}${cor}</p>
                            <p class="text-[12px] text-gray-300 mt-1 font-mono">R$ ${vlrTotal.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>`;
            });
            itensHtml += `</div>`;
        }

        // ── RASTREIO ──
        let rastreioHtml = '';
        if (!isRetirada && (p.codigo_rastreio || p.link_acompanhamento || p.data_prevista_entrega)) {
            rastreioHtml = `
                <div class="mt-3 p-4 bg-[#0a0a0a] border border-blue-900/40 rounded-lg">
                    <p class="text-[10px] text-blue-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                        <span class="material-symbols-outlined text-[14px]">local_shipping</span> Rastreamento
                    </p>
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <p class="text-xs text-gray-400">Código: <span class="font-mono text-white">${p.codigo_rastreio || 'Atualizando...'}</span></p>
                            ${p.data_prevista_entrega ? `<p class="text-xs text-gray-400 mt-1">Previsão: <b class="text-green-400">${new Date(p.data_prevista_entrega).toLocaleDateString('pt-BR')}</b></p>` : ''}
                        </div>
                        ${p.link_acompanhamento ? `<a href="${p.link_acompanhamento}" target="_blank" class="bg-blue-600 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors text-center whitespace-nowrap">Acompanhar</a>` : ''}
                    </div>
                </div>`;
        }

        // ── AVISOS ──
        let blocosAviso = '';
        if (isAguardando && p.pagamento_tipo === 'boleto') {
            blocosAviso += `<div class="mt-3 p-3 rounded bg-yellow-900/20 border border-yellow-800/50 text-xs text-yellow-500">⚠️ <b>Aviso:</b> O banco pode demorar <b>até 48 horas úteis</b> para compensar o Boleto.</div>`;
        }
        // Aviso motoboy APENAS se: pago + envio (não retirada) + cidade é Cachoeiro
        if (isPago && !isRetirada && isCachoeiro) {
            blocosAviso += `<div class="mt-3 p-3 rounded bg-blue-900/20 border border-blue-800/50 text-xs text-blue-400">🛵 <b>Entrega Local:</b> O seu pedido será enviado por motoboy. A loja (Débora) entrará em contacto em breve.</div>`;
        }
        if (isRetirada && isAguardando) {
            blocosAviso += `<div class="mt-3 p-3 rounded bg-purple-900/20 border border-purple-800/50 text-xs text-purple-300">🏬 <b>Retirada na Loja:</b> Gere a Ordem de Retirada e apresente no balcão. Pagamento pode ser feito na hora.</div>`;
        }
        if (isRetirada && isPago) {
            blocosAviso += `<div class="mt-3 p-3 rounded bg-green-900/20 border border-green-800/50 text-xs text-green-400">✅ <b>Pago e pronto para retirar!</b> Gere a Ordem de Retirada e apresente no balcão da loja.</div>`;
        }

        // ── BOTÕES ──
        let botoesAcao = '';
        if (isAguardando) {
            let btnVerificar = '';
            if (p.pagamento_id_externo && !String(p.pagamento_id_externo).includes('GIFT')) {
                btnVerificar = `<button onclick="window.verificarStatusAsaas(${p.id}, '${p.pagamento_id_externo}')" class="bg-blue-600 text-white px-4 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors flex-1 min-w-[180px] flex justify-center items-center gap-2"><span class="material-symbols-outlined text-[18px]">sync</span> Verificar Pagamento</button>`;
            }
            botoesAcao += `
                <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button onclick="window.abrirModalPagamento(${p.id}, ${p.total})" class="bg-white text-black px-4 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors flex-1 min-w-[180px] flex justify-center items-center gap-2"><span class="material-symbols-outlined text-[18px]">payments</span> Pagar / Trocar Forma</button>
                    ${btnVerificar}
                    <button onclick="window.cancelarPedido(${p.id})" class="text-red-500 px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 rounded transition-colors w-full flex justify-center items-center gap-2 mt-1"><span class="material-symbols-outlined text-[18px]">cancel</span> Cancelar Compra</button>
                </div>`;
        }
        // Ordem de Retirada — qualquer pedido de retirada não cancelado (pago OU aguardando)
        if (isRetirada && !isCancelado) {
            const corBtn = isPago
                ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                : 'bg-purple-700 hover:bg-purple-600 shadow-purple-900/20';
            botoesAcao += `
                <div class="mt-4 pt-4 border-t border-gray-800">
                    <button onclick="window.abrirOrdemRetirada(${p.id})" class="w-full ${corBtn} text-white px-4 py-4 rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg">
                        <span class="material-symbols-outlined text-[20px]">receipt_long</span> Gerar Ordem de Retirada (PDF)
                    </button>
                </div>`;
        }

        const displayMetodo = labelMetodo(p.pagamento_tipo, p.pagamento_id_externo);

        html += `
            <div class="bg-[#050505] border border-gray-900 rounded-xl p-6 shadow-2xl relative overflow-hidden transition-colors hover:border-gray-700">
                <div class="flex flex-col md:flex-row justify-between items-start gap-3 mb-4 pb-4 border-b border-gray-900">
                    <div class="flex-1">
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Pedido #${p.id} · ${dataCriacao}</p>
                        <div class="flex flex-wrap gap-2">
                            <div class="inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusCor}">
                                <span class="material-symbols-outlined text-[13px]">${statusIcone}</span> ${statusTexto}
                            </div>
                            ${entregaBadge}
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total</p>
                        <p class="text-white font-bold text-2xl font-mono">R$ ${total}</p>
                        ${displayMetodo ? `<p class="text-[10px] text-gray-500 mt-1 border border-gray-800 px-2 py-0.5 rounded bg-[#0a0a0a] inline-block">${displayMetodo}</p>` : ''}
                    </div>
                </div>
                ${itensHtml}
                ${rastreioHtml}
                ${blocosAviso}
                ${botoesAcao}
            </div>`;
    });

    if (loadingState) loadingState.classList.add('hidden');
    if (ordersContainer) {
        ordersContainer.innerHTML = html;
        ordersContainer.classList.remove('hidden');
        ordersContainer.classList.add('flex');
    }
}

// ==========================================
// 3. CANCELAMENTO (ESTOQUE) E VERIFICAÇÃO ASAAS
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
            alert("O pagamento ainda não foi compensado pelo banco.\n\nLembre-se: Boletos demoram até 48 horas úteis para serem confirmados.");
        }
    } catch (e) {
        alert("Erro ao conectar com o banco. Tente novamente mais tarde.");
    }
}

// ==========================================
// 4. ORDEM DE RETIRADA — PDF
// ==========================================
window.abrirComprovante = function(id) { window.abrirOrdemRetirada(id); }; // compatibilidade

window.abrirOrdemRetirada = function(pedidoId) {
    const pedido = pedidosCarregados.find(p => p.id === pedidoId);
    if (!pedido) return;

    const nomeCliente  = clienteLogado.nome_completo || clienteLogado.nome || 'Cliente';
    const dataEmissao  = new Date().toLocaleString('pt-BR');
    const total        = parseFloat(pedido.total || 0).toFixed(2).replace('.', ',');
    const isPago       = pedido.status_pagamento === 'aprovado' || pedido.status_pagamento === 'pago' || pedido.status_pagamento === 'approved';
    const statusPagTxt = isPago ? '✅ PAGO' : '⏳ AGUARDANDO PAGAMENTO';
    const metodo       = labelMetodo(pedido.pagamento_tipo, pedido.pagamento_id_externo);
    const qrUrl        = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=BD_RETIRADA_${pedidoId}&color=000000&bgcolor=ffffff`;

    let linhasItens = '';
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
            const nome    = item.produto_nome || item.nome || 'Produto';
            const qtd     = item.quantidade || 1;
            const tam     = item.tamanho ? ` | Tam: ${item.tamanho}` : '';
            const cor     = item.cor      ? ` | Cor: ${item.cor}`    : '';
            const vlrUnit  = parseFloat(item.preco_final || item.preco_unit || 0);
            const vlrTotal = parseFloat(item.total_item  || (vlrUnit * qtd) || 0);
            
            // Tenta incluir a imagem base64 no PDF
            const imgSrc = resolverImagemItem(item);
            const imgCel = imgSrc
                ? `<td style="padding:6px 4px;border-bottom:1px solid #eee;width:44px;"><img src="${imgSrc}" style="width:40px;height:52px;object-fit:cover;border-radius:4px;display:block;"></td>`
                : `<td style="padding:6px 4px;border-bottom:1px solid #eee;width:44px;"></td>`;

            linhasItens += `<tr>
                ${imgCel}
                <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;">${nome}${tam}${cor}</td>
                <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${qtd}</td>
                <td style="padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;text-align:right;">R$ ${vlrTotal.toFixed(2).replace('.', ',')}</td>
            </tr>`;
        });
    } else {
        linhasItens = `<tr><td colspan="4" style="padding:8px;font-size:12px;color:#888;text-align:center;">Detalhe dos itens não disponível</td></tr>`;
    }

    const frete    = parseFloat(pedido.frete || 0);
    const desconto = parseFloat(pedido.desconto_total || 0);

    const htmlOrdem = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Ordem de Retirada #${pedidoId} — Boutique Diniz</title>
    <link href="https://fonts.googleapis.com/css2?family=Satisfy&family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Montserrat',Arial,sans-serif;background:#fff;color:#111;padding:28px;max-width:680px;margin:auto}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:16px}
        .logo{font-family:'Satisfy',cursive;font-size:34px;color:#111}
        .logo-sub{font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#666;margin-top:3px}
        .titulo-doc{background:#111;color:#fff;text-align:center;padding:9px 16px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;border-radius:4px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
        .info-box{border:1px solid #ddd;padding:10px 12px;border-radius:6px}
        .info-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px}
        .info-value{font-size:13px;font-weight:600;color:#111}
        .status-pago{color:#16a34a}.status-pendente{color:#d97706}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        thead th{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#888;text-align:left;padding:6px 4px;border-bottom:2px solid #111}
        .totais{border-top:2px solid #111;padding-top:10px;text-align:right}
        .totais-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:#555}
        .totais-total{display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#111;margin-top:8px}
        .footer{margin-top:24px;border-top:1px dashed #ccc;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end}
        .footer-msg{font-size:10px;color:#888;max-width:340px;line-height:1.6}
        .linha-assinatura{border-top:1px solid #111;width:160px;margin:0 auto 4px}
        .assinatura-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;text-align:center}
        .metodo-badge{display:inline-block;background:#f3f4f6;border:1px solid #ddd;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:#333}
        @media print{body{padding:0}}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">Boutique Diniz</div>
            <div class="logo-sub">Ordem de Retirada na Loja</div>
            <div style="margin-top:10px;font-size:10px;color:#666;">Emitido em: ${dataEmissao}</div>
        </div>
        <div style="text-align:center">
            <img src="${qrUrl}" width="90" height="90" alt="QR">
            <div style="font-size:9px;color:#888;margin-top:2px;">Ped. #${pedidoId}</div>
        </div>
    </div>

    <div class="titulo-doc">Autorização de Retirada de Encomenda</div>

    <div class="info-grid">
        <div class="info-box"><div class="info-label">Cliente</div><div class="info-value">${nomeCliente}</div></div>
        <div class="info-box"><div class="info-label">Nº do Pedido</div><div class="info-value">#${pedidoId}</div></div>
        <div class="info-box"><div class="info-label">Forma de Pagamento</div><div class="info-value"><span class="metodo-badge">${metodo || '—'}</span></div></div>
        <div class="info-box"><div class="info-label">Status do Pagamento</div><div class="info-value ${isPago ? 'status-pago' : 'status-pendente'}">${statusPagTxt}</div></div>
        <div class="info-box"><div class="info-label">Tipo de Entrega</div><div class="info-value">🏬 Retirada na Loja</div></div>
        <div class="info-box"><div class="info-label">Canal de Compra</div><div class="info-value">🌐 Site Boutique Diniz</div></div>
    </div>

    <table>
        <thead><tr><th style="width:44px"></th><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${linhasItens}</tbody>
    </table>

    <div class="totais">
        ${frete > 0    ? `<div class="totais-row"><span>Frete</span><span>R$ ${frete.toFixed(2).replace('.', ',')}</span></div>` : ''}
        ${desconto > 0 ? `<div class="totais-row"><span>Desconto</span><span style="color:#16a34a">- R$ ${desconto.toFixed(2).replace('.', ',')}</span></div>` : ''}
        <div class="totais-total"><span>Total</span><span>R$ ${total}</span></div>
    </div>

    <div class="footer">
        <div class="footer-msg">
            Apresente este documento no balcão da loja para retirar a sua encomenda.
            ${!isPago ? '<br><b style="color:#d97706">⚠ Pagamento pendente — efetue o pagamento antes ou no ato da retirada.</b>' : ''}
            <br><br>Boutique Diniz · boutiquediniz.com
        </div>
        <div>
            <div class="linha-assinatura"></div>
            <div class="assinatura-label">Assinatura do Atendente</div>
        </div>
    </div>
    <script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(htmlOrdem); win.document.close(); }
    else { alert("Permita pop-ups neste site e tente novamente."); }
};

// ==========================================
// 5. MÁQUINA DE RE-PAGAMENTO
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
            const numeroCartao    = document.getElementById('novoGiftNumero').value.replace(/\D/g, '');
            const codigoSeguranca = document.getElementById('novoGiftCvv').value;

            // Passo 1 — busca pelo número para obter o ID
            const resBusca = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/numero/${numeroCartao}`, { headers });
            const dadosBusca = await resBusca.json();
            if (!resBusca.ok || !dadosBusca.success) throw new Error(dadosBusca.message || 'Cartão Presente não encontrado.');

            const cartaoId    = dadosBusca.data.id;
            const saldoCartao = parseFloat(dadosBusca.data.saldo || 0);
            if (saldoCartao < parseFloat(pedidoEmPagamento.total))
                throw new Error(`Saldo insuficiente no Gift Card. Disponível: R$ ${saldoCartao.toFixed(2).replace('.', ',')}`);

            // Passo 2 — resgata pelo ID
            const resResgate = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/${cartaoId}/resgatar`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ valor: parseFloat(pedidoEmPagamento.total), codigo_seguranca: codigoSeguranca, pedido_id: pedidoEmPagamento.id })
            });
            const dadosResgate = await resResgate.json();
            if (!resResgate.ok || !dadosResgate.success) throw new Error(dadosResgate.message || 'Erro ao resgatar Gift Card.');

            await atualizarIDPagamentoNaAPI('aprovado', `GIFT-${cartaoId}`);
            alert("Gift Card validado e pagamento confirmado!");
            window.location.reload();
        }

    } catch (e) {
        alert("Aviso: " + e.message);
        btn.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">lock</span> Tentar Novamente`;
        btn.disabled = false;
    }
}

// Mapeia forma interna para o tipo aceito pela API
function mapearTipoPagamento(forma) {
    const mapa = { pix: 'pix', credit: 'credito', debit: 'debito', boleto: 'boleto', giftcard: 'giftcard' };
    return mapa[forma] || forma;
}

async function atualizarIDPagamentoNaAPI(status, idExternoGateway) {
    try {
        const headers = await getAuthHeaders();
        const body = { status_pagamento: status, pagamento_id_externo: idExternoGateway };
        if (formaSelecionada) body.pagamento_tipo = mapearTipoPagamento(formaSelecionada);
        await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoEmPagamento.id}/status-pagamento`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
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

// ==========================================
// 7. POP-UP PROATIVO (COMPRA PENDENTE)
// ==========================================
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
