// src/services/event.js - CORRIGIDO
import axios from 'axios';
import authService from './auth';

// URL base da API
const API_URL = 'http://localhost:8080/api/events';

class EventService {
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

  //
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

  // Preparar evento para envio ao servidor
  prepareEventForServer(eventData) {
    const preparedEvent = { ...eventData };
    
    console.log('Preparando evento para servidor:', preparedEvent);
    
    //converter datas para ISO se necessário
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
    //
    if (preparedEvent.extendedProps?.clienteId && !preparedEvent.clientId) {
      preparedEvent.clientId = parseInt(preparedEvent.extendedProps.clienteId);
    }
    if (preparedEvent.extendedProps?.assignedUser && !preparedEvent.assignedUserId) {
      preparedEvent.assignedUserId = parseInt(preparedEvent.extendedProps.assignedUser);
    }
    
    if (!preparedEvent.extendedProps) {
      preparedEvent.extendedProps = {};
    }

    console.log('Evento preparado:', {
      id: preparedEvent.id,
      title: preparedEvent.title,
      userId: preparedEvent.userId,
      clientId: preparedEvent.clientId,
      assignedUserId: preparedEvent.assignedUserId,
      start: preparedEvent.start,
      end: preparedEvent.end
    });
    
    return preparedEvent;
  }

  processEventFromServer(event) {
    const processedEvent = { ...event };
    
    console.log('Processando evento do servidor:', event);

    if (processedEvent.start) {
      processedEvent.start = new Date(processedEvent.start);
    }
    
    if (processedEvent.end) {
      processedEvent.end = new Date(processedEvent.end);
    }
    
    if (!processedEvent.extendedProps) {
      processedEvent.extendedProps = {};
    }
    
    if (event.clientId && !processedEvent.extendedProps.clienteId) {
      processedEvent.extendedProps.clienteId = event.clientId;
    }
    
    if (event.assignedUserId && !processedEvent.extendedProps.assignedUser) {
      processedEvent.extendedProps.assignedUser = event.assignedUserId;
    }
    
    processedEvent.extendedProps = {
      calendar: processedEvent.extendedProps.calendar || 'Meeting',
      location: processedEvent.extendedProps.location || '',
      status: processedEvent.extendedProps.status || 'In Progress',
      guests: processedEvent.extendedProps.guests || [],
      clienteId: processedEvent.extendedProps.clienteId || event.clientId || null,
      cliente: processedEvent.extendedProps.cliente || '',
      assignedUser: processedEvent.extendedProps.assignedUser || event.assignedUserId || null,
      ...processedEvent.extendedProps
    };
    
    console.log('Evento processado:', {
      id: processedEvent.id,
      title: processedEvent.title,
      userId: processedEvent.userId,
      clienteId: processedEvent.extendedProps.clienteId,
      assignedUser: processedEvent.extendedProps.assignedUser
    });
    
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
      
      console.log('📡 Buscando eventos:', { url, params });
      
      const response = await axios.get(url, { 
        params,
        headers: this.getAuthHeaders()
      });
      
      console.log('📥 Resposta recebida:', response.data?.length, 'eventos');
      
      // ✅ CORRIGIDO: Processar eventos recebidos do servidor
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
      
      console.log('👤 Buscando eventos do usuário:', userId);
      
      const response = await axios.get(API_URL, {
        params: { userId },
        headers: this.getAuthHeaders()
      });
      
      console.log('📥 Eventos do usuário recebidos:', response.data?.length);
      
      // ✅ CORRIGIDO: Processar eventos recebidos do servidor
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
      
      // ✅ CORRIGIDO: Processar evento recebido do servidor
      return this.processEventFromServer(response.data);
    } catch (error) {
      console.error(`Erro ao buscar evento ${id}:`, error);
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
      authService.isAuthenticated();
      
      // ✅ CORRIGIDO: Preparar evento para o servidor
      const preparedEvent = this.prepareEventForServer(eventData);
      
      // Adiciona o ID do usuário atual ao evento se não estiver definido
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.userData && currentUser.userData.id) {
        if (!preparedEvent.userId) {
          preparedEvent.userId = currentUser.userData.id;
        }
      }
      
      console.log('📤 Enviando evento para criação:', preparedEvent);
      
      const response = await axios.post(API_URL, preparedEvent, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Evento criado no backend:', response.data);
      
      // ✅ CORRIGIDO: Processar evento retornado do servidor
      return this.processEventFromServer(response.data);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      throw error;
    }
  }

  async updateEvent(id, eventData) {
    try {
      authService.isAuthenticated();
      
      // ✅ CORRIGIDO: Preparar evento para o servidor
      const preparedEvent = this.prepareEventForServer(eventData);
      
      console.log('📤 Enviando evento para atualização:', preparedEvent);
      
      const response = await axios.put(`${API_URL}/${id}`, preparedEvent, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Evento atualizado no backend:', response.data);
      
      // ✅ CORRIGIDO: Processar evento retornado do servidor
      return this.processEventFromServer(response.data);
    } catch (error) {
      console.error(`Erro ao atualizar evento ${id}:`, error);
      throw error;
    }
  }
  
  async deleteEvent(id) {
    try {
      authService.isAuthenticated();
      console.log('🗑️ Deletando evento:', id);
      
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Evento deletado');
      return response.data;
    } catch (error) {
      console.error(`Erro ao excluir evento ${id}:`, error);
      throw error;
    }
  }

  //
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

  groupEventsByCategory(events) { 
    const categories = {};
    events.forEach(event => {
      const category = event.extendedProps?.calendar || 'Sem categoria';
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  async getEventsWithFilters(filters = {}) {
    try {
      authService.isAuthenticated();
      
      const response = await axios.get(API_URL, {
        params: filters,
        headers: this.getAuthHeaders()
      });
      
      const processedEvents = response.data.map(event => this.processEventFromServer(event));
      return processedEvents;
    } catch (error) {
      console.error('Erro ao buscar eventos com filtros:', error);
      throw error;
    }
  }

  //
  exportEventsAsCSV(events, filename = 'eventos.csv') {
    const headers = ['Título', 'Cliente', 'Vendedor', 'Início', 'Fim', 'Status', 'Categoria', 'Descrição'];
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        `"${event.title}"`,
        `"${event.extendedProps?.cliente || ''}"`,
        `"${event.extendedProps?.assignedUser || event.userId || ''}"`,
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
