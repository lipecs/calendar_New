// src/services/event.js (corrigido)
import axios from 'axios';
import authService from './auth';

// URL base da API
const API_URL = 'http://localhost:8080/api/events';

class EventService {
  // Método para obter headers de autenticação
  getAuthHeaders() {
    const currentUser = authService.getCurrentUser();
    return {
      'X-User-Id': currentUser?.id,
      'X-User-Role': authService.isAdmin() ? 'ADMIN' : 'USER'
    };
  }

  async getEvents(calendars, userId) {
    try {
      authService.isAuthenticated();
      
      let url = API_URL;
      let params = {};
      
      if (calendars) {
        params.calendars = calendars;
      }
      
      if (userId) {
        params.userId = userId;
      }
      
      const response = await axios.get(url, { 
        params,
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      throw error;
    }
  }

  // Método específico para buscar eventos por usuário (para admin)
  async getEventsByUserId(userId) {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(API_URL, {
        params: { userId },
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar eventos do usuário ${userId}:`, error);
      throw error;
    }
  }

  async getEventById(id) {
    try {
      authService.isAuthenticated();
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar evento ${id}:`, error);
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
      authService.isAuthenticated();
      
      // Adiciona o ID do usuário atual ao evento
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.id) {
        eventData.userId = currentUser.id;
      }
      
      const response = await axios.post(API_URL, eventData, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  async updateEvent(id, eventData) {
    try {
      authService.isAuthenticated();
      const response = await axios.put(`${API_URL}/${id}`, eventData, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar evento ${id}:`, error);
      throw error;
    }
  }

  async deleteEvent(id) {
    try {
      authService.isAuthenticated();
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao excluir evento ${id}:`, error);
      throw error;
    }
  }

  // Método para obter estatísticas de eventos por usuário
  async getUserEventStats(userId) {
    try {
      const events = await this.getEventsByUserId(userId);
      
      return {
        total: events.length,
        inProgress: events.filter(e => e.extendedProps?.status === 'In Progress').length,
        done: events.filter(e => e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado').length,
        urgent: events.filter(e => e.extendedProps?.status === 'Urgent' || e.extendedProps?.status === 'Urgente').length,
        byCategory: this.groupEventsByCategory(events),
        upcomingEvents: events.filter(e => new Date(e.start) > new Date()).length
      };
    } catch (error) {
      console.error(`Erro ao obter estatísticas do usuário ${userId}:`, error);
      throw error;
    }
  }

  // Método auxiliar para agrupar eventos por categoria
  groupEventsByCategory(events) {
    const categories = {};
    events.forEach(event => {
      const category = event.extendedProps?.calendar || 'Sem categoria';
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  // Método para buscar eventos com filtros avançados
  async getEventsWithFilters(filters = {}) {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(API_URL, {
        params: filters,
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar eventos com filtros:', error);
      throw error;
    }
  }

  // Método para exportar eventos para CSV
  exportEventsAsCSV(events, filename = 'eventos.csv') {
    const headers = ['Título', 'Início', 'Fim', 'Status', 'Categoria', 'Descrição'];
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        `"${event.title}"`,
        `"${this.formatDate(event.start)}"`,
        `"${this.formatDate(event.end)}"`,
        `"${event.extendedProps?.status || ''}"`,
        `"${event.extendedProps?.calendar || ''}"`,
        `"${event.description || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Método auxiliar para formatação de data
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new EventService();
