import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const ASAAS_API_BASE = "https://round-union-6fef.vitortullijoao.workers.dev";
const ASAAS_SECURITY_KEY = "1526105"; 

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
const cpfCompradorInput = document.getElementById('cpfComprador');

let cliente = null;
let enderecoAtivo = null;
let dadosCarrinho = null;
let valorFrete = 0;
let valorDesconto = 0;
let codigoCupomAtivo = null;
let totalGeral = 0;
let pollingInterval = null;

function bootApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarCheckout);
    } else {
        iniciarCheckout();
    }
}
bootApp();

function mostrarErroFatal(mensagem) {
    if (loadingState) {
        loadingState.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
            <h3 class="text-xl font-bold text-white text-center">Ops, falha na verificação!</h3>
            <p class="text-sm text-gray-400 text-center max-w-sm mt-2">${mensagem}</p>
            <button onclick="window.location.href='carrinho.html'" class="mt-6 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-gray-200 transition-colors">Voltar ao Carrinho</button>
        `;
    }
}

async function iniciarCheckout() {
    try {
        const transacaoPendente = localStorage.getItem('boutique_pending_tx');
        if (transacaoPendente) {
            const txData = JSON.parse(transacaoPendente);
            const sessaoStr = localStorage.getItem('boutique_diniz_session');
            if(sessaoStr) cliente = JSON.parse(atob(sessaoStr)).usuario;
            recuperarTransacaoPendente(txData);
            return;
        }

        const sessaoStr = localStorage.getItem('boutique_diniz_session');
        const carrinhoStr = localStorage.getItem('boutique_dados_checkout');

        if (!sessaoStr || !carrinhoStr) {
            mostrarErroFatal("Não conseguimos ler os dados do seu carrinho. Pode ter expirado.");
            return;
        }

        const sessao = JSON.parse(atob(sessaoStr));
        dadosCarrinho = JSON.parse(carrinhoStr);
        cliente = sessao.usuario;
        
        if(cpfCompradorInput && cliente.cpf) {
            cpfCompradorInput.value = cliente.cpf;
        }
        
        renderizarItensDoPedido();
        await buscarEnderecoEcalcularFrete();

    } catch (e) {
        mostrarErroFatal("Erro interno de comunicação. Verifique a sua conexão de rede.");
    }
}

if(cpfCompradorInput) {
    cpfCompradorInput.addEventListener('input', function (e) {
        let v = e.target.value.replace(/\D/g,"");
        v = v.replace(/(\d{3})(\d)/,"$1.$2");
        v = v.replace(/(\d{3})(\d)/,"$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2");
        e.target.value = v;
    });
}

function resolverImagem(caminho) {
    if (!caminho) return 'https://via.placeholder.com/100/111/fff?text=Sem+Foto';
    if (caminho.startsWith('data:image') || caminho.startsWith('http')) return caminho;
    if (caminho.length > 200) return `data:image/jpeg;base64,${caminho}`;
    return `${API_CONFIG.baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

function renderizarItensDoPedido() {
    if (!dadosCarrinho || !dadosCarrinho.itens || dadosCarrinho.itens.length === 0) {
        mostrarErroFatal("O seu carrinho parece estar vazio.");
        return;
    }

    let htmlItens = '';
    dadosCarrinho.itens.forEach(item => {
        const qtd = item.quantidade || 1;
        const variante = item.produto_variante || item.variante || item || {};
        const produto = variante.produto || item.produto || item || {};
        const nome = produto.nome || item.produto_nome || "Peça Exclusiva";
        const tamanho = variante.tamanho || item.tamanho || "N/D";
        const cor = variante.cor || item.cor || "N/D";
        const preco = parseFloat(produto.preco || item.preco || 0);
        let imgFinal = (produto.imagens && produto.imagens.length > 0) ? (produto.imagens[0].base64 || produto.imagens[0].caminho) : item.imagem;

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
    if(listaItensCompra) listaItensCompra.innerHTML = htmlItens;
}

// ==========================================
// 3. API DE CUPOM E CÁLCULO DE VALORES
// ==========================================
window.aplicarCupom = async function() {
    const inputCupom = document.getElementById('inputCupom');
    const codigo = inputCupom.value.trim().toUpperCase();
    if (!codigo) return;

    const btn = document.getElementById('btnAplicarCupom');
    btn.innerText = "...";
    btn.disabled = true;

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/cupons/validar`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo: codigo,
                valor_carrinho: dadosCarrinho.subtotal
            })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success && data.data.valido) {
            codigoCupomAtivo = codigo;
            valorDesconto = parseFloat(data.data.desconto);
            alert(`Cupom ${codigo} aplicado! Desconto de R$ ${valorDesconto.toFixed(2).replace('.', ',')}`);
            inputCupom.disabled = true;
            btn.innerText = "ATIVO";
            btn.classList.replace('bg-gray-800', 'bg-green-700');
            atualizarResumoValores();
        } else {
            alert(data.message || "Cupom inválido ou esgotado.");
            btn.innerText = "APLICAR";
            btn.disabled = false;
        }
    } catch (e) {
        alert("Erro de rede ao validar cupom.");
        btn.innerText = "APLICAR";
        btn.disabled = false;
    }
}

async function buscarEnderecoEcalcularFrete() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${cliente.id}/enderecos`, { headers });
    if (!res.ok) throw new Error("Erro na API de endereços.");

    const dados = await res.json();
    let enderecos = [];
    if (Array.isArray(dados)) enderecos = dados;
    else if (dados.data) enderecos = Array.isArray(dados.data) ? dados.data : [dados.data];

    enderecoAtivo = enderecos.find(e => e.principal) || enderecos[0];

    if (!enderecoAtivo) {
        mostrarErroFatal("Você precisa salvar o seu endereço no carrinho antes de pagar.");
        return;
    }

    if (txtEnderecoDestino) txtEnderecoDestino.innerText = `${enderecoAtivo.rua}, ${enderecoAtivo.numero} - ${enderecoAtivo.cidade}/${enderecoAtivo.estado}`;
    
    window.calcularFrete(); 

    if (loadingState) loadingState.classList.add('hidden');
    if (checkoutForm) {
        checkoutForm.classList.remove('hidden');
        checkoutForm.classList.add('flex');
    }
}

window.calcularFrete = function() {
    const tipo = document.querySelector('input[name="tipo_entrega"]:checked').value;
    if (tipo === 'retirada') {
        valorFrete = 0;
        if(valorFreteUI) valorFreteUI.innerText = "Grátis";
    } else {
        if (enderecoAtivo.cidade.toLowerCase().includes('cachoeiro de itapemirim')) {
            valorFrete = 35.00;
        } else {
            const fretesBase = { 'ES': 25, 'RJ': 30, 'SP': 35, 'MG': 40 };
            valorFrete = fretesBase[enderecoAtivo.estado] || 65.00;
        }
        if(valorFreteUI) valorFreteUI.innerText = `R$ ${valorFrete.toFixed(2).replace('.', ',')} (Sedex)`;
    }
    atualizarResumoValores();
}

function atualizarResumoValores() {
    if(qtdItens) qtdItens.innerText = dadosCarrinho.itens.reduce((acc, item) => acc + (item.quantidade || 1), 0);
    if(resumoSubtotal) resumoSubtotal.innerText = `R$ ${dadosCarrinho.subtotal.toFixed(2).replace('.', ',')}`;
    if(resumoFrete) resumoFrete.innerText = valorFrete === 0 ? 'Grátis' : `R$ ${valorFrete.toFixed(2).replace('.', ',')}`;
    
    const divDesconto = document.getElementById('linhaDesconto');
    const txtDesconto = document.getElementById('resumoDesconto');
    if (valorDesconto > 0) {
        if(divDesconto) divDesconto.classList.remove('hidden');
        if(txtDesconto) txtDesconto.innerText = `- R$ ${valorDesconto.toFixed(2).replace('.', ',')}`;
    }
    
    totalGeral = dadosCarrinho.subtotal + valorFrete - valorDesconto;
    if(totalGeral < 0) totalGeral = 0; // Prevenção contra cupom maior que total
    
    if(resumoTotal) resumoTotal.innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

window.alternarFormularioPagamento = function() {
    const metodo = document.querySelector('input[name="metodo_pagamento"]:checked').value;
    const fCartao = document.getElementById('formCartao');
    const fGift = document.getElementById('formGiftCard');

    if(fCartao) fCartao.classList.add('hidden');
    if(fGift) fGift.classList.add('hidden');

    if (metodo === 'credit' && fCartao) {
        fCartao.classList.remove('hidden');
        fCartao.classList.add('flex');
    } else if (metodo === 'giftcard' && fGift) {
        fGift.classList.remove('hidden');
        fGift.classList.add('flex');
    }
}

// ==========================================
// 4. MÁQUINA DE PAGAMENTO ASAAS
// ==========================================
if(btnPagar) {
    btnPagar.addEventListener('click', async () => {
        const metodo = document.querySelector('input[name="metodo_pagamento"]:checked').value;
        const cpfRaw = cpfCompradorInput ? cpfCompradorInput.value : '';
        const cpfLimpo = cpfRaw.replace(/\D/g, '');
        
        if (!cpfLimpo || cpfLimpo.length !== 11) {
            alert("Por favor, preencha um CPF válido (11 dígitos).");
            if(cpfCompradorInput) cpfCompradorInput.focus();
            return;
        }

        btnPagar.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Validando com o Banco...`;
        btnPagar.disabled = true;

        try {
            let resultadoPagamento = null;
            const payloadBaseAsaas = {
                amount: parseFloat(totalGeral.toFixed(2)), 
                name: cliente.nome_completo || cliente.nome || "Cliente Boutique Diniz",
                cpf: cpfLimpo, 
                email: cliente.email || 'cliente@boutiquediniz.com',
                description: `Boutique Diniz - Pedido de Roupas ${codigoCupomAtivo ? '(Cupom: '+codigoCupomAtivo+')' : ''}`
            };

            if (metodo === 'pix') resultadoPagamento = await processarAsaasPix(payloadBaseAsaas);
            else if (metodo === 'boleto') resultadoPagamento = await processarAsaasBoleto(payloadBaseAsaas);
            else if (metodo === 'credit') resultadoPagamento = await processarAsaasCartaoCredito(payloadBaseAsaas);
            else if (metodo === 'giftcard') resultadoPagamento = await processarGiftCardInterno();

            if (!resultadoPagamento || !resultadoPagamento.success) {
                throw new Error(resultadoPagamento?.error || "Transação rejeitada.");
            }

            if (metodo === 'pix' || metodo === 'boleto') {
                await finalizarPedidoNoBackEnd('aguardando', resultadoPagamento.paymentId);
                salvarTransacaoPendente({ metodo, payload: resultadoPagamento });
                recuperarTransacaoPendente({ metodo, payload: resultadoPagamento });
            } else {
                await finalizarPedidoNoBackEnd('aprovado', resultadoPagamento.paymentId || 'TX-GIFT');
                mostrarTelaSucesso();
            }

        } catch (error) {
            alert(`Aviso do Banco:\n${error.message}`);
            btnPagar.innerHTML = `<span class="material-symbols-outlined">lock</span> Finalizar Pagamento`;
            btnPagar.disabled = false;
        }
    });
}

function getAsaasHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Security-Key': ASAAS_SECURITY_KEY 
    };
}

async function processarAsaasPix(payloadBase) {
    const res = await fetch(`${ASAAS_API_BASE}/pay/pix`, { method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payloadBase) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Servidor Asaas Indisponível");
    return data;
}

async function processarAsaasBoleto(payloadBase) {
    const res = await fetch(`${ASAAS_API_BASE}/pay/boleto`, { method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payloadBase) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Erro ao gerar o seu boleto.");
    return data;
}

async function processarAsaasCartaoCredito(payloadBase) {
    const numero = document.getElementById('ccNumero').value.replace(/\D/g, ''); 
    const nome = document.getElementById('ccNome').value;
    const validade = document.getElementById('ccValidade').value;
    const cvv = document.getElementById('ccCvv').value;
    const parcelas = document.getElementById('ccParcelas').value;

    if(!numero || !nome || !validade || !cvv) throw new Error("Preencha todos os dados do cartão.");
    const partesValidade = validade.split('/');
    if(partesValidade.length !== 2) throw new Error("Validade inválida. Use o formato MM/AA");

    const payloadCartao = {
        ...payloadBase,
        postalCode: enderecoAtivo.cep.replace(/\D/g, ''), 
        addressNumber: enderecoAtivo.numero,
        installments: parseInt(parcelas),
        card: { holderName: nome.toUpperCase(), number: numero, expiryMonth: partesValidade[0], expiryYear: partesValidade[1].length === 2 ? `20${partesValidade[1]}` : partesValidade[1], ccv: cvv }
    };
    
    const res = await fetch(`${ASAAS_API_BASE}/pay/credit-card`, { method: 'POST', headers: getAsaasHeaders(), body: JSON.stringify(payloadCartao) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "O Cartão de Crédito foi recusado pela operadora.");
    return data;
}

async function processarGiftCardInterno() {
    const numero = document.getElementById('giftNumero').value;
    const cvv = document.getElementById('giftCvv').value;
    if(!numero || !cvv) throw new Error("Preencha os dados do Cartão Presente da loja.");

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_CONFIG.baseUrl}/api/cartoes/resgatar`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: numero, codigo_seguranca: cvv, valor: totalGeral })
    });
    const data = await res.json();
    if(res.ok && data.success) return { success: true, paymentId: `GIFT-${data.data.id}` };
    else throw new Error(data.message || "Saldo insuficiente no cartão presente.");
}

function salvarTransacaoPendente(dados) {
    localStorage.setItem('boutique_pending_tx', JSON.stringify(dados));
}

function recuperarTransacaoPendente(tx) {
    if(checkoutForm) checkoutForm.classList.add('hidden');
    if(loadingState) loadingState.classList.add('hidden');
    if(transactionState) {
        transactionState.classList.remove('hidden');
        transactionState.classList.add('flex');
    }

    if (tx.metodo === 'pix') {
        const boxPix = document.getElementById('boxPix');
        if(boxPix) { boxPix.classList.remove('hidden'); boxPix.classList.add('flex'); }
        
        let qrSrc = tx.payload.pix.qrCodeImage || tx.payload.pix.encodedImage || "";
        if (qrSrc && !qrSrc.startsWith('data:image') && !qrSrc.startsWith('http')) {
            qrSrc = 'data:image/png;base64,' + qrSrc;
        }
        
        document.getElementById('qrCodePix').src = qrSrc;
        document.getElementById('copiaColaPix').value = tx.payload.pix.copyPaste || tx.payload.pix.payload;
        iniciarMonitoramentoPix(tx.payload.paymentId);
    } else if (tx.metodo === 'boleto') {
        const boxBoleto = document.getElementById('boxBoleto');
        if(boxBoleto) { boxBoleto.classList.remove('hidden'); boxBoleto.classList.add('flex'); }
        document.getElementById('linkBoleto').href = tx.payload.boletoUrl;
    }
}

window.copiarPix = function() {
    const copyText = document.getElementById("copiaColaPix");
    copyText.select();
    document.execCommand("copy");
    alert("Código PIX copiado!");
}

function iniciarMonitoramentoPix(paymentId) {
    if (pollingInterval) clearInterval(pollingInterval);
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
    // Boleto leva para a página da animação também, pois o pedido já está finalizado!
    mostrarTelaSucesso();
}

async function finalizarPedidoNoBackEnd(statusPagamento, idExternoGateway) {
    try {
        const headers = await getAuthHeaders();
        const headersJson = { ...headers, 'Content-Type': 'application/json' };
        
        const payloadPedido = {
            cliente_id: cliente.id,
            endereco_id: enderecoAtivo.id,
            tipo_entrega: document.querySelector('input[name="tipo_entrega"]:checked')?.value || 'correios',
            valor_frete: valorFrete,
            cupom_codigo: codigoCupomAtivo,
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
            if (dataPedido.data && dataPedido.data.id) localStorage.setItem('boutique_last_order_id', dataPedido.data.id);

            [span_1](start_span)// GATILHO OFICIAL: Limpa e Esvazia o Carrinho no Banco de Dados[span_1](end_span)
            await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${cliente.id}/limpar`, { 
                method: 'POST', 
                headers: headersJson 
            });
            localStorage.setItem('boutique_cart_qty', '0'); 
        }
    } catch (e) {}
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
    
    // REDIRECIONA PARA A TELA DE SUCESSO COM ANIMAÇÃO!
    window.location.href = 'sucesso.html';
}
