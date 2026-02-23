/**
 * Gerenciador de Layout Global - Boutique Diniz
 * Injeta Cabeçalho, Rodapé Premium, Assistente Luana e Ferramentas de Acessibilidade.
 * Desenvolvido por Atlas Soluções — João Vitor
 */

import './luana-ai.js';

const anoAtual = new Date().getFullYear();

// ==========================================
// CABEÇALHO — preto e branco, sem rosa/roxo
// ==========================================
const headerHTML = `
    <div id="authBanner" class="w-full bg-[#0a0a0a] text-center py-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 border-b border-white/5 transition-colors">
        Carregando...
    </div>

    <header class="sticky top-0 w-full z-40 bg-black/90 backdrop-blur-xl border-b border-white/5 transition-all supports-[backdrop-filter]:bg-black/70">
        <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">

            <a href="site.html" class="flex-shrink-0 group">
                <h1 class="font-logo text-3xl md:text-4xl text-white font-['Satisfy'] group-hover:opacity-70 transition-opacity">Boutique Diniz</h1>
            </a>

            <div class="flex-1 max-w-xl relative hidden md:block">
                <input type="text" id="searchInput"
                    class="w-full bg-[#0a0a0a] border border-white/10 rounded-full px-6 py-2.5 text-sm text-gray-300 focus:border-white/30 focus:bg-black outline-none transition-all"
                    placeholder="Buscar peças exclusivas...">
                <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">search</span>
                </button>
            </div>

            <div class="flex items-center gap-4 md:gap-6 relative">
                <button class="md:hidden text-gray-300 hover:text-white transition-colors"
                    onclick="document.getElementById('mobileSearch').classList.toggle('hidden')">
                    <span class="material-symbols-outlined">search</span>
                </button>

                <a href="carrinho.html" class="relative text-gray-300 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">local_mall</span>
                    <span id="cartCount"
                        class="absolute -top-1 -right-2 bg-white text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">0</span>
                </a>

                <div class="relative z-50">
                    <button id="btnUserMenu"
                        class="flex items-center text-gray-300 hover:text-white transition-colors py-2">
                        <span class="material-symbols-outlined">person</span>
                    </button>
                    <div id="dropdownUserMenu"
                        class="hidden absolute right-0 mt-4 w-64 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden origin-top-right transition-all">
                        <div id="userMenuContent" class="flex flex-col text-sm font-light font-['Montserrat']"></div>
                    </div>
                </div>
            </div>
        </div>

        <div id="mobileSearch"
            class="hidden w-full bg-black/95 p-4 border-t border-white/10 md:hidden absolute top-full left-0 z-40 backdrop-blur-xl">
            <div class="relative">
                <input type="text" id="searchInputMobile"
                    class="w-full bg-[#111] border border-white/10 rounded-full px-4 py-3 text-sm text-white focus:border-white/30 outline-none"
                    placeholder="O que você procura hoje?">
                <button class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <span class="material-symbols-outlined">search</span>
                </button>
            </div>
        </div>
    </header>
`;

// ==========================================
// RODAPÉ PREMIUM — preto e branco
// ==========================================
const footerHTML = `
    <footer class="bg-[#050505] border-t border-white/5 pt-16 pb-8 mt-auto font-['Montserrat']">
        <div class="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

            <!-- Marca -->
            <div class="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                <a href="site.html">
                    <h2 class="font-logo text-5xl text-white font-['Satisfy'] hover:opacity-70 transition-opacity">Boutique Diniz</h2>
                </a>
                <p class="text-[10px] uppercase tracking-[0.3em] text-gray-600">Moda Feminina</p>
                <p class="text-gray-500 text-sm font-light max-w-xs leading-relaxed">
                    Elegância, conforto e as últimas tendências para a mulher moderna.
                </p>

                <!-- Redes sociais — preto e branco -->
                <div class="flex gap-3 mt-2">
                    <!-- Instagram -->
                    <a href="https://www.instagram.com/boutiquedinizz" target="_blank"
                        title="Instagram"
                        class="group w-11 h-11 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center hover:bg-white hover:border-white transition-all duration-300">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.073-4.947-.2-4.354-2.617-6.782-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                    </a>
                    <!-- WhatsApp -->
                    <a href="https://api.whatsapp.com/send?phone=5528999756923&text=Olá!%20Vim%20do%20site%20da%20Boutique%20Diniz." target="_blank"
                        title="WhatsApp"
                        class="group w-11 h-11 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center hover:bg-white hover:border-white transition-all duration-300">
                        <svg class="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                    </a>
                </div>
            </div>

            <!-- Navegação -->
            <div class="md:col-span-3 flex flex-col items-center md:items-start text-center md:text-left">
                <h3 class="text-white font-bold mb-6 uppercase tracking-[0.25em] text-[10px] border-b border-white/10 pb-2 w-full">Navegação</h3>
                <ul class="space-y-3 text-sm text-gray-500 font-light w-full">
                    <li><a href="site.html"             class="hover:text-white transition-colors flex items-center gap-2 group"><span class="material-symbols-outlined text-[13px] opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span> Início</a></li>
                    <li><a href="site.html#colecao"     class="hover:text-white transition-colors flex items-center gap-2 group"><span class="material-symbols-outlined text-[13px] opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span> Coleção</a></li>
                    <li><a href="gift-card.html"        class="hover:text-white transition-colors flex items-center gap-2 group"><span class="material-symbols-outlined text-[13px] opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span> Gift Card</a></li>
                    <li><a href="carrinho.html"         class="hover:text-white transition-colors flex items-center gap-2 group"><span class="material-symbols-outlined text-[13px] opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span> Carrinho</a></li>
                    <li><a href="minhas-compras.html"   class="hover:text-white transition-colors flex items-center gap-2 group"><span class="material-symbols-outlined text-[13px] opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span> Meus Pedidos</a></li>
                    <li><a href="minha-conta.html"      class="hover:text-white transition-colors flex items-center gap-2 group"><span class="material-symbols-outlined text-[13px] opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span> Minha Conta</a></li>
                </ul>
            </div>

            <!-- Atendimento -->
            <div class="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                <h3 class="text-white font-bold mb-6 uppercase tracking-[0.25em] text-[10px] border-b border-white/10 pb-2 w-full">Atendimento</h3>
                <p class="text-gray-500 text-sm font-light mb-4">
                    Precisa de ajuda? Fale com a gente pelo WhatsApp ou converse com a Luana IA.
                </p>
                <a href="https://api.whatsapp.com/send?phone=5528999756923" target="_blank"
                    class="inline-flex items-center gap-2 bg-[#0a0a0a] border border-white/10 px-5 py-3 rounded-full hover:bg-white hover:border-white group transition-all">
                    <svg class="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span class="text-sm text-gray-300 group-hover:text-black font-bold transition-colors">(28) 99975-6923</span>
                </a>
                <div class="mt-5 text-gray-600 text-xs leading-relaxed">
                    <p class="uppercase tracking-widest text-[9px] mb-1 text-gray-700">Horário de Atendimento</p>
                    Seg. a Sex. — 9h às 18h<br>Sábado — 9h às 13h
                </div>
            </div>
        </div>

        <!-- Rodapé inferior -->
        <div class="max-w-7xl mx-auto px-8 mt-14 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-700 gap-3 uppercase tracking-widest">
            <p>&copy; ${anoAtual} Boutique Diniz. Todos os direitos reservados.</p>
            <p class="flex items-center gap-1.5">
                Desenvolvido com
                <span class="material-symbols-outlined text-[11px] text-white/30">favorite</span>
                por <span class="text-gray-500 font-bold ml-1">Atlas Soluções</span>
            </p>
        </div>
    </footer>
`;

// ==========================================
// BOTÃO LUANA — glassmorphism estilo Apple
// ==========================================
const estilosLuana = document.createElement('style');
estilosLuana.textContent = `
    /* Botão flutuante Luana — vidro preto */
    #btnLuanaChat {
        position: fixed;
        bottom: 24px; right: 24px;
        width: 56px; height: 56px;
        border-radius: 50%;
        z-index: 90;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(15, 15, 15, 0.72);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        box-shadow:
            0 8px 32px rgba(0,0,0,0.6),
            0 2px 8px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease, background 0.2s ease;
        animation: luanaFloat 3s ease-in-out infinite;
    }
    #btnLuanaChat:hover {
        transform: scale(1.12);
        background: rgba(30, 30, 30, 0.85);
        box-shadow:
            0 12px 40px rgba(0,0,0,0.7),
            0 4px 12px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.15);
    }
    #btnLuanaChat:active { transform: scale(0.96); }
    #btnLuanaChat .luana-icon { color: #fff; font-size: 24px; }

    /* Tooltip */
    #btnLuanaChat .luana-tooltip {
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        background: rgba(10,10,10,0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 8px 14px;
        border-radius: 10px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    #btnLuanaChat:hover .luana-tooltip { opacity: 1; }

    /* Ponto verde online */
    #btnLuanaChat .luana-online {
        position: absolute;
        top: 2px; right: 2px;
        width: 11px; height: 11px;
        background: #22c55e;
        border-radius: 50%;
        border: 2px solid rgba(0,0,0,0.8);
    }

    /* Flutuação suave */
    @keyframes luanaFloat {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-4px); }
    }
    #btnLuanaChat:hover { animation: none; }

    /* ─── MENU ACESSIBILIDADE — recolhido por padrão ─── */
    #acessibilidadeToggle {
        position: fixed;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 50;
        width: 24px;
        height: 64px;
        background: rgba(15,15,15,0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.1);
        border-left: none;
        border-radius: 0 10px 10px 0;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: width 0.25s ease, background 0.2s;
        overflow: hidden;
    }
    #acessibilidadeToggle:hover {
        background: rgba(30,30,30,0.85);
    }

    /* Painel de acessibilidade */
    #acessibilidadePanel {
        position: fixed;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 49;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 8px;
        background: rgba(10,10,10,0.80);
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
        border: 1px solid rgba(255,255,255,0.1);
        border-left: none;
        border-radius: 0 14px 14px 0;
        box-shadow: 4px 0 24px rgba(0,0,0,0.5);
        /* Fechado por padrão */
        opacity: 0;
        pointer-events: none;
        transform: translateY(-50%) translateX(-110%);
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(.34,1.2,.64,1);
    }
    #acessibilidadePanel.aberto {
        opacity: 1;
        pointer-events: all;
        transform: translateY(-50%) translateX(0);
    }

    .acess-btn {
        width: 38px; height: 38px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #ccc;
        font-size: 13px;
        font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, transform 0.1s;
        font-family: 'Montserrat', sans-serif;
    }
    .acess-btn:hover {
        background: rgba(255,255,255,0.12);
        color: #fff;
        transform: scale(1.08);
    }
    .acess-btn:active { transform: scale(0.94); }

    /* Seta do toggle */
    #acessToggleArrow {
        color: rgba(255,255,255,0.4);
        font-size: 14px;
        transition: transform 0.25s ease;
        user-select: none;
        pointer-events: none;
    }
    #acessibilidadePanel.aberto ~ #acessibilidadeToggle #acessToggleArrow {
        transform: rotate(180deg);
    }
`;
document.head.appendChild(estilosLuana);

// HTML botão Luana
const botaoLuanaHTML = `
    <button id="btnLuanaChat" onclick="window.abrirChatLuana()" aria-label="Abrir chat com a Luana IA">
        <span class="luana-icon material-symbols-outlined">assistant</span>
        <span class="luana-online" aria-hidden="true"></span>
        <span class="luana-tooltip">Falar com a Luana IA</span>
    </button>
`;

// HTML menu acessibilidade — recolhido, abre ao clicar
const menuAcessibilidadeHTML = `
    <div id="acessibilidadePanel" role="toolbar" aria-label="Acessibilidade">
        <button class="acess-btn" onclick="window.luanaZoom('aumentar')" title="Aumentar texto" aria-label="Aumentar tamanho do texto">
            <span class="material-symbols-outlined" style="font-size:18px;">text_increase</span>
        </button>
        <button class="acess-btn" onclick="window.luanaZoom('normal')" title="Tamanho normal" aria-label="Restaurar tamanho do texto">
            <span style="font-size:12px; font-weight:800; letter-spacing:-0.5px;">A</span>
        </button>
        <button class="acess-btn" onclick="window.luanaZoom('diminuir')" title="Diminuir texto" aria-label="Diminuir tamanho do texto">
            <span class="material-symbols-outlined" style="font-size:18px;">text_decrease</span>
        </button>
    </div>

    <button id="acessibilidadeToggle"
        onclick="window.toggleAcessibilidade()"
        title="Acessibilidade"
        aria-label="Abrir ferramentas de acessibilidade"
        aria-expanded="false"
        aria-controls="acessibilidadePanel">
        <span id="acessToggleArrow" class="material-symbols-outlined" style="font-size:14px;">chevron_right</span>
    </button>
`;

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================
export function inicializarLayout() {
    const headerContainer = document.getElementById('app-header');
    const footerContainer = document.getElementById('app-footer');

    if (headerContainer) headerContainer.innerHTML = headerHTML;
    if (footerContainer) footerContainer.innerHTML = footerHTML + botaoLuanaHTML + menuAcessibilidadeHTML;

    configurarMenuUsuario();
    verificarEstadoUsuario();
    injetarVLibras();
}

// ==========================================
// ACESSIBILIDADE
// ==========================================
let zoomAtual = 100;

window.luanaZoom = function(acao) {
    if (acao === 'aumentar') zoomAtual = Math.min(zoomAtual + 10, 130);
    else if (acao === 'diminuir') zoomAtual = Math.max(zoomAtual - 10, 80);
    else zoomAtual = 100;
    document.documentElement.style.fontSize = zoomAtual + '%';
};

window.toggleAcessibilidade = function() {
    const panel = document.getElementById('acessibilidadePanel');
    const btn   = document.getElementById('acessibilidadeToggle');
    const arrow = document.getElementById('acessToggleArrow');
    if (!panel) return;

    const aberto = panel.classList.toggle('aberto');
    if (arrow) arrow.style.transform = aberto ? 'rotate(180deg)' : '';
    if (btn)   btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
};

// Fecha acessibilidade ao clicar fora
document.addEventListener('click', function(e) {
    const panel  = document.getElementById('acessibilidadePanel');
    const toggle = document.getElementById('acessibilidadeToggle');
    if (!panel || !panel.classList.contains('aberto')) return;
    if (!panel.contains(e.target) && !toggle?.contains(e.target)) {
        panel.classList.remove('aberto');
        const arrow = document.getElementById('acessToggleArrow');
        if (arrow) arrow.style.transform = '';
        const btn = document.getElementById('acessibilidadeToggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
}, { passive: true });

// ==========================================
// VLIBRAS
// ==========================================
function injetarVLibras() {
    if (document.getElementById('vlibras-widget')) return;
    const vlibrasHTML = `
        <div id="vlibras-widget">
          <div vw class="enabled">
            <div vw-access-button class="active"></div>
            <div vw-plugin-wrapper>
              <div class="vw-plugin-top-wrapper"></div>
            </div>
          </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', vlibrasHTML);
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => { new window.VLibras.Widget('https://vlibras.gov.br/app'); };
    document.body.appendChild(script);
}

// ==========================================
// MENU DO USUÁRIO
// ==========================================
function configurarMenuUsuario() {
    const btnUser  = document.getElementById('btnUserMenu');
    const dropUser = document.getElementById('dropdownUserMenu');
    if (btnUser && dropUser) {
        btnUser.addEventListener('click', (e) => {
            e.stopPropagation();
            dropUser.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!btnUser.contains(e.target) && !dropUser.contains(e.target)) {
                dropUser.classList.add('hidden');
            }
        });
    }
}

// ==========================================
// ESTADO DO USUÁRIO — preto e branco, sem rosa
// ==========================================
function verificarEstadoUsuario() {
    const usuarioStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    const authBanner    = document.getElementById('authBanner');
    const userMenuContent = document.getElementById('userMenuContent');

    let usuarioLogado = null;
    if (usuarioStr) { try { usuarioLogado = JSON.parse(usuarioStr); } catch (e) {} }

    if (usuarioLogado && authBanner && userMenuContent) {
        const primeiroNome = (usuarioLogado.nome_completo || usuarioLogado.nome || '').split(' ')[0];
        authBanner.innerHTML = `<span class="text-white font-semibold">Olá, ${primeiroNome}.</span> <span class="text-gray-400">A sua moda exclusiva te espera.</span>`;

        userMenuContent.innerHTML = `
            <div class="px-5 py-4 border-b border-white/5 bg-[#0a0a0a]">
                <p class="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Conectado como</p>
                <p class="text-white font-bold truncate text-sm">${usuarioLogado.nome_completo || usuarioLogado.nome}</p>
            </div>
            <div class="py-2">
                <a href="minha-conta.html"     class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-gray-400"><span class="material-symbols-outlined text-[18px] opacity-50">person</span> Minha Conta</a>
                <a href="minhas-compras.html"  class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-gray-400"><span class="material-symbols-outlined text-[18px] opacity-50">shopping_bag</span> Meus Pedidos</a>
                <a href="gift-card.html"       class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-gray-400"><span class="material-symbols-outlined text-[18px] opacity-50">card_giftcard</span> Gift Card</a>
                <a href="carrinho.html"        class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-gray-400"><span class="material-symbols-outlined text-[18px] opacity-50">shopping_cart</span> Carrinho</a>
            </div>
            <div class="py-2 border-t border-white/5">
                <a href="sobre.html" class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-gray-400"><span class="material-symbols-outlined text-[18px] opacity-50">storefront</span> Sobre a Loja</a>
                <a href="https://api.whatsapp.com/send?phone=5528999756923" target="_blank" class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-gray-400"><span class="material-symbols-outlined text-[18px] opacity-50">chat</span> Suporte WhatsApp</a>
            </div>
            <div class="border-t border-white/5 p-2">
                <button onclick="window.fazerLogout()" class="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs border border-white/10">
                    <span class="material-symbols-outlined text-[16px]">logout</span> Sair da Conta
                </button>
            </div>
        `;
    } else if (authBanner && userMenuContent) {
        authBanner.innerHTML = `Frete Grátis para Cachoeiro nas compras acima de R$299. <a href="login.html" class="text-white font-bold ml-2 underline hover:opacity-70 transition-opacity">ENTRAR</a>`;

        userMenuContent.innerHTML = `
            <div class="p-3 space-y-2">
                <a href="login.html"   class="w-full px-4 py-4 bg-white text-black hover:bg-gray-100 transition-colors rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"><span class="material-symbols-outlined text-[16px]">login</span> Fazer Login</a>
                <a href="cadastro.html" class="w-full px-4 py-4 bg-[#111] border border-white/10 hover:border-white/25 text-white transition-colors rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"><span class="material-symbols-outlined text-[16px]">person_add</span> Criar Conta</a>
            </div>
        `;
    }
}

// ==========================================
// LOGOUT
// ==========================================
window.fazerLogout = function() {
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    localStorage.removeItem('boutique_diniz_session');
    localStorage.removeItem('api_token');
    sessionStorage.removeItem('api_token');
    window.location.href = 'site.html';
};
