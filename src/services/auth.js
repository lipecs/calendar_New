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
        // ✅ NOVO: Armazenar no formato padrão
        const userData = {
          accessToken: response.data.accessToken,
          userData: response.data.userData,
          userAbilityRules: response.data.userAbilityRules
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Configurar headers para axios 
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
      axios.defaults.headers.common['X-User-Role'] = userData.role === 'admin' ? 'ADMIN' : 'USER';
    }
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

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.userData && user.userData.role === 'admin';
  }

  getUserAbilities() {
    const user = this.getCurrentUser();
    if (!user || !user.userAbilityRules) return [];

    // ✅ NOVO: Usar as abilities que vêm do backend
    return user.userAbilityRules.map(rule => ({
      action: rule.action,
      subject: rule.subject,
      // Adicionar conditions para usuários comuns
      ...(rule.subject === 'Calendar' && rule.action === 'manage' && user.userData.role !== 'admin' 
        ? { conditions: { userId: user.userData.id } } 
        : {})
    }));
  }
}

// Instância singleton
const authService = new AuthService();

// Inicializa o token de autenticação se o usuário estiver logado
const user = authService.getCurrentUser();
if (user && user.accessToken) {
  authService.setAuthHeader(user.accessToken);
  authService.setUserHeaders(user.userData);
}

export default authService;
