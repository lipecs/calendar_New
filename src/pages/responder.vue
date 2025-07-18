<!-- src/pages/responder.vue - CÓDIGO ORGANIZADO -->
<script setup>
import axios from 'axios'
import { onMounted, ref } from 'vue'

// ============ ESTADOS REATIVOS ============
const availableForms = ref([])
const myResponses = ref([])
const currentForm = ref(null)
const responses = ref({})
const loading = ref(false)
const alert = ref('')
const alertType = ref('success')

// ============ UTILITÁRIOS ============
const getUser = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user.userData || null
    } catch {
        return null
    }
}

const getHeaders = () => {
    const user = getUser()
    if (!user) return {}

    return {
        'X-User-Id': user.id?.toString() || '',
        'X-User-Role': (user.role || 'user').toUpperCase(),
        'Content-Type': 'application/json'
    }
}

const showAlert = (message, type = 'success') => {
    alert.value = message
    alertType.value = type
    setTimeout(() => { alert.value = '' }, 5000)
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

        // Validar questões obrigatórias
        if (!validateRequiredQuestions()) {
            loading.value = false
            return
        }

        const payload = {
            formId: currentForm.value.id,
            responses: JSON.stringify(responses.value),
            status: 'COMPLETED'
        }

        await axios.post('http://localhost:8080/api/forms/responses', payload, {
            headers: getHeaders()
        })

        showAlert('Formulário enviado com sucesso!', 'success')

        // Fechar e recarregar
        closeForm()
        await loadAvailableForms()
        await loadMyResponses()

    } catch (error) {
        console.error('❌ Erro ao enviar formulário:', error)
        showAlert('Erro ao enviar formulário: ' + (error.response?.data || error.message), 'error')
    } finally {
        loading.value = false
    }
}

// ============ FUNÇÕES DE CONTROLE ============
const startForm = (form) => {
    console.log('📝 Iniciando formulário:', form.title)
    currentForm.value = form
    responses.value = {}

    // Inicializar respostas
    if (form.sections) {
        form.sections.forEach(section => {
            if (section.questions) {
                section.questions.forEach(question => {
                    // Inicializar array para múltipla escolha
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

                        // Verificar se está vazio
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
                    <!-- Empty State -->
                    <div v-if="availableForms.length === 0" class="text-center py-8">
                        <VIcon icon="ri-file-list-line" size="64" class="mb-4 text-disabled" />
                        <p class="text-disabled">Nenhum formulário disponível</p>
                    </div>

                    <!-- Lista de Formulários -->
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
                    <!-- Empty State -->
                    <div v-if="myResponses.length === 0" class="text-center py-8">
                        <VIcon icon="ri-file-check-line" size="64" class="mb-4 text-disabled" />
                        <p class="text-disabled">Nenhuma resposta ainda</p>
                    </div>

                    <!-- Lista de Respostas -->
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
                </VCardText>
            </VCard>
        </div>

        <!-- ============ RESPONDER FORMULÁRIO ============ -->
        <div v-else>
            <!-- Header do Formulário -->
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

            <!-- Alerta -->
            <VAlert v-if="alert" :type="alertType" class="mb-4" closable @click:close="alert = ''">
                {{ alert }}
            </VAlert>

            <!-- Formulário -->
            <VCard>
                <VCardText class="pa-6">
                    <!-- Seções -->
                    <div v-for="(section, sectionIndex) in currentForm.sections" :key="section.id || sectionIndex"
                        class="mb-8">
                        <!-- Título da Seção -->
                        <div class="d-flex align-center mb-6">
                            <VIcon icon="ri-folder-line" color="primary" class="me-2" />
                            <h2 class="text-h5">{{ section.title }}</h2>
                        </div>

                        <!-- Questões da Seção -->
                        <div class="ms-6">
                            <div v-for="(question, questionIndex) in section.questions"
                                :key="question.id || questionIndex" class="mb-6 pa-4 border rounded-lg">
                                <!-- Título da Questão -->
                                <div class="mb-4">
                                    <h3 class="text-h6 mb-2">
                                        {{ question.title }}
                                        <span v-if="question.required" class="text-error">*</span>
                                    </h3>
                                    <p v-if="question.description" class="text-body-2 text-medium-emphasis">
                                        {{ question.description }}
                                    </p>
                                </div>

                                <!-- ============ CAMPOS POR TIPO ============ -->

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

                <!-- Ações -->
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
