<!-- src/pages/admin/user-tasks.vue -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import authService from '@/services/auth';
import userService from '@/services/user';
import eventService from '@/services/event';
// VDataTable está disponível globalmente no Vuetify 3

const { t } = useI18n();
const router = useRouter();

// Estados reativo
const users = ref([]);
const selectedUser = ref(null);
const userEvents = ref([]);
const isLoadingUsers = ref(false);
const isLoadingEvents = ref(false);
const isUserDrawerOpen = ref(false);

// Estados de filtragem
const statusFilter = ref('all');
const dateFilter = ref('all');
const searchQuery = ref('');

// Estados de alerta
const alert = ref({
  show: false,
  type: 'success',
  message: ''
});

// Definição da página
definePage({
  meta: {
    pageTitle: 'Visualizar Usuários e Tarefas',
    breadcrumb: [
      { title: 'Home', to: '/' },
      { title: 'Admin', to: '/admin' },
      { title: 'Usuários e Tarefas', active: true }
    ],
    adminRequired: true
  }
});

// Headers para a tabela de usuários
const userHeaders = [
  { title: t('Usuário'), key: 'username', sortable: true },
  { title: t('Email'), key: 'email', sortable: true },
  { title: t('Função'), key: 'role', sortable: false },
  { title: t('Total de Eventos'), key: 'eventCount', sortable: true },
  { title: t('Ações'), key: 'actions', sortable: false }
];

// Headers para a tabela de eventos
const eventHeaders = [
  { title: t('Título'), key: 'title', sortable: true },
  { title: t('Data de Início'), key: 'start', sortable: true },
  { title: t('Data de Fim'), key: 'end', sortable: true },
  { title: t('Status'), key: 'status', sortable: true },
  { title: t('Categoria'), key: 'calendar', sortable: true },
  { title: t('Ações'), key: 'actions', sortable: false }
];

// Opções para filtros
const statusOptions = [
  { title: t('Todos'), value: 'all' },
  { title: t('Em Andamento'), value: 'In Progress' },
  { title: t('Finalizado'), value: 'Done' },
  { title: t('Urgente'), value: 'Urgent' }
];

const dateOptions = [
  { title: t('Todos'), value: 'all' },
  { title: t('Hoje'), value: 'today' },
  { title: t('Esta Semana'), value: 'week' },
  { title: t('Este Mês'), value: 'month' }
];

// Computed para filtrar eventos
const filteredEvents = computed(() => {
  let events = userEvents.value;

  // Filtro por status
  if (statusFilter.value !== 'all') {
    events = events.filter(event => 
      event.extendedProps?.status === statusFilter.value
    );
  }

  // Filtro por data
  if (dateFilter.value !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    events = events.filter(event => {
      const eventDate = new Date(event.start);
      
      switch (dateFilter.value) {
        case 'today':
          return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          return eventDate >= weekStart && eventDate < weekEnd;
        case 'month':
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }

  // Filtro por busca
  if (searchQuery.value) {
    events = events.filter(event => 
      event.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  return events;
});

// Computed para estatísticas do usuário selecionado
const userStats = computed(() => {
  if (!selectedUser.value || userEvents.value.length === 0) {
    return {
      total: 0,
      inProgress: 0,
      done: 0,
      urgent: 0
    };
  }

  return {
    total: userEvents.value.length,
    inProgress: userEvents.value.filter(e => e.extendedProps?.status === 'In Progress').length,
    done: userEvents.value.filter(e => e.extendedProps?.status === 'Done').length,
    urgent: userEvents.value.filter(e => e.extendedProps?.status === 'Urgent').length
  };
});

// Carregar todos os usuários
const fetchUsers = async () => {
  try {
    isLoadingUsers.value = true;
    const usersData = await userService.getAllUsers();
    
    // Carregar contagem de eventos para cada usuário
    const usersWithEventCount = await Promise.all(
      usersData.map(async (user) => {
        try {
          const events = await eventService.getEventsByUserId(user.id);
          return {
            ...user,
            eventCount: events.length
          };
        } catch (error) {
          console.error(`Erro ao carregar eventos do usuário ${user.id}:`, error);
          return {
            ...user,
            eventCount: 0
          };
        }
      })
    );
    
    users.value = usersWithEventCount;
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    showAlert('error', t('Erro ao carregar usuários'));
  } finally {
    isLoadingUsers.value = false;
  }
};

// Carregar eventos de um usuário específico
const fetchUserEvents = async (userId) => {
  try {
    isLoadingEvents.value = true;
    const events = await eventService.getEventsByUserId(userId);
    userEvents.value = events;
  } catch (error) {
    console.error('Erro ao carregar eventos do usuário:', error);
    showAlert('error', t('Erro ao carregar eventos do usuário'));
    userEvents.value = [];
  } finally {
    isLoadingEvents.value = false;
  }
};

// Selecionar usuário e carregar seus eventos
const selectUser = async (user) => {
  selectedUser.value = user;
  await fetchUserEvents(user.id);
  isUserDrawerOpen.value = true;
};

// Fechar drawer
const closeUserDrawer = () => {
  isUserDrawerOpen.value = false;
  selectedUser.value = null;
  userEvents.value = [];
  statusFilter.value = 'all';
  dateFilter.value = 'all';
  searchQuery.value = '';
};

// Formatação de data
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Resolver cor do status
const getStatusColor = (status) => {
  switch (status) {
    case 'Done':
    case 'Finalizado':
      return 'success';
    case 'Urgent':
    case 'Urgente':
      return 'error';
    case 'In Progress':
    default:
      return 'warning';
  }
};

// Resolver cor da categoria
const getCategoryColor = (category) => {
  const colors = {
    'Meeting': 'primary',
    'Task': 'secondary',
    'Deadline': 'error',
    'High Priority': 'warning',
    'Presentation': 'info'
  };
  return colors[category] || 'primary';
};

// Exportar eventos para CSV
const exportToCSV = () => {
  if (!selectedUser.value || filteredEvents.value.length === 0) {
    showAlert('warning', t('Nenhum evento para exportar'));
    return;
  }

  const csvContent = [
    ['Título', 'Início', 'Fim', 'Status', 'Categoria', 'Descrição'].join(','),
    ...filteredEvents.value.map(event => [
      `"${event.title}"`,
      `"${formatDate(event.start)}"`,
      `"${formatDate(event.end)}"`,
      `"${event.extendedProps?.status || ''}"`,
      `"${event.extendedProps?.calendar || ''}"`,
      `"${event.description || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `eventos_${selectedUser.value.username}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Mostrar alerta
const showAlert = (type, message) => {
  alert.value = { show: true, type, message };
  setTimeout(() => { alert.value.show = false; }, 5000);
};

// Verificar autenticação ao montar
onMounted(async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }
  
  if (!authService.isAdmin()) {
    router.push('/not-authorized');
    return;
  }
  
  await fetchUsers();
});

// Atualizar eventos quando filtros mudarem
watch([statusFilter, dateFilter, searchQuery], () => {
  // Os eventos são filtrados automaticamente via computed
});
</script>

<template>
  <VContainer fluid>
    <!-- Cabeçalho -->
    <VRow>
      <VCol cols="12">
        <div class="d-flex justify-space-between align-center mb-6">
          <div>
            <h2 class="text-h4 mb-2">{{ $t('Visualizar Usuários e Tarefas') }}</h2>
            <p class="text-body-1">
              {{ $t('Visualize todos os usuários e suas tarefas/agendamentos atribuídos') }}
            </p>
          </div>
          <VBtn
            color="primary"
            prepend-icon="ri-refresh-line"
            @click="fetchUsers"
            :loading="isLoadingUsers"
          >
            {{ $t('Atualizar') }}
          </VBtn>
        </div>
      </VCol>
    </VRow>

    <!-- Alerta -->
    <VAlert
      v-if="alert.show"
      :type="alert.type"
      closable
      class="mb-4"
      @click:close="alert.show = false"
    >
      {{ alert.message }}
    </VAlert>

    <!-- Tabela de Usuários -->
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardTitle class="d-flex justify-space-between align-center">
            {{ $t('Lista de Usuários') }}
            <VTextField
              v-model="searchQuery"
              :label="$t('Buscar usuário...')"
              prepend-inner-icon="ri-search-line"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 300px;"
            />
          </VCardTitle>
          
          <VDivider />
          
          <VDataTable
            :headers="userHeaders"
            :items="users"
            :loading="isLoadingUsers"
            class="elevation-1"
            :items-per-page="10"
          >
            <!-- Template para a coluna role -->
            <template #item.role="{ item }">
              <VChip
                :color="item.admin ? 'primary' : 'success'"
                size="small"
                class="text-capitalize"
              >
                {{ item.admin ? $t('Administrador') : $t('Usuário') }}
              </VChip>
            </template>
            
            <!-- Template para contagem de eventos -->
            <template #item.eventCount="{ item }">
              <VChip
                :color="item.eventCount > 0 ? 'info' : 'default'"
                size="small"
              >
                {{ item.eventCount }}
              </VChip>
            </template>
            
            <!-- Template para ações -->
            <template #item.actions="{ item }">
              <VBtn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="ri-eye-line"
                @click="selectUser(item)"
              >
                {{ $t('Ver Tarefas') }}
              </VBtn>
            </template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>

    <!-- Drawer para visualizar eventos do usuário -->
    <VNavigationDrawer
      v-model="isUserDrawerOpen"
      temporary
      location="end"
      width="1000"
      class="scrollable-content"
    >
      <template v-if="selectedUser">
        <!-- Cabeçalho do Drawer -->
        <VToolbar color="primary" dark>
          <VAvatar class="me-3">
            <VIcon icon="ri-user-line" />
          </VAvatar>
          <VToolbarTitle>
            {{ selectedUser.username }}
          </VToolbarTitle>
          <VSpacer />
          <IconBtn @click="closeUserDrawer">
            <VIcon icon="ri-close-line" />
          </IconBtn>
        </VToolbar>

        <!-- Informações do usuário -->
        <VCard class="ma-4">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <div class="d-flex align-center mb-2">
                  <VIcon icon="ri-user-line" class="me-2" />
                  <strong>{{ $t('Nome') }}:</strong>
                  <span class="ml-2">{{ selectedUser.username }}</span>
                </div>
                <div class="d-flex align-center mb-2">
                  <VIcon icon="ri-mail-line" class="me-2" />
                  <strong>{{ $t('Email') }}:</strong>
                  <span class="ml-2">{{ selectedUser.email }}</span>
                </div>
                <div class="d-flex align-center">
                  <VIcon icon="ri-shield-line" class="me-2" />
                  <strong>{{ $t('Função') }}:</strong>
                  <VChip
                    :color="selectedUser.admin ? 'primary' : 'success'"
                    size="small"
                    class="ml-2"
                  >
                    {{ selectedUser.admin ? $t('Administrador') : $t('Usuário') }}
                  </VChip>
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <!-- Estatísticas -->
                <VRow>
                  <VCol cols="6">
                    <VCard variant="tonal" color="info">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ userStats.total }}</div>
                        <div class="text-caption">{{ $t('Total') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="6">
                    <VCard variant="tonal" color="warning">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ userStats.inProgress }}</div>
                        <div class="text-caption">{{ $t('Em Andamento') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="6">
                    <VCard variant="tonal" color="success">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ userStats.done }}</div>
                        <div class="text-caption">{{ $t('Finalizados') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="6">
                    <VCard variant="tonal" color="error">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ userStats.urgent }}</div>
                        <div class="text-caption">{{ $t('Urgentes') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Filtros -->
        <VCard class="ma-4">
          <VCardTitle>{{ $t('Filtros') }}</VCardTitle>
          <VCardText>
            <VRow>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="statusFilter"
                  :items="statusOptions"
                  :label="$t('Status')"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="dateFilter"
                  :items="dateOptions"
                  :label="$t('Período')"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="searchQuery"
                  :label="$t('Buscar eventos...')"
                  prepend-inner-icon="ri-search-line"
                  density="compact"
                  variant="outlined"
                  clearable
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Lista de Eventos -->
        <VCard class="ma-4">
          <VCardTitle class="d-flex justify-space-between align-center">
            {{ $t('Eventos e Tarefas') }} ({{ filteredEvents.length }})
            <VBtn
              color="success"
              prepend-icon="ri-download-line"
              size="small"
              @click="exportToCSV"
              :disabled="filteredEvents.length === 0"
            >
              {{ $t('Exportar CSV') }}
            </VBtn>
          </VCardTitle>
          
          <VDivider />
          
          <VDataTable
            :headers="eventHeaders"
            :items="filteredEvents"
            :loading="isLoadingEvents"
            class="elevation-0"
            :items-per-page="25"
          >
            <!-- Template para título -->
            <template #item.title="{ item }">
              <div>
                <div class="font-weight-medium">{{ item.title }}</div>
                <div v-if="item.description" class="text-caption text-medium-emphasis">
                  {{ item.description.substring(0, 50) }}{{ item.description.length > 50 ? '...' : '' }}
                </div>
              </div>
            </template>
            
            <!-- Template para data de início -->
            <template #item.start="{ item }">
              <div class="text-no-wrap">
                {{ formatDate(item.start) }}
              </div>
            </template>
            
            <!-- Template para data de fim -->
            <template #item.end="{ item }">
              <div class="text-no-wrap">
                {{ formatDate(item.end) }}
              </div>
            </template>
            
            <!-- Template para status -->
            <template #item.status="{ item }">
              <VChip
                :color="getStatusColor(item.extendedProps?.status)"
                size="small"
                class="text-capitalize"
              >
                {{ $t(item.extendedProps?.status || 'In Progress') }}
              </VChip>
            </template>
            
            <!-- Template para categoria -->
            <template #item.calendar="{ item }">
              <VChip
                :color="getCategoryColor(item.extendedProps?.calendar)"
                size="small"
                variant="tonal"
              >
                {{ $t(item.extendedProps?.calendar || 'Sem categoria') }}
              </VChip>
            </template>
            
            <!-- Template para ações -->
            <template #item.actions="{ item }">
              <VTooltip text="Ver detalhes">
                <template #activator="{ props }">
                  <IconBtn
                    v-bind="props"
                    size="small"
                    @click="$router.push(`/apps/calendar?event=${item.id}`)"
                  >
                    <VIcon icon="ri-eye-line" />
                  </IconBtn>
                </template>
              </VTooltip>
            </template>
          </VDataTable>
          
          <!-- Estado vazio -->
          <div v-if="!isLoadingEvents && filteredEvents.length === 0" class="text-center pa-8">
            <VIcon icon="ri-calendar-line" size="64" class="text-disabled mb-4" />
            <h3 class="text-h6 text-disabled mb-2">{{ $t('Nenhum evento encontrado') }}</h3>
            <p class="text-body-2 text-disabled">
              {{ $t('Este usuário não possui eventos que correspondam aos filtros selecionados.') }}
            </p>
          </div>
        </VCard>
      </template>
    </VNavigationDrawer>
  </VContainer>
</template>

<style scoped>
.scrollable-content {
  overflow-y: auto;
}

.text-no-wrap {
  white-space: nowrap;
}
</style>  