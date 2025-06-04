<script setup>
import authService from '@/services/auth'
import eventService from '@/services/event'
import userService from '@/services/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useTheme } from 'vuetify'

// Theme
const { name: themeName } = useTheme()

// Estados reativos
const isLoading = ref(true)
const selectedPeriod = ref('month')
const selectedWeekView = ref('completion') // 'completion', 'productivity', 'comparison'
const showAnimations = ref(true)
const autoRefresh = ref(false)
const refreshInterval = ref(null)

const dashboardData = ref({
  totalEvents: 0,
  completedEvents: 0,
  upcomingEvents: 0,
  urgentEvents: 0,
  eventsToday: 0,
  eventsThisWeek: 0,
  eventsThisMonth: 0,
  totalUsers: 0,
  activeUsers: 0,
  productivityScore: 0,
  weeklyGrowth: 0,
  completionTrend: 0,
  averageEventsPerDay: 0
})

const recentEvents = ref([])
const eventsByType = ref([])
const weeklyStats = ref([])
const monthlyComparison = ref([])
const topUsers = ref([])
const productivityTrends = ref([])
const dailyDistribution = ref([])

// Usuário atual
const currentUser = computed(() => {
  const user = authService.getCurrentUser()
  return user?.userData || null
})

const isAdmin = computed(() => authService.isAdmin())

// Carregar dados do dashboard
const loadDashboardData = async () => {
  try {
    isLoading.value = true

    // Carregar eventos
    let events = []
    if (isAdmin.value) {
      events = await eventService.getEvents()
    } else {
      events = await eventService.getEvents(null, currentUser.value?.id)
    }

    // Calcular estatísticas básicas
    calculateBasicStats(events)

    // Gerar dados para gráficos
    generateChartData(events)

    // Gerar análises avançadas
    generateAdvancedAnalytics(events)

    // Carregar dados de usuários se for admin
    if (isAdmin.value) {
      await loadUserData()
    }

  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

// Calcular estatísticas básicas com melhorias
const calculateBasicStats = (events) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)

  const completed = events.filter(e =>
    e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado'
  )

  const thisWeekEvents = events.filter(e => new Date(e.start) >= weekStart)
  const lastWeekEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return eventDate >= lastWeekStart && eventDate < weekStart
  })

  const weeklyGrowth = lastWeekEvents.length > 0
    ? ((thisWeekEvents.length - lastWeekEvents.length) / lastWeekEvents.length) * 100
    : 0

  const thisWeekCompleted = thisWeekEvents.filter(e =>
    e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado'
  ).length
  const lastWeekCompleted = lastWeekEvents.filter(e =>
    e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado'
  ).length

  const thisWeekCompletionRate = thisWeekEvents.length > 0 ? (thisWeekCompleted / thisWeekEvents.length) * 100 : 0
  const lastWeekCompletionRate = lastWeekEvents.length > 0 ? (lastWeekCompleted / lastWeekEvents.length) * 100 : 0
  const completionTrend = thisWeekCompletionRate - lastWeekCompletionRate

  // Calcular média de eventos por dia
  const daysWithEvents = new Set(events.map(e => new Date(e.start).toDateString())).size
  const averageEventsPerDay = daysWithEvents > 0 ? events.length / daysWithEvents : 0

  dashboardData.value = {
    totalEvents: events.length,
    completedEvents: completed.length,
    upcomingEvents: events.filter(e => new Date(e.start) > now).length,
    urgentEvents: events.filter(e =>
      e.extendedProps?.status === 'Urgent' || e.extendedProps?.status === 'Urgente'
    ).length,
    eventsToday: events.filter(e => {
      const eventDate = new Date(e.start)
      return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }).length,
    eventsThisWeek: thisWeekEvents.length,
    eventsThisMonth: events.filter(e => new Date(e.start) >= monthStart).length,
    productivityScore: events.length > 0 ? Math.round((completed.length / events.length) * 100) : 0,
    weeklyGrowth: Math.round(weeklyGrowth),
    completionTrend: Math.round(completionTrend * 10) / 10,
    averageEventsPerDay: Math.round(averageEventsPerDay * 10) / 10
  }
}

// Gerar dados para gráficos aprimorados
const generateChartData = (events) => {
  // Eventos recentes
  recentEvents.value = events
    .sort((a, b) => new Date(b.start) - new Date(a.start))
    .slice(0, 8)

  // Eventos por tipo
  const typeCount = {}
  events.forEach(event => {
    const type = event.extendedProps?.calendar || 'Outros'
    typeCount[type] = (typeCount[type] || 0) + 1
  })

  eventsByType.value = Object.entries(typeCount).map(([type, count]) => ({
    type,
    count,
    percentage: events.length > 0 ? (count / events.length * 100).toFixed(1) : 0
  })).sort((a, b) => b.count - a.count).slice(0, 5)

  // Estatísticas semanais aprimoradas (últimas 8 semanas)
  weeklyStats.value = generateEnhancedWeeklyStats(events)

  // Comparação mensal (últimos 6 meses)
  monthlyComparison.value = generateMonthlyComparison(events)

  // Distribuição diária
  dailyDistribution.value = generateDailyDistribution(events)
}

// Gerar análises avançadas
const generateAdvancedAnalytics = (events) => {
  // Tendências de produtividade por semana
  const weeks = []
  const now = new Date()

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() + 7 * i))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.start)
      return eventDate >= weekStart && eventDate < weekEnd
    })

    const completed = weekEvents.filter(e =>
      e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado'
    ).length

    const completionRate = weekEvents.length > 0 ? (completed / weekEvents.length) * 100 : 0
    const productivity = Math.min(completionRate + (weekEvents.length * 2), 100)

    weeks.push({
      week: i === 0 ? 'Esta' : `${i}sem`,
      date: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total: weekEvents.length,
      completed,
      completionRate: Math.round(completionRate),
      productivity: Math.round(productivity),
      efficiency: weekEvents.length > 0 ? Math.round((completed / weekEvents.length) * 100) : 0
    })
  }

  productivityTrends.value = weeks
}

// Carregar dados de usuários
const loadUserData = async () => {
  try {
    const users = await userService.getAllUsers()
    dashboardData.value.totalUsers = users.length
    dashboardData.value.activeUsers = users.filter(u => u.status !== 'inactive').length

    topUsers.value = users.slice(0, 5).map(user => ({
      ...user,
      eventsCount: Math.floor(Math.random() * 50) + 10,
      completionRate: Math.floor(Math.random() * 40) + 60
    }))
  } catch (error) {
    console.warn('Erro ao carregar usuários:', error)
  }
}

// Gerar estatísticas semanais aprimoradas
const generateEnhancedWeeklyStats = (events) => {
  const weeks = []
  const now = new Date()

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() + 7 * i))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.start)
      return eventDate >= weekStart && eventDate < weekEnd
    })

    const completed = weekEvents.filter(e =>
      e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado'
    ).length

    const urgent = weekEvents.filter(e =>
      e.extendedProps?.status === 'Urgent' || e.extendedProps?.status === 'Urgente'
    ).length

    weeks.push({
      week: i === 0 ? 'Atual' : `S-${i}`,
      shortWeek: `S${8 - i}`,
      date: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total: weekEvents.length,
      completed,
      urgent,
      pending: weekEvents.length - completed,
      completionRate: weekEvents.length > 0 ? Math.round((completed / weekEvents.length) * 100) : 0,
      urgencyRate: weekEvents.length > 0 ? Math.round((urgent / weekEvents.length) * 100) : 0,
      productivity: weekEvents.length > 0 ? Math.min(Math.round(((completed * 1.5 + (weekEvents.length - urgent) * 0.5) / weekEvents.length) * 100), 100) : 0
    })
  }

  return weeks
}

// Distribuição por dia da semana
const generateDailyDistribution = (events) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const distribution = Array(7).fill(0)

  events.forEach(event => {
    const dayOfWeek = new Date(event.start).getDay()
    distribution[dayOfWeek]++
  })

  const maxEvents = Math.max(...distribution)

  return days.map((day, index) => ({
    day,
    count: distribution[index],
    percentage: events.length > 0 ? Math.round((distribution[index] / events.length) * 100) : 0,
    height: maxEvents > 0 ? Math.max((distribution[index] / maxEvents) * 100, 5) : 5
  }))
}

// Gerar comparação mensal
const generateMonthlyComparison = (events) => {
  const months = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

    const monthEvents = events.filter(e => {
      const eventDate = new Date(e.start)
      return eventDate >= monthStart && eventDate <= monthEnd
    })

    const completed = monthEvents.filter(e =>
      e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Finalizado'
    ).length

    months.push({
      month: monthStart.toLocaleDateString('pt-BR', { month: 'short' }),
      fullMonth: monthStart.toLocaleDateString('pt-BR', { month: 'long' }),
      events: monthEvents.length,
      completed,
      completionRate: monthEvents.length > 0 ? Math.round((completed / monthEvents.length) * 100) : 0
    })
  }

  return months
}

// Auto-refresh
const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(loadDashboardData, 300000) // 5 minutos
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }
}

watch(autoRefresh, toggleAutoRefresh)

// Funções de formatação
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Done':
    case 'Finalizado': return 'success'
    case 'Urgent':
    case 'Urgente': return 'error'
    default: return 'primary'
  }
}

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

const getTypeColor = (type) => {
  const colors = {
    'Meeting': 'success',
    'Task': 'warning',
    'Deadline': 'error',
    'High Priority': 'error',
    'Presentation': 'info'
  }
  return colors[type] || 'primary'
}

// Awards do usuário aprimorados
const userAwards = computed(() => {
  const { completedEvents, totalEvents, eventsThisMonth, productivityScore, weeklyGrowth } = dashboardData.value

  if (productivityScore >= 95 && weeklyGrowth > 20) {
    return { title: 'Ninja da Produtividade', subtitle: '95%+ conclusão + crescimento', color: 'purple', icon: 'ri-ninja-line' }
  } else if (productivityScore >= 90) {
    return { title: 'Expert em Produtividade', subtitle: '90%+ de conclusão', color: 'success', icon: 'ri-trophy-line' }
  } else if (completedEvents > 50) {
    return { title: 'Executor Consistente', subtitle: '50+ eventos concluídos', color: 'primary', icon: 'ri-medal-line' }
  } else if (weeklyGrowth > 15) {
    return { title: 'Em Crescimento', subtitle: '+15% esta semana', color: 'info', icon: 'ri-rocket-line' }
  } else if (eventsThisMonth > 20) {
    return { title: 'Organizador Ativo', subtitle: '20+ eventos este mês', color: 'warning', icon: 'ri-star-line' }
  } else {
    return { title: 'Começando a Jornada', subtitle: 'Continue progredindo!', color: 'info', icon: 'ri-seedling-line' }
  }
})

// Stats em tempo real aprimoradas
const liveStats = computed(() => {
  const { totalEvents, completedEvents, urgentEvents, weeklyGrowth, completionTrend } = dashboardData.value
  return {
    completionRate: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0,
    urgencyRate: totalEvents > 0 ? Math.round((urgentEvents / totalEvents) * 100) : 0,
    weeklyGrowth,
    completionTrend,
    isGrowthPositive: weeklyGrowth > 0,
    isTrendPositive: completionTrend > 0
  }
})

// Dados para o gráfico semanal baseado na visualização selecionada
const weeklyChartData = computed(() => {
  if (!weeklyStats.value.length) return []

  switch (selectedWeekView.value) {
    case 'productivity':
      return weeklyStats.value.map(week => ({
        ...week,
        primaryValue: week.productivity,
        secondaryValue: week.completionRate,
        primaryLabel: 'Produtividade',
        secondaryLabel: 'Conclusão'
      }))
    case 'comparison':
      return weeklyStats.value.map(week => ({
        ...week,
        primaryValue: week.completed,
        secondaryValue: week.pending,
        primaryLabel: 'Concluídos',
        secondaryLabel: 'Pendentes'
      }))
    default: // completion
      return weeklyStats.value.map(week => ({
        ...week,
        primaryValue: week.total,
        secondaryValue: week.completed,
        primaryLabel: 'Total',
        secondaryLabel: 'Concluídos'
      }))
  }
})

onMounted(() => {
  if (currentUser.value) {
    loadDashboardData()
  }
})

// Cleanup
const cleanup = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
}

onUnmounted(cleanup)
</script>

<template>
  <div class="dashboard-container">
    <!-- Header Aprimorado -->
    <VRow class="mb-4">
      <VCol cols="12" md="8">
        <div class="d-flex align-center gap-3">
          <VIcon icon="ri-dashboard-3-line" size="28" color="primary" />
          <div>
            <h3 class="text-h4 mb-0">Dashboard</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Análise completa da produtividade
            </p>
          </div>
        </div>
      </VCol>

      <VCol cols="12" md="4" class="d-flex justify-end align-center gap-2">
        <VTooltip text="Atualização automática a cada 5 minutos">
          <template #activator="{ props }">
            <VSwitch v-bind="props" v-model="autoRefresh" density="compact" hide-details inset color="primary" />
          </template>
        </VTooltip>
        <VBtn icon="ri-refresh-line" variant="outlined" size="small" @click="loadDashboardData" :loading="isLoading" />
      </VCol>
    </VRow>

    <VRow class="match-height">
      <!-- Card de Boas-vindas Aprimorado -->
      <VCol cols="12" md="4">
        <VCard class="h-100 welcome-card">
          <VCardText class="d-flex flex-column justify-space-between h-100">
            <div>
              <div class="d-flex align-center mb-3">
                <VAvatar size="40" class="me-3">
                  <VImg :src="`https://ui-avatars.com/api/?name=${currentUser?.username}&background=random`" />
                </VAvatar>
                <div>
                  <h5 class="text-h6 mb-1">Olá, {{ currentUser?.username }}! 👋</h5>
                  <p class="text-caption text-medium-emphasis mb-0">
                    {{ new Date().toLocaleDateString('pt-BR', { weekday: 'long' }) }}
                  </p>
                </div>
              </div>

              <!-- Award Aprimorado -->
              <VAlert :color="userAwards.color" variant="tonal" density="compact" class="mb-3">
                <template #prepend>
                  <VIcon :icon="userAwards.icon" />
                </template>
                <div>
                  <div class="font-weight-medium text-body-2">{{ userAwards.title }}</div>
                  <div class="text-caption">{{ userAwards.subtitle }}</div>
                </div>
              </VAlert>

              <!-- Stats rápidas com tendências -->
              <VRow dense>
                <VCol cols="4">
                  <div class="text-center">
                    <div class="d-flex align-center justify-center gap-1">
                      <div class="text-h5 font-weight-bold text-success">{{ liveStats.completionRate }}%</div>
                      <VIcon v-if="liveStats.completionTrend !== 0"
                        :icon="liveStats.isTrendPositive ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"
                        :color="liveStats.isTrendPositive ? 'success' : 'error'" size="16" />
                    </div>
                    <div class="text-caption text-medium-emphasis">Conclusão</div>
                  </div>
                </VCol>
                <VCol cols="4">
                  <div class="text-center">
                    <div class="text-h5 font-weight-bold text-primary">{{ dashboardData.eventsToday }}</div>
                    <div class="text-caption text-medium-emphasis">Hoje</div>
                  </div>
                </VCol>
                <VCol cols="4">
                  <div class="text-center">
                    <div class="d-flex align-center justify-center gap-1">
                      <div class="text-h5 font-weight-bold text-info">{{ dashboardData.eventsThisWeek }}</div>
                      <VIcon v-if="liveStats.weeklyGrowth !== 0"
                        :icon="liveStats.isGrowthPositive ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"
                        :color="liveStats.isGrowthPositive ? 'success' : 'error'" size="16" />
                    </div>
                    <div class="text-caption text-medium-emphasis">Semana</div>
                  </div>
                </VCol>
              </VRow>

              <!-- Crescimento semanal -->
              <div v-if="dashboardData.weeklyGrowth !== 0" class="mt-3">
                <VAlert :color="liveStats.isGrowthPositive ? 'success' : 'warning'" variant="tonal" density="compact">
                  <div class="text-caption">
                    {{ liveStats.isGrowthPositive ? '+' : '' }}{{ dashboardData.weeklyGrowth }}% eventos vs. semana
                    passada
                  </div>
                </VAlert>
              </div>
            </div>

            <VBtn to="/apps/calendar" color="primary" block class="mt-3">
              <VIcon icon="ri-calendar-line" class="me-2" />
              Ir para Calendário
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Estatísticas Principais Aprimoradas -->
      <VCol cols="12" md="8">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span>Estatísticas Gerais</span>
            <div class="d-flex align-center gap-2">
              <VChip size="small"
                :color="dashboardData.productivityScore >= 80 ? 'success' : dashboardData.productivityScore >= 60 ? 'warning' : 'error'"
                variant="tonal">
                <VIcon icon="ri-bar-chart-line" size="14" class="me-1" />
                Score: {{ dashboardData.productivityScore }}%
              </VChip>
              <VChip size="small" color="info" variant="tonal">
                {{ dashboardData.averageEventsPerDay }} eventos/dia
              </VChip>
            </div>
          </VCardTitle>
          <VCardText>
            <VRow>
              <VCol cols="6" md="3" v-for="(metric, index) in [
                {
                  title: 'Total de Eventos',
                  value: dashboardData.totalEvents,
                  icon: 'ri-calendar-line',
                  color: 'primary',
                  subtitle: 'Este período',
                  trend: null
                },
                {
                  title: 'Concluídos',
                  value: dashboardData.completedEvents,
                  icon: 'ri-check-double-line',
                  color: 'success',
                  subtitle: `${liveStats.completionRate}% do total`,
                  trend: dashboardData.completionTrend
                },
                {
                  title: 'Próximos',
                  value: dashboardData.upcomingEvents,
                  icon: 'ri-time-line',
                  color: 'info',
                  subtitle: 'Agendados',
                  trend: null
                },
                {
                  title: 'Urgentes',
                  value: dashboardData.urgentEvents,
                  icon: 'ri-alarm-warning-line',
                  color: 'error',
                  subtitle: `${liveStats.urgencyRate}% críticos`,
                  trend: null
                }
              ]" :key="index">
                <VCard variant="tonal" :color="metric.color" class="h-100 metric-card" elevation="0">
                  <VCardText class="text-center pa-4">
                    <div class="d-flex align-center justify-center mb-3">
                      <VAvatar :color="metric.color" size="48" variant="tonal">
                        <VIcon :icon="metric.icon" size="24" />
                      </VAvatar>
                    </div>

                    <div class="mb-2">
                      <div class="d-flex align-center justify-center gap-1 mb-1">
                        <div class="text-h4 font-weight-bold metric-number" :class="`text-${metric.color}`">
                          {{ metric.value }}
                        </div>
                        <VIcon v-if="metric.trend !== null && metric.trend !== 0"
                          :icon="metric.trend > 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"
                          :color="metric.trend > 0 ? 'success' : 'error'" size="16" />
                      </div>
                      <div class="text-body-2 font-weight-medium mb-1">
                        {{ metric.title }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ metric.subtitle }}
                      </div>
                      <div v-if="metric.trend !== null && metric.trend !== 0" class="text-caption mt-1"
                        :class="metric.trend > 0 ? 'text-success' : 'text-error'">
                        {{ metric.trend > 0 ? '+' : '' }}{{ metric.trend }}% vs. sem. anterior
                      </div>
                    </div>

                    <!-- Progress indicator melhorado -->
                    <VProgressLinear v-if="metric.color === 'success'" :model-value="liveStats.completionRate"
                      :color="metric.color" height="4" rounded class="mt-2" />
                    <VProgressLinear v-else-if="metric.color === 'error' && dashboardData.totalEvents > 0"
                      :model-value="liveStats.urgencyRate" :color="metric.color" height="4" rounded class="mt-2" />
                    <VProgressLinear v-else-if="metric.color === 'info' && dashboardData.totalEvents > 0"
                      :model-value="(dashboardData.upcomingEvents / dashboardData.totalEvents) * 100"
                      :color="metric.color" height="4" rounded class="mt-2" />
                    <VProgressLinear v-else-if="metric.color === 'primary'" :model-value="100" :color="metric.color"
                      height="4" rounded class="mt-2" />
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <!-- Resumo inteligente -->
            <VRow class="mt-4">
              <VCol cols="12">
                <VAlert
                  :color="dashboardData.productivityScore >= 80 ? 'success' : dashboardData.productivityScore >= 60 ? 'info' : 'warning'"
                  variant="tonal" density="compact">
                  <template #prepend>
                    <VIcon :icon="dashboardData.productivityScore >= 80 ? 'ri-thumb-up-line' :
                      dashboardData.productivityScore >= 60 ? 'ri-information-line' : 'ri-lightbulb-line'" />
                  </template>
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      <span class="font-weight-medium">
                        {{ dashboardData.productivityScore >= 80 ? 'Excelente produtividade!' :
                          dashboardData.productivityScore >= 60 ? 'Boa performance, continue assim!' :
                            'Há espaço para melhorar a organização.' }}
                      </span>
                      <span class="text-caption ml-2">
                        {{ dashboardData.totalEvents > 0 ?
                          `${dashboardData.completedEvents} de ${dashboardData.totalEvents} eventos concluídos` :
                          'Comece criando seus primeiros eventos!' }}
                      </span>
                      <span v-if="dashboardData.weeklyGrowth !== 0" class="text-caption ml-2"
                        :class="liveStats.isGrowthPositive ? 'text-success' : 'text-warning'">
                        • {{ liveStats.isGrowthPositive ? 'Crescimento' : 'Redução' }} de {{
                          Math.abs(dashboardData.weeklyGrowth) }}% esta semana
                      </span>
                    </div>
                    <VChip size="small" :color="dashboardData.productivityScore >= 80 ? 'success' :
                      dashboardData.productivityScore >= 60 ? 'info' : 'warning'">
                      {{ dashboardData.productivityScore }}%
                    </VChip>
                  </div>
                </VAlert>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Evolução Semanal Aprimorada -->
      <VCol cols="12" md="8">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <span>Evolução Semanal</span>
              <VChip v-if="dashboardData.weeklyGrowth !== 0" size="small"
                :color="liveStats.isGrowthPositive ? 'success' : 'warning'" variant="tonal">
                {{ liveStats.isGrowthPositive ? '+' : '' }}{{ dashboardData.weeklyGrowth }}%
              </VChip>
            </div>

            <VBtnToggle v-model="selectedWeekView" mandatory variant="outlined" density="compact">
              <VBtn value="completion" size="small">
                <VIcon icon="ri-check-line" size="16" class="me-1" />
                Conclusão
              </VBtn>
              <VBtn value="productivity" size="small">
                <VIcon icon="ri-line-chart-line" size="16" class="me-1" />
                Produtividade
              </VBtn>
              <VBtn value="comparison" size="small">
                <VIcon icon="ri-bar-chart-2-line" size="16" class="me-1" />
                Comparação
              </VBtn>
            </VBtnToggle>
          </VCardTitle>

          <VCardText>
            <!-- Métricas resumo da semana -->
            <VRow class="mb-4" dense>
              <VCol cols="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-primary">{{ dashboardData.eventsThisWeek }}</div>
                  <div class="text-caption text-medium-emphasis">Esta Semana</div>
                </div>
              </VCol>
              <VCol cols="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-success">{{ liveStats.completionRate }}%</div>
                  <div class="text-caption text-medium-emphasis">Taxa Conclusão</div>
                </div>
              </VCol>
              <VCol cols="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold"
                    :class="liveStats.isGrowthPositive ? 'text-success' : 'text-warning'">
                    {{ liveStats.isGrowthPositive ? '+' : '' }}{{ dashboardData.weeklyGrowth }}%
                  </div>
                  <div class="text-caption text-medium-emphasis">Crescimento</div>
                </div>
              </VCol>
              <VCol cols="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-info">{{ dashboardData.averageEventsPerDay }}</div>
                  <div class="text-caption text-medium-emphasis">Média/Dia</div>
                </div>
              </VCol>
            </VRow>

            <!-- Gráfico de barras melhorado -->
            <div class="d-flex justify-space-between align-items-end weekly-chart"
              style="height: 250px; padding: 20px 0;">
              <div v-for="week in weeklyChartData" :key="week.week"
                class="d-flex flex-column align-center weekly-bar-container" style="flex: 1;">
                <VTooltip location="top">
                  <template #activator="{ props }">
                    <div v-bind="props" class="d-flex flex-column align-center mb-3 weekly-bars"
                      style="height: 180px; justify-content: flex-end; position: relative;">
                      <!-- Barra principal -->
                      <div class="rounded bar-primary" :style="{
                        width: '28px',
                        height: `${Math.max((week.primaryValue / Math.max(...weeklyChartData.map(w => w.primaryValue))) * 160, 8)}px`,
                        backgroundColor: selectedWeekView === 'productivity' ? 'rgba(var(--v-theme-info), 0.4)' :
                          selectedWeekView === 'comparison' ? 'rgba(var(--v-theme-primary), 0.4)' :
                            'rgba(var(--v-theme-primary), 0.4)',
                        transition: 'all 0.3s ease'
                      }"></div>

                      <!-- Barra secundária sobreposta -->
                      <div class="rounded bar-secondary" :style="{
                        width: '28px',
                        height: `${Math.max((week.secondaryValue / Math.max(...weeklyChartData.map(w => w.primaryValue))) * 160, 4)}px`,
                        backgroundColor: selectedWeekView === 'productivity' ? 'rgb(var(--v-theme-success))' :
                          selectedWeekView === 'comparison' ? 'rgb(var(--v-theme-warning))' :
                            'rgb(var(--v-theme-success))',
                        marginTop: `-${Math.max((week.secondaryValue / Math.max(...weeklyChartData.map(w => w.primaryValue))) * 160, 4)}px`,
                        transition: 'all 0.3s ease'
                      }"></div>

                      <!-- Indicador de destaque para semana atual -->
                      <div v-if="week.week === 'Atual' || week.week === 'S8'" class="current-week-indicator"></div>
                    </div>
                  </template>

                  <div class="pa-2">
                    <div class="font-weight-medium mb-1">{{ week.date }}</div>
                    <div>{{ week.primaryLabel }}: {{ week.primaryValue }}{{ selectedWeekView === 'productivity' ? '%' :
                      ''
                    }}</div>
                    <div>{{ week.secondaryLabel }}: {{ week.secondaryValue }}{{ selectedWeekView === 'productivity' ?
                      '%' :
                      '' }}</div>
                    <div v-if="selectedWeekView !== 'productivity'" class="text-caption text-medium-emphasis mt-1">
                      Taxa: {{ week.completionRate }}%
                    </div>
                    <div v-if="week.urgencyRate > 0" class="text-caption text-error">
                      Urgentes: {{ week.urgencyRate }}%
                    </div>
                  </div>
                </VTooltip>

                <!-- Labels da semana -->
                <div class="text-center">
                  <div class="text-caption font-weight-medium" :class="week.week === 'Atual' ? 'text-primary' : ''">
                    {{ week.shortWeek || week.week }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ selectedWeekView === 'productivity' ? `${week.productivity}%` :
                      `${week.secondaryValue}/${week.primaryValue}` }}
                  </div>
                  <div v-if="week.week === 'Atual'" class="text-caption text-primary font-weight-medium">
                    Atual
                  </div>
                </div>
              </div>
            </div>

            <!-- Legenda aprimorada -->
            <div class="d-flex justify-center gap-6 mt-4">
              <div class="d-flex align-center">
                <div class="rounded me-2" :style="{
                  width: '12px',
                  height: '12px',
                  backgroundColor: selectedWeekView === 'productivity' ? 'rgba(var(--v-theme-info), 0.4)' :
                    selectedWeekView === 'comparison' ? 'rgba(var(--v-theme-primary), 0.4)' :
                      'rgba(var(--v-theme-primary), 0.4)'
                }"></div>
                <span class="text-caption">{{ weeklyChartData[0]?.primaryLabel || 'Total' }}</span>
              </div>
              <div class="d-flex align-center">
                <div class="rounded me-2" :style="{
                  width: '12px',
                  height: '12px',
                  backgroundColor: selectedWeekView === 'productivity' ? 'rgb(var(--v-theme-success))' :
                    selectedWeekView === 'comparison' ? 'rgb(var(--v-theme-warning))' :
                      'rgb(var(--v-theme-success))'
                }"></div>
                <span class="text-caption">{{ weeklyChartData[0]?.secondaryLabel || 'Concluídos' }}</span>
              </div>
            </div>

            <!-- Insights da evolução semanal -->
            <VRow class="mt-4">
              <VCol cols="12">
                <VAlert :color="liveStats.isGrowthPositive ? 'success' : 'info'" variant="tonal" density="compact">
                  <template #prepend>
                    <VIcon :icon="liveStats.isGrowthPositive ? 'ri-trending-up-line' : 'ri-information-line'" />
                  </template>
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      <span class="font-weight-medium">
                        {{ liveStats.isGrowthPositive ?
                          `Crescimento positivo de ${dashboardData.weeklyGrowth}% em relação à semana anterior!` :
                          dashboardData.weeklyGrowth < 0 ? `Redução de ${Math.abs(dashboardData.weeklyGrowth)}% comparado
                          à semana passada.` : 'Performance estável em relação à semana anterior.' }} </span>
                          <span class="text-caption ml-2">
                            {{ liveStats.completionTrend > 0 ?
                              `Taxa de conclusão melhorou ${dashboardData.completionTrend}%.` :
                              liveStats.completionTrend < 0 ? `Taxa de conclusão reduziu
                              ${Math.abs(dashboardData.completionTrend)}%.` : 'Taxa de conclusão mantida.' }} </span>
                    </div>
                  </div>
                </VAlert>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Distribuição Diária -->
      <VCol cols="12" md="4">
        <VCard class="h-100">
          <VCardTitle>Distribuição por Dia</VCardTitle>
          <VCardText>
            <div class="text-center mb-4">
              <VProgressCircular :model-value="liveStats.completionRate" :size="100" :width="8" color="success">
                <span class="text-h6 font-weight-bold">{{ liveStats.completionRate }}%</span>
              </VProgressCircular>
              <p class="text-caption text-medium-emphasis mt-2">Taxa de Conclusão</p>
            </div>

            <!-- Gráfico de distribuição diária -->
            <div class="mb-4">
              <div class="d-flex justify-space-around align-items-end" style="height: 100px;">
                <div v-for="day in dailyDistribution" :key="day.day" class="text-center daily-bar">
                  <VTooltip location="top">
                    <template #activator="{ props }">
                      <div v-bind="props" class="rounded mb-2 mx-auto daily-bar-item" :style="{
                        width: '20px',
                        height: `${day.height}px`,
                        backgroundColor: day.count > 0 ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-surface-variant))',
                        transition: 'all 0.3s ease'
                      }"></div>
                    </template>
                    <div>
                      <div>{{ day.day }}</div>
                      <div>{{ day.count }} eventos</div>
                      <div>{{ day.percentage }}% do total</div>
                    </div>
                  </VTooltip>
                  <div class="text-caption">{{ day.day }}</div>
                </div>
              </div>
            </div>

            <VList density="compact" class="py-0">
              <VListItem>
                <template #prepend>
                  <VIcon icon="ri-calendar-today-line" color="primary" size="20" />
                </template>
                <VListItemTitle>Hoje</VListItemTitle>
                <template #append>
                  <VChip size="small" color="primary">{{ dashboardData.eventsToday }}</VChip>
                </template>
              </VListItem>

              <VListItem>
                <template #prepend>
                  <VIcon icon="ri-calendar-week-line" color="info" size="20" />
                </template>
                <VListItemTitle>Esta Semana</VListItemTitle>
                <template #append>
                  <VChip size="small" color="info">{{ dashboardData.eventsThisWeek }}</VChip>
                </template>
              </VListItem>

              <VListItem>
                <template #prepend>
                  <VIcon icon="ri-calendar-month-line" color="warning" size="20" />
                </template>
                <VListItemTitle>Este Mês</VListItemTitle>
                <template #append>
                  <VChip size="small" color="warning">{{ dashboardData.eventsThisMonth }}</VChip>
                </template>
              </VListItem>
            </VList>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Eventos por Tipo Aprimorado -->
      <VCol cols="12" md="6">
        <VCard class="h-100">
          <VCardTitle>Eventos por Tipo</VCardTitle>
          <VCardText>
            <VList v-if="eventsByType.length" density="compact" class="py-0">
              <VListItem v-for="(type, index) in eventsByType" :key="type.type" class="event-type-item">
                <template #prepend>
                  <VIcon :icon="getEventIcon(type.type)" :color="getTypeColor(type.type)" size="20" />
                </template>

                <VListItemTitle class="d-flex align-center justify-space-between">
                  <span>{{ type.type }}</span>
                  <div class="d-flex align-center gap-2">
                    <VProgressLinear :model-value="parseFloat(type.percentage)" :color="getTypeColor(type.type)"
                      height="4" style="width: 60px;" rounded />
                  </div>
                </VListItemTitle>

                <template #append>
                  <div class="text-end">
                    <VChip size="small" :color="getTypeColor(type.type)" variant="tonal">
                      {{ type.count }}
                    </VChip>
                    <div class="text-caption text-medium-emphasis">{{ type.percentage }}%</div>
                  </div>
                </template>
              </VListItem>
            </VList>

            <VAlert v-else type="info" variant="tonal">
              <template #prepend>
                <VIcon icon="ri-information-line" />
              </template>
              Nenhum evento encontrado para análise
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Comparação Mensal Aprimorada -->
      <VCol cols="12" md="6">
        <VCard class="h-100">
          <VCardTitle>Tendência Mensal</VCardTitle>
          <VCardText>
            <div class="d-flex justify-space-around align-items-end mb-4" style="height: 180px;">
              <div v-for="month in monthlyComparison" :key="month.month" class="text-center monthly-item">
                <VTooltip location="top">
                  <template #activator="{ props }">
                    <div v-bind="props" class="mb-2 monthly-chart-container">
                      <div v-if="month.events > 0" class="d-flex flex-column align-items-center"
                        style="height: 140px; justify-content: flex-end;">
                        <!-- Barra total -->
                        <div class="rounded mb-1 mx-auto monthly-bar-total" :style="{
                          width: '32px',
                          height: `${(month.events / Math.max(...monthlyComparison.map(m => m.events))) * 120}px`,
                          backgroundColor: 'rgba(var(--v-theme-primary), 0.3)',
                          transition: 'all 0.3s ease'
                        }"></div>
                        <!-- Barra concluída -->
                        <div class="rounded mx-auto monthly-bar-completed" :style="{
                          width: '32px',
                          height: `${(month.completed / Math.max(...monthlyComparison.map(m => m.events))) * 120}px`,
                          backgroundColor: 'rgb(var(--v-theme-success))',
                          marginTop: `-${(month.completed / Math.max(...monthlyComparison.map(m => m.events))) * 120}px`,
                          transition: 'all 0.3s ease'
                        }"></div>
                      </div>
                    </div>
                  </template>
                  <div class="pa-2">
                    <div class="font-weight-medium">{{ month.fullMonth }}</div>
                    <div>{{ month.events }} eventos</div>
                    <div>{{ month.completed }} concluídos</div>
                    <div>Taxa: {{ month.completionRate }}%</div>
                  </div>
                </VTooltip>

                <p class="text-caption font-weight-medium mb-1">{{ month.month }}</p>
                <p class="text-caption text-medium-emphasis">{{ month.events }}</p>
                <VChip v-if="month.completionRate > 0" size="x-small"
                  :color="month.completionRate >= 80 ? 'success' : month.completionRate >= 60 ? 'warning' : 'error'"
                  variant="tonal">
                  {{ month.completionRate }}%
                </VChip>
              </div>
            </div>

            <!-- Tendência mensal -->
            <VAlert color="info" variant="tonal" density="compact">
              <template #prepend>
                <VIcon icon="ri-line-chart-line" />
              </template>
              <div class="text-caption">
                {{monthlyComparison.length > 1 ?
                  `Média de ${Math.round(monthlyComparison.reduce((sum, m) => sum + m.events, 0) /
                    monthlyComparison.length)}
                eventos por mês` :
                  'Acompanhe a evolução mensal dos seus eventos'
                }}
              </div>
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Eventos Recentes Aprimorado -->
      <VCol cols="12">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <span>Eventos Recentes</span>
              <VChip size="small" color="primary" variant="tonal">
                {{ recentEvents.length }} eventos
              </VChip>
            </div>
            <VBtn variant="text" size="small" to="/apps/calendar">
              <VIcon icon="ri-external-link-line" size="16" class="me-1" />
              Ver todos
            </VBtn>
          </VCardTitle>

          <VCardText>
            <VDataTable :headers="[
              { title: 'Evento', key: 'title', sortable: false },
              { title: 'Tipo', key: 'type', sortable: false },
              { title: 'Data', key: 'date', sortable: false },
              { title: 'Status', key: 'status', sortable: false }
            ]" :items="recentEvents" :items-per-page="8" hide-default-footer density="compact" hover>
              <template #item.title="{ item }">
                <div class="d-flex align-center">
                  <VIcon :icon="getEventIcon(item.extendedProps?.calendar)" size="18" class="me-3" />
                  <div>
                    <span class="font-weight-medium">{{ item.title }}</span>
                    <div v-if="item.extendedProps?.description" class="text-caption text-medium-emphasis">
                      {{ item.extendedProps.description.substring(0, 50) }}{{ item.extendedProps.description.length > 50
                        ? '...' : '' }}
                    </div>
                  </div>
                </div>
              </template>

              <template #item.type="{ item }">
                <VChip :color="getTypeColor(item.extendedProps?.calendar)" size="small" variant="tonal">
                  {{ item.extendedProps?.calendar || 'Outros' }}
                </VChip>
              </template>

              <template #item.date="{ item }">
                <div>
                  <span class="text-sm">{{ formatDate(item.start) }}</span>
                  <div class="text-caption text-medium-emphasis">
                    {{ new Date(item.start) > new Date() ? 'Futuro' : 'Passado' }}
                  </div>
                </div>
              </template>

              <template #item.status="{ item }">
                <VChip :color="getStatusColor(item.extendedProps?.status)" size="small" variant="tonal">
                  {{ item.extendedProps?.status || 'Pendente' }}
                </VChip>
              </template>
            </VDataTable>

            <div v-if="!recentEvents.length" class="text-center py-8">
              <VIcon icon="ri-calendar-line" size="48" color="surface-variant" class="mb-3" />
              <p class="text-body-2 text-medium-emphasis">Nenhum evento encontrado</p>
              <VBtn to="/apps/calendar" color="primary" variant="outlined" class="mt-2">
                Criar primeiro evento
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Admin - Usuários Aprimorado -->
      <VCol v-if="isAdmin" cols="12" md="6">
        <VCard class="h-100">
          <VCardTitle>Usuários do Sistema</VCardTitle>
          <VCardText>
            <div class="text-center mb-4">
              <VIcon icon="ri-group-line" color="primary" size="48" class="mb-2" />
              <h4 class="text-h4">{{ dashboardData.totalUsers }}</h4>
              <p class="text-sm text-medium-emphasis">Total de Usuários</p>
            </div>

            <VRow class="mb-4">
              <VCol cols="6">
                <div class="text-center">
                  <VIcon icon="ri-user-follow-line" color="success" size="24" class="mb-1" />
                  <p class="text-h6 font-weight-medium mb-0 text-success">{{ dashboardData.activeUsers }}</p>
                  <p class="text-caption text-medium-emphasis">Ativos</p>
                  <VProgressLinear
                    :model-value="dashboardData.totalUsers > 0 ? (dashboardData.activeUsers / dashboardData.totalUsers) * 100 : 0"
                    color="success" height="4" rounded />
                </div>
              </VCol>
              <VCol cols="6">
                <div class="text-center">
                  <VIcon icon="ri-user-unfollow-line" color="warning" size="24" class="mb-1" />
                  <p class="text-h6 font-weight-medium mb-0 text-warning">{{ dashboardData.totalUsers -
                    dashboardData.activeUsers }}</p>
                  <p class="text-caption text-medium-emphasis">Inativos</p>
                  <VProgressLinear
                    :model-value="dashboardData.totalUsers > 0 ? ((dashboardData.totalUsers - dashboardData.activeUsers) / dashboardData.totalUsers) * 100 : 0"
                    color="warning" height="4" rounded />
                </div>
              </VCol>
            </VRow>

            <VBtn to="/admin/users" variant="outlined" block class="mt-4">
              <VIcon icon="ri-settings-line" size="16" class="me-2" />
              Gerenciar Usuários
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  padding: 0;
}

.match-height {
  .v-col {
    display: flex;

    .v-card {
      flex: 1;
    }
  }
}

// Cards aprimorados
.welcome-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-surface), 1) 100%);
}

// Efeitos de hover e animações aprimorados
.metric-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.metric-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.metric-card:hover::before {
  left: 100%;
}

.metric-card:hover .metric-number {
  transform: scale(1.1);
}

.metric-number {
  transition: all 0.3s ease;
  position: relative;
}

// Animações dos gráficos semanais
.weekly-chart {
  .weekly-bar-container:hover .weekly-bars {
    transform: translateY(-4px);
  }
}

.weekly-bars {
  transition: all 0.3s ease;
  position: relative;
}

.bar-primary,
.bar-secondary {
  transition: all 0.3s ease;
  position: relative;
}

.current-week-indicator {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  background: rgb(var(--v-theme-primary));
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.7);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(var(--v-theme-primary), 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0);
  }
}

// Animações das barras mensais
.monthly-item:hover .monthly-chart-container {
  transform: translateY(-2px);
}

.monthly-chart-container {
  transition: all 0.3s ease;
}

.monthly-bar-total,
.monthly-bar-completed {
  transition: all 0.3s ease;
}

.monthly-item:hover .monthly-bar-total,
.monthly-item:hover .monthly-bar-completed {
  transform: scaleY(1.05);
}

// Distribuição diária
.daily-bar {
  transition: all 0.3s ease;
}

.daily-bar:hover .daily-bar-item {
  transform: scaleY(1.1);
  background-color: rgb(var(--v-theme-secondary)) !important;
}

.daily-bar-item {
  transition: all 0.3s ease;
}

// Lista de eventos por tipo
.event-type-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 0;
}

.event-type-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  transform: translateX(4px);
}

// Cards com hover aprimorado
.v-card {
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

// Responsividade aprimorada
@media (max-width: 1280px) {
  .weekly-chart {
    height: 220px !important;

    .weekly-bars {
      height: 150px !important;
    }
  }
}

@media (max-width: 960px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }

  .weekly-chart {
    height: 200px !important;
    padding: 15px 0 !important;

    .weekly-bars {
      height: 130px !important;
    }
  }

  .metric-card .metric-number {
    font-size: 1.75rem !important;
  }
}

@media (max-width: 600px) {
  .dashboard-container {
    padding: 0 8px;
  }

  .weekly-chart {
    height: 180px !important;
    padding: 10px 0 !important;

    .weekly-bars {
      height: 110px !important;
    }

    .bar-primary,
    .bar-secondary {
      width: 20px !important;
    }
  }

  .metric-card {
    .v-card-text {
      padding: 12px !important;
    }

    .metric-number {
      font-size: 1.5rem !important;
    }
  }

  .daily-bar-item {
    width: 16px !important;
  }

  .monthly-bar-total,
  .monthly-bar-completed {
    width: 24px !important;
  }
}

// Temas escuros
@media (prefers-color-scheme: dark) {
  .welcome-card {
    background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.15) 0%, rgba(var(--v-theme-surface), 1) 100%);
  }

  .v-card:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .metric-card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
}

// Animações de entrada
.v-card {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Delay escalonado para cards
.v-col:nth-child(1) .v-card {
  animation-delay: 0.1s;
}

.v-col:nth-child(2) .v-card {
  animation-delay: 0.2s;
}

.v-col:nth-child(3) .v-card {
  animation-delay: 0.3s;
}

.v-col:nth-child(4) .v-card {
  animation-delay: 0.4s;
}

.v-col:nth-child(5) .v-card {
  animation-delay: 0.5s;
}

.v-col:nth-child(6) .v-card {
  animation-delay: 0.6s;
}

// Micro-interações
.v-btn {
  transition: all 0.2s ease;
}

.v-btn:hover:not(.v-btn--disabled) {
  transform: translateY(-1px);
}

.v-chip {
  transition: all 0.2s ease;
}

.v-chip:hover {
  transform: scale(1.05);
}

// Loading states
.v-skeleton-loader {
  border-radius: 8px;
}

// Progress bars melhoradas
.v-progress-linear {
  border-radius: 4px;
  overflow: hidden;
}

.v-progress-circular {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

// Tooltips customizados
.v-tooltip .v-overlay__content {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

// Estados de focus aprimorados
.v-btn:focus-visible,
.v-switch:focus-visible,
.v-btn-toggle .v-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

s // Scrollbar customizada

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.5);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.7);
}
</style>
