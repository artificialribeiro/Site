import { getAuthHeaders, API_CONFIG } from './chavetoken.js';

const loadingState = document.getElementById('loadingState');
const accountContent = document.getElementById('accountContent');
const listaEnderecos = document.getElementById('listaEnderecos');

let clienteId = null;

// ==========================================
// 1. CARREGAMENTO INICIAL (GET /api/clientes/:id)
// ==========================================
async function carregarPerfil() {
    const sessaoStr = localStorage.getItem('boutique_diniz_session');
    if (!sessaoStr) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessao = JSON.parse(atob(sessaoStr));
        
        // Extrator Universal de ID de Cliente
        const usuario = sessao.usuario || sessao.cliente || sessao;
        clienteId = usuario.id || usuario.cliente_id || sessao.id;

        if (!clienteId) throw new Error("ID não identificado.");

        const headers = await getAuthHeaders();
        
        [span_1](start_span)// Busca dados detalhados do cliente[span_1](end_span)
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}`, { headers });
        const data = await res.json();
        
        if (data.success) {
            const c = data.data;
            document.getElementById('perfilNome').value = c.nome_completo;
            document.getElementById('perfilCpf').value = c.cpf;
            document.getElementById('perfilEmail').value = c.email || '';
            document.getElementById('perfilCelular').value = c.celular || '';
            
            await carregarEnderecos();

            loadingState.classList.add('hidden');
            accountContent.classList.remove('hidden');
            accountContent.classList.add('flex');
        }
    } catch (e) {
        console.error(e);
        if(loadingState) loadingState.innerHTML = '<p class="text-red-500">Erro ao ligar ao servidor.</p>';
    }
}
carregarPerfil();

// ==========================================
// 2. ATUALIZAR DADOS (PUT /api/clientes/:id)
// ==========================================
document.getElementById('formDadosPessoais').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarPerfil');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Gravando...`;

    try {
        const headers = await getAuthHeaders();
        const payload = {
            email: document.getElementById('perfilEmail').value,
            celular: document.getElementById('perfilCelular').value.replace(/\D/g, '')
        };

        [span_2](start_span)// Envia atualização (Nome e CPF são protegidos no backend)[span_2](end_span)
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert("Dados atualizados com sucesso!");
        } else {
            alert(data.message || "Erro ao atualizar dados.");
        }
    } catch (e) {
        alert("Falha de conexão com a API.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">save</span> Atualizar Perfil`;
    }
});

// ==========================================
// 3. GESTÃO DE ENDEREÇOS (GET /api/clientes/:id/enderecos)
// ==========================================
async function carregarEnderecos() {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, { headers });
        const data = await res.json();
        
        let enderecos = Array.isArray(data) ? data : (data.data || []);
        
        let html = '';
        enderecos.forEach(end => {
            html += `
                <div class="border ${end.principal ? 'border-green-800 bg-green-900/5' : 'border-gray-800'} p-4 rounded-lg relative transition-all">
                    ${end.principal ? '<span class="text-[9px] bg-green-700 text-white px-2 py-0.5 rounded absolute -top-2 left-4 uppercase font-bold">Principal</span>' : ''}
                    <p class="text-sm font-bold text-white">${end.rua}, ${end.numero}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">${end.bairro}</p>
                    <p class="text-xs text-gray-400 mt-1">${end.cidade}/${end.estado} - ${end.cep}</p>
                    
                    <div class="mt-4 flex gap-4 border-t border-gray-900 pt-3">
                        <button onclick="window.removerEndereco(${end.id})" class="text-[10px] uppercase font-bold text-red-500 hover:text-red-400">Remover</button>
                        ${!end.principal ? `<button onclick="window.definirPrincipal(${end.id})" class="text-[10px] uppercase font-bold text-gray-400 hover:text-white">Marcar como Principal</button>` : ''}
                    </div>
                </div>
            `;
        });
        listaEnderecos.innerHTML = html || '<p class="text-xs text-gray-600 italic col-span-2 text-center py-4">Nenhuma morada cadastrada.</p>';
    } catch (e) {}
}

window.abrirModalEndereco = () => document.getElementById('modalEndereco').classList.replace('hidden', 'flex');
window.fecharModalEndereco = () => document.getElementById('modalEndereco').classList.replace('flex', 'hidden');

document.getElementById('formEndereco').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const headers = await getAuthHeaders();
        const payload = {
            tipo: 'casa',
            rua: document.getElementById('endRua').value,
            numero: document.getElementById('endNumero').value,
            complemento: document.getElementById('endComplemento').value,
            bairro: document.getElementById('endBairro').value,
            cidade: document.getElementById('endCidade').value,
            estado: document.getElementById('endEstado').value,
            cep: document.getElementById('endCep').value,
            principal: 0
        };

        [span_3](start_span)// Adiciona novo endereço[span_3](end_span)
        const res = await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.fecharModalEndereco();
            e.target.reset();
            await carregarEnderecos();
        }
    } catch (e) {}
});

window.removerEndereco = async (id) => {
    if (!confirm("Remover este endereço permanentemente?")) return;
    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos/${id}`, {
            method: 'DELETE',
            headers
        });
        await carregarEnderecos();
    } catch (e) {}
};

window.definirPrincipal = async (id) => {
    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_CONFIG.baseUrl}/api/clientes/${clienteId}/enderecos/${id}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ principal: 1 })
        });
        await carregarEnderecos();
    } catch (e) {}
};
