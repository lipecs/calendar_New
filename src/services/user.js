// src/services/user.js - CORRIGIDO COMPLETO
import axios from 'axios';
import authService from './auth';

const API_URL = 'http://localhost:8080/api';
const ADMIN_API_URL = 'http://localhost:8080/api/admin';

class UserService {
  
  // ✅ CORRIGIDO: Método para obter headers de autenticação
  getAuthHeaders() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.userData) {
      throw new Error('Usuário não autenticado');
    }
    
    const headers = {
      'X-User-Id': currentUser.userData.id.toString(),
      'X-User-Role': authService.getUserRoleHeader(currentUser.userData.role),
      'Content-Type': 'application/json'
    };

    console.log('🔑 Headers de autenticação:', headers);
    return headers;
  }

  // ✅ CORRIGIDO: Buscar todos os usuários
  async getAllUsers() {
    try {
      console.log('🔍 Carregando usuários...');
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(ADMIN_API_URL + '/users', {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Usuários carregados:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Tratamento melhorado de erros
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para visualizar usuários.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.response?.data || error.message || 'Erro ao buscar usuários');
      }
    }
  }

  async getUserById(id) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(ADMIN_API_URL + `/users/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por ID:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para visualizar este usuário.');
      } else if (error.response?.status === 404) {
        throw new Error('Usuário não encontrado.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.response?.data || error.message || 'Erro ao buscar usuário');
      }
    }
  }

  async createUser(userData) {
    try {
      console.log('➕ Criando usuário:', userData);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }

      // Validação básica no frontend
      if (!userData.username || !userData.username.trim()) {
        throw new Error('Nome de usuário é obrigatório');
      }

      if (!userData.email || !userData.email.trim()) {
        throw new Error('Email é obrigatório');
      }

      if (!userData.password || !userData.password.trim()) {
        throw new Error('Senha é obrigatória');
      }

      if (!userData.role || !userData.role.trim()) {
        throw new Error('Papel é obrigatório');
      }

      // Montar payload
      const payload = {
        username: userData.username.trim(),
        email: userData.email.trim(),
        password: userData.password.trim(),
        role: userData.role.trim(),
        supervisorId: userData.supervisorId || null,
        coordenadorId: userData.coordenadorId || null
      };
      
      console.log('📤 Payload sendo enviado:', {
        ...payload,
        password: '[OCULTA]'
      });
      
      const headers = this.getAuthHeaders();
      console.log('🔑 Headers finais:', headers);
      
      const response = await axios.post(ADMIN_API_URL + '/users', payload, {
        headers: headers
      });
      
      console.log('✅ Usuário criado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data || 'Dados inválidos';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro de validação');
      } else if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para criar usuários.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(error.message || 'Erro ao criar usuário');
      }
    }
  }

  async updateUser(id, userData) {
    try {
      console.log('✏️ Atualizando usuário ID:', id, userData);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
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
      
      console.log('📤 Payload de atualização sendo enviado:', {
        ...payload,
        password: payload.password ? '[OCULTA]' : 'NÃO FORNECIDA'
      });
      
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
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.delete(ADMIN_API_URL + `/users/${id}`, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar usuário:', error);
      
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

  // ✅ NOVO: Buscar coordenadores
  async getCoordenadores() {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(ADMIN_API_URL + '/coordenadores', {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar coordenadores:', error);
      throw new Error(error.response?.data || error.message || 'Erro ao buscar coordenadores');
    }
  }

  // ✅ NOVO: Buscar supervisores
  async getSupervisores() {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(ADMIN_API_URL + '/supervisores', {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar supervisores:', error);
      throw new Error(error.response?.data || error.message || 'Erro ao buscar supervisores');
    }
  }

  // ✅ NOVO: Buscar vendedores por coordenador
  async getVendedoresByCoordenador(coordenadorId) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get(ADMIN_API_URL + `/vendedores/coordenador/${coordenadorId}`, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar vendedores por coordenador:', error);
      throw new Error(error.response?.data || error.message || 'Erro ao buscar vendedores');
    }
  }
}

export default new UserService();
