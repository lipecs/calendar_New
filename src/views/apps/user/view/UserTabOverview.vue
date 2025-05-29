<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import authService from '@/services/auth'
import eventService from '@/services/event'
import avatar2 from '@images/avatars/avatar-2.png'
import avatar3 from '@images/avatars/avatar-3.png'
import avatar4 from '@images/avatars/avatar-4.png'
import avatar5 from '@images/avatars/avatar-5.png'
import pdf from '@images/icons/project-icons/pdf.png'

const { name } = useTheme()

// Estados reativo
const isLoading = ref(true)
const userStats = ref({
  eventsToday: 0,
  eventsThisWeek: 0,
  completedEvents: 0,
  urgentEvents: 0,
  totalEvents: 0
})

const recentEvents = ref([])
const upcomingEvents = ref([])

// Carregar dados do usuário atual
const currentUser = computed(() => {
  const user = authService.getCurrentUser()
  return user?.userData || null
})

// Carregar estatísticas dos eventos
const loadEventStats = async () => {
  try {
    isLoading.value = true

    // Buscar eventos do usuário
    const events = await eventService.getEvents(null, currentUser.value?.id)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    // Calcular estatísticas
    userStats.value = {
      totalEvents: events.length,
      eventsToday: events.filter(event => {
        const eventDate = new Date(event.start)
        return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }).length,
      eventsThisWeek: events.filter(event => {
        const eventDate = new Date(event.start)
        return eventDate >= weekStart && eventDate < weekEnd
      }).length,
      completedEvents: events.filter(event =>
        event.extendedProps?.status === 'Done' || event.extendedProps?.status === 'Finalizado'
      ).length,
      urgentEvents: events.filter(event =>
        event.extendedProps?.status === 'Urgent' || event.extendedProps?.status === 'Urgente'
      ).length
    }

    // Eventos recentes (últimos 7 dias)
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 7)

    recentEvents.value = events
      .filter(event => new Date(event.start) >= recentDate && new Date(event.start) <= now)
      .sort((a, b) => new Date(b.start) - new Date(a.start))
      .slice(0, 5)

    // Próximos eventos
    upcomingEvents.value = events
      .filter(event => new Date(event.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5)

  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
  } finally {
    isLoading.value = false
  }
}

// Formatar data
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Formatar data relativa
const getRelativeTime = (date) => {
  const now = new Date()
  const eventDate = new Date(date)
  const diff = eventDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  if (days > 1) return `Em ${days} dias`
  if (days < -1) return `Há ${Math.abs(days)} dias`

  return formatDate(date)
}

// Cor do status do evento
const getStatusColor = (status) => {
  if (status === 'Done' || status === 'Finalizado') return 'success'
  if (status === 'Urgent' || status === 'Urgente') return 'error'
  return 'primary'
}

// Ícone do tipo de evento
const getEventIcon = (calendar) => {
  switch (calendar) {
    case 'Meeting': return 'ri-team-line'
    case 'Task': return 'ri-task-line'
    case 'Deadline': return 'ri-calendar-event-line'
    case 'High Priority': return 'ri-alarm-warning-line'
    case 'Presentation': return 'ri-presentation-line'
    default: return 'ri-calendar-line'
  }
}

onMounted(() => {
  if (currentUser.value) {
    loadEventStats()
  }
})

// Dados para gráfico de produtividade (mockado por enquanto)
const productivityData = ref([
  { day: 'Seg', completed: 12, total: 15 },
  { day: 'Ter', completed: 8, total: 10 },
  { day: 'Qua', completed: 15, total: 18 },
  { day: 'Qui', completed: 10, total: 12 },
  { day: 'Sex', completed: 20, total: 22 },
  { day: 'Sáb', completed: 5, total: 8 },
  { day: 'Dom', completed: 3, total: 5 }
])

// Metas do usuário
const userGoals = ref([
  { title: 'Eventos concluídos este mês', current: 45, target: 60, color: 'success' },
  { title: 'Reuniões agendadas', current: 12, target: 15, color: 'info' },
  { title: 'Tarefas urgentes resolvidas', current: 8, target: 10, color: 'warning' }
])
</script>

<template>
  <VRow>
    <!-- Cards de Estatísticas -->
    <VCol cols="12">
      <VRow>
        <VCol cols="12" sm="6" md="3">
          <VCard color="primary" variant="tonal">
            <VCardText class="d-flex align-center">
              <VIcon icon="ri-calendar-line" size="40" color="primary" class="me-4" />
              <div>
                <h6 class="text-h6">{{ userStats.eventsToday }}</h6>
                <span class="text-sm">Eventos Hoje</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard color="success" variant="tonal">
            <VCardText class="d-flex align-center">
              <VIcon icon="ri-check-double-line" size="40" color="success" class="me-4" />
              <div>
                <h6 class="text-h6">{{ userStats.completedEvents }}</h6>
                <span class="text-sm">Concluídos</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard color="error" variant="tonal">
            <VCardText class="d-flex align-center">
              <VIcon icon="ri-alarm-warning-line" size="40" color="error" class="me-4" />
              <div>
                <h6 class="text-h6">{{ userStats.urgentEvents }}</h6>
                <span class="text-sm">Urgentes</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard color="info" variant="tonal">
            <VCardText class="d-flex align-center">
              <VIcon icon="ri-calendar-week-line" size="40" color="info" class="me-4" />
              <div>
                <h6 class="text-h6">{{ userStats.eventsThisWeek }}</h6>
                <span class="text-sm">Esta Semana</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VCol>

    <!-- Próximos Eventos -->
    <VCol cols="12" md="6">
      <VCard title="Próximos Eventos" class="h-100">
        <template #append>
          <VBtn variant="text" size="small" to="/apps/calendar">
            Ver todos
          </VBtn>
        </template>

        <VCardText>
          <VList v-if="upcomingEvents.length" class="py-0">
            <VListItem v-for="event in upcomingEvents" :key="event.id" class="px-0">
              <template #prepend>
                <VAvatar :color="getStatusColor(event.extendedProps?.status)" variant="tonal" size="40">
                  <VIcon :icon="getEventIcon(event.extendedProps?.calendar)" />
                </VAvatar>
              </template>

              <VListItemTitle>{{ event.title }}</VListItemTitle>
              <VListItemSubtitle>
                {{ getRelativeTime(event.start) }} • {{ event.extendedProps?.calendar }}
              </VListItemSubtitle>

              <template #append>
                <VChip :color="getStatusColor(event.extendedProps?.status)" size="small" variant="tonal">
                  {{ event.extendedProps?.status || 'Em andamento' }}
                </VChip>
              </template>
            </VListItem>
          </VList>

          <VAlert v-else type="info" variant="tonal" class="mb-0">
            Nenhum evento próximo encontrado
          </VAlert>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Atividade Recente -->
    <VCol cols="12" md="6">
      <VCard title="Atividade Recente" class="h-100">
        <VCardText>
          <VTimeline density="compact" align="start" truncate-line="both" :line-inset="8">
            <VTimelineItem v-for="event in recentEvents" :key="event.id"
              :dot-color="getStatusColor(event.extendedProps?.status)" size="x-small">
              <div class="d-flex justify-space-between align-center flex-wrap gap-2 mb-2">
                <span class="font-weight-medium">{{ event.title }}</span>
                <span class="text-caption text-medium-emphasis">
                  {{ getRelativeTime(event.start) }}
                </span>
              </div>

              <p class="text-sm text-medium-emphasis mb-1">
                {{ event.extendedProps?.calendar }} • {{ event.extendedProps?.status || 'Em andamento' }}
              </p>

              <p v-if="event.description" class="text-sm mb-0">
                {{ event.description }}
              </p>
            </VTimelineItem>
          </VTimeline>

          <VAlert v-if="!recentEvents.length" type="info" variant="tonal" class="mb-0">
            Nenhuma atividade recente
          </VAlert>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Metas e Progresso -->
    <VCol cols="12" md="6">
      <VCard title="Metas do Mês">
        <VCardText>
          <div v-for="goal in userGoals" :key="goal.title" class="mb-6">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-sm font-weight-medium">{{ goal.title }}</span>
              <span class="text-sm">{{ goal.current }}/{{ goal.target }}</span>
            </div>

            <VProgressLinear :model-value="(goal.current / goal.target) * 100" :color="goal.color" height="8" rounded />
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Gráfico de Produtividade -->
    <VCol cols="12" md="6">
      <VCard title="Produtividade Semanal">
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-4">
            <span class="text-sm text-medium-emphasis">Eventos concluídos por dia</span>
            <VChip color="success" size="small" variant="tonal">
              85% de conclusão
            </VChip>
          </div>

          <div class="d-flex justify-space-between align-items-end" style="height: 150px;">
            <div v-for="day in productivityData" :key="day.day" class="d-flex flex-column align-center"
              style="flex: 1;">
              <div class="d-flex flex-column align-center mb-2" style="height: 100px; justify-content: flex-end;">
                <!-- Barra total -->
                <div class="rounded mb-1" :style="{
                  width: '20px',
                  height: `${(day.total / 25) * 80}px`,
                  backgroundColor: 'rgba(var(--v-theme-surface-variant), 0.3)'
                }"></div>
                <!-- Barra concluída -->
                <div class="rounded" :style="{
                  width: '20px',
                  height: `${(day.completed / 25) * 80}px`,
                  backgroundColor: 'rgb(var(--v-theme-success))',
                  marginTop: `-${(day.completed / 25) * 80}px`,
                  position: 'relative',
                  zIndex: 1
                }"></div>
              </div>

              <span class="text-caption">{{ day.day }}</span>
              <span class="text-caption text-medium-emphasis">
                {{ day.completed }}/{{ day.total }}
              </span>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Resumo Rápido -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <VRow>
            <VCol cols="12" md="8">
              <h5 class="text-h5 mb-4">Resumo da Semana</h5>
              <div class="d-flex flex-wrap gap-4">
                <VChip color="primary" variant="tonal">
                  <VIcon start icon="ri-calendar-line" />
                  {{ userStats.totalEvents }} eventos totais
                </VChip>
                <VChip color="success" variant="tonal">
                  <VIcon start icon="ri-check-line" />
                  {{ Math.round((userStats.completedEvents / userStats.totalEvents) * 100) || 0 }}% concluídos
                </VChip>
                <VChip color="info" variant="tonal">
                  <VIcon start icon="ri-time-line" />
                  {{ userStats.eventsThisWeek }} esta semana
                </VChip>
              </div>
            </VCol>

            <VCol cols="12" md="4" class="d-flex align-center justify-end">
              <div class="text-center">
                <VProgressCircular :model-value="(userStats.completedEvents / userStats.totalEvents) * 100 || 0"
                  :size="80" :width="8" color="success">
                  <span class="text-h6">
                    {{ Math.round((userStats.completedEvents / userStats.totalEvents) * 100) || 0 }}%
                  </span>
                </VProgressCircular>
                <p class="text-sm text-medium-emphasis mt-2 mb-0">Taxa de conclusão</p>
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
