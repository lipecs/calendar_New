<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import authService from '@/services/auth';
import { updateAbility } from '@/plugins/casl/ability';

const props = defineProps({
  onSuccess: Function
});

const router = useRouter();
const isLoading = ref(false);
const error = ref('');
const credentials = ref({
  email: '',
  password: ''
});
const rememberMe = ref(false);
const isPasswordVisible = ref(false);

const login = async () => {
  try {
    error.value = '';
    isLoading.value = true;
    
    const response = await authService.login(
      credentials.value.email, 
      credentials.value.password
    );
    
    // Atualizar abilities após login bem-sucedido
    updateAbility();
    
    // Se fornecido, chama o callback de sucesso
    if (props.onSuccess) {
      props.onSuccess(response);
    } else {
      // Redireciona para o calendário após login bem-sucedido
      router.push('/apps/calendar');
    }
  } catch (err) {
    console.error('Erro de login:', err);
    if (err.response?.status === 400) {
      error.value = 'Credenciais inválidas. Por favor, verifique seu email e senha.';
    } else {
      error.value = 'Erro ao conectar com o servidor. Tente novamente.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <VForm @submit.prevent="login">
    <VRow>
      <!-- Email -->
      <VCol cols="12">
        <VTextField
          v-model="credentials.email"
          label="Email"
          placeholder="johndoe@email.com"
          type="email"
          autofocus
          :rules="[val => !!val || 'Email é obrigatório']"
        />
      </VCol>

      <!-- Password -->
      <VCol cols="12">
        <VTextField
          v-model="credentials.password"
          label="Senha"
          placeholder="············"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
          :rules="[val => !!val || 'Senha é obrigatória']"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
        />

        <div class="d-flex align-center flex-wrap justify-space-between my-5 gap-2">
          <VCheckbox
            v-model="rememberMe"
            label="Lembrar-me"
          />
          <RouterLink 
            class="text-primary ms-2"
            :to="{ name: 'forgot-password' }"
          >
            Esqueceu a senha?
          </RouterLink>
        </div>

        <VBtn
          block
          type="submit"
          :loading="isLoading"
          :disabled="isLoading"
        >
          Entrar
        </VBtn>
      </VCol>

      <!-- Mensagem de erro -->
      <VCol v-if="error" cols="12">
        <VAlert
          color="error"
          variant="tonal"
          density="compact"
        >
          {{ error }}
        </VAlert>
      </VCol>
    </VRow>
  </VForm>
</template>
