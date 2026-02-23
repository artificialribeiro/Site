/**
 * cartao-presente-logic.js  —  Boutique Diniz Gift Card v4
 * Estúdio Atlas © 2026
 *
 * AUTOSSUFICIENTE: sem imports estáticos.
 * Tenta carregar chavetoken.js dinamicamente; se falhar, usa fallback interno.
 * obterDadosUsuario() está inline — não depende de recuperar-dados-padrao.js
 */

const ASAAS_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_KEY  = "1526105";

let usuarioLogado = null;
let pollingPix    = null;
let _apiConfig    = null;
let _getAuthHeaders = null;

// ══════════════════════════════════════════════════
// 1. OBTER DADOS DO USUÁRIO — INLINE (sem dependência externa)
// ══════════════════════════════════════════════════
function obterDadosUsuario() {
    try {
        const usuarioStr  = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
        const sessaoLegado = localStorage.getItem('boutique_diniz_session');

        let dados = null;

        if (usuarioStr) {
            dados = JSON.parse(usuarioStr);
        } else if (sessaoLegado) {
            const dec = JSON.parse(atob(sessaoLegado));
            dados = dec.usuario || dec.cliente || dec;
        }

        if (!dados || (!dados.id && !dados.cliente_id)) {
            window.DBG?.warn('obterDadosUsuario: nenhum usuário encontrado no storage');
            return null;
        }

        window.DBG?.ok('Usuário: ' + (dados.nome || dados.nome_completo || dados.id));
        return dados;

    } catch (e) {
        window.DBG?.err('obterDadosUsuario erro: ' + e.message);
        return null;
    }
}

// ══════════════════════════════════════════════════
// 2. CARREGAR chavetoken.js DINAMICAMENTE (com fallback)
// ══════════════════════════════════════════════════
async function carregarChavetoken() {
    try {
        const mod = await import('./chavetoken.js');
        _apiConfig      = mod.API_CONFIG;
        _getAuthHeaders = mod.getAuthHeaders;
        window.DBG?.ok('chavetoken.js carregado OK');
    } catch (e) {
        window.DBG?.warn('chavetoken.js não encontrado — usando fallback de headers');

        // Fallback: headers básicos sem token dinâmico
        // (funcionará somente se a API não exigir token HMAC)
        _apiConfig = {
            baseUrl: 'https://api.boutiquediniz.com'
        };
        _getAuthHeaders = async () => ({
            'Content-Type': 'application/json',
            'X-API-KEY'   : window._apiKey || ''
        });
    }
}

// ══════════════════════════════════════════════════
// 3. INICIALIZAÇÃO
// ══════════════════════════════════════════════════
async function init() {
    window.DBG?.ok('cartao-presente-logic.js iniciando...');

    await carregarChavetoken();

    usuarioLogado = obterDadosUsuario();

    if (!usuarioLogado) {
        alert("Para comprar ou ver seus Cartões Presente, faça login primeiro.");
        window.location.href = 'login.html';
        return;
    }

    carregarHistorico();
}

// ══════════════════════════════════════════════════
// 4. GERAR PIX
// ══════════════════════════════════════════════════
window.processarPix = async function () {
    if (!usuarioLogado) {
        usuarioLogado = obterDadosUsuario();
        if (!usuarioLogado) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = 'login.html';
            return;
        }
    }

    // Pega o valor do estado global que o HTML gerencia
    const valor = window.valorEscolhido;
    if (!valor || valor < 10) {
        alert("Escolha um valor de pelo menos R$ 10,00.");
        return;
    }

    const btn = document.getElementById('btnPix');
    if (btn) {
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;animation:spinEl 1s linear infinite;">sync</span> Conectando...`;
        btn.disabled = true;
    }

    window.DBG?.ok('Gerando PIX — R$ ' + valor);

    try {
        const payload = {
            amount     : valor,
            name       : usuarioLogado.nome_completo || usuarioLogado.nome || 'Cliente Boutique',
            cpf        : usuarioLogado.cpf  || '00000000000',
            email      : usuarioLogado.email || 'gift@boutiquediniz.com',
            description: `Boutique Diniz - Gift Card R$ ${valor}`
        };

        const res  = await fetch(`${ASAAS_BASE}/pay/pix`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_KEY },
            body   : JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}: ${JSON.stringify(data)}`);

        window.DBG?.ok('PIX OK — paymentId: ' + data.paymentId);
        window.exibirStepPix?.(data);

        // Polling a cada 5s para confirmar pagamento
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
            } catch (_) { /* polling silencioso */ }
        }, 5000);

    } catch (e) {
        window.DBG?.err('Erro PIX: ' + e.message);
        alert("Erro ao gerar PIX:\n" + e.message);
        if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;">qr_code_scanner</span> Tentar Novamente`;
            btn.disabled = false;
        }
    }
};

// ══════════════════════════════════════════════════
// 5. CRIAR CARTÃO NA API
// ══════════════════════════════════════════════════
async function criarCartao(valor) {
    try {
        const headers   = await _getAuthHeaders();
        const clienteId = usuarioLogado.id || usuarioLogado.cliente_id;

        const res  = await fetch(`${_apiConfig.baseUrl}/api/cartoes`, {
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
            throw new Error(data.message || JSON.stringify(data));
        }
    } catch (e) {
        window.ocultarAnimacao?.();
        window.DBG?.err('Erro ao criar cartão: ' + e.message);
        alert("Pagamento recebido!\nHouve um atraso ao gerar o cartão. Atualize a página.");
    }
}

// ══════════════════════════════════════════════════
// 6. CARREGAR HISTÓRICO
// ══════════════════════════════════════════════════
async function carregarHistorico() {
    try {
        const headers   = await _getAuthHeaders();
        const clienteId = usuarioLogado.id || usuarioLogado.cliente_id;

        const res  = await fetch(`${_apiConfig.baseUrl}/api/cartoes?cliente_id=${clienteId}`, { headers });
        const data = await res.json();

        let lista = [];
        if (Array.isArray(data))            lista = data;
        else if (Array.isArray(data?.data)) lista = data.data;

        lista = lista.filter(c => String(c.cliente_id) === String(clienteId)).reverse();
        window.DBG?.ok(`Histórico: ${lista.length} cartão(ões)`);
        window.exibirHistorico?.(lista);

    } catch (e) {
        window.DBG?.err('Histórico: ' + e.message);
        const el = document.getElementById('histLoader');
        if (el) el.innerHTML = `<p style="font-size:9px;letter-spacing:.2em;color:#3a1a1a;text-transform:uppercase;">Erro ao carregar histórico</p>`;
    }
}

// ══════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════
init();

