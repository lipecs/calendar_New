<script setup>
import authService from '@/services/auth';
import UserManagement from '@/views/apps/user/admin/UserManagement.vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

// ✅ CORREÇÃO: Definir página com metadados corretos
definePage({
  meta: {
    pageTitle: 'Gerenciamento de Usuários',
    breadcrumb: [
      {
        title: 'Home',
        to: '/'
      },
      {
        title: 'Admin',
        to: '/admin'
      },
      {
        title: 'Usuários',
        active: true
      }
    ],
    adminRequired: true,
    action: 'manage',
    subject: 'Users'
  }
});

const router = useRouter();
const isLoading = ref(true);
const hasError = ref(false);
const errorMessage = ref('');

// ✅ CORRIGIDO: Verificar autenticação e permissões com logs detalhados
onMounted(async () => {
  try {
    console.log('🚀 Página admin/users sendo carregada...');
    isLoading.value = true;
    hasError.value = false;

    // Verificar autenticação
    if (!authService.isAuthenticated()) {
      console.log('❌ Usuário não autenticado, redirecionando para login');
      router.push('/login');
      return;
    }

    const currentUser = authService.getCurrentUser();
    console.log('✅ Usuário autenticado:', currentUser?.userData?.username, 'Role:', currentUser?.userData?.role);

    // Verificar se é admin ou diretor
    if (!authService.isAdmin() && !authService.isDiretor()) {
      console.log('❌ Usuário sem permissão de admin, redirecionando');
      errorMessage.value = 'Você não tem permissão para acessar esta página';
      hasError.value = true;

      // Aguardar um pouco antes de redirecionar para mostrar a mensagem
      setTimeout(() => {
        router.push('/not-authorized');
      }, 2000);
      return;
    }

    console.log('✅ Usuário tem permissão de admin');
    isLoading.value = false;

  } catch (error) {
    console.error('❌ Erro ao verificar permissões:', error);
    errorMessage.value = 'Erro ao verificar permissões: ' + error.message;
    hasError.value = true;
    isLoading.value = false;
  }
});
</script>

<template>
  <VContainer fluid>
    <!-- Estado de carregamento -->
    <VRow v-if="isLoading">
      <VCol cols="12" class="d-flex justify-center align-center" style="height: 400px;">
        <div class="text-center">
          <VProgressCircular indeterminate size="64" color="primary" />
          <p class="mt-4 text-body-1">{{ $t('Verificando permissões...') }}</p>
        </div>
      </VCol>
    </VRow>

    <!-- Estado de erro -->
    <VRow v-else-if="hasError">
      <VCol cols="12" class="d-flex justify-center align-center" style="height: 400px;">
        <VCard max-width="500" class="text-center pa-6">
          <VIcon icon="ri-error-warning-line" size="64" color="error" class="mb-4" />
          <h3 class="text-h5 mb-4">{{ $t('Acesso Negado') }}</h3>
          <p class="text-body-1 mb-4">{{ errorMessage }}</p>
          <VBtn color="primary" @click="router.push('/')">
            {{ $t('Voltar ao Início') }}
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <!-- Conteúdo principal -->
    <template v-else>
      <VRow>
        <VCol cols="12">
          <div class="d-flex align-center justify-space-between mb-6">
            <div>
              <h2 class="text-h4 mb-2">{{ $t('Gerenciamento de Usuários') }}</h2>
              <p class="text-body-1">
                {{ $t('Gerencie os usuários do sistema, atribuindo funções e permissões adequadas.') }}
              </p>
            </div>
            <VChip color="success" variant="tonal">
              <VIcon start icon="ri-shield-check-line" />
              {{ $t('Área Administrativa') }}
            </VChip>
          </div>
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12">
          <!-- ✅ CORREÇÃO: Verificar se o componente existe antes de renderizar -->
          <Suspense>
            <template #default>
              <UserManagement />
            </template>
            <template #fallback>
              <VCard>
                <VCardText class="text-center py-8">
                  <VProgressCircular indeterminate size="48" color="primary" />
                  <p class="mt-4">{{ $t('Carregando gerenciamento de usuários...') }}</p>
                </VCardText>
              </VCard>
            </template>
          </Suspense>
        </VCol>
      </VRow>
    </template>
  </VContainer>
</template>

<style scoped>
.scrollable-content {
  overflow-y: auto;
}
</style>
