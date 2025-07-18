<!-- src/pages/pages/pricing.vue - CORRIGIDO para Backend Real -->

<template>
  <VCard>
    <VCardTitle class="d-flex justify-space-between align-center flex-wrap">
      {{ $t('Gerenciamento de Clientes') }}
      <VBtn v-if="canManageClients" color="primary" prepend-icon="ri-user-add-line" @click="openAddClientDialog">
        {{ $t('Adicionar Cliente') }}
      </VBtn>
    </VCardTitle>

    <VDivider />

    <!-- Barra de Busca -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <VTextField v-model="searchQuery" :label="$t('Buscar Cliente')"
            :placeholder="$t('Digite o nome ou código do cliente')" prepend-inner-icon="ri-search-line" clearable
            @input="searchClients" />
        </VCol>
        <VCol cols="12" md="3">
          <VSelect v-model="filterByCoordenador" :label="$t('Filtrar por Coordenador')" :items="availableCoordenadores"
            item-title="username" item-value="id" clearable @update:model-value="filterClients" />
        </VCol>
        <VCol cols="12" md="3">
          <VSelect v-model="filterByVendedor" :label="$t('Filtrar por Vendedor')" :items="availableVendedores"
            item-title="username" item-value="id" clearable @update:model-value="filterClients" />
        </VCol>
      </VRow>
    </VCardText>

    <!-- Alerta de mensagem -->
    <VAlert v-if="alert.show" :type="alert.type" closable class="mx-4 mb-4" @click:close="alert.show = false">
      {{ alert.message }}
    </VAlert>

    <!-- Tabela de Clientes -->
    <VCardText>
      <VDataTable :headers="headers" :items="filteredClients" :loading="isLoading" class="elevation-1"
        :items-per-page="10">
        <!-- Status -->
        <template #item.status="{ item }">
          <VChip :color="getStatusColor(item.status)" size="small" class="text-capitalize">
            {{ $t(item.status) }}
          </VChip>
        </template>

        <!-- Coordenador Responsável -->
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

        <!-- Vendedor Responsável -->
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
                <IconBtn v-if="canManageClients" v-bind="props" @click="editClient(item)">
                  <VIcon icon="ri-edit-box-line" />
                </IconBtn>
              </template>
            </VTooltip>

            <VTooltip text="Excluir Cliente">
              <template #activator="{ props }">
                <IconBtn v-if="canManageClients" v-bind="props" color="error" @click="confirmDeleteClient(item)">
                  <VIcon icon="ri-delete-bin-7-line" />
                </IconBtn>
              </template>
            </VTooltip>
          </div>
        </template>
      </VDataTable>
    </VCardText>

    <!-- Dialog para Adicionar/Editar Cliente -->
    <VDialog v-model="clientDialog" max-width="700px" persistent>
      <VCard>
        <VCardTitle class="text-h5">
          {{ isEditMode ? $t('Editar Cliente') : $t('Adicionar Cliente') }}
        </VCardTitle>

        <VCardText>
          <VForm ref="clientForm" @submit.prevent="saveClient">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField v-model="clientData.name" :label="$t('Nome do Cliente')"
                  :rules="[v => !!v || $t('Nome é obrigatório')]" required />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField v-model="clientData.code" :label="$t('Código do Cliente')"
                  :rules="[v => !!v || $t('Código é obrigatório')]" required />
              </VCol>

              <VCol cols="12">
                <VTextField v-model="clientData.email" :label="$t('Email')"
                  :rules="[v => !v || /.+@.+\..+/.test(v) || $t('Email deve ser válido')]" type="email" />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField v-model="clientData.phone" :label="$t('Telefone')" />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect v-model="clientData.status" :label="$t('Status')" :items="statusOptions"
                  :rules="[v => !!v || $t('Status é obrigatório')]" required />
              </VCol>

              <!-- Coordenador Responsável -->
              <VCol cols="12" md="6">
                <VSelect v-model="clientData.coordenadorId" :label="$t('Coordenador Responsável')"
                  :items="availableCoordenadores" item-title="username" item-value="id"
                  :rules="[v => !!v || $t('Coordenador é obrigatório')]" required />
              </VCol>

              <!-- Vendedor Responsável -->
              <VCol cols="12" md="6">
                <VSelect v-model="clientData.vendedorId" :label="$t('Vendedor Responsável')" :items="filteredVendedores"
                  item-title="username" item-value="id" :rules="[v => !!v || $t('Vendedor é obrigatório')]" required />
              </VCol>

              <VCol cols="12">
                <VTextarea v-model="clientData.address" :label="$t('Endereço')" rows="3" />
              </VCol>

              <VCol cols="12">
                <VTextarea v-model="clientData.notes" :label="$t('Observações')" rows="2" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn color="secondary" variant="outlined" @click="closeClientDialog">
            {{ $t('Cancelar') }}
          </VBtn>
          <VBtn color="primary" :loading="isLoading" @click="saveClient">
            {{ isEditMode ? $t('Atualizar') : $t('Salvar') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialog de Confirmação de Exclusão -->
    <VDialog v-model="deleteDialog" max-width="400px">
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
          <VBtn color="secondary" variant="outlined" @click="deleteDialog = false">
            {{ $t('Cancelar') }}
          </VBtn>
          <VBtn color="error" :loading="isLoading" @click="deleteClient">
            {{ $t('Excluir') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>

<script setup>
import authService from '@/services/auth';
import clientService from '@/services/client';
import userService from '@/services/user';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

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

// ✅ ATUALIZADO: Dados do cliente
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
  { title: t('Negociação'), value: 'Negociação' }
];

const filteredVendedores = computed(() => {
  if (!clientData.value.coordenadorId) {
    return availableVendedores.value;
  }

  return availableVendedores.value.filter(vendedor =>
    vendedor.coordenadorId === clientData.value.coordenadorId
  );
});

const loadUsers = async () => {
  try {
    const users = await userService.getAllUsers();

    availableCoordenadores.value = users.filter(u => u.role === 'coordenador');
    availableVendedores.value = users.filter(u => u.role === 'vendedor');
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    showAlert('error', t('Erro ao carregar usuários'));
  }
};

const loadClients = async () => {
  try {
    isLoading.value = true;

    const data = await clientService.getAllClients();
    clients.value = data;
    filteredClients.value = [...clients.value];
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
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

//
const saveClient = async () => {
  try {
    isLoading.value = true;

    if (isEditMode.value) {
      const updatedClient = await clientService.updateClient(clientData.value.id, clientData.value);
      const index = clients.value.findIndex(c => c.id === clientData.value.id);
      if (index !== -1) {
        clients.value[index] = updatedClient;
      }
      showAlert('success', t('Cliente atualizado com sucesso'));
    } else {
      const newClient = await clientService.createClient(clientData.value);
      clients.value.push(newClient);
      showAlert('success', t('Cliente adicionado com sucesso'));
    }

    filterClients();
    closeClientDialog();
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    const errorMessage = error.response?.data || error.message;
    showAlert('error', errorMessage);
  } finally {
    isLoading.value = false;
  }
};

const confirmDeleteClient = (client) => {
  clientToDelete.value = client;
  deleteDialog.value = true;
};

// Excluir cliente usando backend
const deleteClient = async () => {
  try {
    isLoading.value = true;

    await clientService.deleteClient(clientToDelete.value.id);

    const index = clients.value.findIndex(c => c.id === clientToDelete.value.id);
    if (index !== -1) {
      clients.value.splice(index, 1);
    }

    showAlert('success', t('Cliente excluído com sucesso'));
    filterClients();

    deleteDialog.value = false;
    clientToDelete.value = null;
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    const errorMessage = error.response?.data || error.message;
    showAlert('error', errorMessage);
  } finally {
    isLoading.value = false;
  }
};

const getStatusColor = (status) => {
  const colors = {
    'Ativo': 'success',
    'Inativo': 'error',
    'Negociação': 'warning',
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

// Watch para limpar vendedor quando coordenador muda
watch(() => clientData.value.coordenadorId, (newCoordenadorId) => {
  // Se o vendedor atual não pertence ao novo coordenador, limpar
  if (clientData.value.vendedorId) {
    const vendedor = availableVendedores.value.find(v => v.id === clientData.value.vendedorId);
    if (!vendedor || vendedor.coordenadorId !== newCoordenadorId) {
      clientData.value.vendedorId = null;
    }
  }
});

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
