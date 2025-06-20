<!-- FormWizardNumbered.vue - Sistema de Formulários para Vendedores -->
<template>
  <VContainer fluid>
    <!-- Cabeçalho principal -->
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardTitle class="d-flex align-center justify-between pa-6">
            <div>
              <h2 class="text-h4 mb-2">
                <VIcon icon="ri-survey-line" class="me-3" />
                {{ $t('Sistema de Formulários') }}
              </h2>
              <p class="text-body-1 mb-0">
                {{ userRole === 'vendedor' ? $t('Responda aos formulários atribuídos') : $t('Gerencie e atribua formulários aos vendedores') }}
              </p>
            </div>
            <VChip 
              :color="getRoleColor(userRole)" 
              size="large"
              variant="elevated"
            >
              {{ getRoleTitle(userRole) }}
            </VChip>
          </VCardTitle>
        </VCard>
      </VCol>
    </VRow>

    <!-- Área de ação baseada no papel do usuário -->
    <VRow class="mt-4" v-if="['coordenador', 'supervisor', 'admin'].includes(userRole)">
      <VCol cols="12">
        <VCard>
          <VCardText>
            <div class="d-flex flex-wrap gap-4 align-center">
              <VBtn 
                color="primary" 
                size="large"
                @click="openCreateFormDialog"
                prepend-icon="ri-add-line"
              >
                {{ $t('Criar Novo Formulário') }}
              </VBtn>
              
              <VBtn 
                color="success" 
                variant="outlined"
                @click="openAssignFormDialog"
                prepend-icon="ri-user-add-line"
              >
                {{ $t('Atribuir Formulário') }}
              </VBtn>
              
              <VBtn 
                color="info" 
                variant="outlined"
                @click="viewReports"
                prepend-icon="ri-bar-chart-line"
              >
                {{ $t('Relatórios') }}
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Lista de formulários -->
    <VRow class="mt-4">
      <VCol cols="12">
        <VCard>
          <VCardTitle class="pa-6">
            <div class="d-flex align-center justify-between">
              <h3>{{ userRole === 'vendedor' ? $t('Meus Formulários') : $t('Formulários Criados') }}</h3>
              
              <!-- Filtros -->
              <div class="d-flex gap-3">
                <VSelect
                  v-model="statusFilter"
                  :items="statusOptions"
                  :label="$t('Status')"
                  density="compact"
                  style="min-width: 150px"
                  clearable
                />
                <VTextField
                  v-model="searchQuery"
                  :label="$t('Buscar')"
                  density="compact"
                  prepend-inner-icon="ri-search-line"
                  style="min-width: 200px"
                  clearable
                />
              </div>
            </div>
          </VCardTitle>

          <VDataTable
            :items="filteredForms"
            :headers="tableHeaders"
            :loading="isLoading"
            :items-per-page="10"
            class="text-no-wrap"
          >
            <!-- Status -->
            <template #item.status="{ item }">
              <VChip
                :color="getStatusColor(item.status)"
                size="small"
                variant="elevated"
              >
                {{ getStatusText(item.status) }}
              </VChip>
            </template>

            <!-- Progress -->
            <template #item.progress="{ item }">
              <div class="d-flex align-center gap-2">
                <VProgressLinear
                  :model-value="item.progress || 0"
                  :color="item.progress === 100 ? 'success' : 'primary'"
                  height="6"
                  rounded
                />
                <span class="text-caption">{{ item.progress || 0 }}%</span>
              </div>
            </template>

            <!-- Vendedor (para coordenadores/supervisores) -->
            <template #item.vendedor="{ item }" v-if="userRole !== 'vendedor'">
              <div v-if="item.vendedor" class="d-flex align-center gap-2">
                <VAvatar size="24" color="primary">
                  <span class="text-caption">{{ item.vendedor.username.charAt(0).toUpperCase() }}</span>
                </VAvatar>
                <span>{{ item.vendedor.username }}</span>
              </div>
              <VChip v-else color="warning" size="small">
                {{ $t('Não Atribuído') }}
              </VChip>
            </template>

            <!-- Data -->
            <template #item.createdAt="{ item }">
              {{ formatDate(item.createdAt) }}
            </template>

            <!-- Ações -->
            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <!-- Responder/Continuar (para vendedores) -->
                <VTooltip v-if="userRole === 'vendedor'" :text="item.status === 'completed' ? $t('Visualizar') : $t('Responder')">
                  <template #activator="{ props }">
                    <IconBtn
                      v-bind="props"
                      :color="item.status === 'completed' ? 'info' : 'primary'"
                      @click="openForm(item)"
                    >
                      <VIcon :icon="item.status === 'completed' ? 'ri-eye-line' : 'ri-edit-line'" />
                    </IconBtn>
                  </template>
                </VTooltip>

                <!-- Visualizar respostas (para coordenadores/supervisores) -->
                <VTooltip v-if="userRole !== 'vendedor'" :text="$t('Ver Respostas')">
                  <template #activator="{ props }">
                    <IconBtn
                      v-bind="props"
                      color="info"
                      @click="viewResponses(item)"
                    >
                      <VIcon icon="ri-file-list-line" />
                    </IconBtn>
                  </template>
                </VTooltip>

                <!-- Editar (para coordenadores/supervisores) -->
                <VTooltip v-if="userRole !== 'vendedor'" :text="$t('Editar')">
                  <template #activator="{ props }">
                    <IconBtn
                      v-bind="props"
                      color="warning"
                      @click="editForm(item)"
                    >
                      <VIcon icon="ri-edit-box-line" />
                    </IconBtn>
                  </template>
                </VTooltip>

                <!-- Deletar (para coordenadores/supervisores) -->
                <VTooltip v-if="userRole !== 'vendedor'" :text="$t('Deletar')">
                  <template #activator="{ props }">
                    <IconBtn
                      v-bind="props"
                      color="error"
                      @click="deleteForm(item)"
                    >
                      <VIcon icon="ri-delete-bin-line" />
                    </IconBtn>
                  </template>
                </VTooltip>
              </div>
            </template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>

    <!-- Dialog para criar/editar formulário -->
    <VDialog
      v-model="createFormDialog"
      max-width="900px"
      persistent
      scrollable
    >
      <VCard>
        <VCardTitle class="pa-6">
          <div class="d-flex align-center justify-between">
            <h3>{{ isEditingForm ? $t('Editar Formulário') : $t('Criar Novo Formulário') }}</h3>
            <IconBtn @click="createFormDialog = false">
              <VIcon icon="ri-close-line" />
            </IconBtn>
          </div>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <VForm ref="formCreationForm" @submit.prevent="saveForm">
            <VRow>
              <!-- Informações básicas -->
              <VCol cols="12">
                <h4 class="text-h6 mb-4">{{ $t('Informações Básicas') }}</h4>
              </VCol>

              <VCol cols="12" md="8">
                <VTextField
                  v-model="newForm.title"
                  :label="$t('Título do Formulário')"
                  :rules="[v => !!v || $t('Título é obrigatório')]"
                  required
                />
              </VCol>

              <VCol cols="12" md="4">
                <VSelect
                  v-model="newForm.type"
                  :items="formTypes"
                  :label="$t('Tipo de Formulário')"
                  item-title="title"
                  item-value="value"
                  :rules="[v => !!v || $t('Tipo é obrigatório')]"
                  required
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="newForm.description"
                  :label="$t('Descrição')"
                  rows="3"
                  :rules="[v => !!v || $t('Descrição é obrigatória')]"
                  required
                />
              </VCol>

              <!-- Configurações -->
              <VCol cols="12">
                <h4 class="text-h6 mb-4 mt-4">{{ $t('Configurações') }}</h4>
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="newForm.deadline"
                  :label="$t('Data Limite')"
                  type="date"
                  :rules="[v => !!v || $t('Data limite é obrigatória')]"
                  required
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="newForm.priority"
                  :items="priorityOptions"
                  :label="$t('Prioridade')"
                  item-title="title"
                  item-value="value"
                  required
                />
              </VCol>

              <!-- Perguntas do formulário -->
              <VCol cols="12">
                <div class="d-flex align-center justify-between mb-4 mt-4">
                  <h4 class="text-h6">{{ $t('Perguntas') }}</h4>
                  <VBtn
                    color="primary"
                    variant="outlined"
                    @click="addQuestion"
                    prepend-icon="ri-add-line"
                  >
                    {{ $t('Adicionar Pergunta') }}
                  </VBtn>
                </div>

                <div v-for="(question, index) in newForm.questions" :key="index" class="mb-6">
                  <VCard variant="outlined">
                    <VCardText>
                      <div class="d-flex align-start gap-4">
                        <div class="flex-grow-1">
                          <VRow>
                            <VCol cols="12" md="8">
                              <VTextField
                                v-model="question.question"
                                :label="$t('Pergunta') + ' ' + (index + 1)"
                                :rules="[v => !!v || $t('Pergunta é obrigatória')]"
                                required
                              />
                            </VCol>
                            <VCol cols="12" md="4">
                              <VSelect
                                v-model="question.type"
                                :items="questionTypes"
                                :label="$t('Tipo')"
                                item-title="title"
                                item-value="value"
                                required
                              />
                            </VCol>
                            
                            <!-- Opções para select/radio/checkbox -->
                            <VCol cols="12" v-if="['select', 'radio', 'checkbox'].includes(question.type)">
                              <VTextarea
                                v-model="question.options"
                                :label="$t('Opções (uma por linha)')"
                                rows="3"
                                :rules="[v => !!v || $t('Opções são obrigatórias')]"
                                :hint="$t('Digite cada opção em uma linha separada')"
                                persistent-hint
                              />
                            </VCol>

                            <!-- Configurações adicionais -->
                            <VCol cols="12" md="6">
                              <VCheckbox
                                v-model="question.required"
                                :label="$t('Obrigatória')"
                              />
                            </VCol>
                          </VRow>
                        </div>

                        <div>
                          <IconBtn
                            color="error"
                            @click="removeQuestion(index)"
                            :disabled="newForm.questions.length === 1"
                          >
                            <VIcon icon="ri-delete-bin-line" />
                          </IconBtn>
                        </div>
                      </div>
                    </VCardText>
                  </VCard>
                </div>

                <VAlert v-if="newForm.questions.length === 0" type="info" class="mt-4">
                  {{ $t('Adicione pelo menos uma pergunta ao formulário') }}
                </VAlert>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-6">
          <VSpacer />
          <VBtn variant="outlined" @click="createFormDialog = false">
            {{ $t('Cancelar') }}
          </VBtn>
          <VBtn color="primary" @click="saveForm" :loading="isSaving">
            {{ isEditingForm ? $t('Atualizar') : $t('Criar Formulário') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialog para atribuir formulário -->
    <VDialog
      v-model="assignFormDialog"
      max-width="600px"
      persistent
    >
      <VCard>
        <VCardTitle class="pa-6">
          <div class="d-flex align-center justify-between">
            <h3>{{ $t('Atribuir Formulário') }}</h3>
            <IconBtn @click="assignFormDialog = false">
              <VIcon icon="ri-close-line" />
            </IconBtn>
          </div>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <VForm @submit.prevent="assignForm">
            <VRow>
              <VCol cols="12">
                <VSelect
                  v-model="assignmentData.formId"
                  :items="availableForms"
                  :label="$t('Selecionar Formulário')"
                  item-title="title"
                  item-value="id"
                  :rules="[v => !!v || $t('Formulário é obrigatório')]"
                  required
                />
              </VCol>

              <VCol cols="12">
                <VSelect
                  v-model="assignmentData.vendedorIds"
                  :items="vendedores"
                  :label="$t('Vendedores')"
                  item-title="username"
                  item-value="id"
                  multiple
                  chips
                  :rules="[v => v.length > 0 || $t('Selecione pelo menos um vendedor')]"
                  required
                >
                  <template #selection="{ item, index }">
                    <VChip v-if="index < 2">
                      {{ item.title }}
                    </VChip>
                    <VChip v-if="index === 2" color="grey">
                      +{{ assignmentData.vendedorIds.length - 2 }} {{ $t('outros') }}
                    </VChip>
                  </template>
                </VSelect>
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="assignmentData.instructions"
                  :label="$t('Instruções Especiais (opcional)')"
                  rows="3"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-6">
          <VSpacer />
          <VBtn variant="outlined" @click="assignFormDialog = false">
            {{ $t('Cancelar') }}
          </VBtn>
          <VBtn color="success" @click="assignForm" :loading="isAssigning">
            {{ $t('Atribuir') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialog para responder formulário (Wizard) -->
    <VDialog
      v-model="responseDialog"
      max-width="800px"
      persistent
      scrollable
    >
      <VCard v-if="currentForm">
        <VCardTitle class="pa-6">
          <div class="d-flex align-center justify-between">
            <div>
              <h3>{{ currentForm.title }}</h3>
              <p class="text-body-2 mt-1 mb-0">{{ currentForm.description }}</p>
            </div>
            <IconBtn @click="responseDialog = false">
              <VIcon icon="ri-close-line" />
            </IconBtn>
          </div>
        </VCardTitle>

        <VDivider />

        <!-- Progress indicator -->
        <div class="pa-4">
          <div class="d-flex align-center justify-between mb-2">
            <span class="text-body-2">{{ $t('Progresso') }}</span>
            <span class="text-body-2">{{ currentQuestionIndex + 1 }} / {{ currentForm.questions.length }}</span>
          </div>
          <VProgressLinear
            :model-value="((currentQuestionIndex + 1) / currentForm.questions.length) * 100"
            color="primary"
            height="6"
            rounded
          />
        </div>

        <VCardText class="pa-6" style="min-height: 300px;">
          <div v-if="currentQuestion">
            <!-- Numeração da pergunta -->
            <div class="d-flex align-center gap-3 mb-4">
              <VAvatar color="primary" size="32">
                <span class="text-h6">{{ currentQuestionIndex + 1 }}</span>
              </VAvatar>
              <h4 class="text-h6">{{ currentQuestion.question }}</h4>
              <VChip v-if="currentQuestion.required" color="error" size="small">
                {{ $t('Obrigatória') }}
              </VChip>
            </div>

            <!-- Input baseado no tipo da pergunta -->
            <div class="mt-6">
              <!-- Text -->
              <VTextField
                v-if="currentQuestion.type === 'text'"
                v-model="responses[currentQuestionIndex]"
                :label="$t('Sua resposta')"
                :rules="currentQuestion.required ? [v => !!v || $t('Esta pergunta é obrigatória')] : []"
              />

              <!-- Textarea -->
              <VTextarea
                v-else-if="currentQuestion.type === 'textarea'"
                v-model="responses[currentQuestionIndex]"
                :label="$t('Sua resposta')"
                rows="4"
                :rules="currentQuestion.required ? [v => !!v || $t('Esta pergunta é obrigatória')] : []"
              />

              <!-- Number -->
              <VTextField
                v-else-if="currentQuestion.type === 'number'"
                v-model.number="responses[currentQuestionIndex]"
                :label="$t('Sua resposta')"
                type="number"
                :rules="currentQuestion.required ? [v => v !== null && v !== undefined && v !== '' || $t('Esta pergunta é obrigatória')] : []"
              />

              <!-- Date -->
              <VTextField
                v-else-if="currentQuestion.type === 'date'"
                v-model="responses[currentQuestionIndex]"
                :label="$t('Sua resposta')"
                type="date"
                :rules="currentQuestion.required ? [v => !!v || $t('Esta pergunta é obrigatória')] : []"
              />

              <!-- Select -->
              <VSelect
                v-else-if="currentQuestion.type === 'select'"
                v-model="responses[currentQuestionIndex]"
                :items="getQuestionOptions(currentQuestion)"
                :label="$t('Selecione uma opção')"
                :rules="currentQuestion.required ? [v => !!v || $t('Esta pergunta é obrigatória')] : []"
              />

              <!-- Radio -->
              <VRadioGroup
                v-else-if="currentQuestion.type === 'radio'"
                v-model="responses[currentQuestionIndex]"
                :rules="currentQuestion.required ? [v => !!v || $t('Esta pergunta é obrigatória')] : []"
              >
                <VRadio
                  v-for="option in getQuestionOptions(currentQuestion)"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </VRadioGroup>

              <!-- Checkbox -->
              <div v-else-if="currentQuestion.type === 'checkbox'">
                <VCheckbox
                  v-for="option in getQuestionOptions(currentQuestion)"
                  :key="option"
                  v-model="responses[currentQuestionIndex]"
                  :label="option"
                  :value="option"
                  multiple
                />
              </div>

              <!-- Rating -->
              <div v-else-if="currentQuestion.type === 'rating'" class="text-center">
                <VRating
                  v-model="responses[currentQuestionIndex]"
                  size="large"
                  color="warning"
                />
                <p class="text-body-2 mt-2">{{ $t('Avalie de 1 a 5 estrelas') }}</p>
              </div>
            </div>
          </div>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-6">
          <VBtn
            variant="outlined"
            @click="previousQuestion"
            :disabled="currentQuestionIndex === 0"
            prepend-icon="ri-arrow-left-line"
          >
            {{ $t('Anterior') }}
          </VBtn>

          <VSpacer />

          <VBtn
            v-if="currentQuestionIndex < currentForm.questions.length - 1"
            color="primary"
            @click="nextQuestion"
            append-icon="ri-arrow-right-line"
          >
            {{ $t('Próxima') }}
          </VBtn>

          <VBtn
            v-else
            color="success"
            @click="submitResponse"
            :loading="isSubmitting"
            prepend-icon="ri-send-plane-line"
          >
            {{ $t('Finalizar') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar para feedback -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </VContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Estados principais
const isLoading = ref(false)
const isSaving = ref(false)
const isAssigning = ref(false)
const isSubmitting = ref(false)

// Papel do usuário (simulado - deve vir do authService)
const userRole = ref('coordenador') // 'vendedor', 'coordenador', 'supervisor', 'admin'

// Dialogs
const createFormDialog = ref(false)
const assignFormDialog = ref(false)
const responseDialog = ref(false)

// Filtros e busca
const statusFilter = ref('')
const searchQuery = ref('')

// Formulários
const forms = ref([])
const vendedores = ref([])

// Estado do formulário atual (para resposta)
const currentForm = ref(null)
const currentQuestionIndex = ref(0)
const responses = ref([])

// Estado de edição
const isEditingForm = ref(false)
const editingFormId = ref(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Novo formulário
const newForm = ref({
  title: '',
  description: '',
  type: 'survey',
  deadline: '',
  priority: 'medium',
  questions: [{
    question: '',
    type: 'text',
    required: true,
    options: ''
  }]
})

// Atribuição
const assignmentData = ref({
  formId: '',
  vendedorIds: [],
  instructions: ''
})

// Opções de configuração
const formTypes = [
  { title: 'Pesquisa de Satisfação', value: 'survey' },
  { title: 'Avaliação de Performance', value: 'performance' },
  { title: 'Feedback de Cliente', value: 'feedback' },
  { title: 'Relatório de Vendas', value: 'sales_report' },
  { title: 'Questionário Personalizado', value: 'custom' }
]

const questionTypes = [
  { title: 'Texto Simples', value: 'text' },
  { title: 'Texto Longo', value: 'textarea' },
  { title: 'Número', value: 'number' },
  { title: 'Data', value: 'date' },
  { title: 'Seleção Única', value: 'select' },
  { title: 'Múltipla Escolha', value: 'radio' },
  { title: 'Checkbox', value: 'checkbox' },
  { title: 'Avaliação', value: 'rating' }
]

const priorityOptions = [
  { title: 'Baixa', value: 'low' },
  { title: 'Média', value: 'medium' },
  { title: 'Alta', value: 'high' },
  { title: 'Urgente', value: 'urgent' }
]

const statusOptions = [
  { title: 'Pendente', value: 'pending' },
  { title: 'Em Progresso', value: 'in_progress' },
  { title: 'Concluído', value: 'completed' },
  { title: 'Expirado', value: 'expired' }
]

// Computadas
const currentQuestion = computed(() => {
  if (!currentForm.value || !currentForm.value.questions) return null
  return currentForm.value.questions[currentQuestionIndex.value]
})

const tableHeaders = computed(() => {
  const baseHeaders = [
    { title: t('Título'), key: 'title' },
    { title: t('Tipo'), key: 'type' },
    { title: t('Status'), key: 'status' },
    { title: t('Progresso'), key: 'progress' },
    { title: t('Data'), key: 'createdAt' },
    { title: t('Ações'), key: 'actions', sortable: false }
  ]

  if (userRole.value !== 'vendedor') {
    baseHeaders.splice(4, 0, { title: t('Vendedor'), key: 'vendedor' })
  }

  return baseHeaders
})

const filteredForms = computed(() => {
  let filtered = forms.value

  if (statusFilter.value) {
    filtered = filtered.filter(form => form.status === statusFilter.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(form => 
      form.title.toLowerCase().includes(query) ||
      form.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

const availableForms = computed(() => {
  return forms.value.filter(form => !form.vendedor)
})

// Métodos
const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const getRoleColor = (role) => {
  const colors = {
    admin: 'error',
    supervisor: 'warning',
    coordenador: 'info',
    vendedor: 'success'
  }
  return colors[role] || 'primary'
}

const getRoleTitle = (role) => {
  const titles = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    coordenador: 'Coordenador',
    vendedor: 'Vendedor'
  }
  return titles[role] || role
}

const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    expired: 'error'
  }
  return colors[status] || 'primary'
}

const getStatusText = (status) => {
  const texts = {
    pending: 'Pendente',
    in_progress: 'Em Progresso', 
    completed: 'Concluído',
    expired: 'Expirado'
  }
  return texts[status] || status
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR')
}

const getQuestionOptions = (question) => {
  if (!question.options) return []
  return question.options.split('\n').filter(option => option.trim())
}

// Ações principais
const openCreateFormDialog = () => {
  isEditingForm.value = false
  newForm.value = {
    title: '',
    description: '',
    type: 'survey',
    deadline: '',
    priority: 'medium',
    questions: [{
      question: '',
      type: 'text',
      required: true,
      options: ''
    }]
  }
  createFormDialog.value = true
}

const openAssignFormDialog = () => {
  assignmentData.value = {
    formId: '',
    vendedorIds: [],
    instructions: ''
  }
  assignFormDialog.value = true
}

const editForm = (form) => {
  isEditingForm.value = true
  editingFormId.value = form.id
  newForm.value = { ...form }
  createFormDialog.value = true
}

const deleteForm = async (form) => {
  if (confirm(t('Tem certeza que deseja deletar este formulário?'))) {
    try {
      // Aqui faria a chamada para a API
      forms.value = forms.value.filter(f => f.id !== form.id)
      showSnackbar(t('Formulário deletado com sucesso'))
    } catch (error) {
      showSnackbar(t('Erro ao deletar formulário'), 'error')
    }
  }
}

const openForm = (form) => {
  currentForm.value = form
  currentQuestionIndex.value = 0
  
  // Carrega respostas existentes se houver
  if (form.userResponses) {
    responses.value = [...form.userResponses]
  } else {
    responses.value = new Array(form.questions.length).fill('')
  }
  
  responseDialog.value = true
}

const viewResponses = (form) => {
  // Implementar visualização de respostas
  showSnackbar(t('Funcionalidade em desenvolvimento'))
}

const viewReports = () => {
  // Implementar relatórios
  showSnackbar(t('Funcionalidade em desenvolvimento'))
}

// Gerenciamento de perguntas
const addQuestion = () => {
  newForm.value.questions.push({
    question: '',
    type: 'text',
    required: true,
    options: ''
  })
}

const removeQuestion = (index) => {
  newForm.value.questions.splice(index, 1)
}

// Navegação no wizard
const nextQuestion = () => {
  if (validateCurrentQuestion()) {
    currentQuestionIndex.value++
  }
}

const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

const validateCurrentQuestion = () => {
  if (!currentQuestion.value.required) return true
  
  const response = responses.value[currentQuestionIndex.value]
  
  if (currentQuestion.value.type === 'checkbox') {
    return Array.isArray(response) && response.length > 0
  }
  
  return response !== null && response !== undefined && response !== ''
}

// Salvar formulário
const saveForm = async () => {
  try {
    isSaving.value = true
    
    // Validações
    if (!newForm.value.title || !newForm.value.description) {
      showSnackbar(t('Preencha todos os campos obrigatórios'), 'error')
      return
    }
    
    if (newForm.value.questions.length === 0) {
      showSnackbar(t('Adicione pelo menos uma pergunta'), 'error')
      return
    }
    
    // Simula chamada para API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const formData = {
      ...newForm.value,
      id: isEditingForm.value ? editingFormId.value : Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      progress: 0,
      vendedor: null
    }
    
    if (isEditingForm.value) {
      const index = forms.value.findIndex(f => f.id === editingFormId.value)
      if (index !== -1) {
        forms.value[index] = formData
      }
      showSnackbar(t('Formulário atualizado com sucesso'))
    } else {
      forms.value.push(formData)
      showSnackbar(t('Formulário criado com sucesso'))
    }
    
    createFormDialog.value = false
  } catch (error) {
    showSnackbar(t('Erro ao salvar formulário'), 'error')
  } finally {
    isSaving.value = false
  }
}

// Atribuir formulário
const assignForm = async () => {
  try {
    isAssigning.value = true
    
    if (!assignmentData.value.formId || assignmentData.value.vendedorIds.length === 0) {
      showSnackbar(t('Preencha todos os campos obrigatórios'), 'error')
      return
    }
    
    // Simula chamada para API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Atualiza os formulários com os vendedores atribuídos
    assignmentData.value.vendedorIds.forEach(vendedorId => {
      const vendedor = vendedores.value.find(v => v.id === vendedorId)
      const form = forms.value.find(f => f.id === assignmentData.value.formId)
      
      if (vendedor && form) {
        // Cria uma cópia do formulário para cada vendedor
        const assignedForm = {
          ...form,
          id: Date.now() + Math.random(),
          vendedor: vendedor,
          status: 'pending',
          instructions: assignmentData.value.instructions
        }
        forms.value.push(assignedForm)
      }
    })
    
    showSnackbar(t('Formulário atribuído com sucesso'))
    assignFormDialog.value = false
  } catch (error) {
    showSnackbar(t('Erro ao atribuir formulário'), 'error')
  } finally {
    isAssigning.value = false
  }
}

// Submeter resposta
const submitResponse = async () => {
  try {
    isSubmitting.value = true
    
    // Valida todas as perguntas obrigatórias
    for (let i = 0; i < currentForm.value.questions.length; i++) {
      const question = currentForm.value.questions[i]
      const response = responses.value[i]
      
      if (question.required) {
        if (question.type === 'checkbox') {
          if (!Array.isArray(response) || response.length === 0) {
            showSnackbar(t('Responda todas as perguntas obrigatórias'), 'error')
            currentQuestionIndex.value = i
            return
          }
        } else if (!response && response !== 0) {
          showSnackbar(t('Responda todas as perguntas obrigatórias'), 'error')
          currentQuestionIndex.value = i
          return
        }
      }
    }
    
    // Simula envio para API
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Atualiza o status do formulário
    const formIndex = forms.value.findIndex(f => f.id === currentForm.value.id)
    if (formIndex !== -1) {
      forms.value[formIndex].status = 'completed'
      forms.value[formIndex].progress = 100
      forms.value[formIndex].userResponses = responses.value
      forms.value[formIndex].completedAt = new Date().toISOString()
    }
    
    showSnackbar(t('Respostas enviadas com sucesso'))
    responseDialog.value = false
  } catch (error) {
    showSnackbar(t('Erro ao enviar respostas'), 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Carregar dados iniciais
const loadInitialData = async () => {
  try {
    isLoading.value = true
    
    // Simula carregamento de dados
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Dados mockados - vendedores
    vendedores.value = [
      { id: 1, username: 'João Silva', email: 'joao@empresa.com' },
      { id: 2, username: 'Maria Santos', email: 'maria@empresa.com' },
      { id: 3, username: 'Pedro Costa', email: 'pedro@empresa.com' },
      { id: 4, username: 'Ana Oliveira', email: 'ana@empresa.com' }
    ]
    
    // Dados mockados - formulários
    const mockForms = [
      {
        id: 1,
        title: 'Pesquisa de Satisfação do Cliente',
        description: 'Avalie a satisfação dos clientes com nossos produtos',
        type: 'survey',
        status: userRole.value === 'vendedor' ? 'pending' : 'completed',
        progress: userRole.value === 'vendedor' ? 0 : 85,
        createdAt: '2024-01-15T10:00:00Z',
        deadline: '2024-02-15',
        priority: 'high',
        vendedor: userRole.value === 'vendedor' ? { id: 1, username: 'João Silva' } : null,
        questions: [
          {
            question: 'Como você avalia nosso atendimento?',
            type: 'rating',
            required: true
          },
          {
            question: 'Qual produto você mais vendeu este mês?',
            type: 'select',
            required: true,
            options: 'Produto A\nProduto B\nProduto C\nProduto D'
          },
          {
            question: 'Descreva os principais desafios enfrentados',
            type: 'textarea',
            required: true
          }
        ]
      },
      {
        id: 2,
        title: 'Relatório Mensal de Vendas',
        description: 'Relatório detalhado das vendas do mês',
        type: 'sales_report',
        status: 'in_progress',
        progress: 60,
        createdAt: '2024-01-20T14:30:00Z',
        deadline: '2024-02-01',
        priority: 'medium',
        vendedor: userRole.value === 'vendedor' ? { id: 1, username: 'João Silva' } : { id: 2, username: 'Maria Santos' },
        questions: [
          {
            question: 'Quantas vendas você realizou?',
            type: 'number',
            required: true
          },
          {
            question: 'Qual foi o valor total vendido?',
            type: 'number',
            required: true
          }
        ]
      }
    ]
    
    // Filtra formulários baseado no papel do usuário
    if (userRole.value === 'vendedor') {
      forms.value = mockForms.filter(form => form.vendedor?.id === 1) // Simula usuário logado
    } else {
      forms.value = mockForms
    }
    
  } catch (error) {
    showSnackbar(t('Erro ao carregar dados'), 'error')
  } finally {
    isLoading.value = false
  }
}

// Watchers
watch(responseDialog, (newVal) => {
  if (!newVal) {
    currentForm.value = null
    currentQuestionIndex.value = 0
    responses.value = []
  }
})

// Inicialização
onMounted(() => {
  loadInitialData()
})
</script>

<style scoped>
.auth-card-v2 {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}

.question-card {
  transition: all 0.3s ease;
}

.question-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.progress-indicator {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--v-theme-surface));
}

.wizard-navigation {
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(10px);
}

.form-step {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.completed-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.priority-urgent {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.priority-high {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.priority-medium {
  border-left: 4px solid rgb(var(--v-theme-info));
}

.priority-low {
  border-left: 4px solid rgb(var(--v-theme-success));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

/* Melhorias de responsividade */
@media (max-width: 768px) {
  .d-flex.gap-4 {
    flex-direction: column;
    gap: 1rem;
  }
  
  .wizard-navigation {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1rem;
  }
  
  .form-step {
    padding-bottom: 100px;
  }
}

/* Animações personalizadas */
.bounce-enter-active {
  animation: bounce-in 0.5s;
}

.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

/* Estilo para questões obrigatórias */
.required-question {
  border-left: 3px solid rgb(var(--v-theme-error));
  padding-left: 1rem;
}

/* Loading states */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

/* Melhorias na tipografia */
.text-gradient {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Estados de hover para cards */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Indicadores visuais para diferentes tipos de formulário */
.form-type-survey {
  border-top: 4px solid #2196F3;
}

.form-type-performance {
  border-top: 4px solid #FF9800;
}

.form-type-feedback {
  border-top: 4px solid #4CAF50;
}

.form-type-sales_report {
  border-top: 4px solid #9C27B0;
}

.form-type-custom {
  border-top: 4px solid #607D8B;
}
</style>
