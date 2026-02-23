/**
 * Motor de Inteligência Artificial — Boutique Diniz
 * Roda 100% no lado do cliente, conectando diretamente à Groq API.
 * Desenvolvido por Atlas Soluções — João Vitor
 */

class MotorInteligencia {
    constructor() {
        this.storageKey = 'boutique_perfil_ia';
        this.perfil = this.carregarPerfil();
        this.iniciarPWA();
    }

    // Monta a chave Groq na memória apenas no milissegundo da requisição
    _obterChaveGroq() {
        const _p1 = 'Z3NrX1ZaQ3FXem9UUmtrWDZ3ejk=';
        const _p2 = 'VFVDTFdHZHliM0ZZSDlOaA==';
        const _p3 = 'UWdJMElsSzZ6a3F1MXcyNEFsWkk=';
        try { return atob(_p1) + atob(_p2) + atob(_p3); }
        catch { return null; }
    }

    // ─── RASTREADOR DE GOSTOS ───
    carregarPerfil() {
        try {
            const dados = localStorage.getItem(this.storageKey);
            return dados ? JSON.parse(dados) : this._perfilVazio();
        } catch { return this._perfilVazio(); }
    }

    _perfilVazio() {
        return { categoriasVistas: {}, tamanhosPreferidos: {}, coresPreferidas: {}, ultimosProdutos: [] };
    }

    salvarPerfil() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.perfil));
    }

    registrarVisualizacao(produto, varianteSelecionada = null) {
        if (produto.categoria?.nome) {
            const cat = produto.categoria.nome;
            this.perfil.categoriasVistas[cat] = (this.perfil.categoriasVistas[cat] || 0) + 1;
        }
        if (varianteSelecionada) {
            const { tamanho, cor } = varianteSelecionada;
            if (tamanho) this.perfil.tamanhosPreferidos[tamanho] = (this.perfil.tamanhosPreferidos[tamanho] || 0) + 1;
            if (cor)     this.perfil.coresPreferidas[cor]        = (this.perfil.coresPreferidas[cor]        || 0) + 1;
        }
        this.perfil.ultimosProdutos = [produto.id, ...this.perfil.ultimosProdutos.filter(id => id !== produto.id)].slice(0, 15);
        this.salvarPerfil();
    }

    // ─── CÉREBRO: GROQ API ───
    async obterRecomendacoesGroq(catalogo) {
        if (this.perfil.ultimosProdutos.length === 0) return [];
        const chave = this._obterChaveGroq();
        if (!chave) return [];

        const contextoCliente = `
            Categorias mais vistas: ${JSON.stringify(this.perfil.categoriasVistas)}
            Tamanhos preferidos: ${JSON.stringify(this.perfil.tamanhosPreferidos)}
            Cores de interesse: ${JSON.stringify(this.perfil.coresPreferidas)}
        `;
        const contextoCatalogo = catalogo
            .map(p => `ID:${p.id}|Nome:${p.nome}|Cat:${p.categoria?.nome || 'N/A'}`)
            .join('\n');

        const prompt = `
            És a inteligência artificial da Boutique Diniz.
            Perfil da cliente: ${contextoCliente}
            Produtos disponíveis:\n${contextoCatalogo}
            Escolhe EXATAMENTE 4 IDs de produtos que combinem com o perfil da cliente.
            Responde SOMENTE com um array JSON válido. Exemplo: [5, 12, 8, 3]
            Nenhum texto adicional.
        `;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${chave}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant', // Modelo atual e suportado
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 60
                })
            });

            if (!response.ok) throw new Error(`Groq ${response.status}`);

            const data = await response.json();
            const texto = data.choices?.[0]?.message?.content || '';
            const match = texto.match(/\[[\d,\s]+\]/);
            if (match) {
                const ids = JSON.parse(match[0]);
                console.log('IA: Recomendações geradas:', ids);
                return ids;
            }
            return [];
        } catch (e) {
            console.warn('Motor IA silenciado:', e.message);
            return [];
        }
    }

    // ─── PWA: SERVICE WORKER ───
    iniciarPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(() => console.log('PWA: Service Worker registrado.'))
                    .catch(() => {});
            });
        }
    }

    async pedirPermissaoNotificacao() {
        if (!('Notification' in window)) return false;
        const p = await Notification.requestPermission();
        return p === 'granted';
    }

    enviarPushLocal(titulo, mensagem, urlDestino = '/') {
        if (Notification.permission !== 'granted') return;
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(titulo, {
                body: mensagem,
                icon: '/logo.png',
                badge: '/logo.png',
                vibrate: [200, 100, 200],
                data: { url: urlDestino }
            });
        });
    }
}

// Instância global
window.MotorIA = new MotorInteligencia();
