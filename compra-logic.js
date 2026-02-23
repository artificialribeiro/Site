import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

// ==========================================
// CONFIGURAÇÃO DO GATEWAY ASAAS
// ==========================================
const ASAAS_API_BASE     = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_SECURITY_KEY = "1526105";

// ==========================================
// ELEMENTOS DOM
// ==========================================
const loadingState       = document.getElementById('loadingState');
const checkoutForm       = document.getElementById('checkoutForm');
const transactionState   = document.getElementById('transactionState');
const listaItensCompra   = document.getElementById('listaItensCompra');
const txtEnderecoDestino = document.getElementById('txtEnderecoDestino');
const valorFreteUI       = document.getElementById('valorFreteUI');
const resumoSubtotal     = document.getElementById('resumoSubtotal');
const resumoFrete        = document.getElementById('resumoFrete');
const resumoTotal        = document.getElementById('resumoTotal');
const qtdItens           = document.getElementById('qtdItens');
const btnPagar           = document.getElementById('btnPagar');
const cpfCompradorInput  = document.getElementById('cpfComprador');

// ==========================================
// ESTADO GLOBAL
// ==========================================
let cliente          = null;
let enderecoAtivo    = null;
let todosEnderecos   = [];
let dadosCarrinho    = null;
let valorFrete       = 0;
let valorDesconto    = 0;
let codigoCupomAtivo = null;
let totalGeral       = 0;
let pollingInterval  = null;
let pixTimeoutTimer  = null; // encerra PIX após 15 min

// ==========================================
// PADRÃO OFICIAL — RECUPERAR SESSÃO (À PROVA DE FALHAS)
// Documentação Estúdio Atlas — recuperar-dados-padrao.js
// ==========================================
function obterDadosUsuario() {
    try {
        const usuarioStr   = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
        const sessaoLegado = localStorage.getItem('boutique_diniz_session');

        let usuarioDados = null;

        if (usuarioStr) {
            usuarioDados = JSON.parse(usuarioStr);
        } else if (sessaoLegado) {
            const dec    = JSON.parse(atob(sessaoLegado));
            usuarioDados = dec.usuario || dec.cliente || dec;
        }

        if (!usuarioDados || (!usuarioDados.id && !usuarioDados.cliente_id)) return null;
        return usuarioDados;
    } catch (erro) {
        console.error("Sessão corrompida:", erro);
        return null;
    }
}

// ==========================================
// 1. BOOT
// ==========================================
(function bootApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarCheckout);
    } else {
        iniciarCheckout();
    }
})();

function mostrarErroFatal(msg) {
    if (loadingState) {
        loadingState.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
            <h3 class="text-xl font-bold text-white text-center">Ops, algo falhou</h3>
            <p class="text-sm text-gray-400 text-center max-w-sm mt-2">${msg}</p>
            <button onclick="window.location.href='carrinho.html'" class="mt-6 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-gray-200 transition-colors">Voltar ao Carrinho</button>
        `;
    }
}

async function iniciarCheckout() {
    try {
        // Recupera transação pendente (ex: PIX em aberto)
        const txPendente = localStorage.getItem('boutique_pending_tx');
        if (txPendente) {
            const txData = JSON.parse(txPendente);
            // Usa padrão oficial para recuperar cliente mesmo neste fluxo
            cliente = obterDadosUsuario();
            recuperarTransacaoPendente(txData);
            return;
        }

        // PADRÃO OFICIAL: usa obterDadosUsuario() à prova de falhas
        cliente = obterDadosUsuario();
        const carrinhoStr = localStorage.getItem('boutique_dados_checkout');

        if (!cliente) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = 'login.html';
            return;
        }

        if (!carrinhoStr) {
            mostrarErroFatal("Dados do carrinho expirados. Por favor, volte ao carrinho.");
            return;
        }

        dadosCarrinho = JSON.parse(carrinhoStr);

        // Preenche CPF automaticamente — busca em todos os campos possíveis
        const cpfBruto = cliente.cpf || cliente.documento || '';
        if (cpfCompradorInput && cpfBruto) {
            cpfCompradorInput.value = mascararCpf(cpfBruto.replace(/\D/g, ''));
        }

        renderizarItensDoPedido();
        await buscarEnderecosEInicializar();

    } catch (e) {
        console.error(e);
        mostrarErroFatal("Erro interno. Verifique a sua conexão e tente novamente.");
    }
}

// ==========================================
// MÁSCARAS
// ==========================================
function mascararCpf(v) {
    v = v.replace(/\D/g, '').substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
}
if (cpfCompradorInput) {
    cpfCompradorInput.addEventListener('input', function(e) {
        e.target.value = mascararCpf(e.target.value);
    });
}

// Máscara número cartão
document.getElementById('ccNumero')?.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '').substring(0, 16);
    v = v.replace(/(\d{4})/g, '$1 ').trim();
    e.target.value = v;
});

// Máscara validade
document.getElementById('ccValidade')?.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
    e.target.value = v;
});

// Máscara CEP
document.getElementById('novoEndCep')?.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '').substring(0, 8);
    if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5);
    e.target.value = v;
});

// ==========================================
// 2. RENDERIZAÇÃO DOS ITENS
// ==========================================
function resolverImagem(caminho) {
    if (!caminho) return null;
    if (caminho.startsWith('data:image') || caminho.startsWith('http')) return caminho;
    if (caminho.length > 200) return `data:image/jpeg;base64,${caminho}`;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

function renderizarItensDoPedido() {
    if (!dadosCarrinho?.itens?.length) {
        mostrarErroFatal("O seu carrinho está vazio.");
        return;
    }

    let html = '';
    dadosCarrinho.itens.forEach(item => {
        const qtd      = item.quantidade || 1;
        const variante = item.produto_variante || item.variante || item || {};
        const produto  = variante.produto || item.produto || item || {};

        const nome    = produto.nome || item.produto_nome || "Peça Exclusiva";
        const tamanho = variante.tamanho || item.tamanho || "—";
        const cor     = variante.cor     || item.cor     || "—";
        const preco   = parseFloat(item.preco_final || item.total_item || produto.preco || item.preco || 0);

        let imgRaw = (produto.imagens?.length > 0)
            ? (produto.imagens[0].imagem_base64 || produto.imagens[0].base64 || produto.imagens[0].caminho)
            : item.imagem;
        const imgSrc = resolverImagem(imgRaw);

        html += `
            <div class="flex items-center gap-4 bg-[#0a0a0a] border border-gray-800 p-3 rounded-lg">
                <div class="w-12 h-16 bg-[#111] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    ${imgSrc
                        ? `<img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined text-gray-700 text-2xl\\'>checkroom</span>'">`
                        : `<span class="material-symbols-outlined text-gray-700 text-2xl">checkroom</span>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-white truncate">${nome}</h4>
                    <p class="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Tam: ${tamanho} · Cor: ${cor}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">Qtd: ${qtd}</p>
                </div>
                <div class="text-right pr-1">
                    <p class="text-sm font-bold text-green-400">R$ ${preco.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>`;
    });

    if (listaItensCompra) listaItensCompra.innerHTML = html;
}

// ==========================================
// 3. CUPOM
// ==========================================
window.aplicarCupom = async function() {
    const input = document.getElementById('inputCupom');
    const btn   = document.getElementById('btnAplicarCupom');
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) return;

    btn.textContent = "...";
    btn.disabled    = true;

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/cupons/validar`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, valor_carrinho: dadosCarrinho.subtotal || dadosCarrinho.resumo?.subtotal })
        });
        const data = await res.json();

        if (res.ok && data.success && data.data.valido) {
            codigoCupomAtivo = codigo;
            valorDesconto    = parseFloat(data.data.desconto || 0);
            input.disabled   = true;
            btn.textContent  = "✓ ATIVO";
            btn.classList.replace('bg-gray-800', 'bg-green-800');
            atualizarResumoValores();
        } else {
            alert(data.message || "Cupom expirado ou inválido.");
            btn.textContent = "Aplicar";
            btn.disabled    = false;
        }
    } catch (e) {
        btn.textContent = "Aplicar";
        btn.disabled    = false;
    }
};

// ==========================================
// 4. ENDEREÇOS E FRETE
// ==========================================
async function buscarEnderecosEInicializar() {
    const clienteId = cliente.id || cliente.cliente_id;
    const headers   = await getAuthHeaders();
    const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, { headers });
    if (!res.ok) throw new Error("Falha ao carregar endereços.");

    const dados = await res.json();
    todosEnderecos = Array.isArray(dados) ? dados
        : Array.isArray(dados.data) ? dados.data
        : dados.data ? [dados.data] : [];

    enderecoAtivo = todosEnderecos.find(e => e.principal === 1 || e.principal === true) || todosEnderecos[0];

    if (!enderecoAtivo) {
        mostrarErroFatal("Nenhum endereço encontrado. Por favor, adicione um endereço no perfil antes de finalizar a compra.");
        return;
    }

    atualizarExibicaoEndereco();
    window.calcularFrete();

    if (loadingState) loadingState.classList.add('hidden');
    if (checkoutForm) {
        checkoutForm.classList.remove('hidden');
        checkoutForm.classList.add('flex');
    }
}

function atualizarExibicaoEndereco() {
    if (!enderecoAtivo || !txtEnderecoDestino) return;
    const compl = enderecoAtivo.complemento ? `, ${enderecoAtivo.complemento}` : '';
    txtEnderecoDestino.textContent = `${enderecoAtivo.rua}, ${enderecoAtivo.numero}${compl} — ${enderecoAtivo.cidade}/${enderecoAtivo.estado}`;
}

window.calcularFrete = function() {
    const tipo = document.querySelector('input[name="tipo_entrega"]:checked')?.value || 'correios';
    const avisoMotoboy = document.getElementById('avisoMotoboy');
    const labelFrete   = document.getElementById('labelFrete');

    if (tipo === 'retirada') {
        valorFrete = 0;
        if (valorFreteUI) valorFreteUI.textContent = "Grátis";
        if (labelFrete)   labelFrete.textContent   = "Loja Envia em até 3 Horas";
        if (avisoMotoboy) avisoMotoboy.classList.add('hidden');
    } else {
        if (labelFrete) labelFrete.textContent = "Valor do Frete (Sedex)";
        const cidade = (enderecoAtivo?.cidade || '').toLowerCase();
        const estado = enderecoAtivo?.estado || '';

        if (cidade.includes('cachoeiro')) {
            valorFrete = 35.00;
            if (valorFreteUI) valorFreteUI.textContent = `R$ 35,00 (Motoboy)`;
            if (avisoMotoboy) avisoMotoboy.classList.remove('hidden');
        } else {
            if (avisoMotoboy) avisoMotoboy.classList.add('hidden');
            const fretesPorEstado = { ES: 25, RJ: 30, SP: 35, MG: 40, PR: 45, SC: 45, RS: 50, BA: 55, DF: 55 };
            valorFrete = fretesPorEstado[estado] || 65.00;
            if (valorFreteUI) valorFreteUI.textContent = `R$ ${valorFrete.toFixed(2).replace('.', ',')} (Sedex)`;
        }
    }
    atualizarResumoValores();
};

function atualizarResumoValores() {
    const subtotal   = parseFloat(dadosCarrinho.subtotal || dadosCarrinho.resumo?.subtotal || 0);
    const totalItens = dadosCarrinho.itens?.reduce((acc, i) => acc + (i.quantidade || 1), 0) || 0;

    if (qtdItens)       qtdItens.textContent      = totalItens;
    if (resumoSubtotal) resumoSubtotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (resumoFrete)    resumoFrete.textContent    = valorFrete === 0 ? 'Grátis' : `R$ ${valorFrete.toFixed(2).replace('.', ',')}`;

    const divDesc = document.getElementById('linhaDesconto');
    const txtDesc = document.getElementById('resumoDesconto');
    if (valorDesconto > 0) {
        divDesc?.classList.remove('hidden');
        if (txtDesc) txtDesc.textContent = `- R$ ${valorDesconto.toFixed(2).replace('.', ',')}`;
    } else {
        divDesc?.classList.add('hidden');
    }

    totalGeral = Math.max(0, subtotal + valorFrete - valorDesconto);
    if (resumoTotal) resumoTotal.textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

// ==========================================
// 5. MODAL DE ENDEREÇOS
// ==========================================
window.abrirModalEnderecos = async function() {
    const modal = document.getElementById('modalEnderecos');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    await renderizarListaEnderecos();
};

window.fecharModalEnderecos = function() {
    const modal = document.getElementById('modalEnderecos');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('boxNovoEndereco').classList.add('hidden');
};

async function renderizarListaEnderecos() {
    const container = document.getElementById('listaEnderecosModal');
    container.innerHTML = `<div class="text-center text-gray-500 text-sm py-4 animate-pulse">Carregando...</div>`;

    try {
        const clienteId = cliente.id || cliente.cliente_id;
        const headers   = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, { headers });
        const dados = await res.json();
        todosEnderecos = Array.isArray(dados.data) ? dados.data : Array.isArray(dados) ? dados : [];

        if (!todosEnderecos.length) {
            container.innerHTML = `<p class="text-center text-gray-500 text-sm py-4">Nenhum endereço guardado.</p>`;
            return;
        }

        container.innerHTML = todosEnderecos.map(end => {
            const isAtivo = enderecoAtivo?.id === end.id;
            const compl   = end.complemento ? `, ${end.complemento}` : '';
            return `
                <div class="border ${isAtivo ? 'border-green-700 bg-green-900/10' : 'border-gray-800 bg-[#0a0a0a]'} rounded-lg p-4 flex items-start gap-3">
                    <span class="material-symbols-outlined text-[18px] mt-0.5 ${isAtivo ? 'text-green-400' : 'text-gray-600'}">${end.tipo === 'casa' ? 'home' : end.tipo === 'trabalho' ? 'business' : 'location_on'}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold uppercase text-gray-300">${end.tipo || 'Endereço'} ${end.principal ? '· Principal' : ''}</p>
                        <p class="text-xs text-gray-400 mt-1">${end.rua}, ${end.numero}${compl}</p>
                        <p class="text-xs text-gray-400">${end.bairro} — ${end.cidade}/${end.estado}</p>
                        ${end.cep ? `<p class="text-[10px] text-gray-600 mt-0.5">CEP: ${end.cep}</p>` : ''}
                    </div>
                    <button onclick="window.selecionarEndereco(${end.id})" class="text-xs px-3 py-1.5 rounded ${isAtivo ? 'bg-green-700 text-white' : 'border border-gray-700 text-gray-400 hover:border-white hover:text-white'} font-bold uppercase tracking-wide whitespace-nowrap transition-colors">
                        ${isAtivo ? '✓ Ativo' : 'Usar Este'}
                    </button>
                </div>`;
        }).join('');

        container.insertAdjacentHTML('beforeend', `
            <button onclick="document.getElementById('boxNovoEndereco').classList.toggle('hidden')"
                class="w-full border border-dashed border-gray-700 text-gray-500 hover:border-white hover:text-white text-xs py-3 rounded-lg uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[16px]">add_location_alt</span> Adicionar Novo Endereço
            </button>`);

    } catch (e) {
        container.innerHTML = `<p class="text-center text-red-500 text-sm py-4">Erro ao carregar endereços.</p>`;
    }
}

window.selecionarEndereco = function(endId) {
    enderecoAtivo = todosEnderecos.find(e => e.id === endId);
    atualizarExibicaoEndereco();
    window.calcularFrete();
    window.fecharModalEnderecos();
};

window.salvarNovoEndereco = async function() {
    const btn    = document.getElementById('btnSalvarEndereco');
    const tipo   = document.getElementById('novoEndTipo').value;
    const cep    = document.getElementById('novoEndCep').value.replace(/\D/g, '');
    const rua    = document.getElementById('novoEndRua').value.trim();
    const numero = document.getElementById('novoEndNumero').value.trim();
    const compl  = document.getElementById('novoEndComplemento').value.trim();
    const bairro = document.getElementById('novoEndBairro').value.trim();
    const cidade = document.getElementById('novoEndCidade').value.trim();
    const estado = document.getElementById('novoEndEstado').value;

    if (!rua || !numero || !bairro || !cidade || !estado || cep.length !== 8) {
        alert("Preencha todos os campos obrigatórios (*).");
        return;
    }

    if (btn) { btn.textContent = "Salvando..."; btn.disabled = true; }

    try {
        const clienteId = cliente.id || cliente.cliente_id;
        const headers   = await getAuthHeaders();
        const payload   = { tipo, rua, numero, bairro, cidade, estado, cep: `${cep.substring(0, 5)}-${cep.substring(5)}` };
        if (compl) payload.complemento = compl;
        if (!todosEnderecos.length) payload.principal = 1;

        const res  = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            document.getElementById('boxNovoEndereco').classList.add('hidden');
            await renderizarListaEnderecos();
            const novoId = data.data?.id;
            if (novoId) window.selecionarEndereco(novoId);
        } else {
            alert(data.message || "Erro ao salvar endereço.");
        }
    } catch (e) {
        alert("Falha de comunicação ao salvar endereço.");
    } finally {
        if (btn) { btn.textContent = "Salvar Endereço"; btn.disabled = false; }
    }
};

// ==========================================
// 6. FORMULÁRIOS DE PAGAMENTO
// ==========================================
window.alternarFormularioPagamento = function() {
    const metodo      = document.querySelector('input[name="metodo_pagamento"]:checked')?.value || 'pix';
    const fCartao     = document.getElementById('formCartao');
    const fGift       = document.getElementById('formGiftCard');
    const aviso       = document.getElementById('avisoMetodo');
    const boxParcelas = document.getElementById('boxParcelas');

    fCartao?.classList.add('hidden');  fCartao?.classList.remove('flex');
    fGift?.classList.add('hidden');    fGift?.classList.remove('flex');
    if (aviso) aviso.classList.add('hidden');

    if (metodo === 'credit') {
        fCartao?.classList.remove('hidden'); fCartao?.classList.add('flex');
        if (boxParcelas) boxParcelas.classList.remove('hidden');
        if (aviso) { aviso.classList.remove('hidden'); aviso.textContent = "💳 Cartão de Crédito — até 6x sem juros."; }
    } else if (metodo === 'debit') {
        fCartao?.classList.remove('hidden'); fCartao?.classList.add('flex');
        if (boxParcelas) boxParcelas.classList.add('hidden');
        if (aviso) { aviso.classList.remove('hidden'); aviso.textContent = "💳 Cartão de Débito — aprovação imediata."; }
    } else if (metodo === 'giftcard') {
        fGift?.classList.remove('hidden'); fGift?.classList.add('flex');
        if (aviso) { aviso.classList.remove('hidden'); aviso.textContent = "🎁 Gift Card — utilizará o saldo disponível no seu Cartão Presente."; }
    } else if (metodo === 'pix') {
        if (aviso) { aviso.classList.remove('hidden'); aviso.textContent = "⚡ PIX — aprovação em segundos. QR Code gerado após clicar em Finalizar."; }
    } else if (metodo === 'boleto') {
        if (aviso) { aviso.classList.remove('hidden'); aviso.textContent = "🏦 Boleto Bancário — compensação em até 2 dias úteis. O pedido é reservado no estoque."; }
    }
};

// Inicializa aviso do PIX (selecionado por padrão)
document.addEventListener('DOMContentLoaded', () => {
    window.alternarFormularioPagamento();
});

// ==========================================
// 7. MÁQUINA DE PAGAMENTO
// ==========================================
function getAsaasHeaders() {
    return { 'Content-Type': 'application/json', 'X-Security-Key': ASAAS_SECURITY_KEY };
}

if (btnPagar) {
    btnPagar.addEventListener('click', async () => {
        const metodo   = document.querySelector('input[name="metodo_pagamento"]:checked')?.value;
        const cpfRaw   = cpfCompradorInput?.value || '';
        const cpfLimpo = cpfRaw.replace(/\D/g, '');

        if (!cpfLimpo || cpfLimpo.length !== 11) {
            alert("Por favor, preencha um CPF válido (11 dígitos).");
            cpfCompradorInput?.focus();
            return;
        }

        const tipoEntrega = document.querySelector('input[name="tipo_entrega"]:checked')?.value || 'correios';
        if (!enderecoAtivo && tipoEntrega !== 'retirada' && metodo !== 'giftcard') {
            alert("Selecione um endereço de entrega.");
            return;
        }

        btnPagar.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Validando com o Banco...`;
        btnPagar.disabled  = true;

        try {
            const payloadBaseAsaas = {
                amount:      parseFloat(totalGeral.toFixed(2)),
                name:        cliente.nome_completo || cliente.nome || "Cliente Boutique Diniz",
                cpf:         cpfLimpo,
                email:       cliente.email || 'cliente@boutiquediniz.com',
                description: `Boutique Diniz${codigoCupomAtivo ? ' · Cupom: ' + codigoCupomAtivo : ''}`
            };

            let resultadoPagamento = null;

            if      (metodo === 'pix')      resultadoPagamento = await processarAsaasPix(payloadBaseAsaas);
            else if (metodo === 'boleto')   resultadoPagamento = await processarAsaasBoleto(payloadBaseAsaas);
            else if (metodo === 'credit')   resultadoPagamento = await processarAsaasCartao(payloadBaseAsaas, 'credit');
            else if (metodo === 'debit')    resultadoPagamento = await processarAsaasCartao(payloadBaseAsaas, 'debit');
            else if (metodo === 'giftcard') resultadoPagamento = await processarGiftCard();

            if (!resultadoPagamento?.success) {
                throw new Error(resultadoPagamento?.error || "Transação recusada.");
            }

            // Pós-pagamento
            if (metodo === 'pix' || metodo === 'boleto') {
                await finalizarPedidoNoBackEnd('aguardando', resultadoPagamento.paymentId, metodo);
                salvarTransacaoPendente({ metodo, payload: resultadoPagamento });
                recuperarTransacaoPendente({ metodo, payload: resultadoPagamento });
            } else {
                await finalizarPedidoNoBackEnd('aprovado', resultadoPagamento.paymentId || `TX-${metodo.toUpperCase()}-${Date.now()}`, metodo);
                window.mostrarTelaSucesso();
            }

        } catch (error) {
            alert(`⚠️ ${error.message}`);
            btnPagar.innerHTML = `<span class="material-symbols-outlined">lock</span> Finalizar Pagamento`;
            btnPagar.disabled  = false;
        }
    });
}

async function processarAsaasPix(payload) {
    const res  = await fetch(`${ASAAS_API_BASE}/pay/pix`, { method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Asaas PIX indisponível.");
    return data;
}

async function processarAsaasBoleto(payload) {
    const res  = await fetch(`${ASAAS_API_BASE}/pay/boleto`, { method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao gerar boleto.");
    return data;
}

async function processarAsaasCartao(payloadBase, tipo) {
    const numero   = document.getElementById('ccNumero')?.value.replace(/\D/g, '');
    const nome     = document.getElementById('ccNome')?.value;
    const validade = document.getElementById('ccValidade')?.value;
    const cvv      = document.getElementById('ccCvv')?.value;
    const parcelas = tipo === 'credit' ? (document.getElementById('ccParcelas')?.value || '1') : '1';

    if (!numero || !nome || !validade || !cvv) throw new Error("Preencha todos os dados do cartão.");

    // Valida CVV — obrigatório, 3 ou 4 dígitos
    const cvvLimpo = cvv.replace(/\D/g, '');
    if (cvvLimpo.length < 3 || cvvLimpo.length > 4) throw new Error("CVV inválido. Deve ter 3 ou 4 dígitos.");

    const partes = validade.split('/');
    if (partes.length !== 2) throw new Error("Validade inválida. Use MM/AA.");
    const expiryMonth = partes[0].padStart(2, '0');
    const expiryYear  = partes[1].length === 2 ? `20${partes[1]}` : partes[1];

    const endpoint = tipo === 'credit' ? '/pay/credit-card' : '/pay/debit-card';
    const payload  = {
        ...payloadBase,
        postalCode:    enderecoAtivo?.cep?.replace(/\D/g, '') || '',
        addressNumber: enderecoAtivo?.numero || '0',
        installments:  parseInt(parcelas),
        card: {
            holderName:  nome.toUpperCase(),
            number:      numero,
            expiryMonth,
            expiryYear,
            ccv:         cvvLimpo   // CVV validado e limpo
        }
    };

    const res  = await fetch(`${ASAAS_API_BASE}${endpoint}`, { method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Cartão recusado pela operadora.");
    return data;
}

async function processarGiftCard() {
    const numero = document.getElementById('giftNumero')?.value.replace(/\D/g, '');
    const cvv    = document.getElementById('giftCvv')?.value;
    if (!numero || !cvv) throw new Error("Preencha os dados do Cartão Presente.");

    const headers = await getAuthHeaders();

    // Passo 1 — busca pelo número para obter ID e saldo
    const resBusca = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/numero/${numero}`, { headers });
    const dadosBusca = await resBusca.json();
    if (!resBusca.ok || !dadosBusca.success) throw new Error(dadosBusca.message || "Cartão Presente não encontrado.");

    const cartaoId = dadosBusca.data.id;
    const saldo    = parseFloat(dadosBusca.data.saldo || 0);
    if (saldo < totalGeral) {
        throw new Error(`Saldo insuficiente no Gift Card. Disponível: R$ ${saldo.toFixed(2).replace('.', ',')} | Necessário: R$ ${totalGeral.toFixed(2).replace('.', ',')}`);
    }

    // Passo 2 — resgata pelo ID (rota correta: POST /api/cartoes/:id/resgatar)
    const resResgate = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/${cartaoId}/resgatar`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: parseFloat(totalGeral.toFixed(2)), codigo_seguranca: cvv })
    });
    const dadosResgate = await resResgate.json();
    if (!resResgate.ok || !dadosResgate.success) throw new Error(dadosResgate.message || "Erro ao resgatar Gift Card.");

    return { success: true, paymentId: `GIFT-${cartaoId}` };
}

// ==========================================
// 8. FINALIZAR PEDIDO NO BACKEND
// ==========================================
async function finalizarPedidoNoBackEnd(statusPagamento, idExternoGateway, metodo) {
    const clienteId   = cliente.id || cliente.cliente_id;
    const headers     = await getAuthHeaders();
    const headersJson = { ...headers, 'Content-Type': 'application/json' };

    const tipoEntrega   = document.querySelector('input[name="tipo_entrega"]:checked')?.value || 'correios';
    const isEntregaLoja = tipoEntrega === 'retirada';

    // Mapa para nomes aceitos pela API
    const mapaMetodo = { credit: 'credito', debit: 'debito', pix: 'pix', boleto: 'boleto', giftcard: 'giftcard' };
    const pagTipo    = mapaMetodo[metodo] || metodo;

    const payload = {
        cliente_id:                 clienteId,
        filial_origem_id:           1,
        endereco_entrega_id:        isEntregaLoja ? null : (enderecoAtivo?.id || null),
        tipo_entrega:               tipoEntrega,
        observacao_entrega:         isEntregaLoja ? 'Loja envia em até 3 horas' : undefined,
        pagamento_tipo:             pagTipo,
        pagamento_id_externo:       idExternoGateway,
        status_pagamento:           statusPagamento,
        pagamento_status_detalhado: statusPagamento === 'aprovado' ? 'approved' : 'pending',
        frete:                      valorFrete,
        cupom_codigo:               codigoCupomAtivo || undefined
    };

    // Parcelas (crédito)
    if (metodo === 'credit') {
        payload.pagamento_parcelas = parseInt(document.getElementById('ccParcelas')?.value || '1');
    }

    try {
        const res = await fetch(`${API_CONFIG.baseUrl}/api/pedidos`, {
            method: 'POST', headers: headersJson, body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.data?.id) localStorage.setItem('boutique_last_order_id', data.data.id);
        } else {
            console.error("API rejeitou o pedido:", await res.text());
        }
    } catch (e) {
        console.error("Erro ao criar pedido:", e);
    }

    // Limpa carrinho — rota oficial: DELETE /api/carrinho/:cliente_id
    try {
        await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${clienteId}`, { method: 'DELETE', headers: headersJson });
        localStorage.setItem('boutique_cart_qty', '0');
    } catch (e) {}
    localStorage.removeItem('boutique_dados_checkout');
}

// ==========================================
// 9. PIX — POLLING COM TIMEOUT DE 15 MINUTOS
// ==========================================
function salvarTransacaoPendente(dados) {
    localStorage.setItem('boutique_pending_tx', JSON.stringify(dados));
}

function recuperarTransacaoPendente(tx) {
    checkoutForm?.classList.add('hidden');
    loadingState?.classList.add('hidden');
    transactionState?.classList.remove('hidden');
    transactionState?.classList.add('flex');

    if (tx.metodo === 'pix') {
        const box = document.getElementById('boxPix');
        box?.classList.remove('hidden'); box?.classList.add('flex');

        let qrSrc = tx.payload.pix?.qrCodeImage || tx.payload.pix?.encodedImage || "";
        if (qrSrc && !qrSrc.startsWith('data:image') && !qrSrc.startsWith('http')) qrSrc = 'data:image/png;base64,' + qrSrc;
        const qrEl = document.getElementById('qrCodePix');
        if (qrEl) qrEl.src = qrSrc;

        const copiaEl = document.getElementById('copiaColaPix');
        if (copiaEl) copiaEl.value = tx.payload.pix?.copyPaste || tx.payload.pix?.payload || "";

        iniciarMonitoramentoPix(tx.payload.paymentId);

    } else if (tx.metodo === 'boleto') {
        const box = document.getElementById('boxBoleto');
        box?.classList.remove('hidden'); box?.classList.add('flex');
        const linkEl = document.getElementById('linkBoleto');
        if (linkEl) linkEl.href = tx.payload.boletoUrl || tx.payload.bankSlipUrl || '#';
    }
}

window.copiarPix = function() {
    const el = document.getElementById('copiaColaPix');
    if (el) { el.select(); document.execCommand('copy'); alert("Código PIX copiado! Cole no app do seu banco."); }
};

function iniciarMonitoramentoPix(paymentId) {
    if (pollingInterval) clearInterval(pollingInterval);
    if (pixTimeoutTimer) clearTimeout(pixTimeoutTimer);

    // Polling a cada 5 segundos
    pollingInterval = setInterval(async () => {
        try {
            const res  = await fetch(`${ASAAS_API_BASE}/payment/status/${paymentId}`, { headers: getAsaasHeaders() });
            const data = await res.json();
            if (data.success && data.paid === true) {
                encerrarMonitoramentoPix();
                await atualizarStatusPedidoInterno('aprovado', paymentId);
                window.mostrarTelaSucesso();
            }
        } catch (e) {}
    }, 5000);

    // TIMEOUT DE 15 MINUTOS: encerra o PIX automaticamente
    pixTimeoutTimer = setTimeout(() => {
        encerrarMonitoramentoPix();
        exibirPixExpirado();
    }, 15 * 60 * 1000); // 15 min em ms
}

function encerrarMonitoramentoPix() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
    if (pixTimeoutTimer) { clearTimeout(pixTimeoutTimer);  pixTimeoutTimer  = null; }
}

function exibirPixExpirado() {
    // Remove transação pendente do storage
    localStorage.removeItem('boutique_pending_tx');

    // Oculta o box do PIX e mostra mensagem de expirado
    const boxPix = document.getElementById('boxPix');
    if (boxPix) {
        boxPix.innerHTML = `
            <div class="flex flex-col items-center gap-4 py-6 px-4 text-center">
                <span class="material-symbols-outlined text-5xl text-yellow-500">timer_off</span>
                <h3 class="text-lg font-bold text-white">QR Code Expirado</h3>
                <p class="text-sm text-gray-400 max-w-xs">O tempo de 15 minutos esgotou e o código PIX foi cancelado. Você pode voltar ao carrinho e gerar um novo pedido.</p>
                <button onclick="window.location.href='carrinho.html'"
                    class="mt-2 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-gray-200 transition-colors">
                    Voltar ao Carrinho
                </button>
            </div>`;
    }
}

async function atualizarStatusPedidoInterno(status, paymentId) {
    try {
        const pedidoId = localStorage.getItem('boutique_last_order_id');
        if (!pedidoId) return;
        const headers = await getAuthHeaders();
        await fetch(`${API_CONFIG.baseUrl}/api/pedidos/${pedidoId}/status-pagamento`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pagamento: status, pagamento_id_externo: paymentId, pagamento_status_detalhado: 'approved' })
        });
    } catch (e) {}
}

window.concluirPedidoBoleto = function() {
    window.mostrarTelaSucesso();
};

window.mostrarTelaSucesso = function() {
    encerrarMonitoramentoPix();
    localStorage.removeItem('boutique_pending_tx');
    window.location.href = 'sucesso.html';
};
