import authService from '@/services/auth';
import axios from 'axios';
import { defineStore } from 'pinia';

const API_URL = 'http://localhost:8080/api';

const parseDate = (dateInput) => {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return dateInput.toISOString();
  }
  
  if (typeof dateInput === 'string') {
    // Formato brasileiro: dd-mm-yyyy hh:mm
    const brFormat = /^(\d{2})-(\d{2})-(\d{4})\s*(\d{2}):(\d{2})$/.test(dateInput);
    if (brFormat) {
      const [, day, month, year, hours, minutes] = dateInput.match(/^(\d{2})-(\d{2})-(\d{4})\s*(\d{2}):(\d{2})$/);
      return new Date(year, month - 1, day, hours, minutes).toISOString();
    }
    
    // Formato brasileiro: dd-mm-yyyy
    const brDateOnly = /^(\d{2})-(\d{2})-(\d{4})$/.test(dateInput);
    if (brDateOnly) {
      const [, day, month, year] = dateInput.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      return new Date(year, month - 1, day).toISOString();
    }
    
    return new Date(dateInput).toISOString();
  }
  
  return null;
};

export const useCalendarStore = defineStore('calendar', {
  state: () => ({
    availableCalendars: [
      { color: '#18e125', label: 'Meeting' },
      { color: '#d5d51b', label: 'Task' },
      { color: '#673ab7', label: 'Deadline' },
      { color: '#fb0000', label: 'High Priority' },
      { color: '#2196f3', label: 'Presentation' },
    ],
    selectedCalendars: ['Meeting', 'Task', 'Deadline', 'High Priority', 'Presentation'],
    events: [],
  }),

  actions: {
    async fetchEvents(targetUserId = null) {
      try {
        console.log('📡 Buscando eventos...', { targetUserId });
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();
        const isAdmin = authService.isAdmin();
        const isDiretor = authService.isDiretor();
        const isSupervisor = authService.isSupervisor();
        const isCoordenador = authService.isCoordenador();
        const isVendedor = authService.isVendedor();
        
        let url = `${API_URL}/events`;
        const params = {};
        
        if (targetUserId) {
          // Buscar eventos de usuário específico (para admins/superiores)
          params.userId = targetUserId;
          console.log('👤 Buscando eventos do usuário:', targetUserId);
        } else if (isAdmin || isDiretor) {
          // Admin/Diretor sem filtro = todos os eventos
          console.log('👑 Admin/Diretor visualizando todos os eventos');
        } else if (isSupervisor) {
          console.log('👥 Supervisor buscando eventos da equipe');
          // Buscar todos os eventos primeiro, filtrar no frontend ou criar endpoint específico
        } else if (isCoordenador) {
          console.log('🎯 Coordenador buscando eventos da equipe');
        } else {
          // Vendedor ou usuário comum - apenas próprios eventos
          params.userId = currentUser.userData.id;
          console.log('👤 Vendedor buscando próprios eventos');
        }

        const response = await axios.get(url, {
          params,
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': authService.isAdmin() || authService.isDiretor() ? 'ADMIN' : 'USER'
          }
        });

        if (response.status === 200) {
          console.log('✅ Eventos recebidos do backend:', response.data.length);
          
          const events = response.data.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
            extendedProps: {
              calendar: event.extendedProps?.calendar || 'Meeting',
              location: event.extendedProps?.location || '',
              status: event.extendedProps?.status || 'In Progress',
              guests: event.extendedProps?.guests || [],
              clienteId: event.clientId || event.extendedProps?.clienteId || null,
              cliente: event.extendedProps?.cliente || '',
              clienteCode: event.extendedProps?.clienteCode || '',
              assignedUser: event.assignedUserId || event.extendedProps?.assignedUser || null
            }
          }));
          
          this.events = events;
          console.log('✅ Eventos armazenados localmente:', events.length);
          
          return events;
        } else {
          console.error('❌ Erro ao buscar eventos:', response.statusText);
          return [];
        }
      } catch (error) {
        console.error('❌ Erro na requisição de eventos:', error);
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
        
        if (error.response?.status === 401) {
          console.error('🔐 Erro de autenticação - redirecionando para login');
          authService.logout();
          window.location.href = '/login';
        } else if (error.response?.status === 403) {
          console.error('🚫 Acesso negado');
        }
        
        return [];
      }
    },

    isUserUnderSupervision(userId, supervisorId, supervisorType) {
      // Este método deveria idealmente vir do backend
      // Por enquanto, vamos assumir que funciona com os dados já carregados
      // Em produção, isso deveria ser uma chamada API ou dados pré-carregados
      return true; // Simplificado - em produção usar dados reais de hierarquia
    },

    async addEvent(event) {
      try {
        console.log('➕ Adicionando evento:', event);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();
        
        const eventToSend = {
          title: event.title,
          description: event.description || '',
          start: parseDate(event.start), // ← CORREÇÃO AQUI
          end: parseDate(event.end),     // ← CORREÇÃO AQUI
          allDay: event.allDay || false,
          url: event.url || '',
          userId: event.userId || currentUser.userData.id,
          
          clientId: event.clientId || null,
          assignedUserId: event.assignedUserId || null,
          
          // ExtendedProps
          extendedProps: {
            calendar: event.extendedProps?.calendar || 'Meeting',
            location: event.extendedProps?.location || '',
            status: event.extendedProps?.status || 'In Progress',
            guests: event.extendedProps?.guests || [],
            
            clienteId: event.extendedProps?.clienteId || null,
            cliente: event.extendedProps?.cliente || '',
            clienteCode: event.extendedProps?.clienteCode || '',
            assignedUser: event.extendedProps?.assignedUser || null
          }
        };

        console.log('➕ Evento formatado para backend:', {
          title: eventToSend.title,
          start: eventToSend.start,
          end: eventToSend.end,
          userId: eventToSend.userId,
          clientId: eventToSend.clientId,
          assignedUserId: eventToSend.assignedUserId,
          extendedProps: eventToSend.extendedProps
        });

        const response = await axios.post(`${API_URL}/events`, eventToSend, {
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': authService.isAdmin() || authService.isDiretor() ? 'ADMIN' : 'USER'
          }
        });
        
        console.log('✅ Evento criado no backend:', response.data);
        
        if (response.data) {
          const processedEvent = this.processEventFromBackend(response.data);
          this.events.push(processedEvent);
          console.log('✅ Evento adicionado ao store local:', processedEvent);
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao adicionar evento:', error);
        console.error('❌ Detalhes do erro de criação:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          request: error.config?.data
        });
        throw error;
      }
    },

    async updateEvent(event) {
      try {
        console.log('✏️ Atualizando evento:', event);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();

        const eventToSend = {
          id: event.id,
          title: event.title,
          description: event.description || '',
          start: parseDate(event.start), 
          end: parseDate(event.end),    
          allDay: event.allDay || false,
          url: event.url || '',
          userId: event.userId,
          
          clientId: event.clientId || null,
          assignedUserId: event.assignedUserId || null,
          
          // ExtendedProps
          extendedProps: {
            calendar: event.extendedProps?.calendar || 'Meeting',
            location: event.extendedProps?.location || '',
            status: event.extendedProps?.status || 'In Progress',
            guests: event.extendedProps?.guests || [],
            
            clienteId: event.extendedProps?.clienteId || null,
            cliente: event.extendedProps?.cliente || '',
            clienteCode: event.extendedProps?.clienteCode || '',
            assignedUser: event.extendedProps?.assignedUser || null
          }
        };

        console.log('✏️ Evento formatado para atualização:', eventToSend);

        const response = await axios.put(`${API_URL}/events/${event.id}`, eventToSend, {
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': authService.isAdmin() || authService.isDiretor() ? 'ADMIN' : 'USER'
          }
        });
        
        console.log('✅ Evento atualizado no backend:', response.data);
        
        const index = this.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
          const processedEvent = this.processEventFromBackend(response.data);
          this.events[index] = processedEvent;
          console.log('✅ Evento atualizado no store local');
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao atualizar evento:', error);
        throw error;
      }
    },

    async removeEvent(eventId) {
      try {
        console.log('🗑️ Removendo evento:', eventId);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();

        const response = await axios.delete(`${API_URL}/events/${eventId}`, {
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': authService.isAdmin() || authService.isDiretor() ? 'ADMIN' : 'USER'
          }
        });
        
        console.log('✅ Evento removido do backend');
        
        const index = this.events.findIndex(e => e.id === parseInt(eventId));
        if (index !== -1) {
          this.events.splice(index, 1);
          console.log('✅ Evento removido do store local');
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao remover evento:', error);
        throw error;
      }
    },

    processEventFromBackend(backendEvent) {
      const processedEvent = {
        ...backendEvent,
        start: new Date(backendEvent.start),
        end: new Date(backendEvent.end),
        
        extendedProps: {
          calendar: backendEvent.extendedProps?.calendar || 'Meeting',
          location: backendEvent.extendedProps?.location || '',
          status: backendEvent.extendedProps?.status || 'In Progress',
          guests: backendEvent.extendedProps?.guests || [],
          
          clienteId: backendEvent.clientId || backendEvent.extendedProps?.clienteId || null,
          cliente: backendEvent.extendedProps?.cliente || '',
          clienteCode: backendEvent.extendedProps?.clienteCode || '',
          assignedUser: backendEvent.assignedUserId || backendEvent.extendedProps?.assignedUser || null
        }
      };

      if (backendEvent.clientId && !processedEvent.extendedProps.clienteId) {
        processedEvent.extendedProps.clienteId = backendEvent.clientId;
      }
      
      if (backendEvent.assignedUserId && !processedEvent.extendedProps.assignedUser) {
        processedEvent.extendedProps.assignedUser = backendEvent.assignedUserId;
      }

      console.log('🔄 Evento processado do backend:', {
        id: processedEvent.id,
        title: processedEvent.title,
        userId: processedEvent.userId,
        clientId: backendEvent.clientId,
        assignedUserId: backendEvent.assignedUserId,
        extendedProps: processedEvent.extendedProps
      });

      return processedEvent;
    },

    // Buscar todos os filtros do backend
    async fetchFilters() {
      try {
        console.log('🏷️ Carregando filtros...');
        // Por enquanto, usando filtros estáticos
        console.log('✅ Filtros carregados:', this.availableCalendars.length);
        return this.availableCalendars;
      } catch (error) {
        console.error('❌ Erro ao buscar filtros:', error);
        return [];
      }
    },
  },
});
