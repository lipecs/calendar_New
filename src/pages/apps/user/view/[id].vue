<script setup>
import UserBioPanel from '@/views/apps/user/view/UserBioPanel.vue'
import UserTabBillingsPlans from '@/views/apps/user/view/UserTabBillingsPlans.vue'
import UserTabConnections from '@/views/apps/user/view/UserTabConnections.vue'
import UserTabNotifications from '@/views/apps/user/view/UserTabNotifications.vue'
import UserTabOverview from '@/views/apps/user/view/UserTabOverview.vue'
import UserTabSecurity from '@/views/apps/user/view/UserTabSecurity.vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { locale } = useI18n()
const route = useRoute('apps-user-view-id')
const userTab = ref(null)

// Traduções por idioma
const tabTitles = {
  en: {
    overview: 'Overview',
    // security: 'Security',
  },
  pt: {
    overview: 'Visão Geral',
    // security: 'Segurança',
  },
  // Você pode adicionar mais idiomas aqui
}

// Atualiza os títulos dos tabs quando o idioma mudar
const tabs = ref([
  {
    icon: 'ri-group-line',
    title: computed(() => tabTitles[locale.value]?.overview || 'Overview'),
  },
  // {
  // icon: 'ri-lock-2-line',
  // title: computed(() => tabTitles[locale.value]?.security || 'Security'),
  // },
  // Os tabs adicionais podem ser reativados ou mantidos conforme necessário
  // {
  //   icon: 'ri-bookmark-line',
  //   title: computed(() => tabTitles[locale.value]?.billingAndPlan || 'Billing & Plan'),
  // },
  // {
  //   icon: 'ri-notification-4-line',
  //   title: computed(() => tabTitles[locale.value]?.notifications || 'Notifications'),
  // },
  // {
  //   icon: 'ri-link-m',
  //   title: computed(() => tabTitles[locale.value]?.connections || 'Connections'),
  // },
])

// Atualiza a variável tabs sempre que o idioma mudar
watch(locale, () => {
  tabs.value = [
    {
      icon: 'ri-group-line',
      title: computed(() => tabTitles[locale.value]?.overview || 'Overview'),
    },
    // {
    //   icon: 'ri-lock-2-line',
    //   title: computed(() => tabTitles[locale.value]?.security || 'Security'),
    // },
    // Os tabs adicionais podem ser reativados ou mantidos conforme necessário
    // {
    //   icon: 'ri-bookmark-line',
    //   title: computed(() => tabTitles[locale.value]?.billingAndPlan || 'Billing & Plan'),
    // },
    // {
    //   icon: 'ri-notification-4-line',
    //   title: computed(() => tabTitles[locale.value]?.notifications || 'Notifications'),
    // },
    // {
    //   icon: 'ri-link-m',
    //   title: computed(() => tabTitles[locale.value]?.connections || 'Connections'),
    // },
  ]
})

const { data: userData } = await useApi(`/apps/users/${route.params.id}`)
</script>

<template>
  <VRow v-if="userData">
    <VCol cols="12" md="5" lg="4">
      <UserBioPanel :user-data="userData" />
    </VCol>

    <VCol cols="12" md="7" lg="8">
      <VTabs v-model="userTab" class="v-tabs-pill">
        <VTab v-for="tab in tabs" :key="tab.icon">
          <VIcon start :icon="tab.icon" />
          <span>{{ tab.title }}</span>
        </VTab>
      </VTabs>

      <VWindow v-model="userTab" class="mt-6 disable-tab-transition" :touch="false">
        <VWindowItem>
          <UserTabOverview />
        </VWindowItem>

        <VWindowItem>
          <UserTabSecurity />
        </VWindowItem>

        <VWindowItem>
          <UserTabBillingsPlans />
        </VWindowItem>

        <VWindowItem>
          <UserTabNotifications />
        </VWindowItem>

        <VWindowItem>
          <UserTabConnections />
        </VWindowItem>
      </VWindow>
    </VCol>
  </VRow>
  <VCard v-else>
    <VCardTitle class="text-center">
      No User Found
    </VCardTitle>
  </VCard>
</template>
