import axios from 'axios';
import authService from './auth';

const API_URL = 'http://localhost:8080/api';
const ADMIN_API_URL = 'http://localhost:8080/api/admin';

class UserService {
  // Métodos para administradores
  async getAllUsers() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/users');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  // Adicione este método na classe UserService
async getUserById(id) {
  try {
    authService.isAuthenticated();
    
    const response = await axios.get(ADMIN_API_URL + `/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    throw error;
  }
}

  async createUser(userData) {
    try {
      authService.isAuthenticated();
      
      // Preparar dados para o backend
      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        admin: userData.role?.includes('admin') || false
      };
      
      const response = await axios.post(ADMIN_API_URL + '/users', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      authService.isAuthenticated();
      
      // Preparar dados para o backend
      const payload = {
        username: userData.username,      
        email: userData.email,
        admin: userData.role?.includes('admin') || false
      };
      
      // Incluir senha apenas se fornecida
      if (userData.password && userData.password.trim()) {
        payload.password = userData.password;
      }
      
      const response = await axios.put(ADMIN_API_URL + `/users/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      authService.isAuthenticated();
      
      const response = await axios.delete(ADMIN_API_URL + `/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  }

  // Novos métodos para perfil do usuário
  async updateProfile(userData) {
    try {
      authService.isAuthenticated();
      
      const payload = {
        username: userData.username,
        email: userData.email
      };
      
      // Se alterando senha, usar endpoint específico
      if (userData.password && userData.password.trim() && userData.currentPassword) {
        // Primeiro atualizar dados básicos
        const profileResponse = await axios.put(API_URL + '/user/profile', {
          username: userData.username,
          email: userData.email
        });
        
        // Depois alterar a senha
        await this.changePassword(userData.currentPassword, userData.password);
        
        return profileResponse.data;
      } else {
        // Apenas atualizar dados básicos
        const response = await axios.put(API_URL + '/user/profile'  , payload);
        return response.data;
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  async getCurrentProfile() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(API_URL + '/user/profile');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      authService.isAuthenticated();
      
      const payload = {
        currentPassword: currentPassword,
        newPassword: newPassword
      };
      
      const response = await axios.put(API_URL + '/user/change-password', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }
}

export default new UserService();
