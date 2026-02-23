/**
 * cartao-presente-logic.js  —  Boutique Diniz Gift Card v3
 * Estúdio Atlas © 2026
 *
 * Este módulo depende das funções de UI já definidas no HTML:
 *   window.exibirStepPix(dadosPix)
 *   window.exibirStepSucesso(cartao, valor)
 *   window.exibirHistorico(cartoes[])
 *   window.mostrarAnimacaoGeracao(callback)
 *   window.ocultarAnimacao()
 *   window.DBG  (diagnóstico)
 */

import { obterDadosUsuario } from './recuperar-dados-padrao.js';
import { API_CONFIG, getAuthHeaders } from './chavetoken.js';

const ASAAS_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_KEY  = "1526105";

let usuarioLogado = null;
let pollingPix    = null;

// ══════════════════════════════════════
// INICIALIZAÇÃO
// ══════════════════════════════════════
function init() {
    usuarioLogado = obterDadosUsuario();

    if (!usuarioLogado) {
        alert("Para comprar ou ver os seus Cartões Presente, precisa de iniciar sessão.");
        window.location.href = 'login.html';
        return;
    }

    window.DBG?.ok('Usuário logado: ' + (usuarioLogado.nome || usuarioLogado.nome_completo || usuarioLogado.id));
    carregarHistorico();
}

// ══════════════════════════════════════
// GERAR PIX — registrado em window
// ══════════════════════════════════════
window.processarPix = async function () {
    // Re-verifica sessão
    if (!usuarioLogado) {
        usuarioLogado = obterDadosUsuario();
        if (!usuarioLogado) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = 'login.html';
            return;
        }
    }

    const valor = window.valorEscolhido ?? (() => {
        // Lê o valor diretamente do DOM como fallback
        const el = document.getElementById('valorInput');
        return el ? parseFloat(el.value) : null;
    })();

    if (!valor || valor < 10) {
        alert("Escolha um valor de pelo menos R$ 10,00.");
        return;
    }

    const btn = document.getElementById('btnPix');
    if (btn) {
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;animation:spinEl 1s linear infinite;">sync</span> Conectando...`;
        btn.disabled = true;
    }

    window.DBG?.ok('Iniciando PIX — valor: R$ ' + valor);

    try {
        const payload = {
            amount     : valor,
            name       : usuarioLogado.nome_completo || usuarioLogado.nome || 'Cliente Boutique',
            cpf        : usuarioLogado.cpf || '00000000000',
            email      : usuarioLogado.email || 'gift@boutiquediniz.com',
            description: `Boutique Diniz - Gift Card R$ ${valor}`
        };

        const res  = await fetch(`${ASAAS_BASE}/pay/pix`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_KEY },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        window.DBG?.ok('PIX gerado — paymentId: ' + data.paymentId);
        window.exibirStepPix?.(data);

        // Guarda o valor para uso posterior
        window._valorParaCartao = valor;

        // Polling a cada 5s
        pollingPix = setInterval(async () => {
            try {
                const r = await fetch(`${ASAAS_BASE}/payment/status/${data.paymentId}`,
                    { headers: { 'X-Security-Key': ASAAS_KEY } });
                const d = await r.json();
                if (d.success && d.paid === true) {
                    clearInterval(pollingPix);
                    window.DBG?.ok('Pagamento confirmado!');
                    window.mostrarAnimacaoGeracao?.(() => criarCartao(valor));
                }
            } catch (e) { /* ignora falhas de polling */ }
        }, 5000);

    } catch (e) {
        window.DBG?.err('Erro ao gerar PIX: ' + e.message);
        alert("Erro ao gerar PIX: " + e.message);
        if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;">qr_code_scanner</span> Tentar Novamente`;
            btn.disabled = false;
        }
    }
};

// ══════════════════════════════════════
// CRIAR CARTÃO NA API
// ══════════════════════════════════════
async function criarCartao(valor) {
    try {
        const headers   = await getAuthHeaders();
        const clienteId = usuarioLogado.id || usuarioLogado.cliente_id;

        const res  = await fetch(`${API_CONFIG.baseUrl}/api/cartoes`, {
            method : 'POST',
            headers,
            body   : JSON.stringify({ cliente_id: clienteId, valor })
        });
        const data = await res.json();

        if (data.success && data.data) {
            window.DBG?.ok('Cartão criado: ' + data.data.numero);
            window.exibirStepSucesso?.(data.data, valor);
            carregarHistorico();
        } else {
            throw new Error(data.message || "Erro ao salvar cartão.");
        }
    } catch (e) {
        window.ocultarAnimacao?.();
        window.DBG?.err('Erro ao criar cartão: ' + e.message);
        alert("Pagamento recebido! Houve um atraso visual. Atualize a página para ver o cartão.");
    }
}

// ══════════════════════════════════════
// CARREGAR HISTÓRICO
// ══════════════════════════════════════
async function carregarHistorico() {
    try {
        const headers   = await getAuthHeaders();
        const clienteId = usuarioLogado.id || usuarioLogado.cliente_id;

        const res  = await fetch(`${API_CONFIG.baseUrl}/api/cartoes?cliente_id=${clienteId}`, { headers });
        const data = await res.json();

        let lista = [];
        if (Array.isArray(data))        lista = data;
        else if (Array.isArray(data?.data)) lista = data.data;

        lista = lista.filter(c => String(c.cliente_id) === String(clienteId)).reverse();

        window.DBG?.ok(`Histórico: ${lista.length} cartão(ões)`);
        window.exibirHistorico?.(lista);

    } catch (e) {
        window.DBG?.err('Histórico: ' + e.message);
        const el = document.getElementById('histLoader');
        if (el) el.innerHTML = `<p style="font-size:9px;letter-spacing:.2em;color:#3a1a1a;text-transform:uppercase;">Erro ao carregar</p>`;
    }
}

// ══════════════════════════════════════
// START
// ══════════════════════════════════════
init();
