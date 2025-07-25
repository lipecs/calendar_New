<!-- src/pages/responder.vue - CÓDIGO CORRIGIDO COM VISUALIZAÇÃO -->
<script setup>
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

// ============ ESTADOS REATIVOS ============
const availableForms = ref([])
const myResponses = ref([])
const currentForm = ref(null)
const responses = ref({})
const loading = ref(false)
const alert = ref('')
const alertType = ref('success')

// ✅ ADIÇÕES PARA VISUALIZAÇÃO DE RESPOSTAS
const showMyResponsesDialog = ref(false)
const selectedResponseForView = ref(null)
const loadingResponseDetails = ref(false)
const showResponseDetailDialog = ref(false)

// ============ COMPUTADAS ============
const myCompletedResponses = computed(() => {
    return myResponses.value.filter(response => response.status === 'COMPLETED')
})

// ============ UTILITÁRIOS ============
const getUser = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user.userData || null
    } catch {
        return null
    }
}

// ✅ FUNÇÃO CORRIGIDA para obter usuário atual
const getCurrentUser = () => {
    try {
        // Tentar obter dados do localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        const token = localStorage.getItem('token')

        // Se não encontrar userData, tentar 'user'
        if (!userData.id) {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            if (user.userData && user.userData.id) {
                return {
                    userData: user.userData,
                    token: user.accessToken || token
                }
            }
        }

        return {
            userData,
            token
        }
    } catch (error) {
        console.error('❌ Erro ao obter usuário:', error)
        // Retornar estrutura básica para evitar erros
        return {
            userData: { id: 1, username: 'usuario', email: 'teste@teste.com' },
            token: localStorage.getItem('token') || ''
        }
    }
}

const getHeaders = () => {
    const currentUser = getCurrentUser()
    return {
        'Authorization': `Bearer ${currentUser.token}`,
        'Content-Type': 'application/json',
        'X-User-Id': currentUser.userData.id?.toString() || '1'
    }
}

const showAlert = (message, type = 'success') => {
    alert.value = message
    alertType.value = type
    setTimeout(() => { alert.value = '' }, 5000)
}

// ✅ FUNÇÕES DE FORMATAÇÃO
const formatDate = (dateString) => {
    if (!dateString) return 'Não informado'
    try {
        return new Date(dateString).toLocaleString('pt-BR')
    } catch {
        return dateString
    }
}

const getStatusColor = (status) => {
    switch (status) {
        case 'COMPLETED': return 'success'
        case 'DRAFT': return 'warning'
        default: return 'default'
    }
}

const getStatusText = (status) => {
    switch (status) {
        case 'COMPLETED': return 'Concluído'
        case 'DRAFT': return 'Rascunho'
        default: return status
    }
}

// ============ FUNÇÕES DE API ============
const loadAvailableForms = async () => {
    try {
        loading.value = true
        console.log('🔄 Carregando formulários disponíveis...')

        const response = await axios.get('http://localhost:8080/api/forms/available', {
            headers: getHeaders()
        })

        availableForms.value = response.data || []
        console.log('✅ Formulários disponíveis:', availableForms.value.length)
        showAlert('Formulários carregados!', 'success')
    } catch (error) {
        console.error('❌ Erro:', error)
        showAlert('Erro ao carregar formulários: ' + (error.response?.data || error.message), 'error')
    } finally {
        loading.value = false
    }
}

const loadMyResponses = async () => {
    try {
        console.log('🔄 Carregando minhas respostas...')

        const response = await axios.get('http://localhost:8080/api/forms/responses/my', {
            headers: getHeaders()
        })

        myResponses.value = response.data || []
        console.log('✅ Respostas carregadas:', myResponses.value.length)
    } catch (error) {
        console.error('❌ Erro ao carregar respostas:', error)
        showAlert('Erro ao carregar respostas', 'error')
    }
}

const saveDraft = async () => {
    try {
        loading.value = true
        console.log('💾 Salvando rascunho...')

        const payload = {
            formId: currentForm.value.id,
            responses: JSON.stringify(responses.value),
            status: 'DRAFT'
        }

        await axios.post('http://localhost:8080/api/forms/responses/draft', payload, {
            headers: getHeaders()
        })

        showAlert('Rascunho salvo!', 'success')
    } catch (error) {
        console.error('❌ Erro ao salvar rascunho:', error)
        showAlert('Erro ao salvar rascunho: ' + (error.response?.data || error.message), 'error')
    } finally {
        loading.value = false
    }
}

const submitForm = async () => {
    try {
        loading.value = true
        console.log('📤 Enviando formulário...')

        if (!validateRequiredQuestions()) {
            loading.value = false
            return
        }

        const currentUser = getCurrentUser()
        const payload = {
            formId: currentForm.value.id,
            userId: currentUser.userData.id,
            responses: JSON.stringify(responses.value),
            status: 'COMPLETED'
        }

        console.log('📤 Payload enviado:', payload)

        const response = await axios.post('http://localhost:8080/api/forms/responses', payload, {
            headers: getHeaders()
        })

        console.log('✅ Resposta do servidor:', response.data)
        showAlert('Formulário enviado com sucesso!', 'success')

        closeForm()
        await loadAvailableForms()
        await loadMyResponses()

    } catch (error) {
        console.error('❌ Erro ao enviar formulário:', error)
        let errorMessage = 'Erro desconhecido'

        if (error.response) {
            errorMessage = error.response.data || `Erro ${error.response.status}: ${error.response.statusText}`
        } else if (error.request) {
            errorMessage = 'Erro de conexão com o servidor'
        } else {
            errorMessage = error.message
        }

        showAlert('Erro ao enviar formulário: ' + errorMessage, 'error')
    } finally {
        loading.value = false
    }
}

// ============ FUNÇÕES DE CONTROLE ============
const startForm = (form) => {
    console.log('📝 Iniciando formulário:', form.title)
    currentForm.value = form
    responses.value = {}

    if (form.sections) {
        form.sections.forEach(section => {
            if (section.questions) {
                section.questions.forEach(question => {
                    if (question.type === 'MULTIPLE') {
                        responses.value[question.id] = []
                    } else {
                        responses.value[question.id] = ''
                    }
                })
            }
        })
    }
}

const closeForm = () => {
    currentForm.value = null
    responses.value = {}
}

const validateRequiredQuestions = () => {
    let hasError = false

    if (currentForm.value.sections) {
        currentForm.value.sections.forEach(section => {
            if (section.questions) {
                section.questions.forEach(question => {
                    if (question.required) {
                        const response = responses.value[question.id]

                        if (!response ||
                            (typeof response === 'string' && response.trim() === '') ||
                            (Array.isArray(response) && response.length === 0)) {
                            showAlert(`Questão obrigatória não respondida: ${question.title}`, 'error')
                            hasError = true
                        }
                    }
                })
            }
        })
    }

    return !hasError
}

// ============ FUNÇÕES AUXILIARES PARA TEMPLATE ============
const parseOptions = (optionsString) => {
    try {
        return JSON.parse(optionsString || '[]')
    } catch {
        return []
    }
}

const updateMultipleChoice = (questionId, option, checked) => {
    if (!Array.isArray(responses.value[questionId])) {
        responses.value[questionId] = []
    }

    if (checked) {
        responses.value[questionId].push(option)
    } else {
        responses.value[questionId] = responses.value[questionId].filter(item => item !== option)
    }
}

const isOptionSelected = (questionId, option) => {
    return Array.isArray(responses.value[questionId]) ?
        responses.value[questionId].includes(option) : false
}

// ✅ FUNÇÕES PARA VISUALIZAR RESPOSTAS
const viewMyResponses = () => {
    console.log('📋 Abrindo visualização de respostas')
    showMyResponsesDialog.value = true
}

const viewResponseDetail = async (response) => {
    try {
        loadingResponseDetails.value = true
        console.log('👁️ Carregando detalhes da resposta:', response.id)

        // Buscar formulário completo para ter as questões
        const formResponse = await axios.get(`http://localhost:8080/api/forms/${response.formId}`, {
            headers: getHeaders()
        })

        selectedResponseForView.value = {
            ...response,
            form: formResponse.data,
            parsedResponses: JSON.parse(response.responses || '{}')
        }

        // Fechar lista e abrir detalhes
        showMyResponsesDialog.value = false
        setTimeout(() => {
            showResponseDetailDialog.value = true
        }, 300)

        console.log('✅ Detalhes carregados:', selectedResponseForView.value)

    } catch (error) {
        console.error('❌ Erro ao carregar detalhes:', error)
        showAlert('Erro ao carregar detalhes da resposta', 'error')
    } finally {
        loadingResponseDetails.value = false
    }
}

const formatResponseValue = (response) => {
    if (response === null || response === undefined || response === '') {
        return 'Não respondido'
    }

    if (Array.isArray(response)) {
        return response.length > 0 ? response.join(', ') : 'Não respondido'
    }

    if (typeof response === 'object') {
        return JSON.stringify(response)
    }

    return response.toString()
}

const getQuestionText = (questionId, form) => {
    if (!form?.sections) return `Questão ${questionId}`

    for (const section of form.sections) {
        if (section.questions) {
            const question = section.questions.find(q => q.id === questionId)
            if (question) return question.title || question.text
        }
    }
    return `Questão ${questionId}`
}

// ============ LIFECYCLE ============
onMounted(() => {
    console.log('🚀 Iniciando página de respostas...')
    console.log('👤 Usuário logado:', getUser())

    loadAvailableForms()
    loadMyResponses()
})
</script>

<template>
    <div class="pa-6">
        <!-- ============ LISTA DE FORMULÁRIOS ============ -->
        <div v-if="!currentForm">
            <!-- Header -->
            <div class="mb-6">
                <h1 class="text-h4 mb-2">Responder Formulários</h1>
                <p class="text-medium-emphasis">Formulários disponíveis para você</p>
            </div>

            <!-- Alerta -->
            <VAlert v-if="alert" :type="alertType" class="mb-4" closable @click:close="alert = ''">
                {{ alert }}
            </VAlert>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-8">
                <VProgressCircular indeterminate size="64" />
                <p class="mt-4">Carregando...</p>
            </div>

            <!-- Formulários Disponíveis -->
            <VCard class="mb-6">
                <VCardTitle>
                    <VIcon icon="ri-file-list-line" class="me-2" />
                    Formulários Disponíveis
                </VCardTitle>

                <VCardText>
                    <div v-if="availableForms.length === 0" class="text-center py-8">
                        <VIcon icon="ri-file-list-line" size="64" class="mb-4 text-disabled" />
                        <p class="text-disabled">Nenhum formulário disponível</p>
                    </div>

                    <VRow v-else>
                        <VCol v-for="form in availableForms" :key="form.id" cols="12" md="6">
                            <VCard hover>
                                <VCardTitle>{{ form.title }}</VCardTitle>
                                <VCardSubtitle v-if="form.description">
                                    {{ form.description }}
                                </VCardSubtitle>
                                <VCardText>
                                    <div class="d-flex align-center mb-2">
                                        <VIcon icon="ri-calendar-line" size="16" class="me-2" />
                                        <span class="text-sm">Válido até: {{ form.endDate }}</span>
                                    </div>
                                    <div class="d-flex align-center mb-2">
                                        <VIcon icon="ri-file-list-line" size="16" class="me-2" />
                                        <span class="text-sm">
                                            {{ form.sections?.length || 0 }} seções
                                        </span>
                                    </div>
                                    <VChip :color="form.status === 'ACTIVE' ? 'success' : 'secondary'" size="small">
                                        {{ form.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                                    </VChip>
                                </VCardText>
                                <VCardActions>
                                    <VBtn color="primary" @click="startForm(form)" :disabled="form.status !== 'ACTIVE'">
                                        Responder
                                    </VBtn>
                                </VCardActions>
                            </VCard>
                        </VCol>
                    </VRow>
                </VCardText>
            </VCard>

            <!-- Minhas Respostas -->
            <VCard>
                <VCardTitle>
                    <VIcon icon="ri-file-check-line" class="me-2" />
                    Minhas Respostas
                </VCardTitle>

                <VCardText>
                    <div v-if="myResponses.length === 0" class="text-center py-8">
                        <VIcon icon="ri-file-check-line" size="64" class="mb-4 text-disabled" />
                        <p class="text-disabled">Nenhuma resposta ainda</p>
                    </div>

                    <VRow v-else>
                        <VCol v-for="response in myResponses" :key="response.id" cols="12" md="6">
                            <VCard>
                                <VCardTitle>{{ response.formTitle }}</VCardTitle>
                                <VCardText>
                                    <div class="d-flex align-center mb-2">
                                        <VIcon icon="ri-calendar-line" size="16" class="me-2" />
                                        <span class="text-sm">
                                            {{ response.completedAt || 'Em andamento' }}
                                        </span>
                                    </div>
                                    <VChip :color="response.status === 'COMPLETED' ? 'success' : 'warning'"
                                        size="small">
                                        {{ response.status === 'COMPLETED' ? 'Concluído' : 'Rascunho' }}
                                    </VChip>
                                </VCardText>
                            </VCard>
                        </VCol>
                    </VRow>

                    <!-- BOTÃO PARA VISUALIZAR RESPOSTAS -->
                    <div v-if="myCompletedResponses.length > 0" class="text-center mt-4">
                        <VBtn variant="outlined" color="info" @click="viewMyResponses" :disabled="loading">
                            <VIcon icon="ri-eye-line" class="me-2" />
                            Visualizar Respostas ({{ myCompletedResponses.length }})
                        </VBtn>
                    </div>
                </VCardText>
            </VCard>
        </div>

        <!-- ============ RESPONDER FORMULÁRIO ============ -->
        <div v-else>
            <div class="d-flex justify-space-between align-center mb-6">
                <div>
                    <h1 class="text-h4 mb-1">{{ currentForm.title }}</h1>
                    <p v-if="currentForm.description" class="text-medium-emphasis">
                        {{ currentForm.description }}
                    </p>
                </div>
                <VBtn color="secondary" variant="outlined" @click="closeForm">
                    <VIcon icon="ri-close-line" class="me-2" />
                    Fechar
                </VBtn>
            </div>

            <VAlert v-if="alert" :type="alertType" class="mb-4" closable @click:close="alert = ''">
                {{ alert }}
            </VAlert>

            <VCard>
                <VCardText class="pa-6">
                    <div v-for="(section, sectionIndex) in currentForm.sections" :key="section.id || sectionIndex"
                        class="mb-8">
                        <div class="d-flex align-center mb-6">
                            <VIcon icon="ri-folder-line" color="primary" class="me-2" />
                            <h2 class="text-h5">{{ section.title }}</h2>
                        </div>

                        <div class="ms-6">
                            <div v-for="(question, questionIndex) in section.questions"
                                :key="question.id || questionIndex" class="mb-6 pa-4 border rounded-lg">
                                <div class="mb-4">
                                    <h3 class="text-h6 mb-2">
                                        {{ question.title }}
                                        <span v-if="question.required" class="text-error">*</span>
                                    </h3>
                                    <p v-if="question.description" class="text-body-2 text-medium-emphasis">
                                        {{ question.description }}
                                    </p>
                                </div>

                                <!-- Texto Simples -->
                                <VTextField v-if="question.type === 'TEXT'" v-model="responses[question.id]"
                                    label="Sua resposta" variant="outlined" placeholder="Digite sua resposta..." />

                                <!-- Texto Múltiplo -->
                                <VTextarea v-else-if="question.type === 'TEXTAREA'" v-model="responses[question.id]"
                                    label="Sua resposta" variant="outlined" rows="4"
                                    placeholder="Digite sua resposta..." />

                                <!-- Número -->
                                <VTextField v-else-if="question.type === 'NUMBER'" v-model="responses[question.id]"
                                    label="Sua resposta" type="number" variant="outlined"
                                    placeholder="Digite um número..." />

                                <!-- Data -->
                                <VTextField v-else-if="question.type === 'DATE'" v-model="responses[question.id]"
                                    label="Selecione a data" type="date" variant="outlined" />

                                <!-- Hora -->
                                <VTextField v-else-if="question.type === 'TIME'" v-model="responses[question.id]"
                                    label="Selecione a hora" type="time" variant="outlined" />

                                <!-- Múltipla Escolha -->
                                <div v-else-if="question.type === 'MULTIPLE'">
                                    <p class="text-body-2 text-medium-emphasis mb-3">
                                        Selecione uma ou mais opções:
                                    </p>
                                    <div class="ms-2">
                                        <VCheckbox v-for="option in parseOptions(question.options)" :key="option"
                                            :model-value="isOptionSelected(question.id, option)"
                                            @update:model-value="(checked) => updateMultipleChoice(question.id, option, checked)"
                                            :label="option" class="mb-1" />
                                    </div>
                                </div>

                                <!-- Escolha Única -->
                                <div v-else-if="question.type === 'SINGLE'">
                                    <p class="text-body-2 text-medium-emphasis mb-3">
                                        Selecione uma opção:
                                    </p>
                                    <VRadioGroup v-model="responses[question.id]" class="ms-2">
                                        <VRadio v-for="option in parseOptions(question.options)" :key="option"
                                            :value="option" :label="option" class="mb-1" />
                                    </VRadioGroup>
                                </div>

                                <!-- Lista Suspensa -->
                                <VSelect v-else-if="question.type === 'SELECT'" v-model="responses[question.id]"
                                    :items="parseOptions(question.options)" label="Selecione uma opção"
                                    variant="outlined" placeholder="Escolha uma opção..." />

                                <!-- Upload de Arquivo -->
                                <VFileInput v-else-if="question.type === 'FILE'" v-model="responses[question.id]"
                                    label="Selecione um arquivo" variant="outlined" prepend-icon="ri-attachment-line" />

                                <!-- Tipo Não Suportado -->
                                <VAlert v-else type="warning" variant="outlined">
                                    <div class="d-flex flex-column">
                                        <span class="font-weight-bold">Tipo não suportado: {{ question.type }}</span>
                                        <span class="text-body-2 mt-2">Use o campo abaixo para responder:</span>
                                    </div>
                                    <VTextField v-model="responses[question.id]" label="Sua resposta" variant="outlined"
                                        class="mt-3" />
                                </VAlert>
                            </div>
                        </div>
                    </div>
                </VCardText>

                <VCardActions class="pa-6 pt-0">
                    <VBtn color="secondary" variant="outlined" @click="closeForm">
                        <VIcon icon="ri-arrow-left-line" class="me-2" />
                        Voltar
                    </VBtn>

                    <VSpacer />

                    <VBtn color="warning" variant="outlined" @click="saveDraft" :loading="loading">
                        <VIcon icon="ri-save-line" class="me-2" />
                        Salvar Rascunho
                    </VBtn>

                    <VBtn color="primary" @click="submitForm" :loading="loading">
                        <VIcon icon="ri-send-plane-line" class="me-2" />
                        Enviar Formulário
                    </VBtn>
                </VCardActions>
            </VCard>
        </div>

        <!-- ✅ DIALOG PARA LISTA DE RESPOSTAS -->
        <VDialog v-model="showMyResponsesDialog" max-width="1000px" scrollable>
            <VCard>
                <VCardTitle class="d-flex align-center justify-space-between">
                    <div>
                        <div class="text-h6">Minhas Respostas</div>
                        <div class="text-caption text-medium-emphasis">
                            {{ myCompletedResponses.length }} respostas concluídas
                        </div>
                    </div>
                    <VBtn icon="ri-close-line" variant="text" size="small" @click="showMyResponsesDialog = false" />
                </VCardTitle>

                <VDivider />

                <VCardText class="pa-6" style="max-height: 600px;">
                    <VRow v-if="myCompletedResponses.length > 0">
                        <VCol v-for="response in myCompletedResponses" :key="response.id" cols="12" md="6">
                            <VCard variant="outlined" hover>
                                <VCardTitle class="text-subtitle-1">{{ response.formTitle }}</VCardTitle>
                                <VCardSubtitle>Respondido em: {{ formatDate(response.completedAt) }}</VCardSubtitle>
                                <VCardText>
                                    <VChip :color="getStatusColor(response.status)" size="small" variant="tonal">
                                        {{ getStatusText(response.status) }}
                                    </VChip>
                                </VCardText>
                                <VCardActions>
                                    <VBtn color="primary" variant="outlined" size="small"
                                        @click="viewResponseDetail(response)" :loading="loadingResponseDetails">
                                        <VIcon icon="ri-eye-line" class="me-1" />
                                        Ver Resposta
                                    </VBtn>
                                </VCardActions>
                            </VCard>
                        </VCol>
                    </VRow>

                    <div v-else class="text-center py-8">
                        <VIcon icon="ri-file-list-line" size="64" class="mb-4 text-disabled" />
                        <p class="text-disabled">Nenhuma resposta concluída encontrada</p>
                    </div>
                </VCardText>
            </VCard>
        </VDialog>

        <!-- ✅ DIALOG PARA DETALHES DA RESPOSTA -->
        <VDialog v-model="showResponseDetailDialog" max-width="900px" scrollable>
            <VCard v-if="selectedResponseForView">
                <VCardTitle class="d-flex align-center justify-space-between">
                    <div>
                        <div class="text-h6">{{ selectedResponseForView.form?.title }}</div>
                        <div class="text-caption text-medium-emphasis">
                            Respondido em {{ formatDate(selectedResponseForView.completedAt) }}
                        </div>
                    </div>
                    <VBtn icon="ri-close-line" variant="text" size="small" @click="showResponseDetailDialog = false" />
                </VCardTitle>

                <VDivider />

                <VCardText class="pa-6" style="max-height: 600px;">
                    <div class="mb-6">
                        <VChip :color="getStatusColor(selectedResponseForView.status)" variant="tonal">
                            {{ getStatusText(selectedResponseForView.status) }}
                        </VChip>
                        <p v-if="selectedResponseForView.form?.description" class="text-body-2 mt-4">
                            {{ selectedResponseForView.form.description }}
                        </p>
                    </div>

                    <!-- Respostas por seção -->
                    <div v-for="(section, sectionIndex) in selectedResponseForView.form?.sections"
                        :key="section.id || sectionIndex" class="mb-6">
                        <h4 class="text-subtitle-1 mb-4 d-flex align-center">
                            <VIcon icon="ri-folder-line" class="me-2" size="small" />
                            {{ section.title }}
                        </h4>

                        <div class="ms-4">
                            <div v-for="question in section.questions" :key="question.id"
                                class="mb-4 pa-3 bg-grey-lighten-5 rounded">
                                <div class="text-subtitle-2 mb-2">
                                    {{ question.title }}
                                    <span v-if="question.required" class="text-error text-caption ml-1">*</span>
                                </div>
                                <div v-if="question.description" class="text-caption text-medium-emphasis mb-2">
                                    {{ question.description }}
                                </div>
                                <div class="text-body-1">
                                    <strong>Resposta:</strong>
                                    <span class="ml-2">
                                        {{ formatResponseValue(selectedResponseForView.parsedResponses[question.id]) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <VDivider class="my-4" />
                    <div class="text-caption text-medium-emphasis">
                        <div><strong>ID:</strong> {{ selectedResponseForView.id }}</div>
                        <div><strong>Criado:</strong> {{ formatDate(selectedResponseForView.createdAt) }}</div>
                        <div><strong>Atualizado:</strong> {{ formatDate(selectedResponseForView.updatedAt) }}</div>
                    </div>
                </VCardText>

                <VCardActions class="px-6 pb-6">
                    <VSpacer />
                    <VBtn variant="outlined" @click="showResponseDetailDialog = false">Fechar</VBtn>
                </VCardActions>
            </VCard>
        </VDialog>
    </div>
</template>

<style scoped>
.border {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rounded-lg {
    border-radius: 12px;
}
</style>
