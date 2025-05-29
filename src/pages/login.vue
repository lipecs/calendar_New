<!-- src/pages/login.vue (atualizado) -->
<script setup>
import AuthProvider from '@/views/pages/authentication/AuthProvider.vue';
import LoginForm from '@/views/pages/authentication/LoginForm.vue';
import tree1 from '@images/misc/tree1.png';
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png';
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png';
import authV2LoginIllustrationDark from '@images/pages/auth-v2-login-illustration-dark.png';
import authV2LoginIllustrationLight from '@images/pages/auth-v2-login-illustration-light.png';
import authV2MaskDark from '@images/pages/mask-v2-dark.png';
import authV2MaskLight from '@images/pages/mask-v2-light.png';
import { VNodeRenderer } from '@layouts/components/VNodeRenderer';
import { themeConfig } from '@themeConfig';

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight, 
  authV2LoginIllustrationDark, 
  authV2LoginIllustrationBorderedLight, 
  authV2LoginIllustrationBorderedDark, 
  true
);
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark);

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
});

const router = useRouter();

const handleLoginSuccess = () => {
  // Redireciona para o calendário após login bem-sucedido
  router.push('/dashboards/analytics');
};
</script>

<template>
  <RouterLink to="/">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
      <h1 class="auth-title">
        {{ themeConfig.app.title }}
      </h1>
    </div>
  </RouterLink>

  <VRow no-gutters class="auth-wrapper">
    <VCol md="8" class="d-none d-md-flex position-relative">
      <div class="d-flex align-center justify-end w-100 h-100 pa-10 pe-0">
        <VImg max-width="797" :src="authThemeImg" class="auth-illustration" />
      </div>

      <img class="auth-footer-mask" height="360" :src="authThemeMask">

      <VImg :src="tree1" alt="tree image" height="190" width="90" class="auth-footer-tree" />
    </VCol>

    <VCol 
      cols="12" 
      md="4" 
      class="auth-card-v2 d-flex align-center justify-center"
      style="background-color: rgb(var(--v-theme-surface));"
    >
      <VCard flat :max-width="500" class="mt-12 mt-sm-0 pa-4">
        <VCardText>
          <h4 class="text-h4 mb-1">
            Bem-vindo ao <span class="text-capitalize">{{ themeConfig.app.title }}!</span> 👋🏻
          </h4>
          <p class="mb-0">
            Por favor, entre na sua conta para começar
          </p>
        </VCardText>

        <VCardText>
          <LoginForm :on-success="handleLoginSuccess" />
        </VCardText>

        <VCardText class="d-flex align-center">
          <VDivider />
          <span class="mx-2">ou</span>
          <VDivider />
        </VCardText>

        <!-- Auth providers -->
        <VCardText class="text-center">
          <AuthProvider />
        </VCardText>

        <!-- Register link -->
        <VCardText class="text-center">
          <span>Novo no sistema? </span>
          <RouterLink class="text-primary" :to="{ name: 'register' }">
            Criar uma conta
          </RouterLink>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>
