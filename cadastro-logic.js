import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

// --- Estado do Formulário ---
let currentStep = 1;
const totalSteps = 6; // O passo 7 é sucesso/final
const formData = {
    nome_completo: '',
    cpf: '',
    email: '',
    celular: '',
    sexo: '',
    senha: ''
};

// --- Elementos DOM ---
const btnNext = document.getElementById('btnNext');
const btnPrev = document.getElementById('btnPrev');
const navButtons = document.getElementById('navButtons');
const errorMessage = document.getElementById('errorMessage');
const progressBar = document.getElementById('progressBar');

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    setupMasks();
    setupListeners();
});

function setupListeners() {
    // Navegação
    btnNext.addEventListener('click', handleNext);
    btnPrev.addEventListener('click', handlePrev);

    // Enter para avançar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentStep < 6) {
            e.preventDefault();
            handleNext();
        }
    });

    // Seleção de Sexo (Cards)
    document.querySelectorAll('.btn-sexo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove seleção anterior
            document.querySelectorAll('.btn-sexo').forEach(b => {
                b.classList.remove('bg-white', 'text-black', 'ring-2', 'ring-white');
                b.classList.add('border-gray-800');
            });
            // Adiciona seleção atual
            const target = e.currentTarget;
            target.classList.remove('border-gray-800');
            target.classList.add('bg-white', 'text-black', 'ring-2', 'ring-white');
            
            // Salva valor e avança
            document.getElementById('sexo').value = target.dataset.value;
            setTimeout(handleNext, 300); // Avanço automático suave
        });
    });

    // Validação de Senha em Tempo Real
    document.getElementById('senha').addEventListener('input', validatePasswordRules);

    // Modal de Termos
    const modal = document.getElementById('termsModal');
    document.getElementById('btnOpenTerms').addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.remove('hidden');
    });
    const closeTerms = () => modal.classList.add('hidden');
    document.getElementById('btnCloseTerms').addEventListener('click', closeTerms);
    document.getElementById('btnAgreeTerms').addEventListener('click', () => {
        document.getElementById('aceiteTermos').checked = true;
        closeTerms();
    });
}

// --- Lógica de Navegação ---

async function handleNext() {
    showError(null); // Limpa erros

    // 1. Validação do Passo Atual
    if (!validateCurrentStep()) return;

    // 2. Coleta de Dados do Passo
    collectData();

    // 3. Se for o passo de resumo (6), envia para API
    if (currentStep === 6) {
        await submitCadastro();
        return;
    }

    // 4. Avança visualmente
    changeStep(currentStep + 1);
}

function handlePrev() {
    if (currentStep > 1) {
        changeStep(currentStep - 1);
        showError(null);
    }
}

function changeStep(step) {
    // Esconde atual
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.remove('active');
    
    currentStep = step;
    
    // Mostra novo com delay para animação
    setTimeout(() => {
        document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.add('active');
        
        // Foca no primeiro input do novo passo
        const input = document.querySelector(`.step-content[data-step="${currentStep}"] input`);
        if (input) input.focus();
    }, 400);

    updateUI();
}

function updateUI() {
    // Barra de Progresso
    const progress = ((currentStep) / (totalSteps + 1)) * 100;
    progressBar.style.width = `${progress}%`;

    // Botões
    if (currentStep === 1) {
        btnPrev.classList.add('hidden');
    } else {
        btnPrev.classList.remove('hidden');
    }

    if (currentStep === 6) {
        btnNext.innerText = 'CRIAR CONTA';
        // Preenche resumo
        document.getElementById('resumoNome').innerText = formData.nome_completo;
        document.getElementById('resumoCPF').innerText = formData.cpf;
        document.getElementById('resumoEmail').innerText = formData.email || '-';
    } else {
        btnNext.innerText = 'CONTINUAR';
    }

    // Esconde navegação se for sucesso (passo 7)
    if (currentStep === 7) {
        navButtons.classList.add('hidden');
        document.getElementById('loginLink').classList.add('hidden');
    }

    // Atualiza nome no titulo do passo 2
    if (currentStep === 2 && formData.nome_completo) {
        const primeiroNome = formData.nome_completo.split(' ')[0];
        document.getElementById('displayNome').innerText = primeiroNome;
    }
}

// --- Validação e Coleta ---

function validateCurrentStep() {
    const s = currentStep;
    const val = (id) => document.getElementById(id).value.trim();

    if (s === 1) {
        if (val('nome_completo').length < 3) return showError("Por favor, digite seu nome completo.");
    }
    if (s === 2) {
        const cpf = val('cpf').replace(/\D/g, '');
        if (cpf.length !== 11) return showError("O CPF deve conter 11 dígitos.");
        // Validação simples de formato (API fará a checagem real de unicidade)
    }
    if (s === 4) {
        if (!document.getElementById('sexo').value) return showError("Por favor, selecione uma opção.");
    }
    if (s === 5) {
        const pass = val('senha');
        const confirm = val('confirmarSenha');
        if (!checkPasswordStrength(pass)) return showError("A senha não atende aos requisitos de segurança.");
        if (pass !== confirm) return showError("As senhas não coincidem.");
    }
    if (s === 6) {
        if (!document.getElementById('aceiteTermos').checked) return showError("Você precisa concordar com os Termos de Uso.");
    }
    return true;
}

function collectData() {
    formData.nome_completo = document.getElementById('nome_completo').value.trim();
    formData.cpf = document.getElementById('cpf').value.replace(/\D/g, "");
    formData.email = document.getElementById('email').value.trim();
    formData.celular = document.getElementById('celular').value.replace(/\D/g, "");
    formData.sexo = document.getElementById('sexo').value;
    formData.senha = document.getElementById('senha').value;
}

function showError(msg) {
    if (!msg) {
        errorMessage.classList.add('hidden');
        return true;
    }
    errorMessage.innerText = msg;
    errorMessage.classList.remove('hidden');
    // Shake animation
    const currentDiv = document.querySelector(`.step-content[data-step="${currentStep}"]`);
    currentDiv.classList.add('shake'); // Adicione css shake se quiser
    setTimeout(() => currentDiv.classList.remove('shake'), 500);
    return false;
}

// --- Regras de Senha (Visual) ---
function validatePasswordRules() {
    const pass = document.getElementById('senha').value;
    const rules = {
        length: pass.length >= 6,
        upper: /[A-Z]/.test(pass),
        lower: /[a-z]/.test(pass),
        number: /[0-9]/.test(pass)
    };

    // Atualiza ícones
    for (const [key, valid] of Object.entries(rules)) {
        const el = document.getElementById(`rule-${key}`);
        if (valid) {
            el.classList.replace('text-gray-500', 'text-green-400');
            el.querySelector('span').innerText = 'check_circle';
        } else {
            el.classList.replace('text-green-400', 'text-gray-500');
            el.querySelector('span').innerText = 'circle';
        }
    }
}

function checkPasswordStrength(p) {
    return p.length >= 6 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
}

// --- Envio para API ---

async function submitCadastro() {
    btnNext.innerText = 'CRIANDO...';
    btnNext.disabled = true;

    try {
        const authHeaders = await getAuthHeaders(); // Pega Token Dinâmico

        const response = await fetch(`${API_CONFIG.baseUrl}/api/clientes`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // SUCESSO!
            changeStep(7); // Tela de Sucesso
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } else {
            // ERRO (Ex: CPF Duplicado)
            if (response.status === 409) {
                changeStep(2); // Volta pro CPF
                showError("Este CPF já está cadastrado.");
            } else if (response.status === 400) {
                showError("Verifique os dados informados.");
                console.log(result.error);
            } else {
                throw new Error(result.message || "Erro desconhecido");
            }
        }
    } catch (error) {
        console.error(error);
        showError("Erro de conexão. Tente novamente.");
    } finally {
        btnNext.disabled = false;
        if (currentStep !== 7) btnNext.innerText = 'CRIAR CONTA';
    }
}

// --- Máscaras ---
function setupMasks() {
    // CPF
    document.getElementById('cpf').addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, "$1.$2")
             .replace(/(\d{3})(\d)/, "$1.$2")
             .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = v;
    });

    // Celular
    document.getElementById('celular').addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2")
             .replace(/(\d)(\d{4})$/, "$1-$2");
        e.target.value = v;
    });
}