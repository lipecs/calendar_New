<script setup>
import authService from '@/services/auth';
import userService from '@/services/user';
import {
  blankEvent,
  useCalendar,
} from '@/views/apps/calendar/useCalendar';
import { useCalendarStore } from '@/views/apps/calendar/useCalendarStore';
import FullCalendar from '@fullcalendar/vue3';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
// Components
import CalendarEventHandler from '@/views/apps/calendar/CalendarEventHandler.vue';

const router = useRouter();
const store = useCalendarStore()
const event = ref(structuredClone(blankEvent))
const isEventHandlerSidebarActive = ref(false)

// Estados para admin
const selectedUserId = ref(null);
const users = ref([]);
const isAdmin = computed(() => authService.isAuthenticated() && authService.isAdmin());

watch(isEventHandlerSidebarActive, val => {
  if (!val) event.value = structuredClone(blankEvent)
})

const { isLeftSidebarOpen } = useResponsiveLeftSidebar()
const {
  refCalendar,
  calendarOptions,
  addEvent,
  updateEvent,
  removeEvent,
  jumpToDate,
  refetchEvents
} = useCalendar(event, isEventHandlerSidebarActive, isLeftSidebarOpen)

// Adicionando timeZone ao calendarOptions
calendarOptions.value = {
  ...calendarOptions.value,
  timeZone: 'America/Sao_Paulo',
}

// Carregar usuários (apenas para admin)
const loadUsers = async () => {
  if (!isAdmin.value) return;

  try {
    const userData = await userService.getAllUsers();
    users.value = userData;
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  }
};

// Expor selectedUserId globalmente para o useCalendar
watch(selectedUserId, (newValue, oldValue) => {
  window.selectedUserId = newValue;
  window.calendarSelectedUserId = newValue;
  nextTick(() => {
    if (refCalendar.value) refetchEvents();
  });
}, { immediate: false });

const checkAll = computed({
  get: () => store.selectedCalendars.length === store.availableCalendars.length,
  set: val => {
    store.selectedCalendars = val ? store.availableCalendars.map(i => i.label) : []
  },
})

// Criação de filtro
const newFilterName = ref('')
const newFilterColor = ref('#1976D2')
const isCreatingFilter = ref(false)

function createNewFilter() {
  const name = newFilterName.value.trim()
  if (!name) return

  const exists = store.availableCalendars.some(c => c.label.toLowerCase() === name.toLowerCase())

  if (!exists) {
    store.availableCalendars.push({ label: name, color: newFilterColor.value })
  }

  newFilterName.value = ''
  newFilterColor.value = '#1976D2'
  isCreatingFilter.value = false
}

// Edição de filtro
const editedFilter = ref({ label: '', color: '', originalLabel: '' })
const isEditingFilter = ref(false)

function startEditFilter(calendar) {
  editedFilter.value = {
    label: calendar.label,
    color: calendar.color,
    originalLabel: calendar.label,
  }
  isEditingFilter.value = true
}

function cancelEditFilter() {
  editedFilter.value = { label: '', color: '', originalLabel: '' }
  isEditingFilter.value = false
}

function saveEditedFilter() {
  const idx = store.availableCalendars.findIndex(c => c.label === editedFilter.value.originalLabel)
  if (idx !== -1) {
    store.availableCalendars[idx] = {
      label: editedFilter.value.label,
      color: editedFilter.value.color,
    }
    store.selectedCalendars = store.selectedCalendars.map(l =>
      l === editedFilter.value.originalLabel ? editedFilter.value.label : l
    )
  }
  cancelEditFilter()
}

function removeCalendarFilter(label) {
  const idx = store.availableCalendars.findIndex(c => c.label === label)
  if (idx !== -1) {
    store.availableCalendars.splice(idx, 1)
    store.selectedCalendars = store.selectedCalendars.filter(l => l !== label)
  }
}

onMounted(async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }
  if (isAdmin.value) await loadUsers();
  await store.fetchFilters();
  // Aguarda o próximo tick para garantir que o calendário esteja montado
  nextTick(() => {
    if (refCalendar.value) refetchEvents();
  });
});

definePage({
  meta: {
    pageTitle: 'Calendário',
    action: 'read',
    subject: 'Calendar'
  }
});
</script>

<template>
  <div>
    <VCard>
      <!-- Header do calendário com seletor de usuário para admin -->
      <VCardTitle v-if="isAdmin" class="d-flex justify-space-between align-center flex-wrap pa-4">
        <span>{{ $t('Calendar') }}</span>
        <div class="d-flex align-center gap-4">
          <VSelect v-model="selectedUserId" :items="[
            { title: $t('Todos os usuários'), value: null },
            ...users.map(user => ({ title: user.username, value: user.id }))
          ]" :label="$t('Visualizar calendário de:')" density="compact" style="min-width: 200px;" hide-details />
        </div>
      </VCardTitle>

      <VDivider v-if="isAdmin" />

      <VLayout style="z-index: 0;">
        <VNavigationDrawer v-model="isLeftSidebarOpen" width="292" absolute touchless location="start"
          class="calendar-add-event-drawer" :temporary="$vuetify.display.mdAndDown">
          <div class="pa-5">
            <VBtn block prepend-icon="ri-add-line" @click="isEventHandlerSidebarActive = true">
              {{ $t('Add event') }}
            </VBtn>
          </div>

          <VDivider />

          <div class="d-flex align-center justify-center pa-2">
            <AppDateTimePicker v-model="calendarApi" :config="{ inline: true }" class="calendar-date-picker"
              @update:model-value="jumpToDate($event)" />
          </div>

          <VDivider />

          <div class="pa-5">
            <h5 class="text-h5 mb-4">{{ $t('Event Filters') }}</h5>
            <VCheckbox v-model="checkAll" :label="$t('View All')" />

            <div v-for="calendar in store.availableCalendars" :key="calendar.label" class="mb-2">
              <div class="d-flex align-center justify-space-between">
                <VCheckbox v-model="store.selectedCalendars" :value="calendar.label" :label="$t('' + calendar.label)"
                  :color="calendar.color" />
                <div class="d-flex">
                  <VBtn icon size="x-small" @click="startEditFilter(calendar)">
                    <VIcon icon="ri-edit-line" />
                  </VBtn>
                  <VBtn icon size="x-small" @click="removeCalendarFilter(calendar.label)">
                    <VIcon icon="ri-delete-bin-line" />
                  </VBtn>
                </div>
              </div>
            </div>

            <VBtn class="mt-4" prepend-icon="ri-add-circle-line" variant="outlined" color="primary"
              @click="isCreatingFilter = true">
              {{ $t('Create new filter') }}
            </VBtn>
          </div>
        </VNavigationDrawer>

        <VMain>
          <VCard flat>
            <FullCalendar ref="refCalendar" :options="calendarOptions" />
          </VCard>
        </VMain>
      </VLayout>
    </VCard>

    <CalendarEventHandler v-model:isDrawerOpen="isEventHandlerSidebarActive" :event="event" @add-event="addEvent"
      @update-event="updateEvent" @remove-event="removeEvent" />

    <!-- Dialog para criar novo filtro -->
    <VDialog v-model="isCreatingFilter" persistent max-width="400">
      <VCard>
        <VCardTitle>{{ $t('New Event Filter') }}</VCardTitle>
        <VCardText>
          <VTextField v-model="newFilterName" :label="$t('Filter Name')" autofocus />
          <VColorPicker v-model="newFilterColor" hide-inputs show-swatches flat class="mt-4"
            swatches-max-height="120" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="isCreatingFilter = false">
            {{ $t('Cancel') }}
          </VBtn>
          <VBtn color="primary" @click="createNewFilter">
            {{ $t('Add') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialog para editar filtro -->
    <VDialog v-model="isEditingFilter" persistent max-width="400">
      <VCard>
        <VCardTitle>{{ $t('Edit Event Filter') }}</VCardTitle>
        <VCardText>
          <VTextField v-model="editedFilter.label" :label="$t('Filter Name')" autofocus />
          <VColorPicker v-model="editedFilter.color" hide-inputs show-swatches flat class="mt-4"
            swatches-max-height="120" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="cancelEditFilter">
            {{ $t('Cancel') }}
          </VBtn>
          <VBtn color="primary" @click="saveEditedFilter">
            {{ $t('Save') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/libs/full-calendar";

.calendars-checkbox .v-label {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  opacity: var(--v-high-emphasis-opacity);
}

.calendar-add-event-drawer {
  &.v-navigation-drawer:not(.v-navigation-drawer--temporary) {
    border-end-start-radius: 0.375rem;
    border-start-start-radius: 0.375rem;
  }
}

.calendar-date-picker {
  display: none;

  +.flatpickr-input+.flatpickr-calendar.inline {
    border: none;
    box-shadow: none;

    .flatpickr-months {
      border-block-end: none;
    }
  }

  &~.flatpickr-calendar .flatpickr-weekdays {
    margin-block: 0 4px;
  }
}
</style>

<style lang="scss" scoped>
.v-layout {
  overflow: visible !important;

  .v-card {
    overflow: visible;
  }
}

/* Estilo para eventos concluídos */
.event-completed {
  opacity: 0.6 !important;
  background-color: rgba(158, 158, 158, 0.6) !important;
  border-color: rgba(158, 158, 158, 0.6) !important;
  color: #000000 !important;
}

/* Estilo para eventos urgentes */
.event-urgent {
  background-color: #FF0000 !important;
  border-color: #FF0000 !important;
  color: #FFFFFF !important;
  font-weight: bold !important;
}

/* Assegurar que eventos concluídos tenham menor prioridade visual */
.fc-event.event-completed {
  z-index: 1 !important;
}

/* Assegurar que eventos urgentes tenham maior prioridade visual */
.fc-event.event-urgent {
  z-index: 3 !important;
}
</style>
