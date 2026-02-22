/**
 * Gerenciador de Layout (Cabeçalho e Rodapé) - Boutique Diniz
 * Injeta os componentes visuais e gerencia o estado do usuário.
 */

const headerHTML = `
    <div id="authBanner" class="w-full bg-[#111] text-center py-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 border-b border-gray-900 transition-colors">
        Carregando...
    </div>

    <header class="sticky top-0 w-full z-40 bg-black/85 backdrop-blur-md border-b border-[#222] transition-all">
        <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
            
            <a href="site.html" class="flex-shrink-0">
                <h1 class="font-logo text-3xl md:text-4xl text-white font-['Satisfy']">Boutique Diniz</h1>
            </a>

            <div class="flex-1 max-w-xl relative hidden md:block group">
                <input type="text" id="searchInput" class="w-full bg-[#111] border border-gray-800 rounded-full px-6 py-2.5 text-sm focus:border-white outline-none transition-colors" placeholder="Buscar vestidos, acessórios...">
                <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <span class="material-symbols-outlined">search</span>
                </button>
            </div>

            <div class="flex items-center gap-4 md:gap-6 relative">
                <button class="md:hidden text-gray-300 hover:text-white" onclick="document.getElementById('mobileSearch').classList.toggle('hidden')">
                    <span class="material-symbols-outlined">search</span>
                </button>
                
                <a href="carrinho.html" class="relative text-gray-300 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">local_mall</span>
                    <span id="cartCount" class="absolute -top-1 -right-2 bg-white text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">0</span>
                </a>

                <div class="relative">
                    <button id="btnUserMenu" class="flex items-center text-gray-300 hover:text-white transition-colors py-2">
                        <span class="material-symbols-outlined">person</span>
                    </button>
                    <div id="dropdownUserMenu" class="hidden absolute right-0 mt-4 w-56 bg-[#0a0a0a] border border-gray-800 rounded shadow-2xl z-50 overflow-hidden">
                        <div id="userMenuContent" class="flex flex-col text-sm font-light">
                            </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="mobileSearch" class="hidden w-full bg-[#050505] p-4 border-t border-[#222] md:hidden">
            <div class="relative">
                <input type="text" id="searchInputMobile" class="w-full bg-[#111] border border-gray-800 rounded-full px-4 py-2 text-sm focus:border-white outline-none" placeholder="Buscar...">
                <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <span class="material-symbols-outlined">search</span>
                </button>
            </div>
        </div>
    </header>
`;

const footerHTML = `
    <footer class="bg-[#0a0a0a] border-t border-[#222] pt-12 pb-8 mt-auto">
        <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div class="flex flex-col items-center md:items-start">
                <h2 class="font-logo text-4xl text-white mb-2 font-['Satisfy']">Boutique Diniz</h2>
                <p class="text-[0.6rem] uppercase tracking-[0.4em] text-gray-500 mb-6 font-['Montserrat']">Moda Feminina</p>
            </div>
            <div class="flex flex-col gap-3 items-center md:items-start text-sm text-gray-400 font-light font-['Montserrat']">
                <a href="carrinho.html" class="hover:text-white transition-colors">Carrinho</a>
                <a href="minhas-compras.html" class="hover:text-white transition-colors">Gerenciar Compras</a>
                <a href="cartao-presente.html" class="hover:text-white transition-colors">Cartão Presente</a>
            </div>
            <div class="flex flex-col gap-3 items-center md:items-start text-sm text-gray-400 font-light font-['Montserrat']">
                <a href="minha-conta.html" class="hover:text-white transition-colors">Minha Conta</a>
                <a href="sobre.html" class="hover:text-white transition-colors">Sobre a Loja</a>
                <button onclick="window.fazerLogout()" class="text-red-400 hover:text-red-300 transition-colors mt-2 uppercase tracking-widest text-[10px] font-bold">Encerrar Sessão</button>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 mt-12 pt-6 border-t border-gray-900 text-center text-xs text-gray-600 font-['Montserrat']">
            &copy; 2026 Boutique Diniz. Todos os direitos reservados.
        </div>
    </footer>
`;

export function inicializarLayout() {
    // 1. Injeta o HTML nos espaços reservados
    const headerContainer = document.getElementById('app-header');
    const footerContainer = document.getElementById('app-footer');

    if (headerContainer) headerContainer.innerHTML = headerHTML;
    if (footerContainer) footerContainer.innerHTML = footerHTML;

    // 2. Configura a lógica do layout
    configurarMenuUsuario();
    verificarEstadoUsuario();
}

function configurarMenuUsuario() {
    const btnUser = document.getElementById('btnUserMenu');
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

function verificarEstadoUsuario() {
    const sessaoCodificada = localStorage.getItem('boutique_diniz_session');
    const authBanner = document.getElementById('authBanner');
    const userMenuContent = document.getElementById('userMenuContent');
    
    let usuarioLogado = null;

    if (sessaoCodificada) {
        try {
            const sessao = JSON.parse(atob(sessaoCodificada));
            if (sessao.logado && sessao.usuario) usuarioLogado = sessao.usuario;
        } catch (e) {
            localStorage.removeItem('boutique_diniz_session');
        }
    }

    if (usuarioLogado && authBanner && userMenuContent) {
        const primeiroNome = usuarioLogado.nome.split(' ')[0];
        authBanner.innerHTML = `<span class="text-white">Olá, ${primeiroNome}.</span> Seja bem-vinda de volta à sua Boutique.`;
        authBanner.classList.replace('bg-[#111]', 'bg-black');
        
        userMenuContent.innerHTML = `
            <div class="px-4 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest">${usuarioLogado.nome}</div>
            <a href="minha-conta.html" class="px-4 py-3 hover:bg-[#111] hover:text-white transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[18px]">person</span> Meu Perfil</a>
            <a href="minhas-compras.html" class="px-4 py-3 hover:bg-[#111] hover:text-white transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[18px]">shopping_bag</span> Meus Pedidos</a>
            <button onclick="window.fazerLogout()" class="px-4 py-3 hover:bg-[#111] text-red-400 hover:text-red-300 transition-colors flex items-center gap-3 text-left w-full border-t border-gray-800"><span class="material-symbols-outlined text-[18px]">logout</span> Sair</button>
        `;
    } else if (authBanner && userMenuContent) {
        authBanner.innerHTML = `Faça login para ter uma experiência completa e ofertas exclusivas! <a href="login.html" class="text-white font-bold ml-2 underline">ENTRAR</a>`;
        
        userMenuContent.innerHTML = `
            <a href="login.html" class="px-4 py-4 hover:bg-[#111] hover:text-white transition-colors flex items-center gap-3"><span class="material-symbols-outlined text-[18px]">login</span> Fazer Login</a>
            <a href="cadastro.html" class="px-4 py-4 hover:bg-[#111] hover:text-white transition-colors flex items-center gap-3 border-t border-gray-800"><span class="material-symbols-outlined text-[18px]">person_add</span> Criar Conta</a>
        `;
    }
}

// Global para logout funcionar a partir do rodapé injetado
window.fazerLogout = function() {
    localStorage.removeItem('boutique_diniz_session');
    window.location.reload();
}


