<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  languages: {
    type: Array,
    required: true,
  },
  location: {
    type: null,
    required: false,
    default: 'bottom end',
  },
})

const { locale, setLocaleMessage } = useI18n({ useScope: 'global' })

// Função para trocar o idioma
const changeLanguage = (lang) => {
  // Altera o idioma global
  locale.value = lang.i18nLang
  // Adiciona as mensagens do novo idioma (se necessário)
  // setLocaleMessage(lang.i18nLang, yourLanguageMessages)
}
</script>

<template>
  <IconBtn>
    <VIcon icon="ri-translate-2" />

    <!-- Menu -->
    <VMenu
      activator="parent"
      :location="props.location"
      offset="15px"
      width="160"
    >
      <!-- List -->
      <VList
        :selected="[locale.value]"
        color="primary"
        mandatory
      >
        <!-- List item -->
        <VListItem
          v-for="lang in props.languages"
          :key="lang.i18nLang"
          :value="lang.i18nLang"
          @click="changeLanguage(lang)"
        >
          <!-- Language label -->
          <VListItemTitle>{{ lang.label }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </IconBtn>
</template>
