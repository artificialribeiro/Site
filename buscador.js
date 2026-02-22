import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

class BuscadorBoutique {
    constructor() {
        this.inputs = document.querySelectorAll('#searchInput, #searchInputMobile');
        this.maxHistorico = 5;
        this.delayDigitacao = null; // Para evitar chamar a API a cada letra instantaneamente
        this.produtosEmCache = null; // Guarda os produtos para pesquisa ultra-rápida

        this.inicializar();
    }

    inicializar() {
        if (this.inputs.length === 0) return;

        // Adiciona CSS extra para a barra de rolagem do buscador
        this.injetarCSS();

        this.inputs.forEach(input => {
            // Cria o container do Dropdown (Resultados) logo abaixo do input
            const dropdown = document.createElement('div');
            dropdown.className = 'buscador-dropdown absolute top-full left-0 w-full mt-2 bg-[#0a0a0a] border border-gray-800 rounded-lg shadow-2xl hidden flex-col z-[100] overflow-hidden';
            
            // Insere o dropdown no DOM (logo após o input)
            input.parentNode.style.position = 'relative'; // Garante que o dropdown fique alinhado
            input.parentNode.appendChild(dropdown);

            // Eventos do Input
            input.addEventListener('focus', () => this.aoFocar(input, dropdown));
            input.addEventListener('input', (e) => this.aoDigitar(e.target.value, dropdown));
            
            // Evento para capturar o Enter (Pesquisa direta)
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && input.value.trim() !== '') {
                    this.salvarNoHistorico(input.value.trim());
                    window.location.href = `vitrine.botique.diniz.html?q=${encodeURIComponent(input.value.trim())}`;
                }
            });

            // Fecha o dropdown se clicar fora
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        });
    }

    injetarCSS() {
        const style = document.createElement('style');
        style.innerHTML = `
            .buscador-dropdown { max-height: 450px; }
            .buscador-scroll { overflow-y: auto; max-height: 400px; }
            .buscador-scroll::-webkit-scrollbar { width: 6px; }
            .buscador-scroll::-webkit-scrollbar-track { background: #0a0a0a; }
            .buscador-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
            .buscador-scroll::-webkit-scrollbar-thumb:hover { background: #555; }
        `;
        document.head.appendChild(style);
    }

    // --- LÓGICA DE EVENTOS ---

    aoFocar(input, dropdown) {
        const termo = input.value.trim();
        if (termo === '') {
            this.mostrarHistorico(dropdown);
        } else {
            this.aoDigitar(termo, dropdown);
        }
    }

    aoDigitar(termo, dropdown) {
        dropdown.classList.remove('hidden');
        dropdown.innerHTML = `<div class="p-6 text-center text-xs text-gray-500 uppercase tracking-widest"><span class="material-symbols-outlined animate-spin text-2xl mb-2">sync</span><br>Buscando...</div>`;

        clearTimeout(this.delayDigitacao);
        
        if (termo.trim() === '') {
            this.mostrarHistorico(dropdown);
            return;
        }

        // Espera 300ms após o usuário parar de digitar para fazer a busca (Performance)
        this.delayDigitacao = setTimeout(async () => {
            const resultados = await this.buscarProdutos(termo.trim());
            this.renderizarResultados(resultados, dropdown, termo.trim());
        }, 300);
    }

    // --- INTEGRAÇÃO COM A API ---

    async buscarProdutos(termo) {
        try {
            // Se ainda não baixou os produtos, baixa a primeira vez
            if (!this.produtosEmCache) {
                const headers = await getAuthHeaders();
                // Baixa um lote grande para pesquisa rápida local
                const res = await fetch(`${API_CONFIG.baseUrl}/api/produtos?page=1&pageSize=200`, { headers });
                const json = await res.json();
                this.produtosEmCache = json.data || [];
            }

            const t = termo.toLowerCase();
            
            // Filtra por NOME, SKU (Código) ou NOME DA CATEGORIA
            const filtrados = this.produtosEmCache.filter(p => {
                const nomeMatch = p.nome && p.nome.toLowerCase().includes(t);
                const skuMatch = p.sku && p.sku.toLowerCase().includes(t);
                const catMatch = p.categoria && p.categoria.nome && p.categoria.nome.toLowerCase().includes(t);
                return nomeMatch || skuMatch || catMatch;
            });

            return filtrados.slice(0, 6); // Retorna no máximo 6 resultados para não quebrar o visual

        } catch (error) {
            console.error("Erro na busca:", error);
            return [];
        }
    }

    // --- RENDERIZAÇÃO DE HTML/VISUAL ---

    renderizarResultados(produtos, dropdown, termo) {
        if (produtos.length === 0) {
            dropdown.innerHTML = `
                <div class="p-6 text-center">
                    <span class="material-symbols-outlined text-4xl text-gray-700 mb-2">search_off</span>
                    <p class="text-sm text-gray-400">Nenhum resultado para "<span class="text-white">${termo}</span>"</p>
                </div>
            `;
            return;
        }

        let html = `<div class="p-3 text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-900 bg-[#111]">Produtos Encontrados</div>`;
        html += `<div class="buscador-scroll">`;

        produtos.forEach(p => {
            const imgBase64 = p.imagens && p.imagens.length > 0 ? (p.imagens[0].base64 || p.imagens[0].caminho) : null;
            const urlImg = this.resolverImagem(imgBase64);
            const preco = parseFloat(p.preco) || 0;

            html += `
                <div class="flex items-center gap-4 p-3 border-b border-gray-900 hover:bg-[#111] cursor-pointer transition-colors" onclick="window.BuscadorGlobal.selecionarProduto(${p.id}, '${p.nome.replace(/'/g, "\\'")}')">
                    <div class="w-12 h-16 bg-black border border-gray-800 rounded flex-shrink-0 overflow-hidden">
                        <img src="${urlImg}" alt="${p.nome}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 class="text-sm font-medium text-white truncate">${p.nome}</h4>
                        <div class="text-[10px] text-gray-500 uppercase tracking-wider flex gap-2 mt-0.5">
                            ${p.sku ? `<span>CÓD: ${p.sku}</span>` : ''}
                            ${p.categoria ? `<span>• ${p.categoria.nome}</span>` : ''}
                        </div>
                        <span class="text-xs text-green-400 font-bold mt-1">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        
        // Botão para ver todos os resultados
        html += `
            <div class="p-3 bg-black border-t border-gray-800 text-center">
                <button onclick="window.location.href='vitrine.botique.diniz.html?q=${encodeURIComponent(termo)}'" class="text-xs text-white uppercase tracking-widest hover:underline decoration-gray-500 underline-offset-4 w-full py-1">
                    Ver todos os resultados
                </button>
            </div>
        `;

        dropdown.innerHTML = html;
    }

    mostrarHistorico(dropdown) {
        let buscas = JSON.parse(localStorage.getItem('boutique_recent_searches') || '[]');
        
        if (buscas.length === 0) {
            dropdown.innerHTML = `<div class="p-6 text-center text-xs text-gray-600 uppercase tracking-widest">Comece a digitar para buscar...</div>`;
            return;
        }

        let html = `
            <div class="p-3 text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-900 flex justify-between bg-[#111]">
                <span>Buscas Recentes</span>
                <button onclick="window.BuscadorGlobal.limparHistorico()" class="hover:text-white transition-colors">Limpar</button>
            </div>
            <ul class="buscador-scroll">
        `;

        buscas.forEach(b => {
            html += `
                <li class="px-4 py-3 hover:bg-[#111] border-b border-gray-900 cursor-pointer text-sm text-gray-300 flex items-center gap-3 transition-colors" onclick="window.BuscadorGlobal.refazerBusca('${b.replace(/'/g, "\\'")}')">
                    <span class="material-symbols-outlined text-[16px] text-gray-600">history</span> ${b}
                </li>
            `;
        });

        html += `</ul>`;
        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');
    }

    // --- GERENCIAMENTO DE DADOS ---

    salvarNoHistorico(termo) {
        let buscas = JSON.parse(localStorage.getItem('boutique_recent_searches') || '[]');
        // Remove se já existir para colocar no topo
        buscas = buscas.filter(b => b.toLowerCase() !== termo.toLowerCase());
        buscas.unshift(termo);
        
        // Garante que só fique o máximo permitido
        if (buscas.length > this.maxHistorico) buscas.pop();
        
        localStorage.setItem('boutique_recent_searches', JSON.stringify(buscas));
    }

    selecionarProduto(id, nome) {
        // Salva a pesquisa no histórico
        this.salvarNoHistorico(nome);
        
        // Salva como "Visto Recentemente"
        let vistos = JSON.parse(localStorage.getItem('boutique_recent_views') || '[]');
        vistos = vistos.filter(v => v !== id);
        vistos.unshift(id);
        if (vistos.length > 8) vistos.pop();
        localStorage.setItem('boutique_recent_views', JSON.stringify(vistos));

        // Redireciona
        window.location.href = `vitrine.botique.diniz.html?produtoId=${id}`;
    }

    resolverImagem(caminhoDaImagem) {
        if (!caminhoDaImagem) return 'https://via.placeholder.com/150/111/fff?text=Sem+Foto';
        if (caminhoDaImagem.startsWith('data:image')) return caminhoDaImagem;
        if (caminhoDaImagem.length > 200 && /^[a-zA-Z0-9+/]+={0,2}$/.test(caminhoDaImagem)) {
            return `data:image/jpeg;base64,${caminhoDaImagem}`;
        }
        if (caminhoDaImagem.startsWith('http')) return caminhoDaImagem;
        if (caminhoDaImagem.startsWith('/')) return `${API_CONFIG.baseUrl}${caminhoDaImagem}`;
        return `${API_CONFIG.baseUrl}/${caminhoDaImagem}`;
    }
}

// Cria uma instância global para permitir cliques nos botões HTML gerados dinamicamente
window.BuscadorGlobal = new BuscadorBoutique();

window.BuscadorGlobal.limparHistorico = function() {
    localStorage.removeItem('boutique_recent_searches');
    // Fecha o dropdown ou atualiza a visão (como é hacky focar no input de novo, vamos só fechar)
    document.querySelectorAll('.buscador-dropdown').forEach(d => d.classList.add('hidden'));
};

window.BuscadorGlobal.refazerBusca = function(termo) {
    const inputs = document.querySelectorAll('#searchInput, #searchInputMobile');
    if(inputs.length > 0) {
        inputs[0].value = termo;
        window.BuscadorGlobal.salvarNoHistorico(termo);
        window.location.href = `vitrine.botique.diniz.html?q=${encodeURIComponent(termo)}`;
    }
};


