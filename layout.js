/**
 * Gerenciador de Layout Global - Boutique Diniz
 * Injeta Cabeçalho, Rodapé Premium, Assistente Luana e Ferramentas de Acessibilidade em todo o site.
 */

// --- 1. INTEGRAÇÃO AUTOMÁTICA DA LUANA IA ---
// Basta esta linha para ela aparecer em todas as páginas que usam o layout.
import './luana-ai.js'; 

const anoAtual = new Date().getFullYear();

// ==========================================
// HTML DO CABEÇALHO (MANTIDO IGUAL)
// ==========================================
const headerHTML = `
    <div id="authBanner" class="w-full bg-[#111] text-center py-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 border-b border-gray-900 transition-colors">
        Carregando...
    </div>

    <header class="sticky top-0 w-full z-40 bg-black/90 backdrop-blur-xl border-b border-white/5 transition-all supports-[backdrop-filter]:bg-black/60">
        <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
            
            <a href="site.html" class="flex-shrink-0 group">
                <h1 class="font-logo text-3xl md:text-4xl text-white font-['Satisfy'] group-hover:text-pink-500 transition-colors">Boutique Diniz</h1>
            </a>

            <div class="flex-1 max-w-xl relative hidden md:block group">
                <input type="text" id="searchInput" class="w-full bg-[#0a0a0a] border border-gray-800 rounded-full px-6 py-2.5 text-sm text-gray-300 focus:border-gray-600 focus:bg-black outline-none transition-all" placeholder="Buscar peças exclusivas...">
                <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">search</span>
                </button>
            </div>

            <div class="flex items-center gap-4 md:gap-6 relative">
                <button class="md:hidden text-gray-300 hover:text-white transition-colors" onclick="document.getElementById('mobileSearch').classList.toggle('hidden')">
                    <span class="material-symbols-outlined">search</span>
                </button>
                
                <a href="carrinho.html" class="relative text-gray-300 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">local_mall</span>
                    <span id="cartCount" class="absolute -top-1 -right-2 bg-white text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">0</span>
                </a>

                <div class="relative z-50">
                    <button id="btnUserMenu" class="flex items-center text-gray-300 hover:text-white transition-colors py-2">
                        <span class="material-symbols-outlined">person</span>
                    </button>
                    <div id="dropdownUserMenu" class="hidden absolute right-0 mt-4 w-64 bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden origin-top-right transition-all">
                        <div id="userMenuContent" class="flex flex-col text-sm font-light font-['Montserrat']">
                            </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="mobileSearch" class="hidden w-full bg-black/95 p-4 border-t border-white/10 md:hidden absolute top-full left-0 z-40 backdrop-blur-xl">
            <div class="relative">
                <input type="text" id="searchInputMobile" class="w-full bg-[#111] border border-gray-800 rounded-full px-4 py-3 text-sm text-white focus:border-gray-600 outline-none" placeholder="O que você procura hoje?">
                <button class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <span class="material-symbols-outlined">search</span>
                </button>
            </div>
        </div>
    </header>
`;

// ==========================================
// NOVO HTML DO RODAPÉ PREMIUM
// ==========================================
const footerHTML = `
    <footer class="bg-[#050505] border-t border-white/5 pt-16 pb-8 mt-auto font-['Montserrat']">
        <div class="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
            
            <div class="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                <a href="site.html">
                    <h2 class="font-logo text-5xl text-white font-['Satisfy'] hover:text-pink-600 transition-colors">Boutique Diniz</h2>
                </a>
                <p class="text-gray-400 text-sm font-light max-w-xs leading-relaxed">
                    Moda feminina exclusiva que une elegância, conforto e as últimas tendências para a mulher moderna.
                </p>
                
                <div class="flex gap-3 mt-4">
                    <a href="https://www.instagram.com/boutiquedinizz" target="_blank" class="group w-12 h-12 rounded-full bg-[#0a0a0a] border border-gray-800 flex items-center justify-center hover:border-pink-600 hover:bg-pink-600/10 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-tr from-pink-600 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <svg class="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.073-4.947-.2-4.354-2.617-6.782-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                    <a href="https://api.whatsapp.com/send?phone=5528999756923&text=Ol%C3%A1!%20Vim%20do%20site%20da%20Boutique%20Diniz." target="_blank" class="group w-12 h-12 rounded-full bg-[#0a0a0a] border border-gray-800 flex items-center justify-center hover:border-green-500 hover:bg-green-500/10 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-tr from-green-500 to-emerald-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <svg class="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    </a>
                </div>
            </div>

            <div class="md:col-span-3 flex flex-col items-center md:items-start text-center md:text-left">
                <h3 class="text-white font-bold mb-6 uppercase tracking-[0.2em] text-xs border-b border-pink-600/50 pb-2">Navegação</h3>
                <ul class="space-y-3 text-sm text-gray-400 font-light">
                    <li><a href="site.html" class="hover:text-pink-500 transition-colors flex items-center gap-2"><span class="material-symbols-outlined text-[14px] opacity-50">chevron_right</span> Início</a></li>
                    <li><a href="site.html#colecao" class="hover:text-pink-500 transition-colors flex items-center gap-2"><span class="material-symbols-outlined text-[14px] opacity-50">chevron_right</span> Coleção</a></li>
                    <li><a href="carrinho.html" class="hover:text-pink-500 transition-colors flex items-center gap-2"><span class="material-symbols-outlined text-[14px] opacity-50">chevron_right</span> Carrinho</a></li>
                    <li><a href="minhas-compras.html" class="hover:text-pink-500 transition-colors flex items-center gap-2"><span class="material-symbols-outlined text-[14px] opacity-50">chevron_right</span> Meus Pedidos</a></li>
                </ul>
            </div>

            <div class="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                <h3 class="text-white font-bold mb-6 uppercase tracking-[0.2em] text-xs border-b border-green-600/50 pb-2">Atendimento</h3>
                <p class="text-gray-400 text-sm font-light mb-4">
                    Precisa de ajuda? Fale com a gente pelo WhatsApp.
                </p>
                <a href="https://api.whatsapp.com/send?phone=5528999756923" target="_blank" class="inline-flex items-center gap-2 bg-[#111] border border-green-900/30 px-5 py-3 rounded-full hover:bg-green-900/10 hover:border-green-600 transition-all group">
                    <span class="material-symbols-outlined text-green-500 group-hover:scale-110 transition-transform">chat</span>
                    <span class="text-sm text-gray-300 group-hover:text-white font-bold">(28) 99975-6923</span>
                </a>
                <p class="text-gray-500 text-xs mt-4">
                    <span class="block mb-1">Horário de Atendimento:</span>
                    Seg. a Sex. das 9h às 18h<br>Sáb. das 9h às 13h
                </p>
            </div>

        </div>
        
        <div class="max-w-7xl mx-auto px-8 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-600 gap-4 uppercase tracking-wider">
            <p>&copy; ${anoAtual} Boutique Diniz. Todos os direitos reservados.</p>
            <a href="#" class="flex items-center gap-1 hover:text-gray-400 transition-colors">
                Desenvolvido com <span class="material-symbols-outlined text-[10px] text-pink-800">favorite</span> por <span class="text-gray-500 font-bold">Atlas Soluções</span>
            </a>
        </div>
    </footer>
`;

// ==========================================
// BOTÃO FLUTUANTE DA LUANA (REDESENHADO COM ÍCONE BRANCO)
// ==========================================
const botaoLuanaHTML = `
    <button id="btnLuanaChat" onclick="window.abrirChatLuana()" class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-pink-700 to-purple-800 rounded-full shadow-2xl shadow-pink-900/30 flex items-center justify-center z-[90] hover:scale-110 transition-all duration-300 group animate-bounce cursor-pointer border-2 border-white/10 hover:border-white/30">
        <span class="material-symbols-outlined text-white text-2xl group-hover:rotate-12 transition-transform">assistant</span>
        
        <span class="absolute right-16 bg-[#111] border border-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none backdrop-blur-md">
            Falar com a Luana IA
            <svg class="absolute text-[#111] h-3 w-right-full top-1/2 translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-gray-800" x="0px" y="0px" viewBox="0 0 255 255"><polygon class="fill-current" points="0,0 127.5,127.5 255,0"></polygon></svg>
        </span>
    </button>
`;

// ==========================================
// MENU LATERAL DE ACESSIBILIDADE (A+/A-)
// ==========================================
const menuAcessibilidadeHTML = `
    <div class="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 p-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 shadow-lg transition-opacity hover:opacity-100 opacity-40">
        <button onclick="document.body.style.zoom='115%'" class="w-8 h-8 flex items-center justify-center bg-[#111] hover:bg-gray-900 text-white rounded border border-gray-800 transition-colors" title="Aumentar Texto">
            <span class="material-symbols-outlined text-lg">add</span>
        </button>
        <button onclick="document.body.style.zoom='100%'" class="w-8 h-8 flex items-center justify-center bg-[#111] hover:bg-gray-900 text-white rounded border border-gray-800 transition-colors" title="Tamanho Normal">
            <span class="text-xs font-bold">A</span>
        </button>
        <button onclick="document.body.style.zoom='85%'" class="w-8 h-8 flex items-center justify-center bg-[#111] hover:bg-gray-900 text-white rounded border border-gray-800 transition-colors" title="Diminuir Texto">
            <span class="material-symbols-outlined text-lg">remove</span>
        </button>
    </div>
`;

// ==========================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ==========================================
export function inicializarLayout() {
    const headerContainer = document.getElementById('app-header');
    const footerContainer = document.getElementById('app-footer');

    if (headerContainer) headerContainer.innerHTML = headerHTML;
    // Injeta Rodapé + Luana + Menu Acessibilidade
    if (footerContainer) footerContainer.innerHTML = footerHTML + botaoLuanaHTML + menuAcessibilidadeHTML;

    configurarMenuUsuario();
    verificarEstadoUsuario();
    injetarVLibras(); // Injeta o widget oficial do governo
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function injetarVLibras() {
    if (document.getElementById('vlibras-widget')) return; // Evita duplicar

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
    script.onload = () => {
        new window.VLibras.Widget('https://vlibras.gov.br/app');
    };
    document.body.appendChild(script);
}

function configurarMenuUsuario() {
    const btnUser = document.getElementById('btnUserMenu');
    const dropUser = document.getElementById('dropdownUserMenu');
    if (btnUser && dropUser) {
        btnUser.addEventListener('click', (e) => { e.stopPropagation(); dropUser.classList.toggle('hidden'); });
        document.addEventListener('click', (e) => { if (!btnUser.contains(e.target) && !dropUser.contains(e.target)) dropUser.classList.add('hidden'); });
    }
}

function verificarEstadoUsuario() {
    const usuarioStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    const authBanner = document.getElementById('authBanner');
    const userMenuContent = document.getElementById('userMenuContent');
    
    let usuarioLogado = null;
    if (usuarioStr) { try { usuarioLogado = JSON.parse(usuarioStr); } catch (e) {} }

    if (usuarioLogado && authBanner && userMenuContent) {
        const primeiroNome = (usuarioLogado.nome_completo || usuarioLogado.nome || '').split(' ')[0];
        authBanner.innerHTML = `<span class="text-white">Olá, ${primeiroNome}.</span> A sua moda exclusiva te espera.`;
        authBanner.classList.replace('bg-[#111]', 'bg-gradient-to-r');
        authBanner.classList.add('from-pink-900/40', 'to-purple-900/40');
        
        userMenuContent.innerHTML = `
            <div class="px-5 py-4 border-b border-gray-800 bg-[#111]">
                <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Conectado como</p>
                <p class="text-white font-bold truncate">${usuarioLogado.nome_completo || usuarioLogado.nome}</p>
            </div>
            <div class="py-2">
                <a href="minha-conta.html" class="px-5 py-3 hover:bg-white/5 hover:text-pink-500 transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[20px] opacity-70">person</span> Minha Conta</a>
                <a href="minhas-compras.html" class="px-5 py-3 hover:bg-white/5 hover:text-pink-500 transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[20px] opacity-70">shopping_bag</span> Meus Pedidos</a>
                <a href="carrinho.html" class="px-5 py-3 hover:bg-white/5 hover:text-pink-500 transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[20px] opacity-70">shopping_cart</span> Carrinho</a>
            </div>
            <div class="py-2 border-t border-gray-800">
                 <a href="sobre.html" class="px-5 py-3 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[20px] opacity-70">storefront</span> Sobre a Loja</a>
                 <a href="https://api.whatsapp.com/send?phone=5528999756923" target="_blank" class="px-5 py-3 hover:bg-white/5 hover:text-green-500 transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[20px] opacity-70">chat</span> Suporte WhatsApp</a>
            </div>
            <div class="border-t border-gray-800 p-2">
                <button onclick="window.fazerLogout()" class="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"><span class="material-symbols-outlined text-[18px]">logout</span> Sair da Conta</button>
            </div>
        `;
    } else if (authBanner && userMenuContent) {
        authBanner.innerHTML = `Frete Grátis para Cachoeiro nas compras acima de R$299. <a href="login.html" class="text-white font-bold ml-2 underline hover:text-pink-500">ENTRAR</a>`;
        
        userMenuContent.innerHTML = `
            <div class="p-2 space-y-2">
                <a href="login.html" class="w-full px-4 py-4 bg-white text-black hover:bg-gray-200 transition-colors rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"><span class="material-symbols-outlined text-[18px]">login</span> Fazer Login</a>
                <a href="cadastro.html" class="w-full px-4 py-4 bg-[#111] border border-gray-800 hover:border-gray-600 text-white transition-colors rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs"><span class="material-symbols-outlined text-[18px]">person_add</span> Criar Conta</a>
            </div>
        `;
    }
}

window.fazerLogout = function() {
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    localStorage.removeItem('boutique_diniz_session');
    localStorage.removeItem('api_token');
    sessionStorage.removeItem('api_token');
    window.location.href = 'site.html';
}
