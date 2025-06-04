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
      extendedProps: { calendar, guests, location, status },
    } = eventApi

    return {
      id, title, start, end, url, description, allDay,
      extendedProps: { calendar, guests, location, status },
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

  // ✅ CORRIGIDO: Buscar eventos com controle de usuário
  const fetchEvents = (info, successCallback) => {
    if (!info) return

    console.log('🔄 fetchEvents chamado com info:', info);

    // Obter usuário selecionado (para admin) ou usuário atual
    const currentUser = authService.getCurrentUser()
    const isAdmin = authService.isAdmin()
    const isDiretor = authService.isDiretor()

    // ✅ CORRIGIDO: Verificar se há um usuário selecionado globalmente
    let selectedUserId = null;

    // Verificar múltiplas formas de obter o usuário selecionado
    if (isAdmin || isDiretor) {
      // Prioridade: window.selectedUserId (seleção no dropdown)
      if (window.selectedUserId) {
        selectedUserId = window.selectedUserId;
        console.log('👤 Usando usuário selecionado do dropdown:', selectedUserId);
      }
      // Alternativa: prop selectedUserId
      else if (window.calendarSelectedUserId) {
        selectedUserId = window.calendarSelectedUserId;
        console.log('👤 Usando usuário selecionado da prop:', selectedUserId);
      }
      else {
        console.log('👥 Admin/Diretor visualizando todos os eventos (nenhum usuário específico selecionado)');
        selectedUserId = null; // Ver todos os eventos
      }
    } else {
      // Usuário comum sempre vê apenas seus próprios eventos
      selectedUserId = currentUser?.userData?.id;
      console.log('👤 Usuário comum visualizando próprios eventos:', selectedUserId);
    }

    console.log('📊 Estado da busca:', {
      currentUserId: currentUser?.userData?.id,
      isAdmin,
      isDiretor,
      selectedUserId,
      windowSelectedUserId: window.selectedUserId,
      windowCalendarSelectedUserId: window.calendarSelectedUserId
    });

    store.fetchEvents(selectedUserId)
      .then(events => {
        console.log('📥 Eventos recebidos do store:', events.length);

        if (!Array.isArray(events)) {
          console.error('❌ Resposta inválida do store:', events);
          successCallback([]);
          return;
        }

        // ✅ CORRIGIDO: Mapear eventos para o formato do FullCalendar
        const formattedEvents = events.map(e => {
          const formattedEvent = {
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          };

          console.log('📝 Evento formatado:', {
            id: formattedEvent.id,
            title: formattedEvent.title,
            start: formattedEvent.start,
            end: formattedEvent.end,
            userId: formattedEvent.userId,
            client: formattedEvent.extendedProps?.cliente
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

  const addEvent = _event => {
    if (!_event.extendedProps) {
      _event.extendedProps = {}
    }
    
    if (!_event.extendedProps.status) {
      _event.extendedProps.status = 'In Progress'
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

    store.addEvent(_event).then(refetchEvents)
  }

  const updateEvent = _event => {
    if (!_event.extendedProps) {
      _event.extendedProps = {}
    }
    
    if (!_event.extendedProps.status) {
      _event.extendedProps.status = 'In Progress'
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

    store.updateEvent(_event).then(r => {
      updateEventInCalendar(r, ['id', 'title', 'url', 'description'], ['calendar', 'guests', 'location', 'status'])
      refetchEvents()
    })
  }

  const removeEvent = eventId => {
    store.removeEvent(eventId).then(() => removeEventInCalendar(eventId))
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
    locale: 'pt-br', // ✅ AJUSTE: Força o locale português brasileiro
    
    // ✅ AJUSTE: Configurações de formatação de data brasileira
    dayHeaderFormat: { weekday: 'short' }, // Seg, Ter, Qua...
    eventTimeFormat: { // Formato de hora dos eventos
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Formato 24h
    },
    slotLabelFormat: { // Formato das horas na lateral
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    titleFormat: { // Formato do título do calendário
      year: 'numeric',
      month: 'long'
    },
    dayPopoverFormat: { // Formato do popup de dia
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    weekText: 'Semana',
    allDayText: 'Todo o dia',
    moreLinkText: 'mais',
    noEventsText: 'Nenhum evento para exibir',
    
    // ✅ AJUSTE: Configuração específica para exibição de datas
    displayEventTime: true, // Mostra horário dos eventos
    displayEventEnd: true, // Mostra horário de fim
    
    // ✅ AJUSTE: Formatação customizada para diferentes visualizações
    views: {
      dayGridMonth: {
        dayHeaderFormat: { weekday: 'short' }, // Seg, Ter, Qua
        titleFormat: { year: 'numeric', month: 'long' }, // Janeiro 2024
        dayCellContent: function(arg) {
          return arg.dayNumberText; // Apenas o número do dia
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
      if (clickedEvent.url) (clickedEvent.url, '_blank')

      event.value = {
        ...extractEventDataFromEventApi(clickedEvent),
        description: clickedEvent.extendedProps?.description || clickedEvent.description || ''
      }

      isEventHandlerSidebarActive.value = true
    },

    dateClick(info) {
      event.value = { ...event.value, start: info.date }
      isEventHandlerSidebarActive.value = true
    },

    eventDrop({ event: droppedEvent }) {
      updateEvent(extractEventDataFromEventApi(droppedEvent))
    },

    eventResize({ event: resizedEvent }) {
      if (resizedEvent.start && resizedEvent.end)
        updateEvent(extractEventDataFromEventApi(resizedEvent))
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

  // ✅ AJUSTE: Garante que o locale seja sempre pt-br
  watch(locale, newLocale => {
    const fcLocale = 'pt-br' // Sempre usar português brasileiro
    
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
    
    // ✅ AJUSTE: Força configurações de localização após o mount
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
