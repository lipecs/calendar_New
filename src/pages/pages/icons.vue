<!-- src/pages/pages/icons.vue - ATUALIZADO para Painel de Vendedores -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import authService from '@/services/auth';
import userService from '@/services/user';
import eventService from '@/services/event';

const { t } = useI18n();
const router = useRouter();

// ✅ NOVO: Verificações de permissão
const canManageVendedores = computed(() => authService.canManageVendedores());

// Estados reativos
const vendedores = ref([]);
const selectedVendedor = ref(null);
const vendedorEvents = ref([]);
const vendedorClients = ref([]);
const isLoadingVendedores = ref(false);
const isLoadingEvents = ref(false);
const isVendedorDrawerOpen = ref(false);

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
    pageTitle: 'Painel de Vendedores',
    breadcrumb: [
      { title: 'Home', to: '/' },
      { title: 'Vendedores', active: true }
    ]
  }
});

// Headers para a tabela de vendedores
const vendedorHeaders = [
  { title: t('Vendedor'), key: 'username', sortable: true },
  { title: t('Email'), key: 'email', sortable: true },
  { title: t('Coordenador'), key: 'coordenador', sortable: false },
  { title: t('Total de Agendamentos'), key: 'eventCount', sortable: true },
  { title: t('Clientes Ativos'), key: 'clientCount', sortable: true },
  { title: t('Ações'), key: 'actions', sortable: false }
];

// Headers para a tabela de eventos
const eventHeaders = [
  { title: t('Título'), key: 'title', sortable: true },
  { title: t('Cliente'), key: 'cliente', sortable: true },
  { title: t('Data de Início'), key: 'start', sortable: true },
  { title: t('Data de Fim'), key: 'end', sortable: true },
  { title: t('Status'), key: 'status', sortable: true },
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
  let events = vendedorEvents.value;

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
      event.description?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.extendedProps?.cliente?.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  return events;
});

// Computed para estatísticas do vendedor selecionado
const vendedorStats = computed(() => {
  if (!selectedVendedor.value || vendedorEvents.value.length === 0) {
    return {
      total: 0,
      inProgress: 0,
      done: 0,
      urgent: 0,
      clientsCount: vendedorClients.value.length || 0
    };
  }

  return {
    total: vendedorEvents.value.length,
    inProgress: vendedorEvents.value.filter(e => e.extendedProps?.status === 'In Progress').length,
    done: vendedorEvents.value.filter(e => e.extendedProps?.status === 'Done').length,
    urgent: vendedorEvents.value.filter(e => e.extendedProps?.status === 'Urgent').length,
    clientsCount: vendedorClients.value.length
  };
});

// ✅ NOVO: Carregar vendedores baseado na hierarquia
const fetchVendedores = async () => {
  try {
    isLoadingVendedores.value = true;
    
    const currentUser = authService.getCurrentUser();
    const currentUserLevel = authService.getHierarchyLevel();
    
    // Buscar todos os usuários
    const allUsers = await userService.getAllUsers();
    
    // Filtrar vendedores baseado na hierarquia
    let filteredVendedores = allUsers.filter(user => user.role === 'vendedor');
    
    if (currentUserLevel === 3) {
      // Supervisor vê apenas vendedores sob sua responsabilidade
      filteredVendedores = filteredVendedores.filter(vendedor => 
        vendedor.supervisorId === currentUser.userData.id
      );
    } else if (currentUserLevel === 2) {
      // Coordenador vê apenas vendedores sob sua responsabilidade
      filteredVendedores = filteredVendedores.filter(vendedor => 
        vendedor.coordenadorId === currentUser.userData.id
      );
    }
    // Admin e Diretor veem todos os vendedores
    
    // Carregar estatísticas para cada vendedor
    const vendedoresWithStats = await Promise.all(
      filteredVendedores.map(async (vendedor) => {
        try {
          const events = await eventService.getEventsByUserId(vendedor.id);
          
          // Simular clientes ativos (em produção viria do backend)
          const clientCount = Math.floor(Math.random() * 20) + 5;
          
          // Buscar dados do coordenador
          const coordenador = allUsers.find(u => u.id === vendedor.coordenadorId);
          
          return {
            ...vendedor,
            eventCount: events.length,
            clientCount,
            coordenador: coordenador ? {
              id: coordenador.id,
              username: coordenador.username,
              email: coordenador.email
            } : null
          };
        } catch (error) {
          console.error(`Erro ao carregar dados do vendedor ${vendedor.id}:`, error);
          return {
            ...vendedor,
            eventCount: 0,
            clientCount: 0,
            coordenador: null
          };
        }
      })
    );
    
    vendedores.value = vendedoresWithStats;
  } catch (error) {
    console.error('Erro ao carregar vendedores:', error);
    showAlert('error', t('Erro ao carregar vendedores'));
  } finally {
    isLoadingVendedores.value = false;
  }
};

// Carregar eventos de um vendedor específico
const fetchVendedorEvents = async (vendedorId) => {
  try {
    isLoadingEvents.value = true;
    const events = await eventService.getEventsByUserId(vendedorId);
    
    // ✅ NOVO: Adicionar dados do cliente aos eventos (simulado)
    const eventsWithClient = events.map(event => ({
      ...event,
      extendedProps: {
        ...event.extendedProps,
        cliente: `Cliente ${Math.floor(Math.random() * 100) + 1}` // Simulado
      }
    }));
    
    vendedorEvents.value = eventsWithClient;
  } catch (error) {
    console.error('Erro ao carregar eventos do vendedor:', error);
    showAlert('error', t('Erro ao carregar eventos do vendedor'));
    vendedorEvents.value = [];
  } finally {
    isLoadingEvents.value = false;
  }
};

// ✅ NOVO: Carregar clientes do vendedor
const fetchVendedorClients = async (vendedorId) => {
  try {
    // Simular carregamento de clientes (em produção viria do backend)
    vendedorClients.value = [
      { id: 1, name: 'Cliente A', status: 'Ativo' },
      { id: 2, name: 'Cliente B', status: 'Prospecto' },
      { id: 3, name: 'Cliente C', status: 'Ativo' }
    ].filter(() => Math.random() > 0.3); // Simulação aleatória
  } catch (error) {
    console.error('Erro ao carregar clientes do vendedor:', error);
    vendedorClients.value = [];
  }
};

// Selecionar vendedor e carregar seus dados
const selectVendedor = async (vendedor) => {
  selectedVendedor.value = vendedor;
  await Promise.all([
    fetchVendedorEvents(vendedor.id),
    fetchVendedorClients(vendedor.id)
  ]);
  isVendedorDrawerOpen.value = true;
};

// Fechar drawer
const closeVendedorDrawer = () => {
  isVendedorDrawerOpen.value = false;
  selectedVendedor.value = null;
  vendedorEvents.value = [];
  vendedorClients.value = [];
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
  if (!selectedVendedor.value || filteredEvents.value.length === 0) {
    showAlert('warning', t('Nenhum evento para exportar'));
    return;
  }

  const csvContent = [
    ['Título', 'Cliente', 'Início', 'Fim', 'Status', 'Categoria', 'Descrição'].join(','),
    ...filteredEvents.value.map(event => [
      `"${event.title}"`,
      `"${event.extendedProps?.cliente || ''}"`,
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
  link.setAttribute('download', `agendamentos_${selectedVendedor.value.username}_${new Date().toISOString().split('T')[0]}.csv`);
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
  
  if (!canManageVendedores.value) {
    router.push('/not-authorized');
    return;
  }
  
  await fetchVendedores();
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
            <h2 class="text-h4 mb-2">{{ $t('Painel de Vendedores') }}</h2>
            <p class="text-body-1">
              {{ $t('Visualize e gerencie os vendedores e seus agendamentos') }}
            </p>
          </div>
          <VBtn
            color="primary"
            prepend-icon="ri-refresh-line"
            @click="fetchVendedores"
            :loading="isLoadingVendedores"
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

    <!-- Tabela de Vendedores -->
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardTitle class="d-flex justify-space-between align-center">
            {{ $t('Lista de Vendedores') }}
            <VTextField
              v-model="searchQuery"
              :label="$t('Buscar vendedor...')"
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
            :headers="vendedorHeaders"
            :items="vendedores"
            :loading="isLoadingVendedores"
            class="elevation-1"
            :items-per-page="10"
          >
            <!-- Template para vendedor -->
            <template #item.username="{ item }">
              <div class="d-flex align-center">
                <VAvatar size="40" class="me-3">
                  <VIcon icon="ri-user-line" />
                </VAvatar>
                <div>
                  <div class="text-body-1 font-weight-medium">
                    {{ item.username }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    ID: {{ item.id }}
                  </div>
                </div>
              </div>
            </template>
            
            <!-- Template para coordenador -->
            <template #item.coordenador="{ item }">
              <div v-if="item.coordenador" class="d-flex align-center">
                <VAvatar size="32" class="me-2">
                  <VIcon icon="ri-user-settings-line" />
                </VAvatar>
                <div>
                  <div class="text-body-2 font-weight-medium">
                    {{ item.coordenador.username }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ item.coordenador.email }}
                  </div>
                </div>
              </div>
              <VChip v-else color="warning" size="small">
                {{ $t('Não Atribuído') }}
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
            
            <!-- Template para contagem de clientes -->
            <template #item.clientCount="{ item }">
              <VChip
                :color="item.clientCount > 0 ? 'success' : 'default'"
                size="small"
              >
                {{ item.clientCount }}
              </VChip>
            </template>
            
            <!-- Template para ações -->
            <template #item.actions="{ item }">
              <VBtn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="ri-eye-line"
                @click="selectVendedor(item)"
              >
                {{ $t('Ver Agendamentos') }}
              </VBtn>
            </template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>

    <!-- Drawer para visualizar agendamentos do vendedor -->
    <VNavigationDrawer
      v-model="isVendedorDrawerOpen"
      temporary
      location="end"
      width="1200"
      class="scrollable-content"
    >
      <template v-if="selectedVendedor">
        <!-- Cabeçalho do Drawer -->
        <VToolbar color="primary" dark>
          <VAvatar class="me-3">
            <VIcon icon="ri-user-line" />
          </VAvatar>
          <VToolbarTitle>
            {{ selectedVendedor.username }}
          </VToolbarTitle>
          <VSpacer />
          <IconBtn @click="closeVendedorDrawer">
            <VIcon icon="ri-close-line" />
          </IconBtn>
        </VToolbar>

        <!-- Informações do vendedor -->
        <VCard class="ma-4">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <div class="d-flex align-center mb-2">
                  <VIcon icon="ri-user-line" class="me-2" />
                  <strong>{{ $t('Nome') }}:</strong>
                  <span class="ml-2">{{ selectedVendedor.username }}</span>
                </div>
                <div class="d-flex align-center mb-2">
                  <VIcon icon="ri-mail-line" class="me-2" />
                  <strong>{{ $t('Email') }}:</strong>
                  <span class="ml-2">{{ selectedVendedor.email }}</span>
                </div>
                <div v-if="selectedVendedor.coordenador" class="d-flex align-center">
                  <VIcon icon="ri-user-settings-line" class="me-2" />
                  <strong>{{ $t('Coordenador') }}:</strong>
                  <span class="ml-2">{{ selectedVendedor.coordenador.username }}</span>
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <!-- Estatísticas -->
                <VRow>
                  <VCol cols="6">
                    <VCard variant="tonal" color="info">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ vendedorStats.total }}</div>
                        <div class="text-caption">{{ $t('Total') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="6">
                    <VCard variant="tonal" color="warning">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ vendedorStats.inProgress }}</div>
                        <div class="text-caption">{{ $t('Em Andamento') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="6">
                    <VCard variant="tonal" color="success">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ vendedorStats.done }}</div>
                        <div class="text-caption">{{ $t('Finalizados') }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="6">
                    <VCard variant="tonal" color="error">
                      <VCardText class="text-center">
                        <div class="text-h4">{{ vendedorStats.urgent }}</div>
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
                  :label="$t('Buscar agendamentos...')"
                  prepend-inner-icon="ri-search-line"
                  density="compact"
                  variant="outlined"
                  clearable
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Lista de Agendamentos -->
        <VCard class="ma-4">
          <VCardTitle class="d-flex justify-space-between align-center">
            {{ $t('Agendamentos') }} ({{ filteredEvents.length }})
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
            
            <!-- ✅ NOVO: Template para cliente -->
            <template #item.cliente="{ item }">
              <VChip
                color="primary"
                size="small"
                variant="tonal"
              >
                {{ item.extendedProps?.cliente || $t('Sem cliente') }}
              </VChip>
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
            
            <!-- Template para ações -->
            <template #item.actions="{ item }">
              <VTooltip text="Ver no calendário">
                <template #activator="{ props }">
                  <IconBtn
                    v-bind="props"
                    size="small"
                    @click="$router.push(`/apps/calendar?event=${item.id}`)"
                  >
                    <VIcon icon="ri-calendar-line" />
                  </IconBtn>
                </template>
              </VTooltip>
            </template>
          </VDataTable>
          
          <!-- Estado vazio -->
          <div v-if="!isLoadingEvents && filteredEvents.length === 0" class="text-center pa-8">
            <VIcon icon="ri-calendar-line" size="64" class="text-disabled mb-4" />
            <h3 class="text-h6 text-disabled mb-2">{{ $t('Nenhum agendamento encontrado') }}</h3>
            <p class="text-body-2 text-disabled">
              {{ $t('Este vendedor não possui agendamentos que correspondam aos filtros selecionados.') }}
            </p>
          </div>
        </VCard>

        <!-- ✅ NOVO: Lista de Clientes do Vendedor -->
        <VCard class="ma-4">
          <VCardTitle>{{ $t('Clientes Ativos') }} ({{ vendedorStats.clientsCount }})</VCardTitle>
          <VCardText>
            <VList v-if="vendedorClients.length" density="compact">
              <VListItem
                v-for="client in vendedorClients"
                :key="client.id"
                class="client-item"
              >
                <template #prepend>
                  <VAvatar size="32" color="primary" variant="tonal">
                    <VIcon icon="ri-building-line" />
                  </VAvatar>
                </template>
                
                <VListItemTitle>{{ client.name }}</VListItemTitle>
                
                <template #append>
                  <VChip
                    :color="client.status === 'Ativo' ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ client.status }}
                  </VChip>
                </template>
              </VListItem>
            </VList>
            
            <VAlert v-else type="info" variant="tonal">
              {{ $t('Nenhum cliente ativo encontrado') }}
            </VAlert>
          </VCardText>
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

.client-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 0;
}

.client-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  transform: translateX(4px);
}
</style>
