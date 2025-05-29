<script setup>
import { ref, onMounted, computed } from 'vue';
import userService from '@/services/user';
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
  role: ['user'] // Default role
});

// Erros de validação
const formErrors = ref({});

// Opções para o dropdown de papéis
const roles = [
  { title: t('Admin'), value: 'admin' },
  { title: t('Usuário'), value: 'user' }
];

// Headers da tabela
const headers = computed(() => [
  { title: t('Usuário'), key: 'username' },
  { title: t('Email'), key: 'email' },
  { title: t('Função'), key: 'role' },
  { title: t('Ações'), key: 'actions', sortable: false }
]);

// Carrega a lista de usuários
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
    role: user.admin ? ['admin'] : ['user']
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
    role: ['user']
  };
  formErrors.value = {};
};

// Validar formulário
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

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
};

// Salvar usuário (criar ou atualizar)
const saveUser = async () => {
  if (!validateForm()) return;

  try {
    isLoading.value = true;

    const userData = {
      username: userForm.value.username,
      email: userForm.value.email,
      role: userForm.value.role
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
    showAlert('error', t('Erro ao salvar usuário') + ': ' + (error.response?.data || error.message));
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
    showAlert('error', t('Erro ao excluir usuário') + ': ' + (error.response?.data || error.message));
  } finally {
    isLoading.value = false;
  }
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
    <VAlert
      v-if="alert.show"
      :type="alert.type"
      closable
      class="mx-4 mt-4"
      @click:close="alert.show = false"
    >
      {{ alert.message }}
    </VAlert>
    
    <!-- Tabela de usuários -->
    <VCardText>
      <VDataTable
        :headers="headers"
        :items="users"
        :loading="isLoading"
        class="elevation-1"
      >
        <!-- Template para a coluna role -->
        <template #item.role="{ item }">
          <VChip
            :color="item.admin ? 'primary' : 'success'"
            size="small"
            class="text-capitalize"
          >
            {{ item.admin ? $t('Admin') : $t('Usuário') }}
          </VChip>
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
    <VNavigationDrawer
      v-model="isUserDrawerOpen"
      temporary
      location="end"
      width="400"
      class="scrollable-content"
    >
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
            <VTextField
              v-model="userForm.username"
              :label="$t('Nome de usuário')"
              :error-messages="formErrors.username"
              class="mb-3"
              autofocus
              required
            />
            
            <!-- Email -->
            <VTextField
              v-model="userForm.email"
              :label="$t('Email')"
              type="email"
              :error-messages="formErrors.email"
              class="mb-3"
              required
            />
            
            <!-- Função/Papel -->
            <VSelect
              v-model="userForm.role"
              :items="roles"
              :label="$t('Função')"
              item-title="title"
              item-value="value"
              multiple
              class="mb-3"
              required
            />
            
            <!-- Senha -->
            <VTextField
              v-model="userForm.password"
              :label="isEditMode ? $t('Nova senha (opcional)') : $t('Senha')"
              type="password"
              :error-messages="formErrors.password"
              class="mb-3"
              :required="!isEditMode"
            />
            
            <!-- Confirmar senha -->
            <VTextField
              v-model="userForm.confirmPassword"
              :label="isEditMode ? $t('Confirmar nova senha') : $t('Confirmar senha')"
              type="password"
              :error-messages="formErrors.confirmPassword"
              class="mb-5"
              :required="!isEditMode || userForm.password"
            />
            
            <!-- Botões de ação -->
            <div class="d-flex gap-3">
              <VBtn
                type="submit"
                color="primary"
                :loading="isLoading"
                :disabled="isLoading"
              >
                {{ isEditMode ? $t('Atualizar') : $t('Salvar') }}
              </VBtn>
              
              <VBtn
                variant="outlined"
                color="secondary"
                @click="isUserDrawerOpen = false"
              >
                {{ $t('Cancelar') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VNavigationDrawer>
  </VCard>
</template>
