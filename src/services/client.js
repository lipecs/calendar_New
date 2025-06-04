// src/services/client.js - CORRIGIDO
import axios from 'axios';
import authService from './auth';

const API_URL = 'http://localhost:8080/api/clients';

class ClientService {
  // ✅ CORRIGIDO: Método para obter headers de autenticação
  getAuthHeaders() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.userData) {
      throw new Error('Usuário não autenticado');
    }
    
    return {
      'X-User-Id': currentUser.userData.id.toString(),
      'X-User-Role': authService.isAdmin() ? 'ADMIN' : 'USER'
    };
  }

  // ✅ CORRIGIDO: Buscar todos os clientes
  async getAllClients(filters = {}) {
    try {
      console.log('🔍 Carregando clientes...', filters);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(API_URL, { 
        params: filters,
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Clientes carregados:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Melhor tratamento de erro
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para visualizar clientes.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.response?.data || error.message || 'Erro ao carregar clientes');
      }
    }
  }

  // ✅ CORRIGIDO: Buscar cliente por ID
  async getClientById(id) {
    try {
      console.log('🔍 Buscando cliente ID:', id);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Cliente encontrado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar cliente por ID:', error);
      throw this.handleError(error, 'buscar cliente');
    }
  }

  // ✅ CORRIGIDO: Criar cliente
  async createClient(clientData) {
    try {
      console.log('➕ Criando cliente:', clientData);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.post(API_URL, clientData, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Cliente criado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao criar cliente:', error);
      throw this.handleError(error, 'criar cliente');
    }
  }

  // ✅ CORRIGIDO: Atualizar cliente
  async updateClient(id, clientData) {
    try {
      console.log('✏️ Atualizando cliente ID:', id, clientData);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.put(`${API_URL}/${id}`, clientData, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Cliente atualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      throw this.handleError(error, 'atualizar cliente');
    }
  }

  // ✅ CORRIGIDO: Deletar cliente
  async deleteClient(id) {
    try {
      console.log('🗑️ Deletando cliente ID:', id);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Cliente deletado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error);
      throw this.handleError(error, 'deletar cliente');
    }
  }

  // ✅ CORRIGIDO: Buscar clientes disponíveis para seleção em eventos
  async getAvailableClients() {
    try {
      console.log('🔍 Buscando clientes disponíveis...');
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(`${API_URL}/available`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Clientes disponíveis:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar clientes disponíveis:', error);
      throw this.handleError(error, 'buscar clientes disponíveis');
    }
  }

  // ✅ CORRIGIDO: Buscar clientes por vendedor
  async getClientsByVendedor(vendedorId) {
    try {
      console.log('🔍 Buscando clientes do vendedor:', vendedorId);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(`${API_URL}/vendedor/${vendedorId}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Clientes do vendedor:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar clientes por vendedor:', error);
      throw this.handleError(error, 'buscar clientes por vendedor');
    }
  }

  // ✅ CORRIGIDO: Buscar clientes por coordenador
  async getClientsByCoordenador(coordenadorId) {
    try {
      console.log('🔍 Buscando clientes do coordenador:', coordenadorId);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(`${API_URL}/coordenador/${coordenadorId}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Clientes do coordenador:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar clientes por coordenador:', error);
      throw this.handleError(error, 'buscar clientes por coordenador');
    }
  }

  // ✅ CORRIGIDO: Contar clientes ativos por vendedor
  async countClientsByVendedor(vendedorId) {
    try {
      console.log('🔢 Contando clientes do vendedor:', vendedorId);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(`${API_URL}/vendedor/${vendedorId}/count`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Contagem de clientes:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao contar clientes por vendedor:', error);
      throw this.handleError(error, 'contar clientes por vendedor');
    }
  }

  // ✅ CORRIGIDO: Buscar clientes com filtros
  async searchClients(searchTerm) {
    try {
      console.log('🔍 Buscando clientes com termo:', searchTerm);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(API_URL, {
        params: { search: searchTerm },
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Resultados da busca:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro na busca de clientes:', error);
      throw this.handleError(error, 'buscar clientes');
    }
  }

  // ✅ NOVO: Método central para tratamento de erros
  handleError(error, action) {
    const status = error.response?.status;
    const message = error.response?.data || error.message;

    switch (status) {
      case 400:
        return new Error(`Dados inválidos para ${action}: ${message}`);
      case 401:
        return new Error('Sessão expirada. Faça login novamente.');
      case 403:
        return new Error(`Você não tem permissão para ${action}.`);
      case 404:
        return new Error('Cliente não encontrado.');
      case 409:
        return new Error('Conflito: dados já existem.');
      case 422:
        return new Error(`Dados inválidos: ${message}`);
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error('Erro interno do servidor. Tente novamente mais tarde.');
      default:
        return new Error(message || `Erro ao ${action}`);
    }
  }

  // ✅ NOVO: Método para verificar conectividade com o backend
  async testConnection() {
    try {
      console.log('🔗 Testando conexão com o backend...');
      
      const response = await axios.get(`${API_URL}`, {
        headers: this.getAuthHeaders(),
        timeout: 5000 // 5 segundos de timeout
      });
      
      console.log('✅ Conexão com backend OK');
      return true;
    } catch (error) {
      console.error('❌ Falha na conexão com backend:', error);
      return false;
    }
  }
}

export default new ClientService();
