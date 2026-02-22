import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

let currentStep = 1;
let userCPF = ""; 
let recoveryCode = "";

// Elementos
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');
const errorMessage = document.getElementById('errorMessage');

document.addEventListener('DOMContentLoaded', () => {
    setupMasks();
    setupListeners();
});

function setupListeners() {
    btnNext.addEventListener('click', handleNext);
    btnBack.addEventListener('click', handleBack);
    
    // Avançar com Enter
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentStep < 4) {
            e.preventDefault();
            handleNext();
        }
    });

    // Validador de Senha
    document.getElementById('nova_senha').addEventListener('input', validatePasswordVisuals);
}

// --- CONTROLE DE FLUXO ---
async function handleNext() {
    showError(null);

    if (currentStep === 1) {
        const cpfRaw = document.getElementById('cpf').value.replace(/\D/g, "");
        if (cpfRaw.length !== 11) return showError("Digite um CPF válido com 11 dígitos.");
        
        userCPF = document.getElementById('cpf').value; // Mantém a máscara se a API aceitar, ou use cpfRaw
        await requestRecoveryCode(userCPF);
    } 
    else if (currentStep === 2) {
        recoveryCode = document.getElementById('codigo').value.trim();
        if (recoveryCode.length < 4) return showError("Informe o código recebido.");
        
        // A API não valida o código isoladamente, ela valida no reset. Então apenas avançamos.
        changeStep(3);
    }
    else if (currentStep === 3) {
        const senha = document.getElementById('nova_senha').value;
        const confirma = document.getElementById('confirmar_senha').value;
        
        if (!validatePasswordVisuals()) return showError("A senha não atende aos requisitos de segurança.");
        if (senha !== confirma) return showError("As senhas digitadas não coincidem.");
        
        await resetPassword(userCPF, recoveryCode, senha);
    }
}

function handleBack() {
    if (currentStep > 1 && currentStep < 4) {
        changeStep(currentStep - 1);
        showError(null);
    }
}

function changeStep(newStep) {
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.remove('active');
    currentStep = newStep;
    
    setTimeout(() => {
        document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.add('active');
        
        // Foca no input correspondente
        const input = document.querySelector(`.step-content[data-step="${currentStep}"] input`);
        if (input) input.focus();
    }, 300);

    updateUI();
}

function updateUI() {
    btnBack.classList.toggle('hidden', currentStep === 1 || currentStep === 4);
    
    if (currentStep === 1) btnNext.innerText = 'ENVIAR CÓDIGO';
    if (currentStep === 2) btnNext.innerText = 'VERIFICAR';
    if (currentStep === 3) btnNext.innerText = 'REDEFINIR SENHA';
    
    if (currentStep === 4) {
        document.getElementById('actionArea').classList.add('hidden');
        document.getElementById('loginLink').classList.add('hidden');
    }
}

// --- COMUNICAÇÃO COM A API ---

// 1. Solicita o Código
async function requestRecoveryCode(cpfFormatado) {
    setLoading(true);
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_CONFIG.baseUrl}/api/clientes/recuperar-senha`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ cpf: cpfFormatado })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            changeStep(2); // Avança para digitar o código
        } else {
            throw new Error(result.message || "Erro ao processar solicitação.");
        }
    } catch (error) {
        showError(error.message || "Erro de conexão com o servidor.");
    } finally {
        setLoading(false);
    }
}

// 2. Envia Nova Senha
async function resetPassword(cpfFormatado, codigo, novaSenha) {
    setLoading(true);
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_CONFIG.baseUrl}/api/clientes/redefinir-senha`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                cpf: cpfFormatado,
                codigo: codigo,
                nova_senha: novaSenha
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            changeStep(4); // Tela de Sucesso
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } else {
            // Volta pro passo do código se for inválido
            if (result.error && result.error.code === 'UNAUTHORIZED') {
                changeStep(2);
                showError("Código de recuperação inválido ou expirado.");
            } else {
                throw new Error(result.message || "Erro ao redefinir senha.");
            }
        }
    } catch (error) {
        showError(error.message || "Falha ao comunicar com o servidor.");
    } finally {
        setLoading(false);
    }
}

// --- UTILITÁRIOS ---

function showError(msg) {
    if (!msg) {
        errorMessage.classList.add('hidden');
        return;
    }
    errorMessage.innerText = msg;
    errorMessage.classList.remove('hidden');
}

function setLoading(isLoading) {
    btnNext.disabled = isLoading;
    btnNext.innerText = isLoading ? 'PROCESSANDO...' : (currentStep === 1 ? 'ENVIAR CÓDIGO' : (currentStep === 2 ? 'VERIFICAR' : 'REDEFINIR SENHA'));
    btnNext.style.opacity = isLoading ? '0.5' : '1';
}

function validatePasswordVisuals() {
    const pass = document.getElementById('nova_senha').value;
    const rules = {
        length: pass.length >= 6,
        upperLower: /[A-Z]/.test(pass) && /[a-z]/.test(pass),
        numberSpecial: /[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)
    };

    for (const [key, valid] of Object.entries(rules)) {
        const el = document.getElementById(`rule-${key}`);
        if (valid) {
            el.classList.replace('text-gray-500', 'text-white');
            el.querySelector('span').innerText = 'check_circle';
        } else {
            el.classList.replace('text-white', 'text-gray-500');
            el.querySelector('span').innerText = 'circle';
        }
    }
    return rules.length && rules.upperLower && rules.numberSpecial;
}

function setupMasks() {
    // Máscara de CPF
    document.getElementById('cpf').addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = v;
    });
}


