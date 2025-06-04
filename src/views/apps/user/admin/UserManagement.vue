<!-- src/views/apps/user/admin/UserManagement.vue - CORRIGIDO -->
<script setup>
import authService from '@/services/auth';
import userService from '@/services/user';
import { computed, onMounted, ref } from 'vue';
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

// ✅ CORRIGIDO: Opções de papéis baseadas na hierarquia do usuário atual
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

// ✅ CORRIGIDO: Lista de supervisores
const supervisors = computed(() => {
  return users.value.filter(user =>
    user.role === 'supervisor' || user.role === 'diretor' || user.role === 'admin'
  );
});

// ✅ CORRIGIDO: Lista de coordenadores
const coordenadores = computed(() => {
  return users.value.filter(user => user.role === 'coordenador');
});

// Headers da tabela
const headers = computed(() => [
  { title: t('Usuário'), key: 'username' },
  { title: t('Email'), key: 'email' },
  { title: t('Função'), key: 'role' },
  { title: t('Supervisor'), key: 'supervisor' },
  { title: t('Coordenador'), key: 'coordenador' },
  { title: t('Ações'), key: 'actions', sortable: false }
]);

// ✅ CORRIGIDO: Carrega usuários
const fetchUsers = async () => {
  try {
    isLoading.value = true;
    const data = await userService.getAllUsers();
    users.value = data;
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    showAlert('error', t('Erro ao carregar usuários') + ': ' + (error.response?.data?.message || error.message));
  } finally {
    isLoading.value = false;
  }
};

// Abrir o drawer para adicionar novo usuário
const openAddUserDrawer = () => {
  isEditMode.value = false;
  resetForm();
  isUserDrawerOpen.value = true;
};

// Abrir o drawer para editar usuário existente
const openEditUserDrawer = (user) => {
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

// ✅ CORRIGIDO: Validação com novos campos
const validateForm = () => {
  const errors = {};

  if (!userForm.value.username.trim()) {
    errors.username = t('O nome de usuário é obrigatório');
  }

  if (!userForm.value.email.trim()) {
    errors.email = t('O email é obrigatório');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.value.email)) {
    errors.email = t('Por favor, insira um email válido');
  }

  if (!isEditMode.value) {
    if (!userForm.value.password) {
      errors.password = t('A senha é obrigatória');
    } else if (userForm.value.password.length < 6) {
      errors.password = t('A senha deve ter pelo menos 6 caracteres');
    }

    if (userForm.value.password !== userForm.value.confirmPassword) {
      errors.confirmPassword = t('As senhas não coincidem');
    }
  } else if (userForm.value.password && userForm.value.password !== userForm.value.confirmPassword) {
    errors.confirmPassword = t('As senhas não coincidem');
  }

  // ✅ NOVO: Validações hierárquicas
  if (userForm.value.role === 'vendedor') {
    if (!userForm.value.coordenadorId) {
      errors.coordenadorId = t('Vendedor deve ter um coordenador');
    }
    if (!userForm.value.supervisorId) {
      errors.supervisorId = t('Vendedor deve ter um supervisor');
    }
  }

  if (userForm.value.role === 'coordenador') {
    if (!userForm.value.supervisorId) {
      errors.supervisorId = t('Coordenador deve ter um supervisor');
    }
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
};

// ✅ CORRIGIDO: Salvar usuário
const saveUser = async () => {
  if (!validateForm()) return;

  try {
    isLoading.value = true;

    const userData = {
      username: userForm.value.username,
      email: userForm.value.email,
      role: userForm.value.role,
      supervisorId: userForm.value.supervisorId,
      coordenadorId: userForm.value.coordenadorId
    };

    if (userForm.value.password) {
      userData.password = userForm.value.password;
    }

    if (isEditMode.value) {
      await userService.updateUser(currentUserId.value, userData);
      showAlert('success', t('Usuário atualizado com sucesso!'));
    } else {
      await userService.createUser(userData);
      showAlert('success', t('Usuário criado com sucesso!'));
    }

    isUserDrawerOpen.value = false;
    resetForm();
    fetchUsers();
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    const errorMessage = error.response?.data || error.message;
    showAlert('error', t('Erro ao salvar usuário') + ': ' + errorMessage);
  } finally {
    isLoading.value = false;
  }
};

// Excluir usuário
const deleteUser = async (userId) => {
  if (!confirm(t('Tem certeza que deseja excluir este usuário?'))) return;

  try {
    isLoading.value = true;
    await userService.deleteUser(userId);
    showAlert('success', t('Usuário excluído com sucesso!'));
    fetchUsers();
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    const errorMessage = error.response?.data || error.message;
    showAlert('error', t('Erro ao excluir usuário') + ': ' + errorMessage);
  } finally {
    isLoading.value = false;
  }
};

// ✅ CORRIGIDO: Obter nome do supervisor
const getSupervisorName = (user) => {
  if (!user.supervisorId) return t('Não atribuído');
  const supervisor = users.value.find(u => u.id === user.supervisorId);
  return supervisor ? supervisor.username : t('Não encontrado');
};

// ✅ CORRIGIDO: Obter nome do coordenador
const getCoordenadorName = (user) => {
  if (!user.coordenadorId) return t('Não atribuído');
  const coordenador = users.value.find(u => u.id === user.coordenadorId);
  return coordenador ? coordenador.username : t('Não encontrado');
};

// ✅ NOVO: Cores dos papéis
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

// Mostrar alerta
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

// Watch para limpar coordenador quando role muda
watch(() => userForm.value.role, (newRole) => {
  if (['supervisor', 'diretor', 'admin'].includes(newRole)) {
    userForm.value.supervisorId = null;
    userForm.value.coordenadorId = null;
  } else if (newRole === 'coordenador') {
    userForm.value.coordenadorId = null;
  }
});

// Carregar usuários ao montar o componente
onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex justify-space-between align-center flex-wrap">
      {{ $t('Gerenciamento de Usuários') }}
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

        <!-- ✅ CORRIGIDO: Template para supervisor -->
        <template #item.supervisor="{ item }">
          <span class="text-sm">{{ getSupervisorName(item) }}</span>
        </template>

        <!-- ✅ CORRIGIDO: Template para coordenador -->
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
      </VDataTable>
    </VCardText>

    <!-- Drawer para adicionar/editar usuário -->
    <VNavigationDrawer v-model="isUserDrawerOpen" temporary location="end" width="500" class="scrollable-content">
      <VToolbar color="primary">
        <VToolbarTitle>{{ isEditMode ? $t('Editar Usuário') : $t('Adicionar Usuário') }}</VToolbarTitle>
        <template #append>
          <IconBtn @click="isUserDrawerOpen = false">
            <VIcon icon="ri-close-line" />
          </IconBtn>
        </template>
      </VToolbar>

      <VDivider />

      <VCard flat>
        <VCardText>
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

            <!-- ✅ CORRIGIDO: Supervisor (condicionalmente visível) -->
            <VSelect v-if="['coordenador', 'vendedor'].includes(userForm.role)" v-model="userForm.supervisorId"
              :items="supervisors" :label="$t('Supervisor Responsável')" item-title="username" item-value="id"
              class="mb-3" :error-messages="formErrors.supervisorId" clearable
              :required="['coordenador', 'vendedor'].includes(userForm.role)" />

            <!-- ✅ CORRIGIDO: Coordenador (apenas para vendedores) -->
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

            <!-- Botões de ação -->
            <div class="d-flex gap-3">
              <VBtn type="submit" color="primary" :loading="isLoading" :disabled="isLoading">
                {{ isEditMode ? $t('Atualizar') : $t('Salvar') }}
              </VBtn>

              <VBtn variant="outlined" color="secondary" @click="isUserDrawerOpen = false">
                {{ $t('Cancelar') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VNavigationDrawer>
  </VCard>
</template>
