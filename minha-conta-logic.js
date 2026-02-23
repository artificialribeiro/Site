import { API_CONFIG, getAuthHeaders } from './chavetoken.js';

const loadingState = document.getElementById('loadingState');
const accountContent = document.getElementById('accountContent');
const listaEnderecos = document.getElementById('listaEnderecos');

let clienteId = null;

// ==========================================
// 0. MOTOR DE SESSÃO DO USUÁRIO
// ==========================================
function obterIdClienteLogado() {
    try {
        // Procura nas gavetas do navegador
        const usuarioStr = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
        const sessaoLegado = localStorage.getItem('boutique_diniz_session'); 

        let usuarioDados = null;

        if (usuarioStr) {
            usuarioDados = JSON.parse(usuarioStr);
        } else if (sessaoLegado) {
            const dec = JSON.parse(atob(sessaoLegado));
            usuarioDados = dec.usuario || dec.cliente;
        }

        if (!usuarioDados || (!usuarioDados.id && !usuarioDados.cliente_id)) {
            return null;
        }

        return usuarioDados.id || usuarioDados.cliente_id;
    } catch (e) {
        return null;
    }
}

// ==========================================
// 1. CARREGAMENTO INICIAL DO PERFIL
// ==========================================
async function carregarPerfil() {
    
    clienteId = obterIdClienteLogado();
    
    if (!clienteId) {
        localStorage.removeItem('usuario');
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
        return;
    }

    try {
        // AGORA SIM: Usa a sua função oficial para pegar o Token válido!
        const headersSeguros = await getAuthHeaders();
        
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}`, { 
            method: 'GET',
            headers: headersSeguros 
        });
        
        if (!res.ok) {
            throw new Error(`A API rejeitou a conexão (Erro HTTP: ${res.status})`);
        }

        const data = await res.json();
        
        if (data.success) {
            const c = data.data;
            
            document.getElementById('perfilNome').value = c.nome_completo || c.nome || '';
            document.getElementById('perfilCpf').value = c.cpf || '';
            document.getElementById('perfilEmail').value = c.email || '';
            document.getElementById('perfilCelular').value = c.celular || '';
            
            await carregarEnderecos();

            if (loadingState) loadingState.classList.add('hidden');
            if (accountContent) {
                accountContent.classList.remove('hidden');
                accountContent.classList.add('flex');
            }
        } else {
            throw new Error(data.message || "A API não retornou sucesso.");
        }
    } catch (e) {
        console.error("Erro capturado:", e);
        if (loadingState) {
            loadingState.innerHTML = `
                <div class="bg-[#0a0a0a] p-8 rounded-xl border border-red-900/50 text-center max-w-sm mx-auto shadow-2xl">
                    <span class="material-symbols-outlined text-5xl text-red-500 mb-4">wifi_off</span>
                    <h3 class="text-xl font-bold text-white mb-2">Falha na Conexão</h3>
                    <p class="text-xs text-yellow-500 mb-6 leading-relaxed">Erro Técnico: ${e.message}</p>
                    <button onclick="window.location.href='login.html'" class="w-full bg-white text-black px-6 py-4 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-200 transition-colors">Voltar ao Login</button>
                </div>
            `;
        }
    }
}

// Arranca o sistema
carregarPerfil();

// ==========================================
// 2. ATUALIZAR DADOS (PUT /api/clientes/:id)
// ==========================================
document.getElementById('formDadosPessoais').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarPerfil');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> A guardar...`;

    try {
        const headersSeguros = await getAuthHeaders();
        const payload = {
            email: document.getElementById('perfilEmail').value,
            celular: document.getElementById('perfilCelular').value.replace(/\D/g, '')
        };

        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}`, {
            method: 'PUT',
            headers: headersSeguros,
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert("Os seus dados foram atualizados com sucesso!");
        } else {
            alert(data.message || "Erro ao guardar os dados.");
        }
    } catch (e) {
        alert("Falha de conexão com a API.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">save</span> Atualizar Perfil`;
    }
});

// ==========================================
// 3. GESTÃO DE ENDEREÇOS
// ==========================================
async function carregarEnderecos() {
    try {
        const headersSeguros = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, { 
            method: 'GET',
            headers: headersSeguros 
        });
        const data = await res.json();
        
        let enderecos = Array.isArray(data) ? data : (data.data || []);
        let html = '';
        
        enderecos.forEach(end => {
            html += `
                <div class="border ${end.principal ? 'border-green-800 bg-green-900/5' : 'border-gray-800 bg-[#0a0a0a]'} p-5 rounded-lg relative transition-all hover:border-gray-600">
                    ${end.principal ? '<span class="text-[9px] bg-green-600 text-white px-2 py-1 rounded absolute -top-2 left-4 uppercase font-bold tracking-widest shadow-md">Morada Principal</span>' : ''}
                    
                    <p class="text-sm font-bold text-white mb-1 mt-2">${end.rua}, ${end.numero} ${end.complemento ? ' - ' + end.complemento : ''}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest mb-1">${end.bairro}</p>
                    <p class="text-xs text-gray-500">${end.cidade}/${end.estado} - <span class="font-mono text-gray-400">${end.cep}</span></p>
                    
                    <div class="mt-4 flex gap-4 border-t border-gray-900 pt-3">
                        <button onclick="window.removerEndereco(${end.id})" class="text-[10px] uppercase font-bold tracking-widest text-red-500 hover:text-red-400 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">delete</span> Remover</button>
                        ${!end.principal ? `<button onclick="window.definirPrincipal(${end.id})" class="text-[10px] uppercase font-bold tracking-widest text-blue-500 hover:text-blue-400 ml-auto flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">push_pin</span> Tornar Principal</button>` : ''}
                    </div>
                </div>
            `;
        });
        
        if (listaEnderecos) {
            listaEnderecos.innerHTML = html || `<div class="col-span-1 md:col-span-2 text-center py-10 bg-[#0a0a0a] rounded-lg border border-gray-900"><p class="text-xs text-gray-500 uppercase tracking-widest">Nenhuma morada cadastrada</p></div>`;
        }
    } catch (e) {
        console.error("Falha ao carregar endereços", e);
    }
}

// Funções expostas para o HTML
window.abrirModalEndereco = () => {
    const modal = document.getElementById('modalEndereco');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.fecharModalEndereco = () => {
    const modal = document.getElementById('modalEndereco');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

document.getElementById('formEndereco').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px] align-middle mr-1">sync</span> A guardar...`;

    try {
        const headersSeguros = await getAuthHeaders();
        const payload = {
            tipo: 'casa',
            rua: document.getElementById('endRua').value,
            numero: document.getElementById('endNumero').value,
            complemento: document.getElementById('endComplemento').value,
            bairro: document.getElementById('endBairro').value,
            cidade: document.getElementById('endCidade').value,
            estado: document.getElementById('endEstado').value.toUpperCase(),
            cep: document.getElementById('endCep').value.replace(/\D/g, ''),
            principal: 0
        };

        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, {
            method: 'POST',
            headers: headersSeguros,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.fecharModalEndereco();
            e.target.reset();
            await carregarEnderecos();
            alert("Morada adicionada com sucesso!");
        } else {
            const err = await res.json();
            alert(err.message || "Não foi possível guardar a morada.");
        }
    } catch (e) {
        alert("Erro de comunicação.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Salvar Morada";
    }
});

window.removerEndereco = async (id) => {
    if (!confirm("Tem a certeza que deseja apagar permanentemente esta morada?")) return;
    
    try {
        const headersSeguros = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos/${id}`, {
            method: 'DELETE',
            headers: headersSeguros
        });
        
        if(res.ok) {
            await carregarEnderecos();
        } else {
            alert("Falha ao apagar morada.");
        }
    } catch (e) {
        alert("Erro de comunicação com o servidor.");
    }
};

window.definirPrincipal = async (id) => {
    try {
        const headersSeguros = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos/${id}`, {
            method: 'PUT',
            headers: headersSeguros,
            body: JSON.stringify({ principal: 1 })
        });
        
        if(res.ok) {
            await carregarEnderecos();
        } else {
            alert("Erro ao alterar a morada principal.");
        }
    } catch (e) {
        console.error(e);
    }
};
