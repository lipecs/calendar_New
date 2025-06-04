<!-- src/views/apps/calendar/CalendarEventHandler.vue - ATUALIZADO -->
<script setup>
import avatar1 from '@images/avatars/avatar-1.png'
import avatar2 from '@images/avatars/avatar-2.png'
import avatar3 from '@images/avatars/avatar-3.png'
import avatar5 from '@images/avatars/avatar-5.png'
import avatar6 from '@images/avatars/avatar-6.png'
import avatar7 from '@images/avatars/avatar-7.png'
import { Portuguese } from "flatpickr/dist/l10n/pt.js"
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VForm } from 'vuetify/components/VForm'
import { useCalendarStore } from './useCalendarStore'
import authService from '@/services/auth'
import userService from '@/services/user'

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

// ✅ ATUALIZADO: Estados para hierarquia e seleção
const canCreateForOthers = ref(authService.canCreateAgendamentosForOthers())
const availableUsers = ref([])
const availableClients = ref([])
const isLoadingUsers = ref(false)
const isLoadingClients = ref(false)

// ✅ NOVO: Carregar lista de usuários (para superiores hierárquicos)
const loadUsers = async () => {
  if (!canCreateForOthers.value) return

  try {
    isLoadingUsers.value = true
    const users = await userService.getAllUsers()
    const currentUser = authService.getCurrentUser()
    const currentUserLevel = authService.getHierarchyLevel()
    
    // Filtrar usuários baseado na hierarquia
    let filteredUsers = []
    
    if (currentUserLevel >= 4) {
      // Admin/Diretor vê todos
      filteredUsers = users.filter(u => u.role === 'vendedor')
    } else if (currentUserLevel === 3) {
      // Supervisor vê vendedores sob sua responsabilidade
      filteredUsers = users.filter(u => 
        u.role === 'vendedor' && u.supervisorId === currentUser.userData.id
      )
    } else if (currentUserLevel === 2) {
      // Coordenador vê vendedores sob sua responsabilidade
      filteredUsers = users.filter(u => 
        u.role === 'vendedor' && u.coordenadorId === currentUser.userData.id
      )
    }
    
    availableUsers.value = filteredUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: `${user.username} (${user.email})`,
      avatar: avatar1 // Pode ser customizado por usuário
    }))
  } catch (error) {
    console.error('Erro ao carregar usuários:', error)
  } finally {
    isLoadingUsers.value = false
  }
}

// ✅ NOVO: Carregar lista de clientes
const loadClients = async () => {
  try {
    isLoadingClients.value = true
    
    // Simulação de dados de clientes (em produção viria do backend)
    const currentUser = authService.getCurrentUser()
    const currentUserLevel = authService.getHierarchyLevel()
    
    // Simular clientes baseado na hierarquia
    const allClients = [
      { id: 1, name: 'Empresa ABC Ltda', code: 'CLI001', vendedorId: 1, coordenadorId: 1 },
      { id: 2, name: 'XYZ Comercial', code: 'CLI002', vendedorId: 2, coordenadorId: 1 },
      { id: 3, name: 'Tech Solutions', code: 'CLI003', vendedorId: 1, coordenadorId: 2 },
      { id: 4, name: 'Global Corp', code: 'CLI004', vendedorId: 3, coordenadorId: 2 }
    ]
    
    let filteredClients = []
    
    if (currentUserLevel >= 4) {
      // Admin/Diretor vê todos os clientes
      filteredClients = allClients
    } else if (currentUserLevel === 3) {
      // Supervisor vê clientes dos seus vendedores
      filteredClients = allClients.filter(client => {
        // Buscar vendedores sob a responsabilidade do supervisor
        const vendedorUser = availableUsers.value.find(u => u.id === client.vendedorId)
        return vendedorUser // Se o vendedor está na lista de usuários disponíveis
      })
    } else if (currentUserLevel === 2) {
      // Coordenador vê clientes atribuídos a ele
      filteredClients = allClients.filter(client => 
        client.coordenadorId === currentUser.userData.id
      )
    } else if (currentUserLevel === 1) {
      // Vendedor vê apenas seus clientes
      filteredClients = allClients.filter(client => 
        client.vendedorId === currentUser.userData.id
      )
    }
    
    availableClients.value = filteredClients.map(client => ({
      id: client.id,
      name: client.name,
      code: client.code,
      displayName: `${client.name} (${client.code})`
    }))
    
  } catch (error) {
    console.error('Erro ao carregar clientes:', error)
  } finally {
    isLoadingClients.value = false
  }
}

const resetEvent = () => {
  event.value = JSON.parse(JSON.stringify(props.event))
  nextTick(() => {
    refForm.value?.resetValidation()
  })
}

watch(() => props.isDrawerOpen, (newValue) => {
  resetEvent()
  if (newValue) {
    if (canCreateForOthers.value) {
      loadUsers()
    }
    loadClients()
  }
})

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

const handleSubmit = () => {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {
      // ✅ ATUALIZADO: Se for superior hierárquico e tiver selecionado um vendedor
      if (canCreateForOthers.value && event.value.extendedProps?.assignedUser) {
        event.value.userId = event.value.extendedProps.assignedUser
      }

      // If id exist on id => Update event
      if ('id' in event.value)
        emit('updateEvent', event.value)
      // Else => add new event
      else
        emit('addEvent', event.value)

      // Close drawer
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

  if (event.value.end)
    config.maxDate = event.value.end

  return config
})

const endDateTimePickerConfig = computed(() => {
  const config = {
    enableTime: !event.value.allDay,
    dateFormat: `Y-m-d${event.value.allDay ? '' : ' H:i'}`,
    locale: Portuguese,
  }

  if (event.value.start)
    config.minDate = event.value.start

  return config
})

const dialogModelValueUpdate = val => {
  emit('update:isDrawerOpen', val)
}

// Status options com tradução
const statusOptions = computed(() => [
  { value: 'In Progress', title: 'Em andamento' },
  { value: 'Urgent', title: 'Urgente' },
  { value: 'Done', title: 'Finalizado' }
])

// Computed para usuário atribuído
const assignedUserDisplay = computed(() => {
  if (!event.value.extendedProps?.assignedUser) return null

  const user = availableUsers.value.find(u => u.id === event.value.extendedProps.assignedUser)
  return user ? user.displayName : null
})

// ✅ NOVO: Computed para cliente selecionado
const selectedClientDisplay = computed(() => {
  if (!event.value.extendedProps?.clienteId) return null

  const client = availableClients.value.find(c => c.id === event.value.extendedProps.clienteId)
  return client ? client.displayName : null
})

// Montar componente
onMounted(() => {
  if (canCreateForOthers.value) {
    loadUsers()
  }
  loadClients()
})
</script>

<template>
  <VNavigationDrawer 
    temporary 
    location="end" 
    :model-value="props.isDrawerOpen" 
    width="450" 
    class="scrollable-content"
    @update:model-value="dialogModelValueUpdate"
  >
    <!-- Header -->
    <AppDrawerHeaderSection 
      :title="event.id ? $t('Update Event') : $t('Add Event')"
      @cancel="$emit('update:isDrawerOpen', false)"
    >
      <template #beforeClose>
        <IconBtn v-show="event.id" @click="removeEvent">
          <VIcon size="18" icon="ri-delete-bin-7-line" />
        </IconBtn>
      </template>
    </AppDrawerHeaderSection>

    <VDivider />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <VForm ref="refForm" @submit.prevent="handleSubmit">
            <VRow>
              <!-- Title -->
              <VCol cols="12">
                <VTextField 
                  v-model="event.title" 
                  :label="$t('Title')" 
                  :placeholder="$t('Meeting with Jane')"
                  :rules="[requiredValidator]" 
                />
              </VCol>

              <!-- ✅ NOVO: Cliente -->
              <VCol cols="12">
                <VSelect
                  v-model="event.extendedProps.clienteId"
                  :label="$t('Cliente')"
                  :placeholder="$t('Selecionar cliente')"
                  :items="availableClients"
                  :item-title="'displayName'"
                  :item-value="'id'"
                  :loading="isLoadingClients"
                  clearable
                  :rules="[requiredValidator]"
                >
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
                      <VListItemSubtitle>{{ item.raw.code }}</VListItemSubtitle>
                    </VListItem>
                  </template>
                </VSelect>
              </VCol>

              <!-- Calendar -->
              <VCol cols="12">
                <VSelect 
                  v-model="event.extendedProps.calendar" 
                  :label="$t('Label')"
                  :placeholder="$t('Select Event Label')" 
                  :rules="[requiredValidator]" 
                  :items="store.availableCalendars"
                  :item-title="item => item.label" 
                  :item-value="item => item.label"
                >
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

              <!-- ✅ ATUALIZADO: Vendedor Atribuído (apenas para superiores hierárquicos) -->
              <VCol v-if="canCreateForOthers" cols="12">
                <VSelect
                  v-model="event.extendedProps.assignedUser"
                  :label="$t('Atribuir a Vendedor')"
                  :placeholder="$t('Selecionar vendedor para este agendamento')"
                  :items="availableUsers"
                  :item-title="'displayName'"
                  :item-value="'id'"
                  :loading="isLoadingUsers"
                  clearable
                >
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
                </VSelect>
              </VCol>

              <!-- Start date -->
              <VCol cols="12">
                <AppDateTimePicker 
                  :key="JSON.stringify(startDateTimePickerConfig)" 
                  v-model="event.start"
                  :label="$t('Start date')" 
                  :placeholder="$t('Select Date')" 
                  :rules="[requiredValidator]"
                  :config="startDateTimePickerConfig" 
                />
              </VCol>

              <!-- End date -->
              <VCol cols="12">
                <AppDateTimePicker 
                  :key="JSON.stringify(endDateTimePickerConfig)" 
                  v-model="event.end"
                  :label="$t('End date')" 
                  :placeholder="$t('Select End Date')" 
                  :rules="[requiredValidator]"
                  :config="endDateTimePickerConfig" 
                />
              </VCol>

              <!-- All day -->
              <VCol cols="12">
                <VSwitch v-model="event.allDay" :label="$t('All day')" />
              </VCol>

              <!-- Event URL -->
              <VCol cols="12">
                <VTextField 
                  v-model="event.url" 
                  :label="$t('Event URL')" 
                  :placeholder="$t('https://event.com/meeting')"
                  :rules="[urlValidator]" 
                  type="url" 
                />
              </VCol>

              <!-- Location -->
              <VCol cols="12">
                <VTextField 
                  v-model="event.extendedProps.location" 
                  :label="$t('Location')"
                  :placeholder="$t('Meeting room')" 
                />
              </VCol>

              <!-- Description -->
              <VCol cols="12">
                <VTextarea 
                  v-model="event.description" 
                  :label="$t('Description')" 
                  rows="3"
                  :placeholder="$t('Add a description for the event')" 
                />
              </VCol>

              <!-- Status -->
              <VCol cols="12">
                <VSelect 
                  v-model="event.extendedProps.status" 
                  :label="$t('Status')" 
                  :placeholder="$t('Select status')"
                  :items="statusOptions" 
                  :item-title="'title'" 
                  :item-value="'value'" 
                />
              </VCol>

              <!-- Form buttons -->
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
