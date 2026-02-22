/**
 * Módulo de Segurança Contínua - Boutique Diniz
 * Este script deve ser importado em TODAS as páginas privadas do sistema.
 */
(function() {
    'use strict';

    // Configurações de Segurança
    const CONFIG = {
        sessionKey: 'boutique_diniz_session',
        loginPage: 'login.html',
        checkInterval: 2000 // Faz a varredura a cada 2 segundos
    };

    /**
     * 1. AÇÃO DE BLOQUEIO (Kill Switch)
     * Destrói os dados e expulsa o usuário sem deixar rastro no histórico
     */
    function acionarBloqueio(motivo) {
        // Limpa a sessão criptografada
        localStorage.removeItem(CONFIG.sessionKey);
        sessionStorage.clear();
        
        // Redireciona usando 'replace' para que o invasor não consiga usar o botão "Voltar" do navegador
        window.location.replace(CONFIG.loginPage);
    }

    /**
     * 2. VALIDAÇÃO DE SESSÃO CRIPTOGRAFADA
     * Verifica se o token existe e se não foi adulterado
     */
    function validarSessaoAtiva() {
        const sessaoCodificada = localStorage.getItem(CONFIG.sessionKey);
        
        if (!sessaoCodificada) {
            acionarBloqueio('Sessão inexistente.');
            return;
        }

        try {
            // Tenta decodificar o Base64. Se o invasor injetou texto puro, isso vai falhar e bloquear.
            const jsonString = atob(sessaoCodificada);
            const sessao = JSON.parse(jsonString);

            // Verifica se as chaves obrigatórias existem
            if (!sessao.logado || !sessao.usuario || !sessao.usuario.id) {
                acionarBloqueio('Sessão corrompida ou manipulada.');
            }
        } catch (error) {
            acionarBloqueio('Falha de integridade criptográfica.');
        }
    }

    /**
     * 3. PROTEÇÃO DO NAVEGADOR (Anti-Inspeção)
     * Bloqueia atalhos e cliques direitos
     */
    function blindarNavegador() {
        // Bloqueia botão direito
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Bloqueia atalhos de teclado (F12, Ctrl+Shift+I, Ctrl+U, etc)
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.key.toUpperCase() === 'U') {
                e.preventDefault();
                return false;
            }
        });
    }

    /**
     * 4. DETECÇÃO AVANÇADA DE DEVTOOLS
     * Verifica se o painel de desenvolvedor foi aberto (por diferença de tamanho da janela)
     */
    function detectarPainelAberto() {
        // Se a diferença entre a janela inteira e a área visível for maior que 160px, 
        // é muito provável que o DevTools (F12) foi forçado a abrir.
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;

        if (widthDiff || heightDiff) {
            acionarBloqueio('Inspeção de código detectada.');
        }
    }

    /**
     * 5. INICIALIZAÇÃO E VARREDURA CONTÍNUA
     */
    function iniciarVigia() {
        // Executa as proteções imediatamente ao carregar
        blindarNavegador();
        validarSessaoAtiva();

        // Fica rodando em background (Loop infinito de segurança)
        setInterval(() => {
            validarSessaoAtiva();
            detectarPainelAberto();
        }, CONFIG.checkInterval);
    }

    // Dá o start no escudo
    iniciarVigia();

})();


