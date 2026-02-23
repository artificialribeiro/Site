/**
 * Motor PWA & Notificações Push — Boutique Diniz
 * Desenvolvido por Atlas Soluções — João Vitor
 */

import { API_CONFIG, getAuthHeaders } from './chavetoken.js';

function obterDadosUsuario() {
    try {
        const s = localStorage.getItem('boutique_diniz_session') || localStorage.getItem('usuario');
        if (!s) return null;
        const d = JSON.parse(atob(s).replace(/.*?(\{.*\}).*/, '$1').trim());
        return d?.usuario || d?.cliente || d;
    } catch {
        try { return JSON.parse(localStorage.getItem('usuario') || 'null'); }
        catch { return null; }
    }
}

// ─── 1. INICIALIZAR PWA ───
export async function iniciarPWA() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
        const swReg = await navigator.serviceWorker.register('/sw.js');
        console.log('PWA: Service Worker instalado.');

        // Pede permissão 8s após entrar — mais discreto
        setTimeout(() => pedirPermissaoNotificacao(swReg), 8000);
    } catch (e) {
        console.warn('PWA: Service Worker não registrado.', e);
    }
}

// ─── 2. GESTÃO DE PERMISSÃO ───
async function pedirPermissaoNotificacao(swReg) {
    if (Notification.permission === 'default') {
        const p = await Notification.requestPermission();
        if (p === 'granted') verificarAlertas(swReg);
    } else if (Notification.permission === 'granted') {
        verificarAlertas(swReg);
    }
}

// ─── 3. LÓGICA DE NOTIFICAÇÕES ───
async function verificarAlertas(swReg) {
    const hoje = new Date().toDateString();
    if (localStorage.getItem('boutique_ultima_notif') === hoje) return;

    const usuario = obterDadosUsuario();
    if (!usuario) return;

    try {
        const headers   = await getAuthHeaders();
        const clienteId = usuario.id || usuario.cliente_id;
        const nome      = (usuario.nome_completo || usuario.nome || 'Cliente').split(' ')[0];

        // ── TENTATIVA 1: Notificações oficiais da API ──
        try {
            const r = await fetch(`${API_CONFIG.baseUrl}/api/notificacoes/cliente/${clienteId}`, { headers });
            const d = await r.json();
            if (d.success && d.data?.length > 0) {
                const naoLida = d.data.find(n => n.lida === 0);
                if (naoLida) {
                    enviarPush(swReg, naoLida.titulo, naoLida.mensagem, naoLida.link || '/minhas-compras.html');
                    await fetch(`${API_CONFIG.baseUrl}/api/notificacoes/${naoLida.id}/lida`, { method: 'PUT', headers });
                    localStorage.setItem('boutique_ultima_notif', hoje);
                    return;
                }
            }
        } catch {}

        // ── TENTATIVA 2: Carrinho abandonado ──
        try {
            const r = await fetch(`${API_CONFIG.baseUrl}/api/carrinho/${clienteId}`, { headers });
            const d = await r.json();
            if (d.success && d.data?.itens?.length > 0) {
                const qtd     = d.data.itens.reduce((s, i) => s + i.quantidade, 0);
                const produto = d.data.itens[0].produto_nome || 'peças incríveis';
                enviarPush(
                    swReg,
                    `Você esqueceu algo no carrinho, ${nome}! 🛍️`,
                    `${qtd} item(ns) te esperando, incluindo: ${produto}. Finalize antes que esgote!`,
                    '/carrinho.html'
                );
                localStorage.setItem('boutique_ultima_notif', hoje);
                return;
            }
        } catch {}

        // ── TENTATIVA 3: IA (reengajamento) ──
        const perfil = JSON.parse(localStorage.getItem('boutique_perfil_ia') || '{}');
        const cats   = perfil.categoriasVistas ? Object.keys(perfil.categoriasVistas) : [];
        if (cats.length > 0) {
            // Pega a categoria mais visitada
            const favorita = cats.sort((a, b) => (perfil.categoriasVistas[b] || 0) - (perfil.categoriasVistas[a] || 0))[0];
            enviarPush(
                swReg,
                `Olá ${nome}, sentiu a nossa falta? 🖤`,
                `Separamos peças exclusivas de ${favorita} que são a sua cara!`,
                `/vitrine.categoria.html?nome=${encodeURIComponent(favorita)}`
            );
            localStorage.setItem('boutique_ultima_notif', hoje);
        }

    } catch (e) {
        console.error('PWA: Erro ao processar notificações.', e);
    }
}

// ─── 4. ENVIAR PUSH ───
function enviarPush(swReg, titulo, corpo, link) {
    swReg.showNotification(titulo, {
        body: corpo,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        data: { url: link }
    });
}
