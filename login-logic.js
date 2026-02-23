import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const loginForm = document.getElementById('loginForm');
const cpfInput = document.getElementById('cpf');
const senhaInput = document.getElementById('senha');
const errorMsg = document.getElementById('error-msg');
const btnSubmit = document.getElementById('btnSubmit');

// Elementos da nova funcionalidade de sessão ativa
const loginState = document.getElementById('loginState');
const loggedInState = document.getElementById('loggedInState');
const loggedUserName = document.getElementById('loggedUserName');
const btnContinue = document.getElementById('btnContinue');
const btnLogout = document.getElementById('btnLogout');

// --- 0. VERIFICAÇÃO DE SESSÃO AO ABRIR A PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    verificarSessaoAtiva();
});

function verificarSessaoAtiva() {
    const sessaoCodificada = localStorage.getItem('boutique_diniz_session');
    
    if (sessaoCodificada) {
        try {
            // Desfaz o Base64
            const jsonString = atob(sessaoCodificada);
            const sessao = JSON.parse(jsonString);

            if (sessao.logado && sessao.usuario) {
                // Pega apenas o primeiro nome para ficar amigável
                const primeiroNome = sessao.usuario.nome.split(' ')[0];
                loggedUserName.innerText = primeiroNome;

                // Esconde o formulário normal e mostra o cartão de boas-vindas
                loginState.classList.add('hidden');
                loggedInState.classList.remove('hidden');

                // GARANTIA: Se o navegador apagou a sessão universal, restaura-a a partir daqui
                if (!localStorage.getItem('usuario')) {
                    salvarSessaoUniversal(sessao.usuario);
                }
            }
        } catch (error) {
            console.error("Sessão corrompida ou inválida.", error);
            limparSessoes(); // Limpa o erro
        }
    }
}

// Ações dos novos botões da tela de retorno
if (btnContinue) {
    btnContinue.addEventListener('click', () => {
        // Redireciona para a página de verificação conforme solicitado
        window.location.href = 'verificacao.html';
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        // Apaga TODAS as sessões para um logout limpo
        limparSessoes();
        loggedInState.classList.add('hidden');
        loginState.classList.remove('hidden');
        cpfInput.value = '';
        senhaInput.value = '';
        cpfInput.focus();
    });
}

// Função auxiliar para garantir que tudo é limpo no logout
function limparSessoes() {
    localStorage.removeItem('boutique_diniz_session');
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
}

// --- 1. MÁSCARA DE CPF ---
if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 9) {
            value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
        } else if (value.length > 6) {
            value = value.replace(/^(\d{3})(\d{3})(\d{3}).*/, "$1.$2.$3");
        } else if (value.length > 3) {
            value = value.replace(/^(\d{3})(\d{3}).*/, "$1.$2");
        }
        e.target.value = value;
    });
}

// --- 2. FUNÇÃO DE LOGIN ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        mostrarErro(false);
        btnSubmit.innerText = 'Autenticando...';
        btnSubmit.disabled = true;

        const cpfLimpo = cpfInput.value.replace(/\D/g, "");
        const senha = senhaInput.value;

        try {
            const authHeaders = await getAuthHeaders();

            // Chamada na API v3 (documentada no PDF)
            const response = await fetch(`${API_CONFIG.baseUrl}/api/clientes/login`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    cpf: cpfLimpo,
                    senha: senha
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                
                // SALVAMENTO DUPLO: Mantém o original e cria o universal para as outras páginas
                salvarSessaoSegura(result.data);
                salvarSessaoUniversal(result.data);
                
                btnSubmit.innerText = 'Sucesso!';
                setTimeout(() => {
                    // REDIRECIONA PARA VERIFICAÇÃO DE SEGURANÇA
                    window.location.href = 'verificacao.html';
                }, 500);

            } else {
                throw new Error(result.message || 'CPF ou senha inválidos.');
            }

        } catch (error) {
            console.error("Erro no login:", error);
            mostrarErro(error.message || "Erro ao conectar com o servidor.");
            btnSubmit.innerText = 'ENTRAR';
            btnSubmit.disabled = false;
        }
    });
}

// --- 3. SALVAMENTO SEGURO (MANTIDO EXATAMENTE COMO ERA) ---
function salvarSessaoSegura(userData) {
    const sessao = {
        usuario: {
            id: userData.id,
            nome: userData.nome_completo || userData.nome,
            email: userData.email,
            celular: userData.celular,
            cpf: userData.cpf // Adicionado por segurança para a Minha Conta
        },
        token_acesso: new Date().getTime(),
        logado: true
    };

    const jsonString = JSON.stringify(sessao);
    const dadosCodificados = btoa(jsonString); // Obfuscação simples
    localStorage.setItem('boutique_diniz_session', dadosCodificados);
}

// --- NOVO: SALVAMENTO UNIVERSAL (PARA AS PÁGINAS 'MINHA CONTA' E 'PEDIDOS') ---
function salvarSessaoUniversal(userData) {
    // Guarda o objeto completo (id, nome_completo, cpf, email, celular) num formato fácil de ler
    const dadosString = JSON.stringify(userData);
    
    // Salva no localStorage (não apaga quando muda de página no Qamar IDE)
    localStorage.setItem('usuario', dadosString);
    
    // Salva no sessionStorage (por garantia de compatibilidade com outros scripts)
    sessionStorage.setItem('usuario', dadosString);
}

// Helper de erro visual
function mostrarErro(mensagem) {
    if (!mensagem) {
        errorMsg.style.display = 'none';
        return;
    }
    errorMsg.innerText = mensagem;
    errorMsg.style.display = 'block';
    
    loginForm.classList.add('shake');
    setTimeout(() => loginForm.classList.remove('shake'), 500);
}
