// src/services/event.js (com formatação BR)
import axios from 'axios';
import authService from './auth';

// URL base da API
const API_URL = 'http://localhost:8080/api/events';

class EventService {
  // 👉 Função para converter data BR para ISO
  convertBRDateToISO(brDate) {
    if (!brDate) return null;
    
    try {
      // Padrão: DD/MM/YYYY HH:MM ou DD/MM/YYYY
      const dateTimeRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})$/;
      const dateOnlyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      
      let match = brDate.match(dateTimeRegex);
      if (match) {
        const [, day, month, year, hours, minutes] = match;
        return new Date(year, month - 1, day, hours, minutes).toISOString();
      }
      
      match = brDate.match(dateOnlyRegex);
      if (match) {
        const [, day, month, year] = match;
        return new Date(year, month - 1, day).toISOString();
      }
      
      // Se não conseguir fazer parse, tenta usar o Date nativo
      const date = new Date(brDate);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      console.error('Erro ao converter data BR para ISO:', error);
      return null;
    }
  }

  // 👉 Função para converter ISO para formato BR
  convertISOToBRDate(isoDate, allDay = false) {
    if (!isoDate) return '';
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      if (allDay) {
        return `${day}/${month}/${year}`;
      }
      
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Erro ao converter ISO para data BR:', error);
      return '';
    }
  }

  // 👉 Preparar evento para envio ao servidor
  prepareEventForServer(eventData) {
    const preparedEvent = { ...eventData };
    
    // Converter datas para ISO se estiverem em formato BR
    if (preparedEvent.start) {
      if (typeof preparedEvent.start === 'string' && preparedEvent.start.includes('/')) {
        const isoDate = this.convertBRDateToISO(preparedEvent.start);
        if (isoDate) preparedEvent.start = isoDate;
      } else if (preparedEvent.start instanceof Date) {
        preparedEvent.start = preparedEvent.start.toISOString();
      }
    }
    
    if (preparedEvent.end) {
      if (typeof preparedEvent.end === 'string' && preparedEvent.end.includes('/')) {
        const isoDate = this.convertBRDateToISO(preparedEvent.end);
        if (isoDate) preparedEvent.end = isoDate;
      } else if (preparedEvent.end instanceof Date) {
        preparedEvent.end = preparedEvent.end.toISOString();
      }
    }
    
    return preparedEvent;
  }

  // 👉 Processar evento recebido do servidor
  processEventFromServer(event) {
    const processedEvent = { ...event };
    
    // Converter datas ISO para objetos Date (FullCalendar espera Date objects)
    if (processedEvent.start) {
      processedEvent.start = new Date(processedEvent.start);
    }
    
    if (processedEvent.end) {
      processedEvent.end = new Date(processedEvent.end);
    }
    
    return processedEvent;
  }

  // Método para obter headers de autenticação
  getAuthHeaders() {
    const currentUser = authService.getCurrentUser();
    return {
      'X-User-Id': currentUser?.userData?.id,
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
      
      // Processar eventos recebidos do servidor
      const processedEvents = response.data.map(event => this.processEventFromServer(event));
      return processedEvents;
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
      
      // Processar eventos recebidos do servidor
      const processedEvents = response.data.map(event => this.processEventFromServer(event));
      return processedEvents;
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
      
      // Processar evento recebido do servidor
      return this.processEventFromServer(response.data);
    } catch (error) {
      console.error(`Erro ao buscar evento ${id}:`, error);
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
      authService.isAuthenticated();
      
      // Preparar evento para o servidor
      const preparedEvent = this.prepareEventForServer(eventData);
      
      // Adiciona o ID do usuário atual ao evento
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.userData && currentUser.userData.id) {
        preparedEvent.userId = currentUser.userData.id;
      }
      
      console.log('📤 Enviando evento para o servidor:', preparedEvent);
      
      const response = await axios.post(API_URL, preparedEvent, {
        headers: this.getAuthHeaders()
      });
      
      // Processar evento retornado do servidor
      return this.processEventFromServer(response.data);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  async updateEvent(id, eventData) {
    try {
      authService.isAuthenticated();
      
      // Preparar evento para o servidor
      const preparedEvent = this.prepareEventForServer(eventData);
      
      console.log('📤 Atualizando evento no servidor:', preparedEvent);
      
      const response = await axios.put(`${API_URL}/${id}`, preparedEvent, {
        headers: this.getAuthHeaders()
      });
      
      // Processar evento retornado do servidor
      return this.processEventFromServer(response.data);
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
      
      // Processar eventos recebidos do servidor
      const processedEvents = response.data.map(event => this.processEventFromServer(event));
      return processedEvents;
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
        `"${this.formatDateToBR(event.start)}"`,
        `"${this.formatDateToBR(event.end)}"`,
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

  // Método auxiliar para formatação de data BR
  formatDateToBR(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
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
