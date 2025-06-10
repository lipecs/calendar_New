import authService from '@/services/auth'
import enLocale from '@fullcalendar/core/locales/en-gb'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import { onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCalendarStore } from '@/views/apps/calendar/useCalendarStore'
import { useConfigStore } from '@core/stores/config'

export const blankEvent = {
  title: '',
  start: '',
  end: '',
  allDay: false,
  description: '',
  url: '',
  extendedProps: {
    calendar: undefined,
    guests: [],
    location: '',
    status: 'In Progress',
    clienteId: null,
    cliente: '',
    assignedUser: null
  },
}

export const useCalendar = (event, isEventHandlerSidebarActive, isLeftSidebarOpen) => {
  const configStore = useConfigStore()
  const store = useCalendarStore()
  const refCalendar = ref()
  const calendarApi = ref(null)

  const { locale } = useI18n()

  const extractEventDataFromEventApi = eventApi => {
    const {
      id, title, start, end, url, description, allDay,
      extendedProps: { calendar, guests, location, status, clienteId, cliente, assignedUser },
    } = eventApi

    return {
      id, title, start, end, url, description, allDay,
      extendedProps: { 
        calendar, guests, location, status, 
        clienteId: clienteId || null, 
        cliente: cliente || '', 
        assignedUser: assignedUser || null 
      },
      // ✅ NOVO: Garantir campos do backend
      userId: eventApi.userId || eventApi.extendedProps?.userId,
      clientId: clienteId || null,
      assignedUserId: assignedUser || null
    }
  }

  const getColorValue = (colorName) => {
    const colorMap = {
      'error': '#F44336',
      'primary': '#1976D2',
      'warning': '#FF9800',
      'success': '#4CAF50',
      'info': '#2196F3',
    }

    if (colorName && colorName.startsWith('#')) {
      return colorName
    }

    return colorMap[colorName] || '#9E9E9E'
  }

  const applyEventColors = (events) => {
    return events.map(event => {
      let colorValue = '#9E9E9E'
      
      const status = event.extendedProps?.status
      if (status === 'Done' || status === 'Finalizado') {
        return {
          ...event,
          backgroundColor: 'rgba(158, 158, 158, 0.6)',
          borderColor: 'rgba(158, 158, 158, 0.6)',
          textColor: '#000000',
          classNames: ['event-completed']
        }
      } else if (status === 'Urgent' || status === 'Urgente') {
        return {
          ...event,
          backgroundColor: '#FF0000',
          borderColor: '#FF0000',
          textColor: '#FFFFFF',
          classNames: ['event-urgent']
        }
      }
      
      const calendarLabel = event.extendedProps?.calendar
      if (calendarLabel) {
        const calendarFilter = store.availableCalendars.find(c => c.label === calendarLabel)
        if (calendarFilter) {
          colorValue = getColorValue(calendarFilter.color)
        }
      }
      
      return {
        ...event,
        backgroundColor: colorValue,
        borderColor: colorValue,
        extendedProps: {
          ...event.extendedProps,
        },
      }
    })
  }

  // ✅ CORRIGIDO: Buscar eventos com controle aprimorado de usuário
  const fetchEvents = (info, successCallback) => {
    if (!info) return

    console.log('🔄 fetchEvents chamado com info:', info);

    // Obter usuário selecionado (para admin) ou usuário atual
    const currentUser = authService.getCurrentUser()
    const isAdmin = authService.isAdmin()
    const isDiretor = authService.isDiretor()
    const isSupervisor = authService.isSupervisor()
    const isCoordenador = authService.isCoordenador()

    // ✅ CORRIGIDO: Verificar se há um usuário selecionado globalmente
    let selectedUserId = null;

    // Para admins e diretores, verificar seleção de usuário específico
    if (isAdmin || isDiretor) {
      if (window.selectedUserId) {
        selectedUserId = window.selectedUserId;
        console.log('👤 Admin/Diretor visualizando usuário específico:', selectedUserId);
      } else {
        console.log('👥 Admin/Diretor visualizando todos os eventos');
        selectedUserId = null;
      }
    } 
    // Supervisores e coordenadores veem sua equipe (sem filtro específico)
    else if (isSupervisor || isCoordenador) {
      console.log('👥 Supervisor/Coordenador visualizando eventos da equipe');
      selectedUserId = null; // O store vai filtrar por hierarquia
    } 
    // Usuários comuns sempre veem apenas seus próprios eventos
    else {
      selectedUserId = currentUser?.userData?.id;
      console.log('👤 Usuário comum visualizando próprios eventos:', selectedUserId);
    }

    console.log('📊 Estado da busca:', {
      currentUserId: currentUser?.userData?.id,
      isAdmin,
      isDiretor,
      isSupervisor,
      isCoordenador,
      selectedUserId,
      windowSelectedUserId: window.selectedUserId
    });

    store.fetchEvents(selectedUserId)
      .then(events => {
        console.log('📥 Eventos recebidos do store:', events.length);

        if (!Array.isArray(events)) {
          console.error('❌ Resposta inválida do store:', events);
          successCallback([]);
          return;
        }

        // ✅ CORRIGIDO: Processar eventos para o FullCalendar
        const formattedEvents = events.map(e => {
          // ✅ CORRIGIDO: Garantir que as datas são objetos Date
          let startDate = e.start;
          let endDate = e.end;
          
          if (typeof startDate === 'string') {
            startDate = new Date(startDate);
          }
          if (typeof endDate === 'string') {
            endDate = new Date(endDate);
          }

          const formattedEvent = {
            ...e,
            start: startDate,
            end: endDate,
            
            // ✅ CORRIGIDO: Garantir que extendedProps está completo
            extendedProps: {
              calendar: e.extendedProps?.calendar || 'Meeting',
              location: e.extendedProps?.location || '',
              status: e.extendedProps?.status || 'In Progress',
              guests: e.extendedProps?.guests || [],
              
              // ✅ NOVO: Dados específicos do sistema
              clienteId: e.extendedProps?.clienteId || e.clientId || null,
              cliente: e.extendedProps?.cliente || '',
              clienteCode: e.extendedProps?.clienteCode || '',
              assignedUser: e.extendedProps?.assignedUser || e.assignedUserId || null,
              
              // ✅ NOVO: Campos para compatibilidade
              userId: e.userId,
              assignedUserId: e.assignedUserId || null
            }
          };

          console.log('📝 Evento formatado para FullCalendar:', {
            id: formattedEvent.id,
            title: formattedEvent.title,
            userId: formattedEvent.userId,
            clienteId: formattedEvent.extendedProps.clienteId,
            assignedUser: formattedEvent.extendedProps.assignedUser,
            client: formattedEvent.extendedProps.cliente
          });

          return formattedEvent;
        });
        
        const coloredEvents = applyEventColors(formattedEvents);
        console.log('🎨 Eventos com cores aplicadas:', coloredEvents.length);

        successCallback(coloredEvents);
      })
      .catch(error => {
        console.error('❌ Erro ao buscar eventos no useCalendar:', error);
        successCallback([]);
      });
  }

  const updateEventInCalendar = (updatedEventData, propsToUpdate, extendedPropsToUpdate) => {
    const existingEvent = calendarApi.value?.getEventById(String(updatedEventData.id))
    if (!existingEvent) return

    propsToUpdate.forEach(prop => {
      existingEvent.setProp(prop, updatedEventData[prop])
    })

    existingEvent.setDates(updatedEventData.start, updatedEventData.end, {
      allDay: updatedEventData.allDay,
    })

    extendedPropsToUpdate.forEach(prop => {
      existingEvent.setExtendedProp(prop, updatedEventData.extendedProps[prop])
    })

    const status = updatedEventData.extendedProps?.status
    if (status === 'Done' || status === 'Finalizado') {
      existingEvent.setProp('backgroundColor', 'rgba(158, 158, 158, 0.6)')
      existingEvent.setProp('borderColor', 'rgba(158, 158, 158, 0.6)')
      existingEvent.setProp('textColor', '#000000')
      existingEvent.setExtendedProp('classNames', ['event-completed'])
    } else if (status === 'Urgent' || status === 'Urgente') {
      existingEvent.setProp('backgroundColor', '#FF0000')
      existingEvent.setProp('borderColor', '#FF0000')
      existingEvent.setProp('textColor', '#FFFFFF')
      existingEvent.setExtendedProp('classNames', ['event-urgent'])
    } else {
      const calendarLabel = updatedEventData.extendedProps?.calendar
      if (calendarLabel) {
        const calendarFilter = store.availableCalendars.find(c => c.label === calendarLabel)
        if (calendarFilter) {
          const colorValue = getColorValue(calendarFilter.color)
          existingEvent.setProp('backgroundColor', colorValue)
          existingEvent.setProp('borderColor', colorValue)
        }
      }
    }
  }

  const removeEventInCalendar = eventId => {
    const event = calendarApi.value?.getEventById(eventId)
    if (event) event.remove()
  }

  const refetchEvents = () => {
    calendarApi.value?.refetchEvents()
  }

  watch(() => [...store.selectedCalendars], refetchEvents, { deep: true })

  // ✅ CORRIGIDO: Adicionar evento com dados completos
  const addEvent = _event => {
    console.log('📝 useCalendar.addEvent chamado com:', _event);

    // ✅ CORRIGIDO: Garantir que extendedProps existe e está completo
    if (!_event.extendedProps) {
      _event.extendedProps = {}
    }
    
    if (!_event.extendedProps.status) {
      _event.extendedProps.status = 'In Progress'
    }

    // ✅ CORRIGIDO: Garantir que campos de cliente e vendedor estão mapeados
    if (_event.extendedProps.clienteId && !_event.clientId) {
      _event.clientId = parseInt(_event.extendedProps.clienteId);
    }
    
    if (_event.extendedProps.assignedUser && !_event.assignedUserId) {
      _event.assignedUserId = parseInt(_event.extendedProps.assignedUser);
    }

    const status = _event.extendedProps.status
    if (status === 'Done' || status === 'Finalizado') {
      _event.backgroundColor = 'rgba(158, 158, 158, 0.6)'
      _event.borderColor = 'rgba(158, 158, 158, 0.6)'
      _event.textColor = '#000000'
    } else if (status === 'Urgent' || status === 'Urgente') {
      _event.backgroundColor = '#FF0000'
      _event.borderColor = '#FF0000'
      _event.textColor = '#FFFFFF'
    } else {
      const calendarFilter = store.availableCalendars.find(c => c.label === _event.extendedProps.calendar)
      if (calendarFilter) {
        const colorValue = getColorValue(calendarFilter.color)
        _event.backgroundColor = colorValue
        _event.borderColor = colorValue
      }
    }

    if (_event.description === undefined) {
      _event.description = ''
    }

    console.log('🚀 Enviando evento para store:', _event);

    store.addEvent(_event).then(() => {
      console.log('✅ Evento adicionado, atualizando calendário');
      refetchEvents();
    }).catch(error => {
      console.error('❌ Erro ao adicionar evento:', error);
    });
  }

  // ✅ CORRIGIDO: Atualizar evento com dados completos
  const updateEvent = _event => {
    console.log('📝 useCalendar.updateEvent chamado com:', _event);

    // ✅ CORRIGIDO: Garantir que extendedProps existe e está completo
    if (!_event.extendedProps) {
      _event.extendedProps = {}
    }
    
    if (!_event.extendedProps.status) {
      _event.extendedProps.status = 'In Progress'
    }

    // ✅ CORRIGIDO: Garantir que campos de cliente e vendedor estão mapeados
    if (_event.extendedProps.clienteId && !_event.clientId) {
      _event.clientId = parseInt(_event.extendedProps.clienteId);
    }
    
    if (_event.extendedProps.assignedUser && !_event.assignedUserId) {
      _event.assignedUserId = parseInt(_event.extendedProps.assignedUser);
    }

    const status = _event.extendedProps.status
    if (status === 'Done' || status === 'Finalizado') {
      _event.backgroundColor = 'rgba(158, 158, 158, 0.6)'
      _event.borderColor = 'rgba(158, 158, 158, 0.6)'
      _event.textColor = '#000000'
    } else if (status === 'Urgent' || status === 'Urgente') {
      _event.backgroundColor = '#FF0000'
      _event.borderColor = '#FF0000'
      _event.textColor = '#FFFFFF'
    } else {
      const calendarFilter = store.availableCalendars.find(c => c.label === _event.extendedProps.calendar)
      if (calendarFilter) {
        const colorValue = getColorValue(calendarFilter.color)
        _event.backgroundColor = colorValue
        _event.borderColor = colorValue
      }
    }

    console.log('🚀 Enviando atualização para store:', _event);

    store.updateEvent(_event).then(r => {
      console.log('✅ Evento atualizado, atualizando interface');
      updateEventInCalendar(r, ['id', 'title', 'url', 'description'], ['calendar', 'guests', 'location', 'status', 'clienteId', 'cliente', 'assignedUser'])
      refetchEvents();
    }).catch(error => {
      console.error('❌ Erro ao atualizar evento:', error);
    });
  }

  const removeEvent = eventId => {
    console.log('🗑️ useCalendar.removeEvent chamado com:', eventId);
    
    store.removeEvent(eventId).then(() => {
      console.log('✅ Evento removido, atualizando calendário');
      removeEventInCalendar(eventId);
    }).catch(error => {
      console.error('❌ Erro ao remover evento:', error);
    });
  }

  const calendarOptions = reactive({
    plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      start: 'drawerToggler,prev,next title',
      end: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
    },
    events: fetchEvents,
    forceEventDuration: true,
    editable: true,
    eventResizableFromStart: true,
    dragScroll: true,
    dayMaxEvents: 2,
    navLinks: true,
    locales: [ptBrLocale, enLocale],
    locale: 'pt-br',
    
    // Configurações de formatação de data brasileira
    dayHeaderFormat: { weekday: 'short' },
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    titleFormat: {
      year: 'numeric',
      month: 'long'
    },
    dayPopoverFormat: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    weekText: 'Semana',
    allDayText: 'Todo o dia',
    moreLinkText: 'mais',
    noEventsText: 'Nenhum evento para exibir',
    
    displayEventTime: true,
    displayEventEnd: true,
    
    views: {
      dayGridMonth: {
        dayHeaderFormat: { weekday: 'short' },
        titleFormat: { year: 'numeric', month: 'long' },
        dayCellContent: function(arg) {
          return arg.dayNumberText;
        }
      },
      timeGridWeek: {
        dayHeaderFormat: function(date) {
          const day = date.date.day.toString().padStart(2, '0');
          const month = (date.date.month + 1).toString().padStart(2, '0');
          const weekday = date.date.toLocaleDateString('pt-BR', { weekday: 'short' });
          return `${weekday} ${day}/${month}`;
        },
        titleFormat: function(date) {
          const start = date.start.date;
          const end = date.end.date;  
          const startDay = start.day.toString().padStart(2, '0');
          const startMonth = (start.month + 1).toString().padStart(2, '0');
          const endDay = end.day.toString().padStart(2, '0');
          const endMonth = (end.month + 1).toString().padStart(2, '0');
          return `${startDay}/${startMonth} - ${endDay}/${endMonth}/${start.year}`;
        },
        slotLabelFormat: {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }
      },
      timeGridDay: {
        dayHeaderFormat: function(date) {
          const day = date.date.day.toString().padStart(2, '0');
          const month = (date.date.month + 1).toString().padStart(2, '0');
          const year = date.date.year;
          const weekday = date.date.toLocaleDateString('pt-BR', { weekday: 'long' });
          return `${weekday}, ${day}/${month}/${year}`;
        },
        titleFormat: function(date) {
          const day = date.date.day.toString().padStart(2, '0');
          const month = (date.date.month + 1).toString().padStart(2, '0');
          const year = date.date.year;
          return `${day}/${month}/${year}`;
        }
      },
      listMonth: {
        dayHeaderFormat: function(date) {
          const day = date.date.day.toString().padStart(2, '0');
          const month = (date.date.month + 1).toString().padStart(2, '0');
          const year = date.date.year;
          const weekday = date.date.toLocaleDateString('pt-BR', { weekday: 'long' });
          return `${weekday}, ${day}/${month}/${year}`;
        },
        eventTimeFormat: {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }
      }
    },

    eventClassNames({ event: calendarEvent }) {
      const calendarLabel = calendarEvent._def.extendedProps.calendar
      const status = calendarEvent._def.extendedProps.status
      
      if (!store.selectedCalendars.includes(calendarLabel)) {
        return ['d-none']
      }
      
      const classes = [`event-${calendarLabel.toLowerCase().replace(/\s+/g, '-')}`]
      
      if (status === 'Done' || status === 'Finalizado') {
        classes.push('event-completed')
      } else if (status === 'Urgent' || status === 'Urgente') {
        classes.push('event-urgent')
      }
      
      return classes
    },

    eventDidMount({ event: calendarEvent, el }) {
      const calendarLabel = calendarEvent._def.extendedProps.calendar
      const status = calendarEvent._def.extendedProps.status
      
      let backgroundColor = calendarEvent.backgroundColor

      if (status === 'Done' || status === 'Finalizado') {
        backgroundColor = 'rgba(158, 158, 158, 0.6)'
        el.style.backgroundColor = backgroundColor
        el.style.borderColor = backgroundColor
        el.style.color = '#000000'
      } else if (status === 'Urgent' || status === 'Urgente') {
        backgroundColor = '#FF0000'
        el.style.backgroundColor = backgroundColor
        el.style.borderColor = backgroundColor
        el.style.color = '#FFFFFF'
      } else if (!backgroundColor) {
        const calendarFilter = store.availableCalendars.find(c => c.label === calendarLabel)
        if (calendarFilter) {
          backgroundColor = getColorValue(calendarFilter.color)
        }
      }

      if (backgroundColor && store.selectedCalendars.includes(calendarLabel)) {
        el.style.backgroundColor = backgroundColor
        el.style.borderColor = backgroundColor

        if (status !== 'Done' && status !== 'Finalizado' && status !== 'Urgent' && status !== 'Urgente') {
          const colorHex = backgroundColor.replace('#', '')
          const r = parseInt(colorHex.substr(0, 2), 16)
          const g = parseInt(colorHex.substr(2, 2), 16)
          const b = parseInt(colorHex.substr(4, 2), 16)
          const brightness = (r * 299 + g * 587 + b * 114) / 1000

          el.style.color = brightness > 128 ? '#000000' : '#FFFFFF'
        }
      } else if (!store.selectedCalendars.includes(calendarLabel)) {
        el.style.display = 'none'
      }
    },

    eventClick({ event: clickedEvent, jsEvent }) {
      jsEvent.preventDefault()
      if (clickedEvent.url) window.open(clickedEvent.url, '_blank')

      // ✅ CORRIGIDO: Extrair dados completos do evento clicado
      const eventData = extractEventDataFromEventApi(clickedEvent)
      
      console.log('🖱️ Evento clicado:', {
        id: eventData.id,
        title: eventData.title,
        clienteId: eventData.extendedProps.clienteId,
        assignedUser: eventData.extendedProps.assignedUser
      });

      event.value = {
        ...eventData,
        description: clickedEvent.extendedProps?.description || clickedEvent.description || ''
      }

      isEventHandlerSidebarActive.value = true
    },

    dateClick(info) {
      console.log('📅 Data clicada:', info.date);
      
      // ✅ CORRIGIDO: Resetar evento para novo
      event.value = { 
        ...JSON.parse(JSON.stringify(blankEvent)), 
        start: info.date,
        end: new Date(info.date.getTime() + 60 * 60 * 1000) // 1 hora depois
      }
      
      isEventHandlerSidebarActive.value = true
    },

    eventDrop({ event: droppedEvent }) {
      console.log('📦 Evento movido:', droppedEvent);
      const eventData = extractEventDataFromEventApi(droppedEvent)
      updateEvent(eventData)
    },

    eventResize({ event: resizedEvent }) {
      console.log('📏 Evento redimensionado:', resizedEvent);
      if (resizedEvent.start && resizedEvent.end) {
        const eventData = extractEventDataFromEventApi(resizedEvent)
        updateEvent(eventData)
      }
    },

    customButtons: {
      drawerToggler: {
        text: 'calendarDrawerToggler',
        click() {
          isLeftSidebarOpen.value = true
        },
      },
    },
  })

  // Garantir que o locale seja sempre pt-br
  watch(locale, newLocale => {
    const fcLocale = 'pt-br'
    
    if (calendarApi.value) {
      calendarApi.value.setOption('locale', fcLocale)
    }

    calendarOptions.locale = fcLocale
  })

  watch(() => store.availableCalendars, () => {
    if (calendarApi.value) {
      refetchEvents()
    }
  }, { deep: true })

  onMounted(() => {
    calendarApi.value = refCalendar.value.getApi()
    
    // Força configurações de localização após o mount
    if (calendarApi.value) {
      calendarApi.value.setOption('locale', 'pt-br')
    }
    
    setTimeout(() => {
      refetchEvents()
    }, 100)
  })

  const jumpToDate = currentDate => {
    calendarApi.value?.gotoDate(new Date(currentDate))
  }

  watch(() => configStore.isAppRTL, val => {
    if (calendarApi.value) {
      calendarApi.value.setOption('direction', val ? 'rtl' : 'ltr')
    }
  })

  return {
    refCalendar,
    calendarOptions,  
    addEvent,
    updateEvent,
    removeEvent,
    refetchEvents,  
    jumpToDate,
  }
}
