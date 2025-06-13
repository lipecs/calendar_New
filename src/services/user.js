// src/services/user.js - CORRIGIDO COM HEADERS
import axios from 'axios';
import authService from './auth';

const API_URL = 'http://localhost:8080/api';
const ADMIN_API_URL = 'http://localhost:8080/api/admin';

class UserService {
  
  // ✅ NOVO: Método para obter headers de autenticação
  getAuthHeaders() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.userData) {
      throw new Error('Usuário não autenticado');
    }
    
    return {
      'X-User-Id': currentUser.userData.id.toString(),
      'X-User-Role': authService.getUserRoleHeader(currentUser.userData.role)
    };
  }

  // ✅ CORRIGIDO: Buscar todos os usuários
  async getAllUsers() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/users', {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Buscar usuário por ID
  async getUserById(id) {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + `/users/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Criar usuário
  async createUser(userData) {
    try {
      console.log('➕ Criando usuário:', userData);
      
      authService.isAuthenticated();
      
      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        supervisorId: userData.supervisorId || null,
        coordenadorId: userData.coordenadorId || null
      };
      
      console.log('📤 Payload sendo enviado:', payload);
      console.log('🔑 Headers de autenticação:', this.getAuthHeaders());
      
      const response = await axios.post(ADMIN_API_URL + '/users', payload, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Usuário criado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Tratamento melhorado de erros
      if (error.response?.status === 400) {
        const errorMessage = error.response.data || 'Dados inválidos';
        throw new Error(`Erro de validação: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para criar usuários.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.response?.data || error.message || 'Erro ao criar usuário');
      }
    }
  }

  // ✅ CORRIGIDO: Atualizar usuário
  async updateUser(id, userData) {
    try {
      console.log('✏️ Atualizando usuário ID:', id, userData);
      
      authService.isAuthenticated();
      
      const payload = {
        username: userData.username,      
        email: userData.email,
        role: userData.role,
        supervisorId: userData.supervisorId || null,
        coordenadorId: userData.coordenadorId || null
      };
      
      // Incluir senha apenas se fornecida
      if (userData.password && userData.password.trim()) {
        payload.password = userData.password;
      }
      
      console.log('📤 Payload de atualização sendo enviado:', payload);
      console.log('🔑 Headers de autenticação:', this.getAuthHeaders());
      
      const response = await axios.put(ADMIN_API_URL + `/users/${id}`, payload, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Usuário atualizado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Tratamento melhorado de erros
      if (error.response?.status === 400) {
        const errorMessage = error.response.data || 'Dados inválidos';
        throw new Error(`Erro de validação: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para atualizar este usuário.');
      } else if (error.response?.status === 404) {
        throw new Error('Usuário não encontrado.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.response?.data || error.message || 'Erro ao atualizar usuário');
      }
    }
  }

  async deleteUser(id) {
    try {
      console.log('🗑️ Deletando usuário ID:', id);
      
      authService.isAuthenticated();
      
      const response = await axios.delete(ADMIN_API_URL + `/users/${id}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Usuário deletado com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      
      // Tratamento melhorado de erros
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para excluir este usuário.');
      } else if (error.response?.status === 404) {
        throw new Error('Usuário não encontrado.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.response?.data || error.message || 'Erro ao excluir usuário');
      }
    }
  }

  // ✅ CORRIGIDO: Buscar coordenadores
  async getCoordenadores() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/coordenadores', {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar coordenadores:', error);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Buscar supervisores
  async getSupervisores() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/supervisores', {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar supervisores:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar vendedores (para seleção de usuários subordinados)
  async getVendedores() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/vendedores', {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      throw error;
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
        return new Error('Usuário não encontrado.');
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

  // ✅ NOVO: Verificar conectividade com o backend
  async testConnection() {
    try {
      console.log('🔗 Testando conexão com o backend de usuários...');
      
      const response = await axios.get(`${ADMIN_API_URL}/users`, {
        headers: this.getAuthHeaders(),
        timeout: 5000 // 5 segundos de timeout
      });
      
      console.log('✅ Conexão com backend de usuários OK');
      return true;
    } catch (error) {
      console.error('❌ Falha na conexão com backend de usuários:', error);
      return false;
    }
  }
}

export default new UserService();
