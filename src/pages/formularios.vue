<!-- src/pages/formularios.vue - COM CRIAÇÃO DE QUESTÕES -->
<script setup>
import axios from 'axios'
import { onMounted, ref } from 'vue'

// Estados simples
const forms = ref([])
const users = ref([])
const loading = ref(false)
const showDialog = ref(false)

// Dados do formulário
const title = ref('')
const description = ref('')
const startDate = ref('')
const endDate = ref('')
const selectedUsers = ref([])

// Seções e questões
const sections = ref([{
    title: 'Seção 1',
    questions: []
}])

// Nova questão
const showQuestionDialog = ref(false)
const currentSectionIndex = ref(0)
const newQuestion = ref({
    title: '',
    type: 'TEXT',
    description: '',
    required: false,
    options: []
})

// Tipos de questões
const questionTypes = [
    { title: 'Texto (uma linha)', value: 'TEXT' },
    { title: 'Texto (múltiplas linhas)', value: 'TEXTAREA' },
    { title: 'Número', value: 'NUMBER' },
    { title: 'Data', value: 'DATE' },
    { title: 'Hora', value: 'TIME' },
    { title: 'Múltipla Escolha', value: 'MULTIPLE' },
    { title: 'Escolha Única', value: 'SINGLE' },
    { title: 'Lista Suspensa', value: 'SELECT' },
    { title: 'Arquivo', value: 'FILE' }
]

// Alerta
const alert = ref('')
const alertType = ref('success')

// Função para buscar usuário logado
const getUser = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user.userData || null
    } catch {
        return null
    }
}

// Headers para API
const getHeaders = () => {
    const user = getUser()
    if (!user) return {}

    return {
        'X-User-Id': user.id?.toString() || '',
        'X-User-Role': (user.role || 'user').toUpperCase(),
        'Content-Type': 'application/json'
    }
}

// Carregar formulários
const loadForms = async () => {
    try {
        loading.value = true
        console.log('🔄 Carregando formulários...')

        const response = await axios.get('http://localhost:8080/api/forms', {
            headers: getHeaders()
        })

        forms.value = response.data || []
        console.log('✅ Formulários carregados:', forms.value.length)
        showAlert('Formulários carregados!', 'success')
    } catch (error) {
        console.error('❌ Erro:', error)
        showAlert('Erro ao carregar formulários: ' + (error.response?.data || error.message), 'error')
    } finally {
        loading.value = false
    }
}

// Carregar usuários
const loadUsers = async () => {
    try {
        console.log('🔄 Carregando usuários...')

        const response = await axios.get('http://localhost:8080/api/admin/users', {
            headers: getHeaders()
        })

        users.value = response.data || []
        console.log('✅ Usuários carregados:', users.value.length)
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error)
        showAlert('Erro ao carregar usuários', 'error')
    }
}

// Criar formulário
const createForm = async () => {
    try {
        loading.value = true
        console.log('📝 Criando formulário...')

        if (!title.value.trim()) {
            showAlert('Digite um título!', 'error')
            return
        }

        if (!startDate.value || !endDate.value) {
            showAlert('Selecione as datas!', 'error')
            return
        }

        if (selectedUsers.value.length === 0) {
            showAlert('Selecione pelo menos um usuário!', 'error')
            return
        }

        if (sections.value.every(s => s.questions.length === 0)) {
            showAlert('Adicione pelo menos uma questão!', 'error')
            return
        }

        const payload = {
            title: title.value.trim(),
            description: description.value.trim() || '',
            startDate: startDate.value,
            endDate: endDate.value,
            status: 'ACTIVE',
            assignedUsers: selectedUsers.value,
            sections: sections.value.map((section, index) => ({
                title: section.title,
                orderIndex: index + 1,
                questions: section.questions.map((question, qIndex) => ({
                    title: question.title,
                    type: question.type,
                    description: question.description || '',
                    required: question.required || false,
                    options: question.options && question.options.length > 0 ? JSON.stringify(question.options) : null,
                    orderIndex: qIndex + 1
                }))
            }))
        }

        console.log('📤 Enviando:', payload)

        const response = await axios.post('http://localhost:8080/api/forms', payload, {
            headers: getHeaders()
        })

        console.log('✅ Formulário criado:', response.data)
        showAlert('Formulário criado com sucesso!', 'success')

        // Fechar dialog e resetar
        showDialog.value = false
        resetForm()

        // Recarregar lista
        await loadForms()

    } catch (error) {
        console.error('❌ Erro ao criar:', error)
        showAlert('Erro ao criar formulário: ' + (error.response?.data || error.message), 'error')
    } finally {
        loading.value = false
    }
}

// Excluir formulário
const deleteForm = async (formId) => {
    if (!confirm('Excluir este formulário?')) return

    try {
        console.log('🗑️ Excluindo formulário:', formId)

        await axios.delete(`http://localhost:8080/api/forms/${formId}`, {
            headers: getHeaders()
        })

        showAlert('Formulário excluído!', 'success')
        await loadForms()
    } catch (error) {
        console.error('❌ Erro ao excluir:', error)
        showAlert('Erro ao excluir formulário', 'error')
    }
}

// Adicionar seção
const addSection = () => {
    sections.value.push({
        title: `Seção ${sections.value.length + 1}`,
        questions: []
    })
}

// Remover seção
const removeSection = (index) => {
    if (sections.value.length > 1) {
        sections.value.splice(index, 1)
    }
}

// Abrir dialog de questão
const openQuestionDialog = (sectionIndex) => {
    currentSectionIndex.value = sectionIndex
    newQuestion.value = {
        title: '',
        type: 'TEXT',
        description: '',
        required: false,
        options: []
    }
    showQuestionDialog.value = true
}

// Adicionar questão
const addQuestion = () => {
    if (!newQuestion.value.title.trim()) {
        showAlert('Digite o título da questão!', 'error')
        return
    }

    const question = { ...newQuestion.value }

    // Filtrar opções vazias
    if (question.options) {
        question.options = question.options.filter(opt => opt.trim() !== '')
    }

    sections.value[currentSectionIndex.value].questions.push(question)
    showQuestionDialog.value = false
    showAlert('Questão adicionada!', 'success')
}

// Remover questão
const removeQuestion = (sectionIndex, questionIndex) => {
    sections.value[sectionIndex].questions.splice(questionIndex, 1)
}

// Adicionar opção
const addOption = () => {
    newQuestion.value.options.push('')
}

// Remover opção
const removeOption = (index) => {
    newQuestion.value.options.splice(index, 1)
}

// Resetar formulário
const resetForm = () => {
    title.value = ''
    description.value = ''
    startDate.value = ''
    endDate.value = ''
    selectedUsers.value = []
    sections.value = [{
        title: 'Seção 1',
        questions: []
    }]
}

// Mostrar alerta
const showAlert = (message, type = 'success') => {
    alert.value = message
    alertType.value = type

    setTimeout(() => {
        alert.value = ''
    }, 5000)
}

// Abrir dialog
const openDialog = () => {
    resetForm()
    showDialog.value = true
}

// Verificar se questão precisa de opções
const needsOptions = (type) => {
    return ['MULTIPLE', 'SINGLE', 'SELECT'].includes(type)
}

// Lifecycle
onMounted(() => {
    console.log('🚀 Iniciando página de formulários...')
    console.log('👤 Usuário logado:', getUser())

    loadForms()
    loadUsers()
})
</script>

<template>
    <div class="pa-6">
        <!-- Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h1 class="text-h4 mb-2">Formulários</h1>
                <p class="text-medium-emphasis">Gerencie seus formulários</p>
            </div>
            <VBtn color="primary" @click="openDialog">
                <VIcon icon="ri-add-line" class="me-2" />
                Novo Formulário
            </VBtn>
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

        <!-- Lista de formulários -->
        <div v-else-if="forms.length === 0" class="text-center py-8">
            <VIcon icon="ri-file-list-line" size="64" class="mb-4 text-disabled" />
            <h3 class="mb-2">Nenhum formulário</h3>
            <p class="text-medium-emphasis mb-4">Clique em "Novo Formulário" para começar</p>
            <VBtn color="primary" @click="openDialog">Criar Formulário</VBtn>
        </div>

        <VRow v-else>
            <VCol v-for="form in forms" :key="form.id" cols="12" md="6" lg="4">
                <VCard>
                    <VCardTitle>{{ form.title }}</VCardTitle>
                    <VCardSubtitle v-if="form.description">{{ form.description }}</VCardSubtitle>
                    <VCardText>
                        <p class="mb-2">
                            <VIcon icon="ri-calendar-line" size="16" class="me-2" />
                            {{ form.startDate }} até {{ form.endDate }}
                        </p>
                        <p class="mb-2">
                            <VIcon icon="ri-user-line" size="16" class="me-2" />
                            {{ form.assignedUsers?.length || 0 }} usuários
                        </p>
                        <p class="mb-2">
                            <VIcon icon="ri-question-line" size="16" class="me-2" />
                            {{form.sections?.reduce((total, section) => total + (section.questions?.length || 0), 0) ||
                                0}} questões
                        </p>
                        <VChip :color="form.status === 'ACTIVE' ? 'success' : 'secondary'" size="small">
                            {{ form.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                        </VChip>
                    </VCardText>
                    <VCardActions>
                        <VBtn size="small" color="error" @click="deleteForm(form.id)">
                            Excluir
                        </VBtn>
                    </VCardActions>
                </VCard>
            </VCol>
        </VRow>

        <!-- Dialog Novo Formulário -->
        <VDialog v-model="showDialog" max-width="900px" scrollable>
            <VCard>
                <VCardTitle>Novo Formulário</VCardTitle>
                <VCardText style="height: 600px;">
                    <VForm @submit.prevent="createForm">
                        <!-- Informações básicas -->
                        <h3 class="mb-4">Informações Básicas</h3>

                        <VTextField v-model="title" label="Título" class="mb-4" required />

                        <VTextarea v-model="description" label="Descrição" rows="3" class="mb-4" />

                        <VRow>
                            <VCol cols="6">
                                <VTextField v-model="startDate" label="Data Início" type="date" required />
                            </VCol>
                            <VCol cols="6">
                                <VTextField v-model="endDate" label="Data Fim" type="date" required />
                            </VCol>
                        </VRow>

                        <VSelect v-model="selectedUsers" :items="users" item-title="username" item-value="id"
                            label="Usuários que podem responder" multiple chips class="mb-6" />

                        <!-- Seções e Questões -->
                        <div class="d-flex justify-space-between align-center mb-4">
                            <h3>Seções e Questões</h3>
                            <VBtn size="small" color="primary" @click="addSection">
                                Adicionar Seção
                            </VBtn>
                        </div>

                        <div v-for="(section, sectionIndex) in sections" :key="sectionIndex"
                            class="border rounded pa-4 mb-4">
                            <!-- Título da seção -->
                            <div class="d-flex align-center gap-2 mb-3">
                                <VTextField v-model="section.title" label="Título da Seção" density="compact"
                                    class="flex-grow-1" />
                                <VBtn v-if="sections.length > 1" icon="ri-delete-bin-line" size="small" color="error"
                                    @click="removeSection(sectionIndex)" />
                            </div>

                            <!-- Questões da seção -->
                            <div class="ms-4">
                                <div v-for="(question, questionIndex) in section.questions" :key="questionIndex"
                                    class="border-l-2 border-primary pl-4 mb-3">
                                    <div class="d-flex justify-space-between align-center">
                                        <div class="flex-grow-1">
                                            <p class="font-weight-bold mb-1">{{ question.title }}</p>
                                            <p class="text-sm text-medium-emphasis">
                                                Tipo: {{questionTypes.find(t => t.value === question.type)?.title}}
                                                {{ question.required ? ' • Obrigatória' : ' • Opcional' }}
                                            </p>
                                        </div>
                                        <VBtn icon="ri-delete-bin-line" size="small" color="error"
                                            @click="removeQuestion(sectionIndex, questionIndex)" />
                                    </div>
                                </div>

                                <VBtn size="small" color="primary" variant="outlined"
                                    @click="openQuestionDialog(sectionIndex)">
                                    <VIcon icon="ri-add-line" class="me-2" />
                                    Adicionar Questão
                                </VBtn>
                            </div>
                        </div>
                    </VForm>
                </VCardText>
                <VCardActions>
                    <VSpacer />
                    <VBtn @click="showDialog = false">Cancelar</VBtn>
                    <VBtn color="primary" @click="createForm" :loading="loading">
                        Criar Formulário
                    </VBtn>
                </VCardActions>
            </VCard>
        </VDialog>

        <!-- Dialog Nova Questão -->
        <VDialog v-model="showQuestionDialog" max-width="600px">
            <VCard>
                <VCardTitle>Nova Questão</VCardTitle>
                <VCardText>
                    <VTextField v-model="newQuestion.title" label="Título da Questão" class="mb-4" required />

                    <VTextarea v-model="newQuestion.description" label="Descrição (opcional)" rows="2" class="mb-4" />

                    <VSelect v-model="newQuestion.type" :items="questionTypes" label="Tipo de Questão" class="mb-4" />

                    <VCheckbox v-model="newQuestion.required" label="Questão obrigatória" class="mb-4" />

                    <!-- Opções para questões de múltipla escolha -->
                    <div v-if="needsOptions(newQuestion.type)">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <h4>Opções</h4>
                            <VBtn size="small" @click="addOption">Adicionar</VBtn>
                        </div>

                        <div v-for="(option, index) in newQuestion.options" :key="index" class="d-flex gap-2 mb-2">
                            <VTextField v-model="newQuestion.options[index]" :label="`Opção ${index + 1}`"
                                density="compact" class="flex-grow-1" />
                            <VBtn icon="ri-delete-bin-line" size="small" color="error" @click="removeOption(index)" />
                        </div>

                        <VBtn v-if="newQuestion.options.length === 0" @click="addOption">
                            Primeira Opção
                        </VBtn>
                    </div>
                </VCardText>
                <VCardActions>
                    <VSpacer />
                    <VBtn @click="showQuestionDialog = false">Cancelar</VBtn>
                    <VBtn color="primary" @click="addQuestion">
                        Adicionar Questão
                    </VBtn>
                </VCardActions>
            </VCard>
        </VDialog>
    </div>
</template>

<style scoped>
.border-l-2 {
    border-left: 2px solid;
}

.border-primary {
    border-color: rgb(var(--v-theme-primary));
}
</style>
