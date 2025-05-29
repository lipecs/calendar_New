<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import authService from '@/services/auth'
import eventService from '@/services/event'
import userService from '@/services/user'

// Theme
const { name: themeName } = useTheme()

// Estados reativos
const isLoading = ref(true)
const selectedTimeRange = ref('week') // 'week', 'month', 'quarter'
const selectedMetric = ref('appointments') // 'appointments', 'users', 'efficiency'
const autoRefresh = ref(false)
const refreshInterval = ref(null)

// Dados principais
const businessMetrics = ref({
  totalAppointments: 0,
  confirmedAppointments: 0,
  pendingAppointments: 0,
  canceledAppointments: 0,
  totalRevenue: 0,
  averageSessionDuration: 0,
  conversionRate: 0,
  clientRetentionRate: 0,
  peakHours: [],
  busyDays: [],
  monthlyGrowth: 0,
  customerSatisfaction: 0
})

const userMetrics = ref({
  totalClients: 0,
  newClientsThisMonth: 0,
  returningClients: 0,
  vipClients: 0,
  activeUsers: 0,
  usersBySegment: [],
  topClients: [],
  clientAcquisitionCost: 0,
  lifetimeValue: 0,
  churnRate: 0
})

const appointmentMetrics = ref({
  todayAppointments: 0,
  thisWeekAppointments: 0,
  nextWeekAppointments: 0,
  urgentAppointments: 0,
  completionRate: 0,
  averageWaitTime: 0,
  noShowRate: 0,
  rescheduleRate: 0,
  serviceDistribution: [],
  timeSlotPopularity: [],
  seasonalTrends: []
})

const operationalMetrics = ref({
  resourceUtilization: 0,
  staffEfficiency: 0,
  equipmentUsage: 0,
  costPerAppointment: 0,
  profitMargin: 0,
  operationalHours: 0,
  qualityScore: 0,
  responseTime: 0
})

// Dados para gráficos
const revenueChart = ref([])
const appointmentTrends = ref([])
const userActivityHeatmap = ref([])
const servicePerformance = ref([])
const capacityAnalysis = ref([])
const clientSegmentation = ref([])

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

    // Carregar eventos/agendamentos
    let events = []
    if (isAdmin.value) {
      events = await eventService.getEvents()
    } else {
      events = await eventService.getEvents(null, currentUser.value?.id)
    }

    // Calcular métricas de negócio
    calculateBusinessMetrics(events)

    // Calcular métricas de usuários
    await calculateUserMetrics()

    // Calcular métricas de agendamentos
    calculateAppointmentMetrics(events)

    // Calcular métricas operacionais
    calculateOperationalMetrics(events)

    // Gerar dados para gráficos
    generateChartData(events)

  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

// Calcular métricas de negócio
const calculateBusinessMetrics = (events) => {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  const confirmedEvents = events.filter(e => 
    e.extendedProps?.status === 'Confirmed' || e.extendedProps?.status === 'Done'
  )
  
  const pendingEvents = events.filter(e => 
    e.extendedProps?.status === 'Pending' || !e.extendedProps?.status
  )
  
  const canceledEvents = events.filter(e => 
    e.extendedProps?.status === 'Canceled' || e.extendedProps?.status === 'Cancelled'
  )

  const thisMonthEvents = events.filter(e => new Date(e.start) >= thisMonth)
  const lastMonthEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return eventDate >= lastMonth && eventDate < thisMonth
  })

  const monthlyGrowth = lastMonthEvents.length > 0 
    ? ((thisMonthEvents.length - lastMonthEvents.length) / lastMonthEvents.length) * 100 
    : 0

  // Simular dados de receita baseados nos agendamentos
  const totalRevenue = confirmedEvents.length * 150 // Valor médio por serviço
  const conversionRate = events.length > 0 ? (confirmedEvents.length / events.length) * 100 : 0
  
  // Análise de horários de pico
  const hourCounts = Array(24).fill(0)
  events.forEach(event => {
    const hour = new Date(event.start).getHours()
    hourCounts[hour]++
  })
  
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  businessMetrics.value = {
    totalAppointments: events.length,
    confirmedAppointments: confirmedEvents.length,
    pendingAppointments: pendingEvents.length,
    canceledAppointments: canceledEvents.length,
    totalRevenue,
    averageSessionDuration: 45, // minutos
    conversionRate: Math.round(conversionRate),
    clientRetentionRate: 78,
    peakHours,
    monthlyGrowth: Math.round(monthlyGrowth),
    customerSatisfaction: 94
  }
}

// Calcular métricas de usuários
const calculateUserMetrics = async () => {
  try {
    if (isAdmin.value) {
      const users = await userService.getAllUsers()
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const newClients = users.filter(u => new Date(u.createdAt || now) >= thisMonth)
      const activeUsers = users.filter(u => u.status !== 'inactive')
      
      // Simulação de segmentação de clientes
      const segments = [
        { name: 'VIP', count: Math.floor(users.length * 0.15), color: 'error' },
        { name: 'Premium', count: Math.floor(users.length * 0.25), color: 'warning' },
        { name: 'Standard', count: Math.floor(users.length * 0.45), color: 'primary' },
        { name: 'Basic', count: Math.floor(users.length * 0.15), color: 'success' }
      ]

      userMetrics.value = {
        totalClients: users.length,
        newClientsThisMonth: newClients.length,
        returningClients: Math.floor(users.length * 0.65),
        vipClients: segments[0].count,
        activeUsers: activeUsers.length,
        usersBySegment: segments,
        topClients: users.slice(0, 5).map(user => ({
          ...user,
          appointmentsCount: Math.floor(Math.random() * 20) + 5,
          totalSpent: Math.floor(Math.random() * 5000) + 500,
          lastVisit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        })),
        clientAcquisitionCost: 45,
        lifetimeValue: 1250,
        churnRate: 8.5
      }
    }
  } catch (error) {
    console.warn('Erro ao carregar métricas de usuários:', error)
  }
}

// Calcular métricas de agendamentos
const calculateAppointmentMetrics = (events) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
  })

  const thisWeekEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return eventDate >= weekStart && eventDate < nextWeekStart
  })

  const nextWeekEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return eventDate >= nextWeekStart && eventDate < new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  })

  const urgentEvents = events.filter(e => 
    e.extendedProps?.status === 'Urgent' || e.extendedProps?.priority === 'High'
  )

  const completedEvents = events.filter(e => 
    e.extendedProps?.status === 'Done' || e.extendedProps?.status === 'Completed'
  )

  // Distribuição por tipo de serviço
  const serviceCount = {}
  events.forEach(event => {
    const service = event.extendedProps?.calendar || event.extendedProps?.type || 'Outros'
    serviceCount[service] = (serviceCount[service] || 0) + 1
  })

  const serviceDistribution = Object.entries(serviceCount)
    .map(([service, count]) => ({
      service,
      count,
      percentage: events.length > 0 ? Math.round((count / events.length) * 100) : 0,
      revenue: count * 150 // Valor médio por serviço
    }))
    .sort((a, b) => b.count - a.count)

  appointmentMetrics.value = {
    todayAppointments: todayEvents.length,
    thisWeekAppointments: thisWeekEvents.length,
    nextWeekAppointments: nextWeekEvents.length,
    urgentAppointments: urgentEvents.length,
    completionRate: events.length > 0 ? Math.round((completedEvents.length / events.length) * 100) : 0,
    averageWaitTime: 12, // minutos
    noShowRate: 15, // percentual
    rescheduleRate: 8, // percentual
    serviceDistribution
  }
}

// Calcular métricas operacionais
const calculateOperationalMetrics = (events) => {
  const confirmedEvents = events.filter(e => 
    e.extendedProps?.status === 'Confirmed' || e.extendedProps?.status === 'Done'
  )

  operationalMetrics.value = {
    resourceUtilization: 85,
    staffEfficiency: 92,
    equipmentUsage: 78,
    costPerAppointment: 35,
    profitMargin: 65,
    operationalHours: 8.5,
    qualityScore: 94,
    responseTime: 4.2 // minutos
  }
}

// Gerar dados para gráficos
const generateChartData = (events) => {
  // Gráfico de receita mensal
  const months = []
  const now = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    
    const monthEvents = events.filter(e => {
      const eventDate = new Date(e.start)
      return eventDate >= monthDate && eventDate <= nextMonth
    })
    
    const confirmedEvents = monthEvents.filter(e => 
      e.extendedProps?.status === 'Confirmed' || e.extendedProps?.status === 'Done'
    )
    
    months.push({
      month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
      revenue: confirmedEvents.length * 150,
      appointments: monthEvents.length,
      confirmed: confirmedEvents.length
    })
  }
  
  revenueChart.value = months

  // Tendências de agendamentos por dia da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dayDistribution = Array(7).fill(0)
  
  events.forEach(event => {
    const dayOfWeek = new Date(event.start).getDay()
    dayDistribution[dayOfWeek]++
  })
  
  appointmentTrends.value = weekDays.map((day, index) => ({
    day,
    appointments: dayDistribution[index],
    utilization: Math.round((dayDistribution[index] / Math.max(...dayDistribution)) * 100)
  }))

  // Análise de capacidade por horário
  const timeSlots = []
  for (let hour = 8; hour <= 18; hour++) {
    const slotEvents = events.filter(e => {
      const eventHour = new Date(e.start).getHours()
      return eventHour === hour
    })
    
    timeSlots.push({
      time: `${hour}:00`,
      appointments: slotEvents.length,
      capacity: 10, // Capacidade máxima por hora
      utilization: Math.round((slotEvents.length / 10) * 100)
    })
  }
  
  capacityAnalysis.value = timeSlots
}

// Formatação de valores
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR')
}

// Cores para status
const getStatusColor = (status) => {
  switch (status) {
    case 'Confirmed':
    case 'Done': return 'success'
    case 'Pending': return 'warning'
    case 'Canceled': return 'error'
    case 'Urgent': return 'error'
    default: return 'primary'
  }
}

// Ícones para serviços
const getServiceIcon = (service) => {
  switch (service?.toLowerCase()) {
    case 'consultation': return 'ri-user-heart-line'
    case 'meeting': return 'ri-team-line'
    case 'task': return 'ri-task-line'
    case 'appointment': return 'ri-calendar-check-line'
    case 'presentation': return 'ri-presentation-line'
    default: return 'ri-service-line'
  }
}

// Insights baseados nos dados
const businessInsights = computed(() => {
  const insights = []
  
  if (businessMetrics.value.monthlyGrowth > 20) {
    insights.push({
      type: 'success',
      title: 'Crescimento Excepcional',
      message: `${businessMetrics.value.monthlyGrowth}% de crescimento este mês!`,
      icon: 'ri-trending-up-line'
    })
  }
  
  if (appointmentMetrics.value.completionRate < 70) {
    insights.push({
      type: 'warning',
      title: 'Taxa de Conclusão Baixa',
      message: 'Considere revisar o processo de confirmação',
      icon: 'ri-alarm-warning-line'
    })
  }
  
  if (operationalMetrics.value.resourceUtilization > 90) {
    insights.push({
      type: 'info',
      title: 'Alta Utilização',
      message: 'Considere expandir a capacidade',
      icon: 'ri-information-line'
    })
  }
  
  return insights
})

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
  <div class="business-dashboard">
    <!-- Header -->
    <VRow class="mb-4">
      <VCol cols="12" md="8">
        <div class="d-flex align-center gap-3">
          <VIcon icon="ri-store-3-line" size="28" color="primary" />
          <div>
            <h3 class="text-h4 mb-0">Business Dashboard</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Gestão de Agendamentos e Clientes
            </p>
          </div>
        </div>
      </VCol>

      <VCol cols="12" md="4" class="d-flex justify-end align-center gap-2">
        <VBtnToggle v-model="selectedTimeRange" mandatory variant="outlined" density="compact">
          <VBtn value="week" size="small">Semana</VBtn>
          <VBtn value="month" size="small">Mês</VBtn>
          <VBtn value="quarter" size="small">Trimestre</VBtn>
        </VBtnToggle>
        <VSwitch v-model="autoRefresh" density="compact" hide-details inset color="primary" />
        <VBtn icon="ri-refresh-line" variant="outlined" size="small" @click="loadDashboardData" :loading="isLoading" />
      </VCol>
    </VRow>

    <!-- Métricas Principais -->
    <VRow class="mb-4">
      <VCol cols="12" sm="6" md="3" v-for="(metric, index) in [
        {
          title: 'Total de Agendamentos',
          value: businessMetrics.totalAppointments,
          icon: 'ri-calendar-line',
          color: 'primary',
          growth: businessMetrics.monthlyGrowth,
          subtitle: 'Este período'
        },
        {
          title: 'Receita Total',
          value: formatCurrency(businessMetrics.totalRevenue),
          icon: 'ri-money-dollar-circle-line',
          color: 'success',
          growth: 18,
          subtitle: 'Faturamento'
        },
        {
          title: 'Clientes Ativos',
          value: userMetrics.activeUsers,
          icon: 'ri-user-heart-line',
          color: 'info',
          growth: 12,
          subtitle: 'Usuários'
        },
        {
          title: 'Taxa de Conversão',
          value: `${businessMetrics.conversionRate}%`,
          icon: 'ri-line-chart-line',
          color: 'warning',
          growth: businessMetrics.conversionRate - 75,
          subtitle: 'Performance'
        }
      ]" :key="index">
        <VCard class="metric-card h-100" :class="`border-${metric.color}`">
          <VCardText class="d-flex align-center">
            <VAvatar :color="metric.color" variant="tonal" size="56" class="me-4">
              <VIcon :icon="metric.icon" size="28" />
            </VAvatar>
            
            <div class="flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-h5 font-weight-bold">{{ metric.value }}</span>
                <VChip v-if="metric.growth !== undefined" 
                  :color="metric.growth >= 0 ? 'success' : 'error'" 
                  size="small" variant="tonal">
                  <VIcon :icon="metric.growth >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'" size="14" class="me-1" />
                  {{ Math.abs(metric.growth) }}%
                </VChip>
              </div>
              <p class="text-body-2 font-weight-medium mb-1">{{ metric.title }}</p>
              <p class="text-caption text-medium-emphasis mb-0">{{ metric.subtitle }}</p>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <!-- Gráfico de Receita -->
      <VCol cols="12" md="8">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span>Evolução da Receita</span>
            <VBtnToggle v-model="selectedMetric" mandatory variant="outlined" density="compact">
              <VBtn value="revenue" size="small">Receita</VBtn>
              <VBtn value="appointments" size="small">Agendamentos</VBtn>
            </VBtnToggle>
          </VCardTitle>
          <VCardText>
            <div class="revenue-chart">
              <div class="d-flex justify-space-around align-items-end" style="height: 300px; padding: 20px 0;">
                <div v-for="month in revenueChart" :key="month.month" 
                  class="d-flex flex-column align-center chart-bar">
                  <VTooltip location="top">
                    <template #activator="{ props }">
                      <div v-bind="props" class="d-flex flex-column align-center mb-3"
                        style="height: 250px; justify-content: flex-end;">
                        <div class="rounded chart-bar-item" 
                          :style="{
                            width: '60px',
                            height: `${(selectedMetric === 'revenue' ? month.revenue : month.appointments) / 
                              Math.max(...revenueChart.map(m => selectedMetric === 'revenue' ? m.revenue : m.appointments)) * 220}px`,
                            backgroundColor: selectedMetric === 'revenue' ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-primary))',
                            transition: 'all 0.3s ease'
                          }">
                        </div>
                      </div>
                    </template>
                    <div>
                      <div class="font-weight-medium">{{ month.month }}</div>
                      <div>Receita: {{ formatCurrency(month.revenue) }}</div>
                      <div>Agendamentos: {{ month.appointments }}</div>
                      <div>Confirmados: {{ month.confirmed }}</div>
                    </div>
                  </VTooltip>
                  
                  <div class="text-center">
                    <div class="text-caption font-weight-medium">{{ month.month }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ selectedMetric === 'revenue' ? formatCurrency(month.revenue) : month.appointments }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Distribuição de Clientes -->
      <VCol cols="12" md="4">
        <VCard class="h-100">
          <VCardTitle>Segmentação de Clientes</VCardTitle>
          <VCardText>
            <div class="text-center mb-4">
              <div class="text-h3 font-weight-bold text-primary">{{ userMetrics.totalClients }}</div>
              <div class="text-body-2 text-medium-emphasis">Total de Clientes</div>
            </div>

            <VList density="compact">
              <VListItem v-for="segment in userMetrics.usersBySegment" :key="segment.name">
                <template #prepend>
                  <VAvatar :color="segment.color" size="32" variant="tonal">
                    <VIcon icon="ri-vip-crown-line" size="16" />
                  </VAvatar>
                </template>
                
                <VListItemTitle class="d-flex align-center justify-space-between">
                  <span>{{ segment.name }}</span>
                  <VChip :color="segment.color" size="small" variant="tonal">
                    {{ segment.count }}
                  </VChip>
                </VListItemTitle>
                
                <VListItemSubtitle>
                  <VProgressLinear 
                    :model-value="userMetrics.totalClients > 0 ? (segment.count / userMetrics.totalClients) * 100 : 0"
                    :color="segment.color" height="4" rounded class="mt-1" />
                </VListItemSubtitle>
              </VListItem>
            </VList>

            <VRow class="mt-4" dense>
              <VCol cols="6">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-success">{{ userMetrics.newClientsThisMonth }}</div>
                  <div class="text-caption text-medium-emphasis">Novos este mês</div>
                </div>
              </VCol>
              <VCol cols="6">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-warning">{{ userMetrics.returningClients }}</div>
                  <div class="text-caption text-medium-emphasis">Recorrentes</div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Análise de Capacidade -->
      <VCol cols="12" md="6">
        <VCard>
          <VCardTitle>Análise de Capacidade por Horário</VCardTitle>
          <VCardText>
            <div class="capacity-analysis">
              <div v-for="slot in capacityAnalysis" :key="slot.time" 
                class="d-flex align-center mb-3 capacity-slot">
                <div class="text-body-2 font-weight-medium" style="min-width: 60px;">
                  {{ slot.time }}
                </div>
                
                <div class="flex-grow-1 mx-3">
                  <VProgressLinear 
                    :model-value="slot.utilization"
                    :color="slot.utilization > 80 ? 'error' : slot.utilization > 60 ? 'warning' : 'success'"
                    height="12" rounded>
                    <template #default="{ value }">
                      <small class="text-white font-weight-bold">{{ Math.ceil(value) }}%</small>
                    </template>
                  </VProgressLinear>
                </div>
                
                <div class="text-caption text-medium-emphasis" style="min-width: 80px;">
                  {{ slot.appointments }}/{{ slot.capacity }}
                </div>
              </div>
            </div>

            <VAlert color="info" variant="tonal" density="compact" class="mt-4">
              <template #prepend>
                <VIcon icon="ri-lightbulb-line" />
              </template>
              <div class="text-caption">
                Horários de maior demanda: 14h-16h. Considere expandir a capacidade nestes períodos.
              </div>
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Tendências de Agendamentos -->
      <VCol cols="12" md="6">
        <VCard>
          <VCardTitle>Distribuição Semanal</VCardTitle>
          <VCardText>
            <div class="d-flex justify-space-around align-items-end mb-4" style="height: 200px;">
              <div v-for="day in appointmentTrends" :key="day.day" 
                class="text-center weekly-trend">
                <VTooltip location="top">
                  <template #activator="{ props }">
                    <div v-bind="props" class="mb-2">
                      <div class="rounded mx-auto trend-bar" 
                        :style="{
                          width: '32px',
                          height: `${day.utilization * 1.5}px`,
                          backgroundColor: day.utilization > 80 ? 'rgb(var(--v-theme-error))' : 
                            day.utilization > 60 ? 'rgb(var(--v-theme-warning))' : 'rgb(var(--v-theme-success))',
                          transition: 'all 0.3s ease'
                        }">
                      </div>
                    </div>
                  </template>
                  <div>
                    <div>{{ day.day }}</div>
                    <div>{{ day.appointments }} agendamentos</div>
                    <div>{{ day.utilization }}% utilização</div>
                  </div>
                </VTooltip>
                
                <div class="text-caption font-weight-medium">{{ day.day }}</div>
                <div class="text-caption text-medium-emphasis">{{ day.appointments }}</div>
              </div>
            </div>

            <VRow dense>
              <VCol cols="4">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-primary">{{ appointmentMetrics.thisWeekAppointments }}</div>
                  <div class="text-caption text-medium-emphasis">Esta Semana</div>
                </div>
              </VCol>
              <VCol cols="4">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-info">{{ appointmentMetrics.nextWeekAppointments }}</div>
                  <div class="text-caption text-medium-emphasis">Próxima Semana</div>
                </div>
              </VCol>
              <VCol cols="4">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-success">{{ appointmentMetrics.completionRate }}%</div>
                  <div class="text-caption text-medium-emphasis">Taxa Conclusão</div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Performance dos Serviços -->
      <VCol cols="12" md="8">
        <VCard>
          <VCardTitle>Performance dos Serviços</VCardTitle>
          <VCardText>
            <VDataTable 
              :headers="[
                { title: 'Serviço', key: 'service', sortable: false },
                { title: 'Agendamentos', key: 'count', sortable: true },
                { title: 'Participação', key: 'percentage', sortable: true },
                { title: 'Receita', key: 'revenue', sortable: true },
                { title: 'Tendência', key: 'trend', sortable: false }
              ]"
              :items="appointmentMetrics.serviceDistribution"
              :items-per-page="5"
              hide-default-footer
              density="compact">
              
              <template #item.service="{ item }">
                <div class="d-flex align-center">
                  <VIcon :icon="getServiceIcon(item.service)" size="20" class="me-3" />
                  <span class="font-weight-medium">{{ item.service }}</span>
                </div>
              </template>

              <template #item.count="{ item }">
                <VChip color="primary" size="small" variant="tonal">
                  {{ item.count }}
                </VChip>
              </template>

              <template #item.percentage="{ item }">
                <div class="d-flex align-center">
                  <VProgressLinear 
                    :model-value="item.percentage" 
                    color="success" 
                    height="6" 
                    style="width: 60px;" 
                    rounded 
                    class="me-2" />
                  <span class="text-caption">{{ item.percentage }}%</span>
                </div>
              </template>

              <template #item.revenue="{ item }">
                <span class="font-weight-medium">{{ formatCurrency(item.revenue) }}</span>
              </template>

              <template #item.trend="{ item }">
                <VIcon 
                  :icon="Math.random() > 0.5 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"
                  :color="Math.random() > 0.5 ? 'success' : 'error'"
                  size="20" />
              </template>
            </VDataTable>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Métricas Operacionais -->
      <VCol cols="12" md="4">
        <VCard class="h-100">
          <VCardTitle>Eficiência Operacional</VCardTitle>
          <VCardText>
            <div class="operational-metrics">
              <div v-for="(metric, index) in [
                {
                  title: 'Utilização de Recursos',
                  value: operationalMetrics.resourceUtilization,
                  icon: 'ri-dashboard-line',
                  color: 'primary'
                },
                {
                  title: 'Eficiência da Equipe',
                  value: operationalMetrics.staffEfficiency,
                  icon: 'ri-team-line',
                  color: 'success'
                },
                {
                  title: 'Pontuação de Qualidade',
                  value: operationalMetrics.qualityScore,
                  icon: 'ri-star-line',
                  color: 'warning'
                },
                {
                  title: 'Tempo de Resposta',
                  value: `${operationalMetrics.responseTime}min`,
                  icon: 'ri-time-line',
                  color: 'info'
                }
              ]" :key="index" class="mb-4">
                <div class="d-flex align-center mb-2">
                  <VIcon :icon="metric.icon" :color="metric.color" size="20" class="me-2" />
                  <span class="text-body-2 font-weight-medium">{{ metric.title }}</span>
                </div>
                
                <div class="d-flex align-center">
                  <VProgressCircular 
                    :model-value="typeof metric.value === 'number' ? metric.value : 85"
                    :color="metric.color"
                    size="40"
                    width="4"
                    class="me-3">
                    <span class="text-caption font-weight-bold">
                      {{ typeof metric.value === 'number' ? metric.value : metric.value }}
                    </span>
                  </VProgressCircular>
                  
                  <div class="flex-grow-1">
                    <VProgressLinear 
                      :model-value="typeof metric.value === 'number' ? metric.value : 85"
                      :color="metric.color"
                      height="8"
                      rounded />
                  </div>
                </div>
              </div>
            </div>

            <!-- Custos e Lucros -->
            <VDivider class="my-4" />
            
            <VRow dense>
              <VCol cols="6">
                <div class="text-center">
                  <VIcon icon="ri-money-dollar-box-line" color="success" size="24" class="mb-1" />
                  <div class="text-h6 font-weight-bold text-success">{{ operationalMetrics.profitMargin }}%</div>
                  <div class="text-caption text-medium-emphasis">Margem de Lucro</div>
                </div>
              </VCol>
              <VCol cols="6">
                <div class="text-center">
                  <VIcon icon="ri-calculator-line" color="error" size="24" class="mb-1" />
                  <div class="text-h6 font-weight-bold text-error">{{ formatCurrency(operationalMetrics.costPerAppointment) }}</div>
                  <div class="text-caption text-medium-emphasis">Custo/Agendamento</div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Top Clientes -->
      <VCol cols="12" md="6">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span>Top Clientes</span>
            <VChip color="primary" size="small" variant="tonal">
              {{ userMetrics.topClients.length }} clientes
            </VChip>
          </VCardTitle>
          <VCardText>
            <VList density="compact">
              <VListItem v-for="(client, index) in userMetrics.topClients" :key="client.id" class="client-item">
                <template #prepend>
                  <VAvatar size="40" class="me-3">
                    <VImg :src="`https://ui-avatars.com/api/?name=${client.username}&background=random`" />
                  </VAvatar>
                </template>

                <VListItemTitle class="d-flex align-center justify-space-between">
                  <div>
                    <span class="font-weight-medium">{{ client.username }}</span>
                    <VChip v-if="index < 3" size="x-small" 
                      :color="index === 0 ? 'error' : index === 1 ? 'warning' : 'success'"
                      variant="tonal" class="ml-2">
                      #{{ index + 1 }}
                    </VChip>
                  </div>
                  <div class="text-end">
                    <div class="text-h6 font-weight-bold">{{ formatCurrency(client.totalSpent) }}</div>
                    <div class="text-caption text-medium-emphasis">{{ client.appointmentsCount }} agendamentos</div>
                  </div>
                </VListItemTitle>

                <VListItemSubtitle class="d-flex align-center justify-space-between">
                  <span>Última visita: {{ formatDate(client.lastVisit) }}</span>
                  <VProgressLinear 
                    :model-value="(client.appointmentsCount / 20) * 100"
                    color="primary"
                    height="4"
                    style="width: 100px;"
                    rounded />
                </VListItemSubtitle>
              </VListItem>
            </VList>

            <VBtn variant="outlined" block class="mt-4" to="/clients">
              <VIcon icon="ri-group-line" size="16" class="me-2" />
              Ver Todos os Clientes
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Insights e Alertas -->
      <VCol cols="12" md="6">
        <VCard>
          <VCardTitle>Insights do Negócio</VCardTitle>
          <VCardText>
            <div v-for="insight in businessInsights" :key="insight.title" class="mb-3">
              <VAlert :color="insight.type" variant="tonal" density="compact">
                <template #prepend>
                  <VIcon :icon="insight.icon" />
                </template>
                <div>
                  <div class="font-weight-medium text-body-2">{{ insight.title }}</div>
                  <div class="text-caption">{{ insight.message }}</div>
                </div>
              </VAlert>
            </div>

            <!-- Métricas de Satisfação -->
            <VCard variant="outlined" class="mt-4">
              <VCardText class="text-center py-4">
                <VIcon icon="ri-emotion-happy-line" color="success" size="32" class="mb-2" />
                <div class="text-h4 font-weight-bold text-success">{{ businessMetrics.customerSatisfaction }}%</div>
                <div class="text-body-2 font-weight-medium">Satisfação do Cliente</div>
                <VProgressLinear 
                  :model-value="businessMetrics.customerSatisfaction"
                  color="success"
                  height="6"
                  rounded
                  class="mt-2" />
              </VCardText>
            </VCard>

            <!-- Métricas de Retenção -->
            <VRow dense class="mt-4">
              <VCol cols="4">
                <div class="text-center">
                  <VIcon icon="ri-refresh-line" color="info" size="20" class="mb-1" />
                  <div class="text-body-1 font-weight-bold">{{ businessMetrics.clientRetentionRate }}%</div>
                  <div class="text-caption text-medium-emphasis">Retenção</div>
                </div>
              </VCol>
              <VCol cols="4">
                <div class="text-center">
                  <VIcon icon="ri-user-add-line" color="success" size="20" class="mb-1" />
                  <div class="text-body-1 font-weight-bold">{{ formatCurrency(userMetrics.clientAcquisitionCost) }}</div>
                  <div class="text-caption text-medium-emphasis">CAC</div>
                </div>
              </VCol>
              <VCol cols="4">
                <div class="text-center">
                  <VIcon icon="ri-money-dollar-circle-line" color="warning" size="20" class="mb-1" />
                  <div class="text-body-1 font-weight-bold">{{ formatCurrency(userMetrics.lifetimeValue) }}</div>
                  <div class="text-caption text-medium-emphasis">LTV</div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Resumo do Dia -->
      <VCol cols="12">
        <VCard>
          <VCardTitle>Resumo de Hoje</VCardTitle>
          <VCardText>
            <VRow>
              <VCol cols="12" md="8">
                <VRow dense>
                  <VCol cols="6" md="3" v-for="(stat, index) in [
                    {
                      title: 'Agendamentos Hoje',
                      value: appointmentMetrics.todayAppointments,
                      icon: 'ri-calendar-today-line',
                      color: 'primary'
                    },
                    {
                      title: 'Agendamentos Urgentes',
                      value: appointmentMetrics.urgentAppointments,
                      icon: 'ri-alarm-warning-line',
                      color: 'error'
                    },
                    {
                      title: 'Tempo Médio de Espera',
                      value: `${appointmentMetrics.averageWaitTime}min`,
                      icon: 'ri-time-line',
                      color: 'warning'
                    },
                    {
                      title: 'Taxa de No-Show',
                      value: `${appointmentMetrics.noShowRate}%`,
                      icon: 'ri-user-unfollow-line',
                      color: 'info'
                    }
                  ]" :key="index">
                    <VCard variant="tonal" :color="stat.color" class="text-center">
                      <VCardText class="py-4">
                        <VIcon :icon="stat.icon" :color="stat.color" size="24" class="mb-2" />
                        <div class="text-h5 font-weight-bold" :class="`text-${stat.color}`">{{ stat.value }}</div>
                        <div class="text-caption">{{ stat.title }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>
              </VCol>

              <VCol cols="12" md="4">
                <VCard variant="outlined" class="h-100">
                  <VCardText class="text-center d-flex flex-column justify-center h-100">
                    <VIcon icon="ri-rocket-line" color="primary" size="48" class="mb-3" />
                    <h5 class="text-h5 mb-2">Próximas Ações</h5>
                    <VList density="compact">
                      <VListItem>
                        <template #prepend>
                          <VIcon icon="ri-phone-line" color="success" size="16" />
                        </template>
                        <VListItemTitle class="text-body-2">Confirmar agendamentos de amanhã</VListItemTitle>
                      </VListItem>
                      <VListItem>
                        <template #prepend>
                          <VIcon icon="ri-mail-line" color="info" size="16" />
                        </template>
                        <VListItemTitle class="text-body-2">Enviar lembretes por email</VListItemTitle>
                      </VListItem>
                      <VListItem>
                        <template #prepend>
                          <VIcon icon="ri-bar-chart-line" color="warning" size="16" />
                        </template>
                        <VListItemTitle class="text-body-2">Revisar relatório semanal</VListItemTitle>
                      </VListItem>
                    </VList>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style lang="scss" scoped>
.business-dashboard {
  padding: 0;
}

// Cards com bordas coloridas
.metric-card {
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
  
  &.border-primary { border-left-color: rgb(var(--v-theme-primary)); }
  &.border-success { border-left-color: rgb(var(--v-theme-success)); }
  &.border-info { border-left-color: rgb(var(--v-theme-info)); }
  &.border-warning { border-left-color: rgb(var(--v-theme-warning)); }
  &.border-error { border-left-color: rgb(var(--v-theme-error)); }
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

// Animações dos gráficos
.chart-bar:hover .chart-bar-item {
  transform: scaleY(1.05);
}

.chart-bar-item {
  transition: all 0.3s ease;
}

.weekly-trend:hover .trend-bar {
  transform: scaleY(1.1);
}

.trend-bar {
  transition: all 0.3s ease;
}

// Slots de capacidade
.capacity-slot:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 8px;
  margin: 0 -8px 8px -8px;
}

// Items de cliente
.client-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 0;
}

.client-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  transform: translateX(4px);
}

// Métricas operacionais
.operational-metrics {
  .v-progress-circular {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
}

// Animações de entrada
.v-card {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Delay escalonado para cards
.v-row .v-col:nth-child(1) .v-card { animation-delay: 0.1s; }
.v-row .v-col:nth-child(2) .v-card { animation-delay: 0.2s; }
.v-row .v-col:nth-child(3) .v-card { animation-delay: 0.3s; }
.v-row .v-col:nth-child(4) .v-card { animation-delay: 0.4s; }
.v-row .v-col:nth-child(5) .v-card { animation-delay: 0.5s; }

// Hover effects
.v-card {
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.v-btn:hover:not(.v-btn--disabled) {
  transform: translateY(-1px);
}

.v-chip:hover {
  transform: scale(1.05);
}

// Responsividade
@media (max-width: 960px) {
  .revenue-chart {
    .chart-bar-item {
      width: 40px !important;
    }
  }
  
  .trend-bar {
    width: 24px !important;
  }
}

@media (max-width: 600px) {
  .business-dashboard {
    padding: 0 8px;
  }
  
  .revenue-chart {
    .chart-bar-item {
      width: 32px !important;
    }
  }
  
  .capacity-slot {
    flex-direction: column;
    align-items: flex-start !important;
    
    .v-progress-linear {
      width: 100% !important;
      margin: 8px 0 !important;
    }
  }
}

// Temas escuro
@media (prefers-color-scheme: dark) {
  .v-card:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
}

// Progress bars customizadas
.v-progress-linear {
  border-radius: 6px;
  overflow: hidden;
}

.v-progress-circular {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

// Scrollbar customizada
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
