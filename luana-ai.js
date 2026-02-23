/**
 * Assistente Virtual IA - Luana (Boutique Diniz)
 * Desenvolvido por Atlas Soluções — João Vitor
 */

const GROQ_API_KEY = "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";
const WHATSAPP_LOJA = "28999756923";

// ─────────────────────────────────────────────
// ESTILOS — tema preto/branco, scroll, mobile
// ─────────────────────────────────────────────
const luanaStyles = document.createElement('style');
luanaStyles.textContent = `
    #luanaChatWindow {
        display: flex !important;
        flex-direction: column;
        font-family: 'Montserrat', sans-serif;
    }
    #luanaChatWindow.hidden { display: none !important; }

    /* Scroll funcional */
    #luanaMessages {
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        scroll-behavior: smooth;
    }
    #luanaMessages::-webkit-scrollbar { width: 3px; }
    #luanaMessages::-webkit-scrollbar-track { background: transparent; }
    #luanaMessages::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

    /* Formatação das bolhas */
    .luana-msg { word-break: break-word; line-height: 1.6; }
    .luana-msg strong { font-weight: 700; }
    .luana-msg em { font-style: italic; opacity: 0.85; }
    .luana-msg ul { list-style: none; padding: 0; margin: 5px 0 2px; display: flex; flex-direction: column; gap: 3px; }
    .luana-msg ul li::before { content: "• "; color: #fff; font-weight: bold; }
    .luana-msg ol { padding-left: 18px; margin: 5px 0 2px; display: flex; flex-direction: column; gap: 3px; }
    .luana-msg p { margin: 0 0 5px; }
    .luana-msg p:last-child { margin-bottom: 0; }
    .luana-msg hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 7px 0; }

    /* Bolha do usuário: texto escuro em fundo branco */
    .luana-bubble-user strong { color: #000; }
    .luana-bubble-user ul li::before { color: #000; }

    /* Botão scroll para baixo */
    #luanaScrollBtn {
        position: absolute;
        bottom: 12px; right: 12px;
        width: 30px; height: 30px;
        background: #fff;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
    }
    #luanaScrollBtn.visible { opacity: 1; pointer-events: all; }
    #luanaScrollBtn span { color: #000; }

    /* Sem zoom no iOS */
    #luanaInput { font-size: 16px !important; }

    /* Mobile */
    @media (max-width: 480px) {
        #luanaChatWindow {
            width: calc(100vw - 16px) !important;
            height: calc(100dvh - 100px) !important;
            max-height: none !important;
            right: 8px !important;
            bottom: 80px !important;
            border-radius: 16px !important;
        }
    }

    /* Animação de entrada */
    @keyframes luanaPop {
        from { opacity: 0; transform: translateY(6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .luana-bubble { animation: luanaPop 0.18s ease-out forwards; }

    /* Dots de digitação */
    .luana-dot { width: 7px; height: 7px; border-radius: 50%; background: #555; }
    .luana-dot:nth-child(1) { animation: luanaBounce 1s 0.0s infinite; }
    .luana-dot:nth-child(2) { animation: luanaBounce 1s 0.18s infinite; }
    .luana-dot:nth-child(3) { animation: luanaBounce 1s 0.36s infinite; }
    @keyframes luanaBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-5px); opacity: 1; }
    }

    /* Focus do input */
    #luanaInput:focus { border-color: #fff !important; }

    /* Botão enviar hover */
    #luanaSendBtn:hover { background: #333 !important; }
`;
document.head.appendChild(luanaStyles);

// ─────────────────────────────────────────────
// HTML DO CHAT — tema preto/branco Boutique Diniz
// ─────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
    <div id="luanaChatWindow"
         class="hidden fixed bottom-24 right-4 md:right-6 w-[370px] max-w-[calc(100vw-16px)] bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl z-[100] transition-all duration-300 transform translate-y-4 opacity-0"
         style="height:520px;">

        <!-- Cabeçalho — preto com logo script -->
        <div style="background:#000; border-bottom:1px solid #222;" class="p-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-700">
                        <span class="material-symbols-outlined text-black text-2xl">face_3</span>
                    </div>
                    <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></span>
                </div>
                <div>
                    <h3 class="text-white font-bold text-sm leading-none tracking-wide">Luana</h3>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Boutique Diniz • Online</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <a href="https://wa.me/${WHATSAPP_LOJA}" target="_blank" title="Falar com atendente" class="text-gray-500 hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-[22px]">support_agent</span>
                </a>
                <button onclick="window.fecharChatLuana()" class="text-gray-500 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        </div>

        <!-- Mensagens -->
        <div class="relative flex-1 overflow-hidden" style="min-height:0;">
            <div id="luanaMessages" class="h-full p-4 flex flex-col gap-3 text-sm" style="background:#050505;"></div>
            <div id="luanaScrollBtn" onclick="window.luanaScrollBaixo()" title="Ir para o final">
                <span class="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
            </div>
        </div>

        <!-- Input -->
        <div class="p-3 flex gap-2 items-end flex-shrink-0 rounded-b-2xl" style="background:#0a0a0a; border-top:1px solid #1a1a1a;">
            <textarea
                id="luanaInput"
                rows="1"
                class="flex-1 rounded-2xl px-4 py-2.5 text-white outline-none resize-none leading-snug transition-colors"
                style="min-height:40px; max-height:100px; overflow-y:auto; background:#111; border:1px solid #2a2a2a;"
                placeholder="Digite sua dúvida..."
                oninput="window.luanaAutoResize(this)"
                onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); window.enviarMensagemLuana(); }"
            ></textarea>
            <button onclick="window.enviarMensagemLuana()" id="luanaSendBtn"
                class="w-10 h-10 rounded-full text-black flex items-center justify-center transition-all flex-shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style="background:#fff; box-shadow:0 2px 8px rgba(255,255,255,0.08);">
                <span class="material-symbols-outlined text-[18px]" style="color:#000;">send</span>
            </button>
        </div>
    </div>
`);

// ─────────────────────────────────────────────
// SYSTEM PROMPT — dados de treinamento completos
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Você se chama Luana. Você é a assistente virtual da Boutique Diniz, loja de moda feminina. Sempre que se apresentar, diga seu nome: "Olá! Sou a Luana, assistente virtual da Boutique Diniz."

FORMATAÇÃO OBRIGATÓRIA:
- Use **negrito** para informações importantes
- Use listas com "- " para enumerar opções ou passos
- Separe blocos com linha em branco
- Respostas curtas e diretas — nunca paredes de texto

SE PERGUNTAREM QUEM CRIOU VOCÊ:
Diga: "Fui desenvolvida pelo **Instituto Atlas Soluções**, com desenvolvimento de **João Vitor**." Não invente outras informações sobre o desenvolvimento.

REGRAS E INFORMAÇÕES DA BOUTIQUE DINIZ:

**CONTATO:**
- **WhatsApp:** (28) 99975-6923
- **Instagram:** @boutiquedinizz

**ENTREGAS:**
- Enviamos para todo o Brasil com rastreio
- Em Cachoeiro de Itapemirim (ES): retirada na loja física ou entrega via motoboy (taxa à parte)

**FORMAS DE PAGAMENTO** (processadas pelo banco ASAAS, 100% seguras):
- Pix, Cartão de Crédito, Débito ou Boleto Bancário
- Nunca realize pagamentos fora da plataforma ASAAS

**BOLETO BANCÁRIO:**
- Pode demorar até 48 horas úteis para o banco confirmar
- Após pagar o boleto, a cliente deve acessar o menu "Meus Pedidos" no site e atualizar o status do pagamento
- Se quiser trocar a forma de pagamento depois de emitir o boleto, basta acessar "Meus Pedidos" e escolher outra forma (Pix, Cartão de Crédito, Débito ou Gift Card)

**GIFT CARD:**
- A cliente pode presentear outra pessoa com um Gift Card da Boutique Diniz
- O Gift Card pode ser comprado diretamente pelo menu "Gift Card" no site
- Também pode ser adquirido presencialmente nas lojas físicas mais próximas da Boutique Diniz
- O valor do Gift Card é resgatado em roupas e cosméticos vendidos nas lojas físicas ou pelo site
- Gift Cards comprados não têm devolução do valor pago — apenas resgate em produtos

**NOTIFICAÇÕES:**
- Após uma compra pelo site, a cliente recebe notificações e e-mails automáticos lembrando sobre o pagamento e atualizações do pedido

**DEVOLUÇÕES E CANCELAMENTOS:**
- Roupas íntimas NÃO têm devolução
- Cancelamentos e devoluções devem ser solicitados exclusivamente pelo WhatsApp da loja ou presencialmente nas lojas físicas da Boutique Diniz
- A equipe avaliará cada caso conforme a política da loja

**CARTÃO DE DÉBITO/CRÉDITO:**
- Uma vez que a compra foi realizada e paga por cartão, não há devolução do valor
- Cancelamentos e reembolsos seguem a política da loja (contato pelo WhatsApp)`;

// ─────────────────────────────────────────────
// MEMÓRIA
// ─────────────────────────────────────────────
let historicoConversa = [];
try {
    const salvo = JSON.parse(localStorage.getItem('luana_memoria') || '[]');
    if (Array.isArray(salvo) && salvo.length > 0 && salvo[0]?.role === 'system') {
        salvo[0].content = SYSTEM_PROMPT; // Sempre atualiza para versão mais recente
        historicoConversa = salvo;
    }
} catch(e) {
    localStorage.removeItem('luana_memoria');
}
if (historicoConversa.length === 0) {
    historicoConversa.push({ role: "system", content: SYSTEM_PROMPT });
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────
function markdownParaHtml(texto) {
    if (!texto) return '';
    let h = texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    h = h.replace(/^---$/gm, '<hr>');
    h = h.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>[\s\S]+?<\/li>)(\n<li>[\s\S]+?<\/li>)*/g, match => `<ul>${match}</ul>`);
    h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    const blocos = h.split(/\n{2,}/);
    h = blocos.map(bloco => {
        bloco = bloco.trim();
        if (!bloco) return '';
        if (/^<(ul|ol|hr)/.test(bloco)) return bloco;
        bloco = bloco.replace(/\n/g, '<br>');
        return `<p>${bloco}</p>`;
    }).join('');

    return h;
}

window.luanaAutoResize = function(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
};

window.luanaScrollBaixo = function() {
    const box = document.getElementById('luanaMessages');
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
};

function luanaAdicionarBolha(html, tipo) {
    const box = document.getElementById('luanaMessages');
    if (!box) return null;

    const div = document.createElement('div');

    if (tipo === 'user') {
        // Bolha do usuário: branco com texto preto
        div.className = 'luana-bubble luana-msg luana-bubble-user self-end max-w-[85%] text-sm p-3 rounded-2xl rounded-tr-none';
        div.style.cssText = 'background:#fff; color:#000;';
    } else if (tipo === 'erro') {
        div.className = 'luana-bubble luana-msg self-start max-w-[85%] text-xs p-3 rounded-2xl rounded-tl-none';
        div.style.cssText = 'background:rgba(127,29,29,0.3); border:1px solid rgba(185,28,28,0.5); color:#fca5a5;';
    } else {
        // Bolha da IA: cinza escuro com texto branco
        div.className = 'luana-bubble luana-msg self-start max-w-[85%] text-sm p-3 rounded-2xl rounded-tl-none';
        div.style.cssText = 'background:#111; border:1px solid #222; color:#fff;';
    }

    div.innerHTML = html;
    box.appendChild(div);

    const distFinal = box.scrollHeight - box.scrollTop - box.clientHeight;
    if (distFinal < 120) {
        setTimeout(() => window.luanaScrollBaixo(), 40);
    }
    return div;
}

function configurarScrollDetector() {
    const box = document.getElementById('luanaMessages');
    const btn = document.getElementById('luanaScrollBtn');
    if (!box || !btn || btn._configured) return;
    btn._configured = true;
    box.addEventListener('scroll', () => {
        const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
        btn.classList.toggle('visible', dist > 80);
    }, { passive: true });
}

// ─────────────────────────────────────────────
// ABRIR / FECHAR
// ─────────────────────────────────────────────
window.abrirChatLuana = function() {
    const chat = document.getElementById('luanaChatWindow');
    chat.classList.remove('hidden');
    setTimeout(() => {
        chat.classList.remove('translate-y-4', 'opacity-0');
        chat.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    renderizarHistoricoVisual();
    configurarScrollDetector();
    setTimeout(() => {
        document.getElementById('luanaInput')?.focus();
        window.luanaScrollBaixo();
    }, 360);
};

window.fecharChatLuana = function() {
    const chat = document.getElementById('luanaChatWindow');
    chat.classList.remove('translate-y-0', 'opacity-100');
    chat.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => { chat.classList.add('hidden'); }, 300);
};

// ─────────────────────────────────────────────
// RENDERIZAR HISTÓRICO
// ─────────────────────────────────────────────
function renderizarHistoricoVisual() {
    const box = document.getElementById('luanaMessages');
    if (!box) return;
    box.innerHTML = '';

    luanaAdicionarBolha(
        'Olá! Sou a <strong>Luana</strong>, assistente virtual da Boutique Diniz. 🖤<br>Como posso ajudar você hoje?',
        'bot'
    );

    historicoConversa.forEach(msg => {
        if (msg.role === 'user') {
            luanaAdicionarBolha(
                msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'),
                'user'
            );
        } else if (msg.role === 'assistant') {
            luanaAdicionarBolha(markdownParaHtml(msg.content), 'bot');
        }
    });

    setTimeout(() => window.luanaScrollBaixo(), 100);
}

// ─────────────────────────────────────────────
// ENVIAR MENSAGEM
// ─────────────────────────────────────────────
let luanaEnviando = false;

window.enviarMensagemLuana = async function() {
    if (luanaEnviando) return;

    const input = document.getElementById('luanaInput');
    const sendBtn = document.getElementById('luanaSendBtn');
    const msg = input.value.trim();
    if (!msg) return;

    luanaEnviando = true;
    if (sendBtn) sendBtn.disabled = true;

    input.value = '';
    input.style.height = 'auto';
    luanaAdicionarBolha(
        msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'),
        'user'
    );

    historicoConversa.push({ role: "user", content: msg });

    const box = document.getElementById('luanaMessages');
    const typingDiv = document.createElement('div');
    typingDiv.style.cssText = 'background:#111; border:1px solid #222;';
    typingDiv.className = 'luana-bubble self-start flex gap-1.5 items-center p-3 rounded-2xl rounded-tl-none';
    typingDiv.innerHTML = '<div class="luana-dot"></div><div class="luana-dot"></div><div class="luana-dot"></div>';
    box.appendChild(typingDiv);
    setTimeout(() => window.luanaScrollBaixo(), 40);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: historicoConversa,
                temperature: 0.5,
                max_tokens: 400
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error?.message || `Erro ${response.status}`);
        }

        const respostaLuana = data.choices?.[0]?.message?.content;
        if (!respostaLuana) throw new Error("Resposta vazia da IA.");

        historicoConversa.push({ role: "assistant", content: respostaLuana });
        while (historicoConversa.length > 21) {
            historicoConversa.splice(1, 2);
        }
        localStorage.setItem('luana_memoria', JSON.stringify(historicoConversa));

        typingDiv.remove();
        luanaAdicionarBolha(markdownParaHtml(respostaLuana), 'bot');

    } catch (e) {
        typingDiv.remove();
        console.error("[Luana IA] Erro:", e.message);
        luanaAdicionarBolha(
            'Puxa, tive um probleminha aqui 🥺<br>Pode repetir? Se persistir, fala com a gente no <strong>WhatsApp</strong>!',
            'erro'
        );
        historicoConversa.pop();
    } finally {
        luanaEnviando = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
};
