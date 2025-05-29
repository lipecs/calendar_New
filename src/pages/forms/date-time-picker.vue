<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as demoCode from '@/views/demos/forms/form-elements/date-time-picker/demoCodeDateTimePicker'

// Acesso à funcionalidade de internacionalização (i18n)
const { locale } = useI18n()

// Estado para a data selecionada
const selectedDate = ref(new Date())

// Computed para formato de data baseado no idioma
const dateFormat = computed(() => {
  return locale.value === 'pt' ? 'dd/MM/yyyy' : 'yyyy-MM-dd'
})

// Função para atualizar o idioma e o formato do calendário do FullCalendar
watch(locale, (newLocale) => {
  const fcLocale = newLocale === 'pt' ? 'pt-br' : 'en-gb'
  if (calendarApi.value) {
    calendarApi.value.setOption('locale', fcLocale)
  }
})
</script>

<template>
  <VRow>
    <!-- 👉 Basic -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Basic"
        :code="demoCode.basic"
      >
        <DemoDateTimePickerBasic :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Time Picker -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Time Picker"
        :code="demoCode.timePicker"
      >
        <DemoDateTimePickerTimePicker :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Date & Time -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Date and Time"
        :code="demoCode.dateAndTime"
      >
        <DemoDateTimePickerDateAndTime :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Multiple Dates -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Multiple Dates"
        :code="demoCode.multipleDates"
      >
        <DemoDateTimePickerMultipleDates :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Range -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Range"
        :code="demoCode.range"
      >
        <DemoDateTimePickerRange :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Human Friendly -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Human Friendly"
        :code="demoCode.humanFriendly"
      >
        <DemoDateTimePickerHumanFriendly :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Disabled Range -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Disabled Range"
        :code="demoCode.disabledRange"
      >
        <DemoDateTimePickerDisabledRange :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>

    <!-- 👉 Inline -->
    <VCol
      cols="12"
      md="6"
    >
      <AppCardCode
        title="Inline"
        :code="demoCode.inline"
      >
        <DemoDateTimePickerInline :dateFormat="dateFormat" />
      </AppCardCode>
    </VCol>
  </VRow>
</template>
