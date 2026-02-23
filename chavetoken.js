/**
 * Configurações da API
 */
const API_CONFIG = {
    baseUrl: "https://3000-iknk5ldddsf3ol72h88dv-b83a7f78.us1.manus.computer",
    staticKey: "1526", // Sua chave padrão
    endpoints: {
        getToken: "/api/token",
        revokeToken: "/api/token/revoke"
    }
};

// Variáveis internas para armazenar o token e sua validade
let _currentToken = null;
let _tokenExpiration = null;

/**
 * Função principal para obter um Token válido.
 * Se o token atual não existir ou estiver expirado, ela gera um novo.
 */
async function getIntegrationToken() {
    const now = Date.now();

    // Verifica se já temos um token válido (com margem de segurança de 10 segundos)
    if (_currentToken && _tokenExpiration && now < (_tokenExpiration - 10000)) {
        console.log("Reutilizando token existente...");
        return _currentToken;
    }

    console.log("Gerando novo token de integração...");

    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getToken}`, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_CONFIG.staticKey,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success && result.data) {
            _currentToken = result.data.token;
            // Define a expiração baseada na resposta (segundos para milissegundos)
            // result.data.expires_in_seconds geralmente é 900 (15 min)
            _tokenExpiration = now + (result.data.expires_in_seconds * 1000);
            
            return _currentToken;
        } else {
            console.error("Erro ao gerar token:", result);
            throw new Error(result.message || "Falha na autenticação");
        }

    } catch (error) {
        console.error("Erro de conexão ou API:", error);
        throw error;
    }
}

/**
 * Helper para obter os headers completos para requisições protegidas.
 * Retorna o objeto pronto para ser usado no fetch.
 */
async function getAuthHeaders() {
    const token = await getIntegrationToken();
    return {
        'Content-Type': 'application/json',
        'X-API-KEY': API_CONFIG.staticKey,
        'X-API-TOKEN': token
    };
}

// Exporta as configurações e as funções necessárias
export { API_CONFIG, getIntegrationToken, getAuthHeaders };