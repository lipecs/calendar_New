<!-- src/pages/pages/pricing.vue - ATUALIZADO para Gerenciamento de Clientes -->
<template>
  <VCard>
    <VCardTitle class="d-flex justify-space-between align-center flex-wrap">
      {{ $t('Gerenciamento de Clientes') }}
      <VBtn 
        v-if="canManageClients"
        color="primary" 
        prepend-icon="ri-user-add-line" 
        @click="openAddClientDialog"
      >
        {{ $t('Adicionar Cliente') }}
      </VBtn>
    </VCardTitle>
    
    <VDivider />
    
    <!-- Barra de Busca -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <VTextField
            v-model="searchQuery"
            :label="$t('Buscar Cliente')"
            :placeholder="$t('Digite o nome ou código do cliente')"
            prepend-inner-icon="ri-search-line"
            clearable
            @input="searchClients"
          />
        </VCol>
        <!-- ✅ NOVO: Filtro por coordenador -->
        <VCol cols="12" md="3">
          <VSelect
            v-model="filterByCoordenador"
            :label="$t('Filtrar por Coordenador')"
            :items="availableCoordenadores"
            item-title="username"
            item-value="id"
            clearable
            @update:model-value="filterClients"
          />
        </VCol>
        <!-- ✅ NOVO: Filtro por vendedor -->
        <VCol cols="12" md="3">
          <VSelect
            v-model="filterByVendedor"
            :label="$t('Filtrar por Vendedor')"
            :items="availableVendedores"
            item-title="username"
            item-value="id"
            clearable
            @update:model-value="filterClients"
          />
        </VCol>
      </VRow>
    </VCardText>
    
    <!-- Alerta de mensagem -->
    <VAlert
      v-if="alert.show"
      :type="alert.type"
      closable
      class="mx-4 mb-4"
      @click:close="alert.show = false"
    >
      {{ alert.message }}
    </VAlert>
    
    <!-- Tabela de Clientes -->
    <VCardText>
      <VDataTable
        :headers="headers"
        :items="filteredClients"
        :loading="isLoading"
        :search="searchQuery"
        class="elevation-1"
        :items-per-page="10"
      >
        <!-- Status -->
        <template #item.status="{ item }">
          <VChip
            :color="getStatusColor(item.status)"
            size="small"
            class="text-capitalize"
          >
            {{ $t(item.status) }}
          </VChip>
        </template>
        
        <!-- ✅ ATUALIZADO: Coordenador Responsável -->
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
        
        <!-- ✅ ATUALIZADO: Vendedor Responsável -->
        <template #item.vendedor="{ item }">
          <div v-if="item.vendedor" class="d-flex align-center">
            <VAvatar size="32" class="me-2">
              <VIcon icon="ri-user-line" />
            </VAvatar>
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ item.vendedor.username }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ item.vendedor.email }}
              </div>
            </div>
          </div>
          <VChip v-else color="warning" size="small">
            {{ $t('Não Atribuído') }}
          </VChip>
        </template>
        
        <!-- Data de Criação -->
        <template #item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>
        
        <!-- Ações -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-2">
            <VTooltip text="Editar Cliente">
              <template #activator="{ props }">
                <IconBtn 
                  v-if="canManageClients"
                  v-bind="props"
                  @click="editClient(item)"
                >
                  <VIcon icon="ri-edit-box-line" />
                </IconBtn>
              </template>
            </VTooltip>
            
            <VTooltip text="Excluir Cliente">
              <template #activator="{ props }">
                <IconBtn 
                  v-if="canManageClients"
                  v-bind="props"
                  color="error" 
                  @click="confirmDeleteClient(item)"
                >
                  <VIcon icon="ri-delete-bin-7-line" />
                </IconBtn>
              </template>
            </VTooltip>
          </div>
        </template>
      </VDataTable>
    </VCardText>
    
    <!-- Dialog para Adicionar/Editar Cliente -->
    <VDialog 
      v-model="clientDialog" 
      max-width="700px"
      persistent
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ isEditMode ? $t('Editar Cliente') : $t('Adicionar Cliente') }}
        </VCardTitle>
        
        <VCardText>
          <VForm ref="clientForm" @submit.prevent="saveClient">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="clientData.name"
                  :label="$t('Nome do Cliente')"
                  :rules="[v => !!v || $t('Nome é obrigatório')]"
                  required
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="clientData.code"
                  :label="$t('Código do Cliente')"
                  :rules="[v => !!v || $t('Código é obrigatório')]"
                  required
                />
              </VCol>
              
              <VCol cols="12">
                <VTextField
                  v-model="clientData.email"
                  :label="$t('Email')"
                  :rules="[v => !v || /.+@.+\..+/.test(v) || $t('Email deve ser válido')]"
                  type="email"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VTextField
                  v-model="clientData.phone"
                  :label="$t('Telefone')"
                />
              </VCol>
              
              <VCol cols="12" md="6">
                <VSelect
                  v-model="clientData.status"
                  :label="$t('Status')"
                  :items="statusOptions"
                  :rules="[v => !!v || $t('Status é obrigatório')]"
                  required
                />
              </VCol>
              
              <!-- ✅ NOVO: Coordenador Responsável -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="clientData.coordenadorId"
                  :label="$t('Coordenador Responsável')"
                  :items="availableCoordenadores"
                  item-title="username"
                  item-value="id"
                  :rules="[v => !!v || $t('Coordenador é obrigatório')]"
                  required
                />
              </VCol>
              
              <!-- ✅ NOVO: Vendedor Responsável -->
              <VCol cols="12" md="6">
                <VSelect
                  v-model="clientData.vendedorId"
                  :label="$t('Vendedor Responsável')"
                  :items="availableVendedores"
                  item-title="username"
                  item-value="id"
                  :rules="[v => !!v || $t('Vendedor é obrigatório')]"
                  required
                />
              </VCol>
              
              <VCol cols="12">
                <VTextarea
                  v-model="clientData.address"
                  :label="$t('Endereço')"
                  rows="3"
                />
              </VCol>
              
              <VCol cols="12">
                <VTextarea
                  v-model="clientData.notes"
                  :label="$t('Observações')"
                  rows="2"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        
        <VCardActions>
          <VSpacer />
          <VBtn
            color="secondary"
            variant="outlined"
            @click="closeClientDialog"
          >
            {{ $t('Cancelar') }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="isLoading"
            @click="saveClient"
          >
            {{ isEditMode ? $t('Atualizar') : $t('Salvar') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    
    <!-- Dialog de Confirmação de Exclusão -->
    <VDialog 
      v-model="deleteDialog" 
      max-width="400px"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ $t('Confirmar Exclusão') }}
        </VCardTitle>
        
        <VCardText>
          {{ $t('Tem certeza que deseja excluir o cliente') }} 
          <strong>{{ clientToDelete?.name }}</strong>?
          <br><br>
          {{ $t('Esta ação não pode ser desfeita.') }}
        </VCardText>
        
        <VCardActions>
          <VSpacer />
          <VBtn
            color="secondary"
            variant="outlined"
            @click="deleteDialog = false"
          >
            {{ $t('Cancelar') }}
          </VBtn>
          <VBtn
            color="error"
            :loading="isLoading"
            @click="deleteClient"
          >
            {{ $t('Excluir') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import authService from '@/services/auth';
import userService from '@/services/user';

const { t } = useI18n();

// ✅ NOVO: Verificações de permissão
const canManageClients = computed(() => authService.canManageClientes());

// Estados reativos
const clients = ref([]);
const filteredClients = ref([]);
const availableCoordenadores = ref([]);
const availableVendedores = ref([]);
const isLoading = ref(false);
const searchQuery = ref('');
const filterByCoordenador = ref(null);
const filterByVendedor = ref(null);

// Dialogs
const clientDialog = ref(false);
const deleteDialog = ref(false);

// ✅ ATUALIZADO: Dados do cliente com coordenador e vendedor
const clientData = ref({
  name: '',
  code: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  status: 'Ativo',
  coordenadorId: null,
  vendedorId: null
});

const clientToDelete = ref(null);
const isEditMode = ref(false);

// Alerta
const alert = ref({
  show: false,
  type: 'success',
  message: ''
});

// ✅ ATUALIZADO: Configurações da tabela
const headers = [
  { title: t('Nome'), key: 'name', sortable: true },
  { title: t('Código'), key: 'code', sortable: true },
  { title: t('Email'), key: 'email', sortable: true },
  { title: t('Telefone'), key: 'phone', sortable: false },
  { title: t('Status'), key: 'status', sortable: true },
  { title: t('Coordenador'), key: 'coordenador', sortable: false },
  { title: t('Vendedor'), key: 'vendedor', sortable: false },
  { title: t('Criado em'), key: 'createdAt', sortable: true },
  { title: t('Ações'), key: 'actions', sortable: false }
];

const statusOptions = [
  { title: t('Ativo'), value: 'Ativo' },
  { title: t('Inativo'), value: 'Inativo' },
  { title: t('Prospecto'), value: 'Prospecto' },
  { title: t('Bloqueado'), value: 'Bloqueado' }
];

// ✅ NOVO: Carregar coordenadores e vendedores
const loadUsers = async () => {
  try {
    const users = await userService.getAllUsers();
    
    // Filtrar coordenadores e vendedores baseado na hierarquia
    const currentUser = authService.getCurrentUser();
    const currentUserLevel = authService.getHierarchyLevel();
    
    if (currentUserLevel >= 4) {
      // Admin/Diretor vê todos
      availableCoordenadores.value = users.filter(u => u.role === 'coordenador');
      availableVendedores.value = users.filter(u => u.role === 'vendedor');
    } else if (currentUserLevel === 3) {
      // Supervisor vê seus subordinados
      availableCoordenadores.value = users.filter(u => 
        u.role === 'coordenador' && u.supervisorId === currentUser.userData.id
      );
      availableVendedores.value = users.filter(u => 
        u.role === 'vendedor' && u.supervisorId === currentUser.userData.id
      );
    }
  } catch (error) {
    showAlert('error', t('Erro ao carregar usuários'));
  }
};

// Métodos
const loadClients = async () => {
  try {
    isLoading.value = true;
    
    // ✅ SIMULAÇÃO: Dados mockados com relacionamentos
    clients.value = [
      {
        id: 1,
        name: 'Empresa ABC Ltda',
        code: 'CLI001',
        email: 'contato@empresaabc.com',
        phone: '(11) 9999-9999',
        address: 'Rua das Flores, 123',
        notes: 'Cliente importante',
        status: 'Ativo',
        coordenadorId: 1,
        vendedorId: 2,
        coordenador: { id: 1, username: 'coordenador1', email: 'coord1@empresa.com' },
        vendedor: { id: 2, username: 'vendedor1', email: 'vend1@empresa.com' },
        createdAt: new Date('2024-01-15')
      },
      {
        id: 2,
        name: 'XYZ Comercial',
        code: 'CLI002', 
        email: 'xyz@comercial.com',
        phone: '(11) 8888-8888',
        address: 'Av. Principal, 456',
        notes: '',
        status: 'Prospecto',
        coordenadorId: 1,
        vendedorId: null,
        coordenador: { id: 1, username: 'coordenador1', email: 'coord1@empresa.com' },
        vendedor: null,
        createdAt: new Date('2024-02-10')
      }
    ];
    
    // ✅ FILTRAR: Clientes baseado na hierarquia do usuário
    const currentUser = authService.getCurrentUser();
    const currentUserLevel = authService.getHierarchyLevel();
    
    if (currentUserLevel < 3) {
      // Coordenador vê apenas clientes atribuídos a ele
      if (currentUserLevel === 2) {
        clients.value = clients.value.filter(client => 
          client.coordenadorId === currentUser.userData.id
        );
      }
      // Vendedor vê apenas clientes atribuídos a ele
      else if (currentUserLevel === 1) {
        clients.value = clients.value.filter(client => 
          client.vendedorId === currentUser.userData.id
        );
      }
    }
    
    filteredClients.value = [...clients.value];
  } catch (error) {
    showAlert('error', t('Erro ao carregar clientes'));
  } finally {
    isLoading.value = false;
  }
};

const searchClients = () => {
  filterClients();
};

const filterClients = () => {
  let filtered = [...clients.value];
  
  // Filtro por busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.code.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query))
    );
  }
  
  // Filtro por coordenador
  if (filterByCoordenador.value) {
    filtered = filtered.filter(client => 
      client.coordenadorId === filterByCoordenador.value
    );
  }
  
  // Filtro por vendedor
  if (filterByVendedor.value) {
    filtered = filtered.filter(client => 
      client.vendedorId === filterByVendedor.value
    );
  }
  
  filteredClients.value = filtered;
};

const openAddClientDialog = () => {
  isEditMode.value = false;
  clientData.value = {
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'Ativo',
    coordenadorId: null,
    vendedorId: null
  };
  clientDialog.value = true;
};

const editClient = (client) => {
  isEditMode.value = true;
  clientData.value = { ...client };
  clientDialog.value = true;
};

const closeClientDialog = () => {
  clientDialog.value = false;
  clientData.value = {
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'Ativo',
    coordenadorId: null,
    vendedorId: null
  };
};

const saveClient = async () => {
  try {
    isLoading.value = true;
    
    // Validação básica
    if (!clientData.value.name || !clientData.value.code) {
      throw new Error(t('Nome e código são obrigatórios'));
    }
    
    if (!clientData.value.coordenadorId || !clientData.value.vendedorId) {
      throw new Error(t('Coordenador e vendedor são obrigatórios'));
    }
    
    // Verificar se código já existe (apenas para novos clientes)
    if (!isEditMode.value) {
      const existingClient = clients.value.find(c => c.code === clientData.value.code);
      if (existingClient) {
        throw new Error(t('Código do cliente já existe'));
      }
    }
    
    // Buscar dados do coordenador e vendedor
    const coordenador = availableCoordenadores.value.find(c => c.id === clientData.value.coordenadorId);
    const vendedor = availableVendedores.value.find(v => v.id === clientData.value.vendedorId);
    
    if (isEditMode.value) {
      // Atualizar cliente existente
      const index = clients.value.findIndex(c => c.id === clientData.value.id);
      if (index !== -1) {
        clients.value[index] = { 
          ...clientData.value,
          coordenador,
          vendedor
        };
        showAlert('success', t('Cliente atualizado com sucesso'));
      }
    } else {
      // Adicionar novo cliente
      const newClient = {
        ...clientData.value,
        id: Date.now(), // Simulação de ID
        createdAt: new Date(),
        coordenador,
        vendedor
      };
      clients.value.push(newClient);
      showAlert('success', t('Cliente adicionado com sucesso'));
    }
    
    filterClients();
    closeClientDialog();
  } catch (error) {
    showAlert('error', error.message);
  } finally {
    isLoading.value = false;
  }
};

const confirmDeleteClient = (client) => {
  clientToDelete.value = client;
  deleteDialog.value = true;
};

const deleteClient = async () => {
  try {
    isLoading.value = true;
    
    const index = clients.value.findIndex(c => c.id === clientToDelete.value.id);
    if (index !== -1) {
      clients.value.splice(index, 1);
      showAlert('success', t('Cliente excluído com sucesso'));
      filterClients();
    }
    
    deleteDialog.value = false;
    clientToDelete.value = null;
  } catch (error) {
    showAlert('error', t('Erro ao excluir cliente'));
  } finally {
    isLoading.value = false;
  }
};

const getStatusColor = (status) => {
  const colors = {
    'Ativo': 'success',
    'Inativo': 'secondary',
    'Prospecto': 'warning',
    'Bloqueado': 'error'
  };
  return colors[status] || 'primary';
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const showAlert = (type, message) => {
  alert.value = {
    show: true,
    type,
    message
  };
  
  setTimeout(() => {
    alert.value.show = false;
  }, 5000);
};

// Lifecycle
onMounted(() => {
  loadUsers();
  loadClients();
});
</script>

<style scoped>
.v-card {
  overflow: visible;
}
</style>
