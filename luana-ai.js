/**
 * Assistente Virtual IA - Luana (Boutique Diniz)
 * Desenvolvido por Atlas Soluções.
 */

const GROQ_API_KEY = "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";
const WHATSAPP_LOJA = "28999756923";

// ─────────────────────────────────────────────
// ESTILOS INJETADOS — scroll, formatação, mobile
// ─────────────────────────────────────────────
const luanaStyles = document.createElement('style');
luanaStyles.textContent = `
    #luanaChatWindow {
        display: flex !important;
        flex-direction: column;
    }
    #luanaChatWindow.hidden { display: none !important; }

    /* Scroll suave e sempre funcional */
    #luanaMessages {
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        scroll-behavior: smooth;
    }

    /* Scrollbar estilizada */
    #luanaMessages::-webkit-scrollbar { width: 4px; }
    #luanaMessages::-webkit-scrollbar-track { background: transparent; }
    #luanaMessages::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }

    /* Formatação das bolhas */
    .luana-msg { word-break: break-word; line-height: 1.6; }
    .luana-msg strong { font-weight: 700; }
    .luana-msg em { font-style: italic; opacity: 0.85; }
    .luana-msg ul { list-style: none; padding: 0; margin: 5px 0 2px; display: flex; flex-direction: column; gap: 3px; }
    .luana-msg ul li::before { content: "• "; color: #f472b6; font-weight: bold; }
    .luana-msg ol { padding-left: 18px; margin: 5px 0 2px; display: flex; flex-direction: column; gap: 3px; }
    .luana-msg p { margin: 0 0 5px; }
    .luana-msg p:last-child { margin-bottom: 0; }
    .luana-msg hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 7px 0; }

    /* Botão scroll para baixo */
    #luanaScrollBtn {
        position: absolute;
        bottom: 12px;
        right: 12px;
        width: 30px; height: 30px;
        background: #db2777;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    #luanaScrollBtn.visible { opacity: 1; pointer-events: all; }

    /* Input sem zoom no iOS (min 16px) */
    #luanaInput { font-size: 16px !important; }

    /* Mobile: tela quase inteira */
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

    /* Animação de entrada das bolhas */
    @keyframes luanaPop {
        from { opacity: 0; transform: translateY(6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .luana-bubble { animation: luanaPop 0.18s ease-out forwards; }

    /* Dots de digitação */
    .luana-dot { width: 7px; height: 7px; border-radius: 50%; background: #6b7280; }
    .luana-dot:nth-child(1) { animation: luanaBounce 1s 0.0s infinite; }
    .luana-dot:nth-child(2) { animation: luanaBounce 1s 0.18s infinite; }
    .luana-dot:nth-child(3) { animation: luanaBounce 1s 0.36s infinite; }
    @keyframes luanaBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30%  { transform: translateY(-5px); opacity: 1; }
    }
`;
document.head.appendChild(luanaStyles);

// ─────────────────────────────────────────────
// HTML DO CHAT
// ─────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
    <div id="luanaChatWindow" class="hidden fixed bottom-24 right-4 md:right-6 w-[370px] max-w-[calc(100vw-16px)] bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl z-[100] transition-all duration-300 transform translate-y-4 opacity-0" style="height:520px;">

        <!-- Cabeçalho -->
        <div class="bg-gradient-to-r from-pink-700 to-purple-800 p-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
                        <span class="material-symbols-outlined text-pink-600 text-2xl">face_3</span>
                    </div>
                    <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-purple-800"></span>
                </div>
                <div>
                    <h3 class="text-white font-bold text-sm leading-none">Luana</h3>
                    <p class="text-[10px] text-pink-200 uppercase tracking-widest mt-0.5">Assistente Virtual • Online</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <a href="https://wa.me/${WHATSAPP_LOJA}" target="_blank" title="Falar com atendente humano" class="text-white/70 hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-[22px]">support_agent</span>
                </a>
                <button onclick="window.fecharChatLuana()" class="text-white/70 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        </div>

        <!-- Área de mensagens com botão de scroll -->
        <div class="relative flex-1 overflow-hidden" style="min-height:0;">
            <div id="luanaMessages" class="h-full p-4 flex flex-col gap-3 text-sm bg-[#050505]"></div>
            <div id="luanaScrollBtn" onclick="window.luanaScrollBaixo()" title="Ir para o final">
                <span class="material-symbols-outlined text-white text-[18px]">keyboard_arrow_down</span>
            </div>
        </div>

        <!-- Input -->
        <div class="p-3 bg-[#0a0a0a] border-t border-gray-900 flex gap-2 items-end flex-shrink-0 rounded-b-2xl">
            <textarea
                id="luanaInput"
                rows="1"
                class="flex-1 bg-[#111] border border-gray-800 rounded-2xl px-4 py-2.5 text-white outline-none focus:border-pink-600 transition-colors resize-none leading-snug"
                placeholder="Digite sua dúvida..."
                style="min-height:40px; max-height:100px; overflow-y:auto;"
                oninput="window.luanaAutoResize(this)"
                onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); window.enviarMensagemLuana(); }"
            ></textarea>
            <button onclick="window.enviarMensagemLuana()" id="luanaSendBtn"
                class="w-10 h-10 bg-pink-700 hover:bg-pink-600 active:scale-95 rounded-full text-white flex items-center justify-center transition-all flex-shrink-0 shadow-lg shadow-pink-900/30 disabled:opacity-40 disabled:cursor-not-allowed">
                <span class="material-symbols-outlined text-[18px]">send</span>
            </button>
        </div>
    </div>
`);

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é a Luana, assistente virtual simpática e elegante da Boutique Diniz, loja de moda feminina. Responda de forma amigável e use emojis com moderação.

FORMATAÇÃO OBRIGATÓRIA:
- Use **negrito** para destacar informações importantes (ex: **Pix**, **WhatsApp**)
- Use listas com "- " quando listar opções ou passos
- Deixe uma linha em branco entre blocos de informação
- Respostas curtas para perguntas simples; um pouco mais detalhadas quando necessário
- Nunca escreva paredes de texto corrido

REGRAS DA LOJA:
1. **WhatsApp:** (28) 99975-6923
2. **Instagram:** @boutiquedinizz
3. **Entregas:** Todo o Brasil com rastreio. Em Cachoeiro de Itapemirim (ES): retirada na loja ou motoboy (taxa à parte).
4. **Pagamentos** (banco **ASAAS**, 100% seguros):
   - Pix, Cartão de Crédito, Débito ou Boleto
   - Boleto pode demorar até 48h úteis para confirmar
   - Nunca pague fora da plataforma ASAAS
5. **Devoluções:** Roupas íntimas **não têm devolução**. Cancelamentos e devoluções pós-envio: falar no WhatsApp.

Desenvolvedores: Instituto Atlas Soluções.`;

// ─────────────────────────────────────────────
// MEMÓRIA
// ─────────────────────────────────────────────
let historicoConversa = [];
try {
    const salvo = JSON.parse(localStorage.getItem('luana_memoria') || '[]');
    if (Array.isArray(salvo) && salvo.length > 0 && salvo[0]?.role === 'system') {
        salvo[0].content = SYSTEM_PROMPT;
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

// Converte Markdown simples → HTML seguro
function markdownParaHtml(texto) {
    if (!texto) return '';

    // Escapa HTML perigoso
    let h = texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Negrito e itálico
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Linha horizontal
    h = h.replace(/^---$/gm, '<hr>');

    // Listas: agrupa linhas consecutivas que começam com "- " ou "• "
    h = h.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>[\s\S]+?<\/li>)(\n<li>[\s\S]+?<\/li>)*/g, match => `<ul>${match}</ul>`);

    // Listas numeradas
    h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Quebras de linha duplas → parágrafos
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

// Auto-resize do textarea
window.luanaAutoResize = function(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
};

// Scroll para o fundo
window.luanaScrollBaixo = function() {
    const box = document.getElementById('luanaMessages');
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
};

// Adiciona bolha ao chat
function luanaAdicionarBolha(html, tipo) {
    const box = document.getElementById('luanaMessages');
    if (!box) return null;

    const estilos = {
        user: 'bg-pink-700 text-white p-3 rounded-2xl rounded-tr-none self-end max-w-[85%] text-sm',
        bot:  'bg-[#111] border border-gray-800 text-white p-3 rounded-2xl rounded-tl-none self-start max-w-[85%] text-sm',
        erro: 'bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-2xl rounded-tl-none self-start max-w-[85%] text-xs'
    };

    const div = document.createElement('div');
    div.className = `luana-bubble luana-msg ${estilos[tipo] || estilos.bot}`;
    div.innerHTML = html;
    box.appendChild(div);

    // Auto-scroll só se já estava perto do fundo
    const distFinal = box.scrollHeight - box.scrollTop - box.clientHeight;
    if (distFinal < 120) {
        setTimeout(() => window.luanaScrollBaixo(), 40);
    }

    return div;
}

// Detector de scroll: mostra botão quando não está no fundo
function configurarScrollDetector() {
    const box = document.getElementById('luanaMessages');
    const btn = document.getElementById('luanaScrollBtn');
    if (!box || !btn) return;
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

    // Saudação fixa
    luanaAdicionarBolha(
        'Olá maravilhosa! 🥰 Eu sou a <strong>Luana</strong>, assistente virtual da Boutique Diniz.<br>Como posso ajudar com os seus looks ou pedidos hoje?',
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

    // Bloqueia re-envio
    luanaEnviando = true;
    if (sendBtn) sendBtn.disabled = true;

    // 1. Mostra mensagem do usuário
    input.value = '';
    input.style.height = 'auto';
    luanaAdicionarBolha(
        msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'),
        'user'
    );

    // 2. Salva na memória
    historicoConversa.push({ role: "user", content: msg });

    // 3. Indicador de digitação
    const box = document.getElementById('luanaMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'luana-bubble bg-[#111] border border-gray-800 p-3 rounded-2xl rounded-tl-none self-start flex gap-1.5 items-center';
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
                temperature: 0.55,
                max_tokens: 400
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error?.message || `Erro ${response.status}`);
        }

        const respostaLuana = data.choices?.[0]?.message?.content;
        if (!respostaLuana) throw new Error("Resposta vazia da IA.");

        // 4. Salva na memória e limita tamanho
        historicoConversa.push({ role: "assistant", content: respostaLuana });
        while (historicoConversa.length > 21) {
            historicoConversa.splice(1, 2); // Remove par antigo, preserva system prompt
        }
        localStorage.setItem('luana_memoria', JSON.stringify(historicoConversa));

        // 5. Exibe resposta formatada
        typingDiv.remove();
        luanaAdicionarBolha(markdownParaHtml(respostaLuana), 'bot');

    } catch (e) {
        typingDiv.remove();
        console.error("[Luana IA] Erro:", e.message);
        luanaAdicionarBolha(
            'Puxa, tive um probleminha aqui 🥺<br>Pode repetir a pergunta? Se o erro continuar, fala comigo no <strong>WhatsApp</strong>!',
            'erro'
        );
        historicoConversa.pop(); // Remove a tentativa corrompida
    } finally {
        luanaEnviando = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
};
