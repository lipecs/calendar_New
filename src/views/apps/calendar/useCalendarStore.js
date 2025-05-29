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
    // ✅ CORREÇÃO: Buscar eventos com melhor debug
    async fetchEvents(userId = null) {
      try {
        console.log('📡 Buscando eventos...', { userId });
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        let url = `${API_URL}/events`;
        const params = {};
        
        // Se calendários específicos foram selecionados
        if (this.selectedCalendars.length > 0) {
          params.calendars = this.selectedCalendars.join(',');
        }
        
        // Se um userId específico foi fornecido (para admin visualizar outro usuário)
        if (userId) {
          params.userId = userId;
        }

        console.log('📡 Parâmetros da requisição:', { url, params });
        console.log('📡 Headers:', axios.defaults.headers.common);

        const response = await axios.get(url, { params });
        
        console.log('✅ Resposta da API:', response);
        
        if (response.status === 200) {
          this.events = response.data;
          console.log('✅ Eventos carregados:', response.data.length, 'eventos');
          return response.data;
        } else {
          console.error('❌ Erro ao buscar eventos:', response.statusText);
          return { message: response.statusText };
        }
      } catch (error) {
        console.error('❌ Erro na requisição de eventos:', error);
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        return { message: error.message };
      }
    },

    async addEvent(event) {
      try {
        console.log('➕ Adicionando evento:', event);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        // Converte as datas para ISO se forem tipo Date
        const formattedEvent = {
          ...event,
          start: new Date(event.start).toISOString(),
          end: new Date(event.end).toISOString(),
        };

        console.log('➕ Evento formatado:', formattedEvent);

        const response = await axios.post(`${API_URL}/events`, formattedEvent);
        
        console.log('✅ Evento criado:', response.data);
        
        // Atualizar eventos locais
        this.events.push(response.data);
        
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao adicionar evento:', error);
        throw error;
      }
    },

    async updateEvent(event) {
      try {
        console.log('✏️ Atualizando evento:', event);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const formattedEvent = {
          ...event,
          start: new Date(event.start).toISOString(),
          end: new Date(event.end).toISOString(),
        };

        const response = await axios.put(`${API_URL}/events/${event.id}`, formattedEvent);
        
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

    async removeEvent(eventId) {
      try {
        console.log('🗑️ Removendo evento:', eventId);
        
        if (!authService.isAuthenticated()) {
          throw new Error('Usuário não autenticado');
        }

        const response = await axios.delete(`${API_URL}/events/${eventId}`);
        
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
        return { message: error.message };
      }
    },
  },
});
