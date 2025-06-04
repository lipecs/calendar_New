// src/services/user.js - CORRIGIDO
import axios from 'axios';
import authService from './auth';

const API_URL = 'http://localhost:8080/api';
const ADMIN_API_URL = 'http://localhost:8080/api/admin';

class UserService {
  // ✅ CORRIGIDO: Métodos para administradores
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

  // ✅ CORRIGIDO: Criar usuário
  async createUser(userData) {
    try {
      authService.isAuthenticated();
      
      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role, // ✅ CORRIGIDO: Usar role em vez de admin
        supervisorId: userData.supervisorId || null,
        coordenadorId: userData.coordenadorId || null
      };
      
      const response = await axios.post(ADMIN_API_URL + '/users', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Atualizar usuário
  async updateUser(id, userData) {
    try {
      authService.isAuthenticated();
      
      const payload = {
        username: userData.username,      
        email: userData.email,
        role: userData.role, // ✅ CORRIGIDO: Usar role em vez de admin
        supervisorId: userData.supervisorId || null,
        coordenadorId: userData.coordenadorId || null
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

  // ✅ NOVO: Buscar coordenadores
  async getCoordenadores() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/coordenadores');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar coordenadores:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar supervisores
  async getSupervisores() {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(ADMIN_API_URL + '/supervisores');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar supervisores:', error);
      throw error;
    }
  }

  // Métodos existentes para perfil do usuário
  async updateProfile(userData) {
    try {
      authService.isAuthenticated();
      
      const payload = {
        username: userData.username,
        email: userData.email
      };
      
      if (userData.password && userData.password.trim() && userData.currentPassword) {
        const profileResponse = await axios.put(API_URL + '/user/profile', {
          username: userData.username,
          email: userData.email
        });
        
        await this.changePassword(userData.currentPassword, userData.password);
        
        return profileResponse.data;
      } else {
        const response = await axios.put(API_URL + '/user/profile', payload);
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