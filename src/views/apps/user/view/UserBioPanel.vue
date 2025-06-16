<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import authService from '@/services/auth';
import userService from '@/services/user';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  userData: {
    type: Object,
    required: false, // Tornar opcional já que vamos usar dados reais
  },
})

const standardPlan = {
  plan: 'Standard',
  price: 99,
  benefits: [
    '10 Users',
    'Up to 10GB storage',
    'Basic Support',
  ],
}

const isUserInfoEditDialogVisible = ref(false)
const isUpgradePlanDialogVisible = ref(false)

// Estados para edição de perfil
const isEditProfileDialogVisible = ref(false)
const isLoading = ref(false)
const isLoadingProfile = ref(true)
const alert = ref({
  show: false,
  type: 'success',
  message: ''
})

// Dados reais do perfil do usuário
const userProfile = ref({
  id: null,
  username: '',
  email: '',
  role: 'user',
  admin: false,
  fullName: '',
  avatar: null,
  taskDone: 0,
  projectDone: 0,
  status: 'active',
  taxId: '',
  // contact: '',
  language: 'Portuguese',
  country: 'Brazil'
})

// Formulário de edição de perfil
const profileForm = ref({
  username: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Erros de validação
const formErrors = ref({})

// Obter dados do usuário atual
const currentUser = computed(() => {
  const user = authService.getCurrentUser();
  return user?.userData || null;
})

// Carregar perfil completo do usuário
const loadUserProfile = async () => {
  try {
    isLoadingProfile.value = true

    // Obter dados básicos do localStorage
    const user = authService.getCurrentUser();
    if (user && user.userData) {
      // Tentar buscar dados atualizados do backend
      try {
        const profileData = await userService.getCurrentProfile();

        userProfile.value = {
          id: profileData.id,
          username: profileData.username,
          email: profileData.email,
          role: profileData.admin ? 'admin' : 'user',
          admin: profileData.admin,
          fullName: profileData.username, // Usar username como fullName se não tiver
          avatar: null, // Por enquanto sem avatar
          taskDone: 1230, // Dados mockados por enquanto
          projectDone: 568, // Dados mockados por enquanto
          status: 'active',
          taxId: 'Tax-' + profileData.id,
          // contact: '+55 (11) 99999-9999', // Mockado
          language: 'Portuguese',
          country: 'Brazil'
        }
      } catch (error) {
        console.warn('Erro ao carregar perfil do backend, usando dados locais:', error)

        // Fallback para dados locais
        userProfile.value = {
          id: user.userData.id,
          username: user.userData.username,
          email: user.userData.email,
          role: user.userData.role === 'admin' ? 'admin' : 'user',
          admin: user.userData.role === 'admin',
          fullName: user.userData.username,
          avatar: null,
          taskDone: 1230,
          projectDone: 568,
          status: 'active',
          taxId: 'Tax-' + user.userData.id,
          // contact: '+55 (11) 99999-9999',
          language: 'Portuguese',
          country: 'Brazil'
        }
      }
    }
  } catch (error) {
    console.error('Erro ao carregar perfil:', error)
    showAlert('error', t('Erro ao carregar dados do perfil'))
  } finally {
    isLoadingProfile.value = false
  }
}

const resolveUserStatusVariant = stat => {
  if (stat === 'pending') return 'warning'
  if (stat === 'active') return 'success'
  if (stat === 'inactive') return 'secondary'
  return 'primary'
}

const resolveUserRoleVariant = role => {
  if (role === 'subscriber') return { color: 'primary', icon: 'ri-user-line' }
  if (role === 'author') return { color: 'warning', icon: 'ri-settings-2-line' }
  if (role === 'maintainer') return { color: 'success', icon: 'ri-database-2-line' }
  if (role === 'editor') return { color: 'info', icon: 'ri-pencil-line' }
  if (role === 'admin') return { color: 'error', icon: 'ri-server-line' }
  return { color: 'primary', icon: 'ri-user-line' }
}

// Abrir diálogo de edição de perfil
const openEditProfileDialog = () => {
  if (userProfile.value) {
    profileForm.value = {
      username: userProfile.value.username || '',
      email: userProfile.value.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    formErrors.value = {}
    isEditProfileDialogVisible.value = true
  }
}

// Validar formulário
const validateForm = () => {
  const errors = {}

  if (!profileForm.value.username.trim()) {
    errors.username = t('O nome de usuário é obrigatório')
  }

  if (!profileForm.value.email.trim()) {
    errors.email = t('O email é obrigatório')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.value.email)) {
    errors.email = t('Por favor, insira um email válido')
  }

  // Se preencheu nova senha, validar
  if (profileForm.value.newPassword) {
    if (profileForm.value.newPassword.length < 6) {
      errors.newPassword = t('A senha deve ter pelo menos 6 caracteres')
    }

    if (profileForm.value.newPassword !== profileForm.value.confirmPassword) {
      errors.confirmPassword = t('As senhas não coincidem')
    }

    if (!profileForm.value.currentPassword) {
      errors.currentPassword = t('Senha atual é obrigatória para alterar a senha')
    }
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// Salvar alterações do perfil
const saveProfile = async () => {
  if (!validateForm()) return

  try {
    isLoading.value = true

    // Atualizar perfil através do serviço
    await userService.updateProfile({
      username: profileForm.value.username,
      email: profileForm.value.email,
      password: profileForm.value.newPassword,
      currentPassword: profileForm.value.currentPassword
    })

    const user = authService.getCurrentUser()
    if (user && user.userData) {
      user.userData.username = profileForm.value.username
      user.userData.email = profileForm.value.email
      localStorage.setItem('user', JSON.stringify(user))
    }

    // Atualizar dados locais do perfil
    userProfile.value.username = profileForm.value.username
    userProfile.value.email = profileForm.value.email
    userProfile.value.fullName = profileForm.value.username

    showAlert('success', t('Perfil atualizado com sucesso!'))
    isEditProfileDialogVisible.value = false

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    showAlert('error', t('Erro ao atualizar perfil') + ': ' + (error.response?.data || error.message))
  } finally {
    isLoading.value = false
  }
}

// Mostrar alerta
const showAlert = (type, message) => {
  alert.value = {
    show: true,
    type,
    message
  }

  setTimeout(() => {
    alert.value.show = false
  }, 5000)
}

// Resetar formulário
const resetForm = () => {
  profileForm.value = {
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  formErrors.value = {}
}

// Helper para avatar text
const avatarText = (name) => {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

// Helper para formatter
const kFormatter = (num) => {
  return Math.abs(num) > 999 ? Math.sign(num) * ((Math.abs(num) / 1000).toFixed(1)) + 'k' : Math.sign(num) * Math.abs(num)
}

onMounted(() => {
  loadUserProfile()
})

// Watch para recarregar quando o usuário mudar
watch(() => currentUser.value, () => {
  if (currentUser.value) {
    loadUserProfile()
  }
}, { deep: true })
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VAlert v-if="alert.show" :type="alert.type" closable class="mb-4" @click:close="alert.show = false">
        {{ alert.message }}
      </VAlert>

      <!-- Loading do perfil -->
      <VCard v-if="isLoadingProfile" class="text-center pa-8">
        <VProgressCircular indeterminate color="primary" size="64" />
        <p class="mt-4">{{ $t('Carregando perfil...') }}</p>
      </VCard>

      <!-- Perfil do usuário -->
      <VCard v-else-if="userProfile.id">
        <VCardText class="text-center pt-12 pb-6">
          <VAvatar rounded :size="120" :color="!userProfile.avatar ? 'primary' : undefined"
            :variant="!userProfile.avatar ? 'tonal' : undefined">
            <VImg v-if="userProfile.avatar" :src="userProfile.avatar" />
            <span v-else class="text-5xl font-weight-medium">
              {{ avatarText(userProfile.fullName) }}
            </span>
          </VAvatar>

          <h5 class="text-h5 mt-4">
            {{ userProfile.fullName || userProfile.username }}
          </h5>

          <VChip :color="resolveUserRoleVariant(userProfile.role).color" size="small" class="text-capitalize mt-4">
            {{ userProfile.role }}
          </VChip>
        </VCardText>

        <VCardText class="d-flex justify-center flex-wrap gap-6 pb-6">
          <div class="d-flex align-center me-8">
            <VAvatar :size="40" rounded color="primary" variant="tonal" class="me-4">
              <VIcon size="24" icon="ri-check-line" />
            </VAvatar>
            <div>
              <h6 class="text-h5">
                {{ kFormatter(userProfile.taskDone) }}
              </h6>
              <span>{{ $t('taskDone') }}</span>
            </div>
          </div>

          <div class="d-flex align-center me-4">
            <VAvatar :size="44" rounded color="primary" variant="tonal" class="me-3">
              <VIcon size="24" icon="ri-briefcase-4-line" />
            </VAvatar>
            <div>
              <h6 class="text-h6">
                {{ kFormatter(userProfile.projectDone) }}
              </h6>
              <span>{{ $t('projectDone') }}</span>
            </div>
          </div>
        </VCardText>

        <VCardText class="pb-6">
          <h5 class="text-h5">{{ $t('details') }}</h5>
          <VDivider class="my-4" />

          <VList class="card-list">
            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('username') }}:</span>
                <span class="text-body-1">@{{ userProfile.username }}</span>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('billingEmail') }}:</span>
                <span class="text-body-1">{{ userProfile.email }}</span>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('status') }}:</span>
                <VChip size="small" :color="resolveUserStatusVariant(userProfile.status)" class="text-capitalize">
                  {{ userProfile.status }}
                </VChip>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('role') }}:</span>
                <span class="text-capitalize text-body-1">{{ userProfile.role }}</span>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('taxId') }}:</span>
                <span class="text-body-1">{{ userProfile.taxId }}</span>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('contact') }}:</span>
                <span class="text-body-1">{{ userProfile.contact }}</span>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('language') }}:</span>
                <span class="text-body-1">{{ userProfile.language }}</span>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle class="text-sm">
                <span class="font-weight-medium">{{ $t('country') }}:</span>
                <span class="text-body-1">{{ userProfile.country }}</span>
              </VListItemTitle>
            </VListItem>
          </VList>
        </VCardText>

        <VCardText class="d-flex justify-center">
          <VBtn variant="elevated" class="me-4" @click="openEditProfileDialog">
            {{ $t('Editar Perfil') }}
          </VBtn>
          <VBtn variant="outlined" color="error" disabled>
            {{ $t('suspend') }}
          </VBtn>
        </VCardText>
      </VCard>

      <VCard v-else class="text-center pa-8">
        <VIcon icon="ri-error-warning-line" size="64" color="error" class="mb-4" />
        <h5 class="text-h5 mb-2">{{ $t('Erro ao carregar perfil') }}</h5>
        <p class="text-body-1 mb-4">{{ $t('Não foi possível carregar os dados do perfil.') }}</p>
        <VBtn color="primary" @click="loadUserProfile">
          {{ $t('Tentar novamente') }}
        </VBtn>
      </VCard>
    </VCol>
  </VRow>

  <VDialog v-model="isEditProfileDialogVisible" max-width="500px" persistent>
    <VCard>
      <VCardTitle class="text-h5 pa-6">
        {{ $t('Editar Perfil') }}
      </VCardTitle>

      <VDivider />

      <VCardText class="pa-6">
        <VForm @submit.prevent="saveProfile">
          <!-- Nome de usuário -->
          <VTextField v-model="profileForm.username" :label="$t('Nome de usuário')"
            :error-messages="formErrors.username" class="mb-4" autofocus required />

          
          <VTextField v-model="profileForm.email" :label="$t('Email')" type="email" :error-messages="formErrors.email"
            class="mb-4" required />

          <VDivider class="my-6" />

          <p class="text-subtitle-2 mb-4">{{ $t('Alterar Senha (opcional)') }}</p>

          
          <VTextField v-model="profileForm.currentPassword" :label="$t('Senha atual')" type="password"
            :error-messages="formErrors.currentPassword" class="mb-4" placeholder="Digite sua senha atual" />

          
          <VTextField v-model="profileForm.newPassword" :label="$t('Nova senha')" type="password"
            :error-messages="formErrors.newPassword" class="mb-4" placeholder="Digite a nova senha" />

          
          <VTextField v-model="profileForm.confirmPassword" :label="$t('Confirmar nova senha')" type="password"
            :error-messages="formErrors.confirmPassword" class="mb-4" placeholder="Confirme a nova senha" />
        </VForm>
      </VCardText>

      <VCardActions class="pa-6">
        <VSpacer />
        <VBtn variant="outlined" color="secondary" @click="isEditProfileDialogVisible = false">
          {{ $t('Cancelar') }}
        </VBtn>

        <VBtn color="primary" :loading="isLoading" :disabled="isLoading" @click="saveProfile">
          {{ $t('Salvar') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <UserInfoEditDialog v-if="false" v-model:isDialogVisible="isUserInfoEditDialogVisible" :user-data="userProfile" />
  <UserUpgradePlanDialog v-if="false" v-model:isDialogVisible="isUpgradePlanDialogVisible" />
</template>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 0.5rem;
}

.current-plan {
  border: 2px solid rgb(var(--v-theme-primary));
}

.text-capitalize {
  text-transform: capitalize !important;
}
</style>
