// src/services/auth.js - ATUALIZADO
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/auth/';

class AuthService {
  async login(email, password) {
    try {
      const response = await axios.post(API_URL + 'signin', {
        email,
        password
      });
      
      if (response.data.accessToken) {
        const userData = {
          accessToken: response.data.accessToken,
          userData: response.data.userData,
          userAbilityRules: response.data.userAbilityRules
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        
        this.setAuthHeader(response.data.accessToken);
        this.setUserHeaders(response.data.userData);
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['X-User-Id'];
    delete axios.defaults.headers.common['X-User-Role'];
  }

  setAuthHeader(token) {
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }

  setUserHeaders(userData) {
    if (userData && userData.id) {
      axios.defaults.headers.common['X-User-Id'] = userData.id.toString();
      axios.defaults.headers.common['X-User-Role'] = this.getUserRoleHeader(userData.role);
    }
  }

  // ✅ NOVO: Método para converter role para header
  getUserRoleHeader(role) {
    const roleMap = {
      'admin': 'ADMIN',
      'diretor': 'DIRETOR',
      'supervisor': 'SUPERVISOR', 
      'coordenador': 'COORDENADOR',
      'vendedor': 'VENDEDOR',
      'user': 'USER'
    };
    return roleMap[role] || 'USER';
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    if (user && user.accessToken) {
      this.setAuthHeader(user.accessToken);
      this.setUserHeaders(user.userData);
      return true;
    }
    return false;
  } 

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  // ✅ ATUALIZADO: Verificação de admin incluindo diretor
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.userData && (user.userData.role === 'admin' || user.userData.role === 'diretor');
  }

  // ✅ NOVO: Verificações específicas de papéis
  isDiretor() {
    const user = this.getCurrentUser();
    return user && user.userData && user.userData.role === 'diretor';
  }

  isSupervisor() {
    const user = this.getCurrentUser();
    return user && user.userData && user.userData.role === 'supervisor';
  }

  isCoordenador() {
    const user = this.getCurrentUser();
    return user && user.userData && user.userData.role === 'coordenador';
  }

  isVendedor() {
    const user = this.getCurrentUser();
    return user && user.userData && user.userData.role === 'vendedor';
  }

  // ✅ NOVO: Verificar se pode gerenciar vendedores
  canManageVendedores() {
    const user = this.getCurrentUser();
    if (!user || !user.userData) return false;
    
    const role = user.userData.role;
    return ['admin', 'diretor', 'supervisor', 'coordenador'].includes(role);
  }

  // ✅ NOVO: Verificar se pode cadastrar clientes
  canManageClientes() {
    const user = this.getCurrentUser();
    if (!user || !user.userData) return false;
    
    const role = user.userData.role;
    return ['admin', 'diretor', 'supervisor'].includes(role);
  }

  // ✅ NOVO: Verificar se pode criar agendamentos para outros
  canCreateAgendamentosForOthers() {
    const user = this.getCurrentUser();
    if (!user || !user.userData) return false;
    
    const role = user.userData.role;
    return ['admin', 'diretor', 'supervisor', 'coordenador'].includes(role);
  }

  // ✅ NOVO: Obter nível hierárquico
  getHierarchyLevel() {
    const user = this.getCurrentUser();
    if (!user || !user.userData) return 0;
    
    const levels = {
      'admin': 5,
      'diretor': 4,
      'supervisor': 3,
      'coordenador': 2,
      'vendedor': 1,
      'user': 0
    };
    
    return levels[user.userData.role] || 0;
  }

  getUserAbilities() {
    const user = this.getCurrentUser();
    if (!user || !user.userAbilityRules) return [];

    return user.userAbilityRules.map(rule => ({
      action: rule.action,
      subject: rule.subject,
      ...(rule.subject === 'Calendar' && rule.action === 'manage' && !this.isAdmin() 
        ? { conditions: { userId: user.userData.id } } 
        : {})
    }));
  }
}

const authService = new AuthService();

const user = authService.getCurrentUser();
if (user && user.accessToken) {
  authService.setAuthHeader(user.accessToken);
  authService.setUserHeaders(user.userData);
}

export default authService;
