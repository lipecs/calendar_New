<!-- src/views/apps/user/admin/UserManagement.vue - CORRIGIDO COMPLETO COM POPUP -->
<script setup>
import authService from '@/services/auth';
import userService from '@/services/user';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Estados para controle de usuários e formulários
const users = ref([]);
const isLoading = ref(false);
const isUserDrawerOpen = ref(false);
const isEditMode = ref(false);
const currentUserId = ref(null);

// Estado de alerta para feedback
const alert = ref({
  show: false,
  type: 'success',
  message: ''
});

// Formulário de usuário
const userForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'vendedor',
  supervisorId: null,
  coordenadorId: null
});

// Erros de validação
const formErrors = ref({});

const roles = computed(() => {
  const currentUserLevel = authService.getHierarchyLevel();
  const allRoles = [
    { title: 'Admin', value: 'admin', level: 5 },
    { title: 'Diretor', value: 'diretor', level: 4 },
    { title: 'Supervisor', value: 'supervisor', level: 3 },
    { title: 'Coordenador', value: 'coordenador', level: 2 },
    { title: 'Vendedor', value: 'vendedor', level: 1 }
  ];

  return allRoles.filter(role => role.level <= currentUserLevel);
});

const supervisors = computed(() => {
  return users.value.filter(user =>
    user.role === 'supervisor' || user.role === 'diretor' || user.role === 'admin'
  );
});

const coordenadores = computed(() => {
  return users.value.filter(user => user.role === 'coordenador');
});

// Headers da tabela
const headers = computed(() => [
  { title: t('User'), key: 'username' },
  { title: t('Email'), key: 'email' },
  { title: t('role'), key: 'role' },
  { title: t('Supervisor'), key: 'supervisor' },
  { title: t('coordinator'), key: 'coordenador' },
  { title: t('actions'), key: 'actions', sortable: false }
]);

const fetchUsers = async () => {
  try {
    console.log('🔄 Carregando usuários...');
    isLoading.value = true;

    if (!authService.isAuthenticated()) {
      throw new Error('Usuário não autenticado');
    }

    const data = await userService.getAllUsers();
    console.log('✅ Usuários carregados:', data?.length || 0);
    users.value = data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);

    let errorMessage = 'Erro desconhecido';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data) {
      errorMessage = typeof error.response.data === 'string'
        ? error.response.data
        : error.response.data.message || 'Erro no servidor';
    }

    showAlert('error', t('Erro ao carregar usuários') + ': ' + errorMessage);
  } finally {
    isLoading.value = false;
  }
};

const openAddUserDrawer = () => {
  console.log('➕ Abrindo popup para adicionar usuário');
  isEditMode.value = false;
  resetForm();
  isUserDrawerOpen.value = true;
};

const openEditUserDrawer = (user) => {
  console.log('✏️ Abrindo popup para editar usuário:', user.username);
  isEditMode.value = true;
  currentUserId.value = user.id;

  userForm.value = {
    username: user.username,
    email: user.email,
    password: '',
    confirmPassword: '',
    role: user.role,
    supervisorId: user.supervisorId || null,
    coordenadorId: user.coordenadorId || null
  };

  isUserDrawerOpen.value = true;
};

// Resetar formulário
const resetForm = () => {
  console.log('🔄 Resetando formulário');
  userForm.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'vendedor',
    supervisorId: null,
    coordenadorId: null
  };
  formErrors.value = {};
};

const validateForm = () => {
  console.log('🔍 Validando formulário:', userForm.value);
  const errors = {};

  if (!userForm.value.username.trim()) {
    errors.username = t('O nome de usuário é obrigatório');
  }

  if (!userForm.value.email.trim()) {
    errors.email = t('O email é obrigatório');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.value.email)) {
    errors.email = t('Email deve ter um formato válido');
  }

  if (!isEditMode.value && !userForm.value.password.trim()) {
    errors.password = t('A senha é obrigatória');
  }

  if (userForm.value.password && userForm.value.password.length < 6) {
    errors.password = t('A senha deve ter pelo menos 6 caracteres');
  }

  if (userForm.value.password !== userForm.value.confirmPassword) {
    errors.confirmPassword = t('As senhas não coincidem');
  }

  if (!userForm.value.role.trim()) {
    errors.role = t('A função é obrigatória');
  }

  // Validação de hierarquia
  if (['coordenador', 'vendedor'].includes(userForm.value.role) && !userForm.value.supervisorId) {
    errors.supervisorId = t('Um supervisor é obrigatório para esta função');
  }

  if (userForm.value.role === 'vendedor' && !userForm.value.coordenadorId) {
    errors.coordenadorId = t('Um coordenador é obrigatório para vendedores');
  }

  formErrors.value = errors;
  console.log('🔍 Erros de validação:', errors);
  return Object.keys(errors).length === 0;
};

const saveUser = async () => {
  console.log('💾 Salvando usuário...');

  if (!validateForm()) {
    console.log('❌ Validação falhou');
    return;
  }

  try {
    isLoading.value = true;

    // Preparar dados do usuário
    const userData = {
      username: userForm.value.username.trim(),
      email: userForm.value.email.trim(),
      role: userForm.value.role.trim(),
      supervisorId: userForm.value.supervisorId,
      coordenadorId: userForm.value.coordenadorId
    };

    // Adicionar senha apenas se fornecida
    if (userForm.value.password.trim()) {
      userData.password = userForm.value.password.trim();
    }

    console.log('📤 Dados do usuário sendo enviados:', {
      ...userData,
      password: userData.password ? '[OCULTA]' : 'NÃO FORNECIDA'
    });

    if (isEditMode.value) {
      console.log('✏️ Atualizando usuário ID:', currentUserId.value);
      await userService.updateUser(currentUserId.value, userData);
      showAlert('success', t('Usuário atualizado com sucesso!'));
    } else {
      console.log('➕ Criando novo usuário');
      const result = await userService.createUser(userData);
      console.log('✅ Usuário criado com sucesso:', result);
      showAlert('success', t('Usuário criado com sucesso!'));
    }

    isUserDrawerOpen.value = false;
    resetForm();
    fetchUsers();

  } catch (error) {
    console.error('❌ Erro ao salvar usuário:', {
      error,
      response: error.response,
      data: error.response?.data,
      status: error.response?.status
    });

    let errorMessage = 'Erro desconhecido';

    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else {
        errorMessage = 'Erro no servidor';
      }
    }

    console.error('📢 Mostrando erro para usuário:', errorMessage);
    showAlert('error', t('Erro ao salvar usuário') + ': ' + errorMessage);
  } finally {
    isLoading.value = false;
  }
};

// Excluir usuário
const deleteUser = async (userId) => {
  if (!confirm(t('Tem certeza que deseja excluir este usuário?'))) return;

  try {
    console.log('🗑️ Excluindo usuário ID:', userId);
    isLoading.value = true;
    await userService.deleteUser(userId);
    showAlert('success', t('Usuário excluído com sucesso!'));
    fetchUsers();
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);

    let errorMessage = 'Erro desconhecido';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data) {
      errorMessage = typeof error.response.data === 'string'
        ? error.response.data
        : error.response.data.error || error.response.data.message || 'Erro no servidor';
    }

    showAlert('error', t('Erro ao excluir usuário') + ': ' + errorMessage);
  } finally {
    isLoading.value = false;
  }
};

const getSupervisorName = (user) => {
  if (!user.supervisorId) return t('-');
  const supervisor = users.value.find(u => u.id === user.supervisorId);
  return supervisor ? supervisor.username : t('Não encontrado');
};

const getCoordenadorName = (user) => {
  if (!user.coordenadorId) return t('-');
  const coordenador = users.value.find(u => u.id === user.coordenadorId);
  return coordenador ? coordenador.username : t('Não encontrado');
};

const getRoleColor = (role) => {
  const colors = {
    'admin': 'error',
    'diretor': 'purple',
    'supervisor': 'primary',
    'coordenador': 'info',
    'vendedor': 'success',
    'user': 'secondary'
  };
  return colors[role] || 'secondary';
};

const showAlert = (type, message) => {
  console.log(`Alerta ${type}:`, message);
  alert.value = {
    show: true,
    type,
    message
  };

  setTimeout(() => {
    alert.value.show = false;
  }, 5000);
};

watch(() => userForm.value.role, (newRole, oldRole) => {
  console.log('Role mudou de', oldRole, 'para', newRole);

  if (['supervisor', 'diretor', 'admin'].includes(newRole)) {
    console.log('🧹 Limpando supervisor e coordenador para papel superior');
    userForm.value.supervisorId = null;
    userForm.value.coordenadorId = null;
  } else if (newRole === 'coordenador') {
    console.log('🧹 Limpando coordenador para papel de coordenador');
    userForm.value.coordenadorId = null;
  }
});

onMounted(() => {
  console.log('🚀 Componente montado, carregando usuários...');
  fetchUsers();
});
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex justify-space-between align-center flex-wrap">
      {{ $t('user_management_description') }}
      <VBtn color="primary" prepend-icon="ri-user-add-line" @click="openAddUserDrawer">
        {{ $t('Adicionar Usuário') }}
      </VBtn>
    </VCardTitle>

    <VDivider />

    <!-- Alerta de mensagem -->
    <VAlert v-if="alert.show" :type="alert.type" closable class="mx-4 mt-4" @click:close="alert.show = false">
      {{ alert.message }}
    </VAlert>

    <!-- Tabela de usuários -->
    <VCardText>
      <VDataTable :headers="headers" :items="users" :loading="isLoading" class="elevation-1">
        <!-- Template para a coluna role -->
        <template #item.role="{ item }">
          <VChip :color="getRoleColor(item.role)" size="small" class="text-capitalize">
            {{ item.role }}
          </VChip>
        </template>

        <template #item.supervisor="{ item }">
          <span class="text-sm">{{ getSupervisorName(item) }}</span>
        </template>

        <template #item.coordenador="{ item }">
          <span class="text-sm">{{ getCoordenadorName(item) }}</span>
        </template>

        <!-- Template para a coluna de ações -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-2">
            <IconBtn @click="openEditUserDrawer(item)">
              <VIcon icon="ri-edit-box-line" />
            </IconBtn>

            <IconBtn color="error" @click="deleteUser(item.id)">
              <VIcon icon="ri-delete-bin-7-line" />
            </IconBtn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-4">
            <VIcon icon="ri-user-line" size="48" class="mb-2 text-disabled" />
            <p class="text-disabled">{{ $t('Nenhum usuário encontrado') }}</p>
          </div>
        </template>
      </VDataTable>
    </VCardText>

    <!-- POPUP/DIALOG para adicionar/editar usuário -->
    <VDialog v-model="isUserDrawerOpen" max-width="600px" persistent scrollable>
      <VCard>
        <VCardTitle class="pa-6">
          <div class="d-flex align-center justify-between">
            <h3>{{ isEditMode ? $t('Editar Usuário') : $t('Adicionar Usuário') }}</h3>
            <IconBtn @click="isUserDrawerOpen = false">
              <VIcon icon="ri-close-line" />
            </IconBtn>
          </div>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <VForm @submit.prevent="saveUser">
            <!-- Nome de usuário -->
            <VTextField v-model="userForm.username" :label="$t('Nome de usuário')" :error-messages="formErrors.username"
              class="mb-3" autofocus required />

            <!-- Email -->
            <VTextField v-model="userForm.email" :label="$t('Email')" type="email" :error-messages="formErrors.email"
              class="mb-3" required />

            <!-- Função/Papel -->
            <VSelect v-model="userForm.role" :items="roles" :label="$t('Função')" item-title="title" item-value="value"
              class="mb-3" :error-messages="formErrors.role" required />

            <!-- Supervisor (condicionalmente visível) -->
            <VSelect v-if="['coordenador', 'vendedor'].includes(userForm.role)" v-model="userForm.supervisorId"
              :items="supervisors" :label="$t('Supervisor Responsável')" item-title="username" item-value="id"
              class="mb-3" :error-messages="formErrors.supervisorId" clearable
              :required="['coordenador', 'vendedor'].includes(userForm.role)" />

            <!-- Coordenador (apenas para vendedores) -->
            <VSelect v-if="userForm.role === 'vendedor'" v-model="userForm.coordenadorId" :items="coordenadores"
              :label="$t('Coordenador Responsável')" item-title="username" item-value="id" class="mb-3"
              :error-messages="formErrors.coordenadorId" clearable required />

            <!-- Senha -->
            <VTextField v-model="userForm.password" :label="isEditMode ? $t('Nova senha (opcional)') : $t('Senha')"
              type="password" :error-messages="formErrors.password" class="mb-3" :required="!isEditMode" />

            <!-- Confirmar senha -->
            <VTextField v-model="userForm.confirmPassword"
              :label="isEditMode ? $t('Confirmar nova senha') : $t('Confirmar senha')" type="password"
              :error-messages="formErrors.confirmPassword" class="mb-5" :required="!isEditMode || userForm.password" />
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-6">
          <VSpacer />

          <VBtn variant="outlined" color="secondary" @click="isUserDrawerOpen = false">
            {{ $t('Cancelar') }}
          </VBtn>

          <VBtn color="primary" :loading="isLoading" :disabled="isLoading" @click="saveUser">
            {{ isEditMode ? $t('Atualizar') : $t('Salvar') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>

<style scoped>
.scrollable-content {
  overflow-y: auto;
}
</style>
