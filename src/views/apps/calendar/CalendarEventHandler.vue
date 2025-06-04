<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import authService from '@/services/auth'
import clientService from '@/services/client'
import userService from '@/services/user'
import avatar1 from '@images/avatars/avatar-1.png'
import { Portuguese } from "flatpickr/dist/l10n/pt.js"
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VForm } from 'vuetify/components/VForm'
import { useCalendarStore } from './useCalendarStore'

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  event: {
    type: null,
    required: true,
  },
})

const emit = defineEmits([
  'update:isDrawerOpen',
  'addEvent',
  'updateEvent',
  'removeEvent',
])

const store = useCalendarStore()
const refForm = ref()

// Event
const event = ref(JSON.parse(JSON.stringify(props.event)))

// Hierarchy/user/client states
const canCreateForOthers = ref(authService.canCreateAgendamentosForOthers())
const availableUsers = ref([])
const availableClients = ref([])
const isLoadingUsers = ref(false)
const isLoadingClients = ref(false)

// Alert states
const alert = ref({
  show: false,
  type: 'success',
  message: ''
})

// Carregar usuários - hierarquia
const loadUsers = async () => {
  if (!canCreateForOthers.value) return

  try {
    isLoadingUsers.value = true
    const users = await userService.getAllUsers()
    const currentUser = authService.getCurrentUser()
    const currentUserLevel = authService.getHierarchyLevel()

    let filteredUsers = []

    if (currentUserLevel >= 4) {
      filteredUsers = users.filter(u => u.role === 'vendedor')
    } else if (currentUserLevel === 3) {
      filteredUsers = users.filter(u =>
        u.role === 'vendedor' && u.supervisorId === currentUser.userData.id
      )
    } else if (currentUserLevel === 2) {
      filteredUsers = users.filter(u =>
        u.role === 'vendedor' && u.coordenadorId === currentUser.userData.id
      )
    }

    availableUsers.value = filteredUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: `${user.username} (${user.email})`,
      avatar: avatar1
    }))
  } catch (error) {
    showAlert('error', 'Erro ao carregar usuários: ' + (error.response?.data || error.message))
  } finally {
    isLoadingUsers.value = false
  }
}

// Carregar clientes do backend
const loadClients = async () => {
  try {
    isLoadingClients.value = true
    const clients = await clientService.getAvailableClients()
    availableClients.value = clients.map(client => ({
      id: client.id,
      name: client.name,
      code: client.code,
      displayName: `${client.name} (${client.code})`,
      status: client.status,
      vendedorId: client.vendedorId,
      coordenadorId: client.coordenadorId
    }))
  } catch (error) {
    showAlert('error', 'Erro ao carregar clientes: ' + (error.response?.data || error.message))
    availableClients.value = [
      { id: 1, name: 'Empresa ABC Ltda', code: 'CLI001', displayName: 'Empresa ABC Ltda (CLI001)' },
      { id: 2, name: 'XYZ Comercial', code: 'CLI002', displayName: 'XYZ Comercial (CLI002)' },
      { id: 3, name: 'Tech Solutions', code: 'CLI003', displayName: 'Tech Solutions (CLI003)' },
      { id: 4, name: 'Global Corp', code: 'CLI004', displayName: 'Global Corp (CLI004)' }
    ]
  } finally {
    isLoadingClients.value = false
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

const resetEvent = () => {
  event.value = JSON.parse(JSON.stringify(props.event))
  nextTick(() => {
    refForm.value?.resetValidation()
  })
}

// Watch drawer open
watch(() => props.isDrawerOpen, async (newValue) => {
  resetEvent()
  if (newValue) {
    const promises = []
    if (canCreateForOthers.value) promises.push(loadUsers())
    promises.push(loadClients())
    try {
      await Promise.all(promises)
    } catch {}
  }
})

// Watch event changes
watch(() => props.event, (newEvent) => {
  if (newEvent) {
    event.value = JSON.parse(JSON.stringify(newEvent))
    if (event.value.extendedProps?.clienteId && availableClients.value.length === 0) {
      loadClients()
    }
  }
}, { deep: true })

watch(() => event.value.extendedProps?.status, (newStatus) => {
  if (newStatus === 'Done' || newStatus === 'Finalizado') {
    event.value.extendedProps.calendar = event.value.extendedProps.calendar || 'Meeting'
    emit('updateEvent', event.value)
  }
  if (newStatus === 'Urgent' || newStatus === 'Urgente') {
    event.value.extendedProps.calendar = event.value.extendedProps.calendar || 'Meeting'
    emit('updateEvent', event.value)
  }
})

const removeEvent = () => {
  emit('removeEvent', String(event.value.id))
  emit('update:isDrawerOpen', false)
}

// Handle submit - garante userId correto
const handleSubmit = () => {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {
      // Determinar o userId correto para o evento
      let targetUserId = authService.getCurrentUser().userData.id
      if (canCreateForOthers.value && event.value.extendedProps?.assignedUser) {
        targetUserId = event.value.extendedProps.assignedUser
      }
      event.value.userId = targetUserId

      // Garantir que informações do cliente estão presentes
      if (event.value.extendedProps?.clienteId) {
        const selectedClient = availableClients.value.find(c => c.id === event.value.extendedProps.clienteId)
        if (selectedClient) {
          event.value.extendedProps.cliente = selectedClient.name
        }
      }

      if ('id' in event.value) {
        emit('updateEvent', event.value)
      } else {
        emit('addEvent', event.value)
      }
      emit('update:isDrawerOpen', false)
    }
  })
}

// Form
const onCancel = () => {
  emit('update:isDrawerOpen', false)
  nextTick(() => {
    refForm.value?.reset()
    resetEvent()
    refForm.value?.resetValidation()
  })
}

const startDateTimePickerConfig = computed(() => {
  const config = {
    enableTime: !event.value.allDay,
    dateFormat: `Y-m-d${event.value.allDay ? '' : ' H:i'}`,
    locale: Portuguese,
  }
  if (event.value.end) config.maxDate = event.value.end
  return config
})

const endDateTimePickerConfig = computed(() => {
  const config = {
    enableTime: !event.value.allDay,
    dateFormat: `Y-m-d${event.value.allDay ? '' : ' H:i'}`,
    locale: Portuguese,
  }
  if (event.value.start) config.minDate = event.value.start
  return config
})

const dialogModelValueUpdate = val => {
  emit('update:isDrawerOpen', val)
}

const statusOptions = computed(() => [
  { value: 'In Progress', title: 'Em andamento' },
  { value: 'Urgent', title: 'Urgente' },
  { value: 'Done', title: 'Finalizado' }
])

const assignedUserDisplay = computed(() => {
  if (!event.value.extendedProps?.assignedUser) return null
  const user = availableUsers.value.find(u => u.id === event.value.extendedProps.assignedUser)
  return user ? user.displayName : null
})

const selectedClientDisplay = computed(() => {
  if (!event.value.extendedProps?.clienteId) return null
  const client = availableClients.value.find(c => c.id === event.value.extendedProps.clienteId)
  return client ? client.displayName : null
})

// Filtrar clientes por vendedor se necessário
const filteredClients = computed(() => {
  if (!event.value.extendedProps?.assignedUser || authService.isVendedor()) {
    return availableClients.value
  }
  const selectedUserId = event.value.extendedProps.assignedUser
  return availableClients.value.filter(client => client.vendedorId === selectedUserId)
})

// Limpa cliente se vendedor muda e cliente não pertence ao novo vendedor
watch(() => event.value.extendedProps?.assignedUser, (newUserId, oldUserId) => {
  if (newUserId !== oldUserId && event.value.extendedProps?.clienteId) {
    const currentClient = availableClients.value.find(c => c.id === event.value.extendedProps.clienteId)
    if (currentClient && currentClient.vendedorId !== newUserId) {
      event.value.extendedProps.clienteId = null
    }
  }
})

// Cliente obrigatório
const isClientRequired = computed(() => true)

onMounted(async () => {
  try {
    if (canCreateForOthers.value) await loadUsers()
    await loadClients()
  } catch {}
})
</script>

<template>
  <VNavigationDrawer temporary location="end" :model-value="props.isDrawerOpen" width="450" class="scrollable-content"
    @update:model-value="dialogModelValueUpdate">
    <AppDrawerHeaderSection :title="event.id ? $t('Update Event') : $t('Add Event')"
      @cancel="$emit('update:isDrawerOpen', false)">
      <template #beforeClose>
        <IconBtn v-show="event.id" @click="removeEvent">
          <VIcon size="18" icon="ri-delete-bin-7-line" />
        </IconBtn>
      </template>
    </AppDrawerHeaderSection>
    <VDivider />

    <VAlert v-if="alert.show" :type="alert.type" density="compact" class="ma-4" closable
      @click:close="alert.show = false">
      {{ alert.message }}
    </VAlert>

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <VForm ref="refForm" @submit.prevent="handleSubmit">
            <VRow>
              <VCol cols="12">
                <VTextField v-model="event.title" :label="$t('Title')" :placeholder="$t('Meeting with Jane')"
                  :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="12">
                <VSelect v-model="event.extendedProps.clienteId" :label="$t('Cliente')"
                  :placeholder="isLoadingClients ? $t('Carregando clientes...') : $t('Selecionar cliente')"
                  :items="filteredClients" :item-title="'displayName'" :item-value="'id'" :loading="isLoadingClients"
                  :disabled="isLoadingClients" clearable :rules="isClientRequired ? [requiredValidator] : []">
                  <template #selection="{ item }">
                    <div class="align-center d-flex">
                      <VIcon icon="ri-building-line" size="18" class="me-2" />
                      <span>{{ item.raw.displayName }}</span>
                    </div>
                  </template>
                  <template #item="{ item, props: itemProps }">
                    <VListItem v-bind="itemProps">
                      <template #prepend>
                        <VIcon icon="ri-building-line" size="18" />
                      </template>
                      <VListItemTitle>{{ item.raw.name }}</VListItemTitle>
                      <VListItemSubtitle>
                        {{ item.raw.code }}
                        <VChip v-if="item.raw.status" size="x-small"
                          :color="item.raw.status === 'Ativo' ? 'success' : 'warning'" class="ml-2">
                          {{ item.raw.status }}
                        </VChip>
                      </VListItemSubtitle>
                    </VListItem>
                  </template>
                  <template #no-data>
                    <VListItem>
                      <VListItemTitle class="text-center text-medium-emphasis">
                        {{ isLoadingClients ? 'Carregando clientes...' : 'Nenhum cliente disponível' }}
                      </VListItemTitle>
                    </VListItem>
                  </template>
                </VSelect>
              </VCol>
              <VCol cols="12">
                <VSelect v-model="event.extendedProps.calendar" :label="$t('Label')"
                  :placeholder="$t('Select Event Label')" :rules="[requiredValidator]" :items="store.availableCalendars"
                  :item-title="item => item.label" :item-value="item => item.label">
                  <template #selection="{ item }">
                    <div v-show="event.extendedProps.calendar" class="align-center d-flex">
                      <VIcon size="8" icon="ri-circle-fill" :color="item.raw.color" class="me-2" />
                      <span>{{ $t(item.raw.label) }}</span>
                    </div>
                  </template>
                  <template #item="{ item, props: itemProps }">
                    <VListItem v-bind="itemProps">
                      <template #prepend>
                        <VIcon size="8" icon="ri-circle-fill" :color="item.raw.color" />
                      </template>
                      <VListItemTitle>{{ $t(item.raw.label) }}</VListItemTitle>
                    </VListItem>
                  </template>
                </VSelect>
              </VCol>
              <VCol v-if="canCreateForOthers" cols="12">
                <VSelect v-model="event.extendedProps.assignedUser" :label="$t('Atribuir a Vendedor')"
                  :placeholder="isLoadingUsers ? $t('Carregando vendedores...') : $t('Selecionar vendedor para este agendamento')"
                  :items="availableUsers" :item-title="'displayName'" :item-value="'id'" :loading="isLoadingUsers"
                  :disabled="isLoadingUsers" clearable>
                  <template #selection="{ item }">
                    <div class="align-center d-flex">
                      <VAvatar size="24" class="me-2">
                        <VImg :src="item.raw.avatar" />
                      </VAvatar>
                      <span>{{ item.raw.displayName }}</span>
                    </div>
                  </template>
                  <template #item="{ item, props: itemProps }">
                    <VListItem v-bind="itemProps">
                      <template #prepend>
                        <VAvatar size="32">
                          <VImg :src="item.raw.avatar" />
                        </VAvatar>
                      </template>
                      <VListItemTitle>{{ item.raw.username }}</VListItemTitle>
                      <VListItemSubtitle>{{ item.raw.email }}</VListItemSubtitle>
                    </VListItem>
                  </template>
                  <template #no-data>
                    <VListItem>
                      <VListItemTitle class="text-center text-medium-emphasis">
                        {{ isLoadingUsers ? 'Carregando vendedores...' : 'Nenhum vendedor disponível' }}
                      </VListItemTitle>
                    </VListItem>
                  </template>
                </VSelect>
              </VCol>
              <VCol cols="12">
                <AppDateTimePicker :key="JSON.stringify(startDateTimePickerConfig)" v-model="event.start"
                  :label="$t('Start date')" :placeholder="$t('Select Date')" :rules="[requiredValidator]"
                  :config="startDateTimePickerConfig" />
              </VCol>
              <VCol cols="12">
                <AppDateTimePicker :key="JSON.stringify(endDateTimePickerConfig)" v-model="event.end"
                  :label="$t('End date')" :placeholder="$t('Select End Date')" :rules="[requiredValidator]"
                  :config="endDateTimePickerConfig" />
              </VCol>
              <VCol cols="12">
                <VSwitch v-model="event.allDay" :label="$t('All day')" />
              </VCol>
              <VCol cols="12">
                <VTextField v-model="event.url" :label="$t('Event URL')" :placeholder="$t('https://event.com/meeting')"
                  :rules="[urlValidator]" type="url" />
              </VCol>
              <VCol cols="12">
                <VTextField v-model="event.extendedProps.location" :label="$t('Location')"
                  :placeholder="$t('Meeting room')" />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="event.description" :label="$t('Description')" rows="3"
                  :placeholder="$t('Add a description for the event')" />
              </VCol>
              <VCol cols="12">
                <VSelect v-model="event.extendedProps.status" :label="$t('Status')" :placeholder="$t('Select status')"
                  :items="statusOptions" :item-title="'title'" :item-value="'value'" />
              </VCol>
              <VCol cols="12">
                <VBtn type="submit" class="me-3">
                  {{ $t('Submit') }}
                </VBtn>
                <VBtn variant="outlined" color="secondary" @click="onCancel">
                  {{ $t('Cancel') }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>

<style scoped>
.scrollable-content {
  overflow-y: auto;
}

.v-select .v-select__selection--disabled {
  opacity: 0.6;
}

.v-select--disabled {
  pointer-events: none;
}

.v-text-field,
.v-select,
.v-textarea {
  margin-bottom: 8px;
}

.v-alert {
  margin: 0 !important;
}
</style>
