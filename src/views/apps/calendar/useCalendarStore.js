import { defineStore } from 'pinia';
import axios from 'axios';
import authService from '@/services/auth';

const API_URL = 'http://localhost:8080/api';

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
    // ✅ CORRIGIDO: Buscar eventos com melhor controle de usuário
    async fetchEvents(targetUserId = null) {
      try {
        console.log('📡 Buscando eventos...', { targetUserId });
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();
        const isAdmin = authService.isAdmin();
        const isDiretor = authService.isDiretor();
        
        let url = `${API_URL}/events`;
        const params = {};
        
        // ✅ CORRIGIDO: Lógica de parâmetros
        if (targetUserId) {
          // Admin/Diretor quer ver eventos de usuário específico
          params.userId = targetUserId;
          console.log('📋 Admin/Diretor visualizando eventos do usuário:', targetUserId);
        } else if (isAdmin || isDiretor) {
          // Admin/Diretor sem usuário específico = todos os eventos
          console.log('📋 Admin/Diretor visualizando todos os eventos');
          // Não adiciona userId, vai buscar todos
        } else {
          // Usuário comum vê apenas seus próprios eventos
          params.userId = currentUser.userData.id;
          console.log('👤 Usuário comum visualizando próprios eventos:', currentUser.userData.id);
        }
        
        // Filtro por calendários selecionados
        if (this.selectedCalendars.length > 0 && this.selectedCalendars.length < this.availableCalendars.length) {
          params.calendars = this.selectedCalendars.join(',');
        }

        console.log('📤 Parâmetros da requisição:', { url, params });
        console.log('📤 Headers:', {
          'X-User-Id': currentUser.userData.id,
          'X-User-Role': isAdmin || isDiretor ? 'ADMIN' : 'USER'
        });

        const response = await axios.get(url, { 
          params,
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': isAdmin || isDiretor ? 'ADMIN' : 'USER'
          }
        });
        
        console.log('✅ Resposta da API:', response);
        
        if (response.status === 200) {
          this.events = response.data;
          console.log('✅ Eventos carregados:', response.data.length, 'eventos');
          console.log('📊 Detalhes dos eventos:', response.data.map(e => ({
            id: e.id,
            title: e.title,
            userId: e.userId,
            client: e.extendedProps?.cliente
          })));
          return response.data;
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
        
        // ✅ NOVO: Tratamento específico de erros
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

    // ✅ CORRIGIDO: Adicionar evento com melhor tratamento
    async addEvent(event) {
      try {
        console.log('➕ Adicionando evento:', event);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();
        
        // ✅ NOVO: Garantir que o evento tenha todas as propriedades necessárias
        const eventToSend = {
          ...event,
          userId: event.userId || currentUser.userData.id, // Use userId do evento ou usuário atual
          start: new Date(event.start).toISOString(),
          end: new Date(event.end).toISOString(),
        };

        // ✅ NOVO: Garantir que extendedProps existe
        if (!eventToSend.extendedProps) {
          eventToSend.extendedProps = {};
        }

        // ✅ NOVO: Mapear clienteId para o backend
        if (eventToSend.extendedProps.clienteId) {
          eventToSend.clientId = eventToSend.extendedProps.clienteId;
        }

        console.log('➕ Evento formatado para envio:', eventToSend);

        const response = await axios.post(`${API_URL}/events`, eventToSend, {
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': authService.isAdmin() || authService.isDiretor() ? 'ADMIN' : 'USER'
          }
        });
        
        console.log('✅ Evento criado:', response.data);
        
        // ✅ CORRIGIDO: Atualizar eventos locais apenas se o evento foi criado com sucesso
        if (response.data) {
          this.events.push(response.data);
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

    // ✅ CORRIGIDO: Atualizar evento
    async updateEvent(event) {
      try {
        console.log('✏️ Atualizando evento:', event);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const currentUser = authService.getCurrentUser();

        const eventToSend = {
          ...event,
          start: new Date(event.start).toISOString(),
          end: new Date(event.end).toISOString(),
        };

        // ✅ NOVO: Mapear clienteId para o backend
        if (eventToSend.extendedProps?.clienteId) {
          eventToSend.clientId = eventToSend.extendedProps.clienteId;
        }

        const response = await axios.put(`${API_URL}/events/${event.id}`, eventToSend, {
          headers: {
            'X-User-Id': currentUser.userData.id.toString(),
            'X-User-Role': authService.isAdmin() || authService.isDiretor() ? 'ADMIN' : 'USER'
          }
        });
        
        console.log('✅ Evento atualizado:', response.data);
        
        // Atualizar evento local
        const index = this.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
          this.events[index] = response.data;
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao atualizar evento:', error);
        throw error;
      }
    },

    // ✅ CORRIGIDO: Remover evento
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
        
        console.log('✅ Evento removido');
        
        // Remover evento local
        const index = this.events.findIndex(e => e.id === parseInt(eventId));
        if (index !== -1) {
          this.events.splice(index, 1);
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao remover evento:', error);
        throw error;
      }
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
