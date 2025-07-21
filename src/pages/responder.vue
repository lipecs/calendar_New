<!-- src/pages/responder.vue - CÓDIGO COMPLETO CORRIGIDO -->
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
const currentUser = ref(null)
// ============ UTILITÁRIOS ============
const getUser = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user.userData || null
    } catch {
        return null
    }
}

// ============ FUNÇÃO CORRIGIDA getCurrentUser ============
const getCurrentUser = () => {
    try {
        console.log('🔍 Verificando usuário atual...')

        // Primeira tentativa: verificar se existe 'user' no localStorage
        let userData = null
        let token = null

        // Tentar diferentes chaves do localStorage
        const possibleKeys = ['user', 'userData', 'currentUser', 'auth']

        for (const key of possibleKeys) {
            const stored = localStorage.getItem(key)
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    console.log(`📋 Dados encontrados em '${key}':`, parsed)

                    // Verificar se tem userData
                    if (parsed.userData && parsed.userData.id) {
                        userData = parsed.userData
                        token = parsed.token || localStorage.getItem('token')
                        break
                    }
                    // Verificar se o próprio objeto tem id
                    else if (parsed.id) {
                        userData = parsed
                        token = localStorage.getItem('token')
                        break
                    }
                } catch (e) {
                    console.warn(`⚠️ Erro ao parsear ${key}:`, e)
                }
            }
        }

        // Se não encontrou userData, tentar token separado
        if (!token) {
            token = localStorage.getItem('token') || localStorage.getItem('authToken')
        }

        // Se ainda não tem userData, criar estrutura básica
        if (!userData) {
            console.warn('⚠️ userData não encontrado, tentando fallback...')

            // Tentar extrair ID do token (se for JWT)
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]))
                    if (payload.id || payload.userId || payload.sub) {
                        userData = {
                            id: payload.id || payload.userId || payload.sub,
                            username: payload.username || payload.name || 'Usuário',
                            email: payload.email || ''
                        }
                        console.log('✅ userData extraído do token:', userData)
                    }
                } catch (e) {
                    console.warn('⚠️ Não foi possível extrair dados do token:', e)
                }
            }
        }

        // Verificação final
        if (!userData || !userData.id) {
            console.error('❌ Não foi possível obter dados do usuário')
            console.log('📋 localStorage keys disponíveis:', Object.keys(localStorage))

            // Log de todos os itens do localStorage para debug
            Object.keys(localStorage).forEach(key => {
                console.log(`   ${key}:`, localStorage.getItem(key))
            })

            throw new Error('Usuário não autenticado ou dados inválidos')
        }

        const result = {
            token: token || '',
            userData: userData
        }

        console.log('✅ Usuário atual obtido:', result)
        return result

    } catch (error) {
        console.error('❌ Erro ao obter usuário atual:', error)

        // Opcional: redirecionar para login
        // window.location.href = '/login'

        throw error
    }
}

const getHeaders = () => {
    try {
        const currentUser = getCurrentUser()

        const headers = {
            'Content-Type': 'application/json'
        }

        // Adicionar Authorization se tiver token
        if (currentUser.token) {
            headers['Authorization'] = `Bearer ${currentUser.token}`
        }

        console.log('📨 Headers preparados:', headers)
        return headers

    } catch (error) {
        console.error('❌ Erro ao obter headers:', error)
        return {
            'Content-Type': 'application/json'
        }
    }
}

const showAlert = (message, type = 'success') => {
    alert.value = message
    alertType.value = type
    setTimeout(() => { alert.value = '' }, 5000)
}

// ============ FUNÇÕES DE API CORRIGIDAS ============
const loadAvailableForms = async () => {
    try {
        loading.value = true
        console.log('🔄 Carregando formulários disponíveis...')

        const currentUser = getCurrentUser() // ✅ Obter usuário aqui

        const response = await axios.get('http://localhost:8080/api/forms/available', {
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUser.userData.id.toString(),
                'Authorization': `Bearer ${currentUser.token}`
            }
        })

        availableForms.value = response.data || []
        console.log('✅ Formulários disponíveis:', availableForms.value.length)
    } catch (error) {
        console.error('❌ Erro:', error)

        let errorMessage = 'Erro desconhecido'
        if (error.response?.data) {
            errorMessage = typeof error.response.data === 'object'
                ? error.response.data.error || JSON.stringify(error.response.data)
                : error.response.data
        } else {
            errorMessage = error.message
        }

        showAlert('Erro ao carregar formulários: ' + errorMessage, 'error')
    } finally {
        loading.value = false
    }
}

const loadMyResponses = async () => {
    try {
        console.log('🔄 Carregando minhas respostas...')

        const currentUser = getCurrentUser() // ✅ Obter usuário aqui

        const response = await axios.get('http://localhost:8080/api/forms/responses/my', {
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUser.userData.id.toString(),
                'Authorization': `Bearer ${currentUser.token}`
            }
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

        const currentUser = getCurrentUser() // ✅ Obter usuário aqui

        const payload = {
            formId: currentForm.value.id,
            userId: currentUser.userData.id, // ✅ Agora está garantido que existe
            responses: JSON.stringify(responses.value),
            status: 'DRAFT'
        }

        console.log('💾 Payload do rascunho:', payload)

        await axios.post('http://localhost:8080/api/forms/responses/draft', payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUser.userData.id.toString(),
                'Authorization': `Bearer ${currentUser.token}`
            }
        })

        showAlert('Rascunho salvo!', 'success')
    } catch (error) {
        console.error('❌ Erro ao salvar rascunho:', error)

        let errorMessage = 'Erro desconhecido'
        if (error.response?.data) {
            errorMessage = typeof error.response.data === 'object'
                ? error.response.data.error || JSON.stringify(error.response.data)
                : error.response.data
        } else {
            errorMessage = error.message
        }

        showAlert('Erro ao salvar rascunho: ' + errorMessage, 'error')
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

        // 🔧 CORREÇÃO: Obter dados do usuário atual COM VALIDAÇÃO
        const currentUser = getCurrentUser()

        // ✅ Verificação adicional de segurança
        if (!currentUser.userData || !currentUser.userData.id) {
            throw new Error('Dados do usuário inválidos')
        }

        // 🔧 CORREÇÃO: Estruturar payload corretamente
        const payload = {
            formId: currentForm.value.id,
            userId: currentUser.userData.id,
            responses: JSON.stringify(responses.value),
            status: 'COMPLETED'
        }

        console.log('📤 Payload enviado:', payload)

        // 🔧 CORREÇÃO: Usar endpoint correto com headers apropriados
        const response = await axios.post('http://localhost:8080/api/forms/responses', payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUser.userData.id.toString(), // ✅ Agora está protegido
                'Authorization': `Bearer ${currentUser.token}`
            }
        })

        console.log('✅ Resposta do servidor:', response.data)
        showAlert('Formulário enviado com sucesso!', 'success')

        // Fechar e recarregar
        closeForm()
        await loadAvailableForms()
        await loadMyResponses()

    } catch (error) {
        console.error('❌ Erro ao enviar formulário:', error)

        // 🔧 MELHOR TRATAMENTO DE ERRO
        let errorMessage = 'Erro desconhecido'

        if (error.response) {
            // Erro do servidor
            if (error.response.data && typeof error.response.data === 'object' && error.response.data.error) {
                errorMessage = error.response.data.error
            } else if (typeof error.response.data === 'string') {
                errorMessage = error.response.data
            } else {
                errorMessage = `Erro ${error.response.status}: ${error.response.statusText}`
            }
            console.error('❌ Dados do erro:', error.response.data)
            console.error('❌ Status do erro:', error.response.status)
        } else if (error.request) {
            // Erro de rede
            errorMessage = 'Erro de conexão com o servidor'
        } else {
            // Erro de configuração
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

    // Inicializar respostas
    if (form.sections) {
        form.sections.forEach(section => {
            if (section.questions) {
                section.questions.forEach(question => {
                    // Inicializar baseado no tipo da questão
                    switch (question.type) {
                        case 'MULTIPLE':
                            responses.value[question.id] = []
                            break
                        case 'NUMBER':
                            responses.value[question.id] = null
                            break
                        case 'DATE':
                        case 'TIME':
                            responses.value[question.id] = ''
                            break
                        default:
                            responses.value[question.id] = ''
                    }
                })
            }
        })
    }

    console.log('📝 Respostas inicializadas:', responses.value)
}

const closeForm = () => {
    currentForm.value = null
    responses.value = {}
}

const validateRequiredQuestions = () => {
    let hasError = false
    const errors = []

    if (currentForm.value.sections) {
        currentForm.value.sections.forEach(section => {
            if (section.questions) {
                section.questions.forEach(question => {
                    if (question.required) {
                        const response = responses.value[question.id]

                        // 🔧 VALIDAÇÃO MELHORADA
                        let isEmpty = false

                        if (response === null || response === undefined) {
                            isEmpty = true
                        } else if (typeof response === 'string' && response.trim() === '') {
                            isEmpty = true
                        } else if (Array.isArray(response) && response.length === 0) {
                            isEmpty = true
                        }

                        if (isEmpty) {
                            const errorMsg = `${section.title} - ${question.title}: Campo obrigatório`
                            errors.push(errorMsg)
                            hasError = true
                        }
                    }
                })
            }
        })
    }

    // 🔧 MOSTRAR TODOS OS ERROS DE UMA VEZ
    if (hasError) {
        const errorMessage = errors.length === 1
            ? errors[0]
            : `${errors.length} campos obrigatórios não preenchidos:\n• ${errors.join('\n• ')}`

        showAlert(errorMessage, 'error')
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
    console.log('🔄 Atualizando múltipla escolha:', { questionId, option, checked })

    if (!Array.isArray(responses.value[questionId])) {
        responses.value[questionId] = []
    }

    if (checked) {
        // Adicionar opção se não estiver presente
        if (!responses.value[questionId].includes(option)) {
            responses.value[questionId].push(option)
        }
    } else {
        // Remover opção
        responses.value[questionId] = responses.value[questionId].filter(item => item !== option)
    }

    console.log('🔄 Respostas atualizadas para questão', questionId, ':', responses.value[questionId])
}

const isOptionSelected = (questionId, option) => {
    return Array.isArray(responses.value[questionId])
        ? responses.value[questionId].includes(option)
        : false
}
const canViewOthersResponses = computed(() => {
    if (!currentUser.value?.userData?.role) return false

    const role = currentUser.value.userData.role
    return ['admin', 'diretor', 'supervisor', 'coordenador'].includes(role)
})

// ✅ NOVO: Navegação para página de visualização
const navigateToViewResponses = () => {
    // Adapte conforme seu sistema de roteamento
    // Exemplo usando Vue Router:
    // router.push('/visualizar-respostas')

    // Ou usando window.location:
    window.location.href = '/visualizar-respostas'

    // Ou usando sua implementação de navegação
    showAlert('Redirecionando para visualizar respostas...', 'info')
}


// ============ LIFECYCLE ============
onMounted(async () => {
    try {
        console.log('🚀 Iniciando página de respostas...')

        // ✅ NOVO: Armazenar usuário atual
        currentUser.value = getCurrentUser()
        console.log('👤 Usuário logado:', currentUser.value.userData)

        await loadAvailableForms()
        await loadMyResponses()

        console.log('✅ Componente inicializado com sucesso')
    } catch (error) {
        console.error('❌ Erro na inicialização:', error)
        showAlert('Erro ao inicializar página: ' + error.message, 'error')
    }
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
                    <h1 class="text-h4 mb-2">Responder Formulários</h1>
                    <p class="text-medium-emphasis">Formulários disponíveis para você</p>
                </div>

                <!-- ✅ NOVO: Botão para visualizar respostas (apenas para Admin, Diretor, Supervisor, Coordenador) -->
                <div v-if="canViewOthersResponses" class="d-flex gap-2">
                    <VBtn color="info" variant="outlined" @click="navigateToViewResponses" :disabled="loading">
                        <VIcon icon="ri-eye-line" class="me-2" />
                        Ver Respostas
                    </VBtn>
                </div>
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
