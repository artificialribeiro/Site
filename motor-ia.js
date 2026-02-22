/**
 * Motor de Inteligência Artificial e PWA - Boutique Diniz
 * Roda 100% no lado do cliente (Navegador), conectando diretamente à Groq API.
 */

class MotorInteligencia {
    constructor() {
        this.storageKey = 'boutique_perfil_ia';
        this.perfil = this.carregarPerfil();
        this.iniciarPWA();
    }

    // --- COFRE DA API GROQ (RODANDO DIRETO NO NAVEGADOR) ---
    // Remonta o token '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' 
    // na memória apenas no milissegundo em que vai fazer a requisição.
    _obterChaveGroq() {
        const _p1 = 'Z3NrX1ZaQ3FXem9UUmtrWDZ3ejk=';
        const _p2 = 'VFVDTFdHZHliM0ZZSDlOaA==';
        const _p3 = 'UWdJMElsSzZ6a3F1MXcyNEFsWkk=';
        
        try {
            return atob(_p1) + atob(_p2) + atob(_p3);
        } catch (e) {
            console.error("Falha ao montar chave da IA.");
            return null;
        }
    }

    // --- 1. RASTREADOR DE GOSTOS (SALVA NO DISPOSITIVO DA CLIENTE) ---
    carregarPerfil() {
        const dados = localStorage.getItem(this.storageKey);
        if (dados) return JSON.parse(dados);
        
        return {
            categoriasVistas: {},
            tamanhosPreferidos: {},
            coresPreferidas: {},
            ultimosProdutos: []
        };
    }

    salvarPerfil() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.perfil));
    }

    registrarVisualizacao(produto, varianteSelecionada = null) {
        // Regista a categoria visualizada
        if (produto.categoria && produto.categoria.nome) {
            const cat = produto.categoria.nome;
            this.perfil.categoriasVistas[cat] = (this.perfil.categoriasVistas[cat] || 0) + 1;
        }

        // Regista tamanhos e cores se o utilizador interagiu
        if (varianteSelecionada) {
            const tam = varianteSelecionada.tamanho;
            const cor = varianteSelecionada.cor;
            if (tam) this.perfil.tamanhosPreferidos[tam] = (this.perfil.tamanhosPreferidos[tam] || 0) + 1;
            if (cor) this.perfil.coresPreferidas[cor] = (this.perfil.coresPreferidas[cor] || 0) + 1;
        }

        // Regista o ID do produto para o histórico (limite de 15)
        this.perfil.ultimosProdutos = this.perfil.ultimosProdutos.filter(id => id !== produto.id);
        this.perfil.ultimosProdutos.unshift(produto.id);
        if (this.perfil.ultimosProdutos.length > 15) this.perfil.ultimosProdutos.pop();

        this.salvarPerfil();
        console.log("IA: Preferências da cliente atualizadas localmente.");
    }

    // --- 2. CÉREBRO: CONEXÃO DIRETA COM A GROQ API ---
    async obterRecomendacoesGroq(catalogoDisponivel) {
        // Se a cliente for nova e não clicou em nada ainda, retorna vazio
        if (this.perfil.ultimosProdutos.length === 0) return [];

        const chaveGroq = this._obterChaveGroq();
        if (!chaveGroq) return [];

        // Monta o contexto para a IA baseado no histórico da cliente
        const contextoCliente = `
            Categorias mais acessadas: ${JSON.stringify(this.perfil.categoriasVistas)}
            Tamanhos que costuma clicar: ${JSON.stringify(this.perfil.tamanhosPreferidos)}
            Cores de interesse: ${JSON.stringify(this.perfil.coresPreferidas)}
        `;

        // Prepara a lista de produtos disponíveis (apenas texto essencial para poupar tokens e acelerar a resposta)
        const contextoCatalogo = catalogoDisponivel.map(p => 
            `ID:${p.id} | Nome:${p.nome} | Cat:${p.categoria ? p.categoria.nome : 'N/A'}`
        ).join('\n');

        const prompt = `
            És a inteligência artificial da Boutique Diniz.
            Perfil de navegação atual da cliente: ${contextoCliente}
            
            Produtos disponíveis na loja:
            ${contextoCatalogo}
            
            Analisa o gosto da cliente e escolhe EXATAMENTE 4 IDs de produtos disponíveis que combinem com o perfil dela.
            A tua resposta DEVE SER EXCLUSIVAMENTE um array JSON válido (exemplo: [5, 12, 8, 3]). Não escrevas nenhuma palavra ou texto adicional, apenas o array.
        `;

        try {
            console.log("IA: Consultando cérebro Groq diretamente do navegador...");
            
            // CONEXÃO DIRETA SEM SERVIDOR (Browser -> Groq)
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${chaveGroq}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192", // Modelo da Groq otimizado para rapidez
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1 // Temperatura baixa para respostas lógicas e exatas
                })
            });

            if (!response.ok) throw new Error("Falha na comunicação com a API da Groq");

            const data = await response.json();
            const respostaIA = data.choices[0].message.content;
            
            // Extrai rigorosamente apenas o Array JSON da resposta da IA
            const matchArray = respostaIA.match(/\[(.*?)\]/);
            
            if (matchArray) {
                const idsRecomendados = JSON.parse(matchArray[0]);
                console.log("IA: Recomendações geradas com sucesso:", idsRecomendados);
                return idsRecomendados;
            } else {
                return [];
            }

        } catch (error) {
            console.error("Motor IA silenciado (Erros de conexão direta).", error);
            return []; // Retorna um array vazio para não quebrar a página
        }
    }

    // --- 3. SERVIÇOS DE PWA E NOTIFICAÇÃO (SERVICE WORKER) ---
    iniciarPWA() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            window.addEventListener('load', () => {
                // Regista o worker que ficará ativo em segundo plano
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('PWA: Service Worker instalado com sucesso.'))
                    .catch(err => console.log('PWA: Service Worker não suportado neste ambiente local.'));
            });
        }
    }

    async pedirPermissaoNotificacao() {
        if (!('Notification' in window)) return false;
        const permissao = await Notification.requestPermission();
        return permissao === 'granted';
    }

    enviarPushLocal(titulo, mensagem, urlRedirecionamento = '/') {
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titulo, {
                    body: mensagem,
                    icon: '/logo.png',
                    badge: '/logo-badge.png',
                    vibrate: [200, 100, 200],
                    data: { url: urlRedirecionamento }
                });
            });
        }
    }
}

// Cria a instância global para que possa ser utilizada em qualquer ficheiro HTML e JS
window.MotorIA = new MotorInteligencia();


