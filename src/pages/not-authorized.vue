<script setup>
import miscMaskDark from '@images/misc/misc-mask-dark.png';
import miscMaskLight from '@images/misc/misc-mask-light.png';
import tree1 from '@images/misc/tree1.png';
import tree3 from '@images/misc/tree3.png';
import pages401 from '@images/pages/401.png';
import authService from '@/services/auth';

const authThemeMask = useGenerateImageVariant(miscMaskLight, miscMaskDark);
const isAuthenticated = authService.isAuthenticated();

definePage({
  alias: '/pages/misc/not-authorized',
  meta: {
    layout: 'blank',
    public: true,
  },
});
</script>

<template>
  <div class="misc-wrapper">
    <ErrorHeader
      status-code="401"
      title="Acesso não autorizado! 🔐"
      description="Você não tem permissão para acessar esta página."
      class="mb-10"
    />

    <!-- 👉 Image -->
    <div class="misc-avatar w-100 text-center">
      <VImg
        :src="pages401"
        alt="Não Autorizado"
        :max-width="785"
        :height="500"
        class="mx-auto"
      />
      
      <!-- Botões de ação -->
      <div class="d-flex justify-center gap-4 mt-10" style="z-index: 1;">
        <!-- Botão de voltar para o calendário (se autenticado) -->
        <VBtn
          v-if="isAuthenticated"
          to="/apps/calendar"
          color="primary"
        >
          Voltar para o Calendário
        </VBtn>
        
        <!-- Botão de voltar ao login (se não autenticado) -->
        <VBtn
          v-if="!isAuthenticated"
          to="/login"
          color="primary"
        >
          Entrar
        </VBtn>
        
        <!-- Botão de voltar para home -->
        <VBtn
          to="/"
          variant="outlined"
        >
          Voltar para o Início
        </VBtn>
      </div>

      <div class="d-md-flex gap-x-2 misc-footer-tree d-none">
        <img
          :src="tree3"
          alt="tree"
          height="120"
          width="68"
        >
        <img
          :src="tree3"
          alt="tree"
          height="70"
          width="40"
          class="align-self-end"
        >
      </div>

      <img
        height="210"
        :src="tree1"
        class="misc-footer-tree-1 d-none d-md-block"
      >
      <img
        cover
        :src="authThemeMask"
        height="172"
        class="misc-footer-img d-none d-md-block flip-in-rtl"
      >
    </div>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/misc.scss";

.misc-footer-tree, .misc-footer-tree-1 {
  position: absolute;
}

.misc-footer-tree {
  inset-block-end: 3.75rem;
  inset-inline-start: 3.75rem;
}

.misc-footer-tree-1 {
  inset-block-end: 5rem;
  inset-inline-end: 4.75rem;
}
</style>
