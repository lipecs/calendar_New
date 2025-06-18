// src/services/user.js - ATUALIZADO COM HIERARQUIA
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
        throw new Error(error.response?.data?.error || error.response?.data || error.message || 'Erro ao buscar usuários');
      }
    }
  }

  // ✅ NOVO: Buscar usuários gerenciados baseado na hierarquia
  async getManagedUsers() {
    try {
      console.log('👥 Buscando usuários gerenciados...');
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }

      const currentUser = authService.getCurrentUser();
      const currentUserId = currentUser.userData.id;
      const userRole = currentUser.userData.role;

      // Buscar todos os usuários primeiro
      const allUsers = await this.getAllUsers();
      
      let managedUsers = [];

      switch (userRole) {
        case 'admin':
        case 'diretor':
          // Admin e Diretor podem ver todos
          managedUsers = allUsers;
          break;

        case 'supervisor':
          // Supervisor vê coordenadores e vendedores sob sua responsabilidade
          managedUsers = allUsers.filter(user => 
            user.supervisorId === currentUserId
          );
          break;

        case 'coordenador':
          // Coordenador vê vendedores sob sua coordenação
          managedUsers = allUsers.filter(user => 
            user.coordenadorId === currentUserId && user.role === 'vendedor'
          );
          break;

        default:
          // Vendedores não gerenciam ninguém
          managedUsers = [];
      }

      console.log('✅ Usuários gerenciados encontrados:', {
        userRole,
        currentUserId,
        totalUsers: allUsers.length,
        managedUsers: managedUsers.length,
        users: managedUsers.map(u => ({ id: u.id, username: u.username, role: u.role }))
      });

      return managedUsers;

    } catch (error) {
      console.error('❌ Erro ao buscar usuários gerenciados:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar subordinados de um supervisor
  async getSubordinatesBySupervisor(supervisorId = null) {
    try {
      const currentUser = authService.getCurrentUser();
      const targetSupervisorId = supervisorId || currentUser.userData.id;
      
      console.log('👥 Buscando subordinados do supervisor:', targetSupervisorId);

      const allUsers = await this.getAllUsers();
      
      // Filtrar usuários que têm este supervisor
      const subordinates = allUsers.filter(user => 
        user.supervisorId === targetSupervisorId
      );

      console.log('✅ Subordinados encontrados:', subordinates.length);
      return subordinates;

    } catch (error) {
      console.error('❌ Erro ao buscar subordinados:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar vendedores de um coordenador
  async getVendedoresByCoordenador(coordenadorId = null) {
    try {
      const currentUser = authService.getCurrentUser();
      const targetCoordenadorId = coordenadorId || currentUser.userData.id;
      
      console.log('👤 Buscando vendedores do coordenador:', targetCoordenadorId);

      const allUsers = await this.getAllUsers();
      
      // Filtrar vendedores que têm este coordenador
      const vendedores = allUsers.filter(user => 
        user.coordenadorId === targetCoordenadorId && user.role === 'vendedor'
      );

      console.log('✅ Vendedores encontrados:', vendedores.length);
      return vendedores;

    } catch (error) {
      console.error('❌ Erro ao buscar vendedores por coordenador:', error);
      throw error;
    }
  }

  // ✅ NOVO: Verificar se um usuário está sob supervisão/coordenação
  async isUserUnderManagement(userId, managerId, managerType = 'supervisor') {
    try {
      const allUsers = await this.getAllUsers();
      const user = allUsers.find(u => u.id === userId);
      
      if (!user) return false;

      if (managerType === 'supervisor') {
        return user.supervisorId === managerId;
      } else if (managerType === 'coordenador') {
        return user.coordenadorId === managerId;
      }

      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar hierarquia:', error);
      return false;
    }
  }

  // ✅ NOVO: Obter estrutura hierárquica completa
  async getHierarchyStructure() {
    try {
      console.log('🏗️ Construindo estrutura hierárquica...');
      
      const allUsers = await this.getAllUsers();
      const currentUser = authService.getCurrentUser();
      
      const structure = {
        currentUser: currentUser.userData,
        admins: allUsers.filter(u => u.role === 'admin'),
        diretores: allUsers.filter(u => u.role === 'diretor'),
        supervisores: allUsers.filter(u => u.role === 'supervisor'),
        coordenadores: allUsers.filter(u => u.role === 'coordenador'),
        vendedores: allUsers.filter(u => u.role === 'vendedor'),
        hierarchy: {}
      };

      // Construir hierarquia para supervisores
      structure.supervisores.forEach(supervisor => {
        structure.hierarchy[supervisor.id] = {
          supervisor,
          coordenadores: allUsers.filter(u => u.supervisorId === supervisor.id && u.role === 'coordenador'),
          vendedores: allUsers.filter(u => u.supervisorId === supervisor.id && u.role === 'vendedor')
        };
      });

      // Construir hierarquia para coordenadores
      structure.coordenadores.forEach(coordenador => {
        if (!structure.hierarchy[coordenador.id]) {
          structure.hierarchy[coordenador.id] = { coordenador };
        }
        structure.hierarchy[coordenador.id].vendedores = allUsers.filter(u => 
          u.coordenadorId === coordenador.id && u.role === 'vendedor'
        );
      });

      console.log('✅ Estrutura hierárquica construída:', structure);
      return structure;

    } catch (error) {
      console.error('❌ Erro ao construir hierarquia:', error);
      throw error;
    }
  }

  // ✅ MÉTODOS EXISTENTES: Manter todos os métodos originais
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
        throw new Error(error.response?.data?.error || error.response?.data || error.message || 'Erro ao buscar usuário');
      }
    }
  }

  // ✅ CORRIGIDO: Criar usuário
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
      
      // ✅ CORRIGIDO: Usando o endpoint correto
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
        const errorData = error.response.data;
        const errorMessage = errorData?.error || errorData || 'Dados inválidos';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro de validação');
      } else if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para criar usuários.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error || errorData || error.message || 'Erro ao criar usuário';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao criar usuário');
      }
    }
  }

  // ✅ CORRIGIDO: Atualizar usuário
  async updateUser(id, userData) {
    try {
      console.log('✏️ Atualizando usuário:', id, userData);
      
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

      if (!userData.role || !userData.role.trim()) {
        throw new Error('Papel é obrigatório');
      }

      // Montar payload
      const payload = {
        username: userData.username.trim(),
        email: userData.email.trim(),
        role: userData.role.trim(),
        supervisorId: userData.supervisorId || null,
        coordenadorId: userData.coordenadorId || null
      };

      // Adicionar senha apenas se fornecida
      if (userData.password && userData.password.trim()) {
        payload.password = userData.password.trim();
      }
      
      console.log('📤 Payload de atualização sendo enviado:', {
        ...payload,
        password: payload.password ? '[OCULTA]' : '[NÃO FORNECIDA]'
      });
      
      const headers = this.getAuthHeaders();
      
      // ✅ CORRIGIDO: Usando o endpoint correto
      const response = await axios.put(ADMIN_API_URL + `/users/${id}`, payload, {
        headers: headers
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
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        const errorMessage = errorData?.error || errorData || 'Dados inválidos';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro de validação');
      } else if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para atualizar usuários.');
      } else if (error.response?.status === 404) {
        throw new Error('Usuário não encontrado.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error || errorData || error.message || 'Erro ao atualizar usuário';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao atualizar usuário');
      }
    }
  }

  // ✅ CORRIGIDO: Excluir usuário
  async deleteUser(id) {
    try {
      console.log('🗑️ Excluindo usuário:', id);
      
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.delete(ADMIN_API_URL + `/users/${id}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Usuário excluído com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        const errorMessage = errorData?.error || errorData || 'Dados inválidos';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro de validação');
      } else if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 403) {
        throw new Error('Você não tem permissão para excluir este usuário.');
      } else if (error.response?.status === 404) {
        throw new Error('Usuário não encontrado.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error || errorData || error.message || 'Erro ao excluir usuário';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao excluir usuário');
      }
    }
  }

  // ✅ MÉTODOS AUXILIARES EXISTENTES
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
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || errorData || error.message || 'Erro ao buscar coordenadores';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao buscar coordenadores');
    }
  }

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
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || errorData || error.message || 'Erro ao buscar supervisores';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao buscar supervisores');
    }
  }
}

export default new UserService();
