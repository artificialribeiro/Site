import { obterDadosUsuario } from './recuperar-dados-padrao.js';
import { API_CONFIG, getAuthHeaders } from './chavetoken.js';

// ==========================================
// 1. INICIALIZAR A APP (PWA)
// ==========================================
export async function iniciarPWA() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const swReg = await navigator.serviceWorker.register('/sw.js');
            console.log('App Boutique Diniz Instalada com Sucesso!');

            // Pede permissão 5 segundos após entrar para não ser invasivo
            setTimeout(() => {
                pedirPermissaoNotificacao(swReg);
            }, 5000);

        } catch (error) {
            console.error('Erro ao instalar a App:', error);
        }
    }
}

// ==========================================
// 2. GESTÃO DE PERMISSÃO
// ==========================================
async function pedirPermissaoNotificacao(swReg) {
    if (Notification.permission === 'default') {
        const permissao = await Notification.requestPermission();
        if (permissao === 'granted') {
            verificarAlertas(swReg);
        }
    } else if (Notification.permission === 'granted') {
        verificarAlertas(swReg);
    }
}

// ==========================================
// 3. O CÉREBRO DAS NOTIFICAÇÕES (API + CARRINHO + IA)
// ==========================================
async function verificarAlertas(swReg) {
    const hoje = new Date().toDateString();
    const ultimaNotif = localStorage.getItem('boutique_ultima_notif');

    // REGRA DE OURO: Só manda 1 notificação por dia!
    if (ultimaNotif === hoje) return; 

    const usuario = obterDadosUsuario();
    if (!usuario) return;

    try {
        const headers = await getAuthHeaders();
        const clienteId = usuario.id || usuario.cliente_id;
        const primeiroNome = usuario.nome ? usuario.nome.split(' ')[0] : 'Cliente';
        
        // ----------------------------------------------------
        // TENTATIVA 1: AVISOS OFICIAIS (Envio de Pedidos, etc)
        // ----------------------------------------------------
        const resAlertas = await fetch(`${API_CONFIG.baseUrl}/api/notificacoes/cliente/${clienteId}`, { headers });
        const dataAlertas = await resAlertas.json();

        if (dataAlertas.success && dataAlertas.data && dataAlertas.data.length > 0) {
            const naoLida = dataAlertas.data.find(n => n.lida === 0);
            if (naoLida) {
                enviarPush(swReg, naoLida.titulo, naoLida.mensagem, naoLida.link || '/minhas-compras.html');
                await fetch(`${API_CONFIG.baseUrl}/api/notificacoes/${naoLida.id}/lida`, { method: 'PUT', headers });
                localStorage.setItem('boutique_ultima_notif', hoje);
                return; // Para aqui
            }
        }

        // ----------------------------------------------------
        // TENTATIVA 2: CARRINHO ABANDONADO (Recuperação de Venda)
        // ----------------------------------------------------
        const resCarrinho = await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${clienteId}`, { headers });
        const dataCarrinho = await resCarrinho.json();

        if (dataCarrinho.success && dataCarrinho.data && dataCarrinho.data.itens && dataCarrinho.data.itens.length > 0) {
            const qtdItens = dataCarrinho.data.itens.reduce((acc, item) => acc + item.quantidade, 0);
            const nomeProduto = dataCarrinho.data.itens[0].produto_nome || 'peças incríveis';
            
            enviarPush(
                swReg, 
                `Você esqueceu algo no carrinho, ${primeiroNome}! 🛍️`, 
                `Temos ${qtdItens} item(ns) guardado(s) pra você, incluindo: ${nomeProduto}. Finalize a compra antes que esgote!`, 
                `/carrinho.html`
            );
            localStorage.setItem('boutique_ultima_notif', hoje);
            return; // Para aqui
        }

        // ----------------------------------------------------
        // TENTATIVA 3: INTELIGÊNCIA ARTIFICIAL (Engajamento)
        // ----------------------------------------------------
        const historicoIA = JSON.parse(localStorage.getItem('boutique_ia_profile') || '{}');
        
        if (historicoIA.categorias && historicoIA.categorias.length > 0) {
            const categoriaFavorita = historicoIA.categorias[0]; 
            enviarPush(
                swReg, 
                `Olá ${primeiroNome}, sentiu a nossa falta? 🖤`, 
                `Separamos peças exclusivas na coleção de ${categoriaFavorita} que são a sua cara!`, 
                `/site.html?busca=${categoriaFavorita}`
            );
            localStorage.setItem('boutique_ultima_notif', hoje);
        }

    } catch (e) {
        console.error("Falha ao processar notificações do PWA:", e);
    }
}

// ==========================================
// 4. DESENHAR A NOTIFICAÇÃO NO ECRÃ
// ==========================================
function enviarPush(swReg, titulo, corpo, linkDestino) {
    swReg.showNotification(titulo, {
        body: corpo,
        icon: '/logo.png', // Agora usa a sua logo oficial
        badge: '/logo.png', // Ícone que fica pequeno na barra superior do Android
        vibrate: [200, 100, 200, 100, 200], 
        requireInteraction: true, // Mantém a notificação na tela até o cliente clicar ou arrastar
        data: { url: linkDestino } 
    });
}
