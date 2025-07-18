<!-- src/pages/forms/index.vue - SISTEMA SIMPLES E FUNCIONAL -->
<script setup>
import authService from '@/services/auth'
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

// Router
const router = useRouter()

// Estados
const forms = ref([])
const users = ref([])
const isLoading = ref(false)
const isFormDialogOpen = ref(false)
const isEditMode = ref(false)
const currentFormId = ref(null)

// Dados do formulário
const formData = ref({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    assignedUsers: [],
    sections: [{
        title: 'Seção 1',
        questions: []
    }]
})

// Alertas
const alert = ref({
    show: false,
    type: 'success',
    message: ''
})

// Permissões
const currentUser = computed(() => authService.getCurrentUser()?.userData)
const canCreateForms = computed(() => {
    const role = currentUser.value?.role
    return ['admin', 'diretor', 'supervisor', 'coordenador'].includes(role)
})

// Headers para API
const getHeaders = () => {
    const user = authService.getCurrentUser()
    return {
        'X-User-Id': user?.userData?.id?.toString(),
        'X-User-Role': user?.userData?.role?.toUpperCase(),
        'Content-Type': 'application/json'
    }
}

// Carregar formulários
const loadForms = async () => {
    try {
        isLoading.value = true

        const response = await axios.get('/api/forms', {
            headers: getHeaders()
        })

        forms.value = response.data || []
        showAlert('success', 'Formulários carregados com sucesso')
    } catch (error) {
        console.error('Erro ao carregar formulários:', error)
        showAlert('error', 'Erro ao carregar formulários: ' + (error.response?.data || error.message))
    } finally {
        isLoading.value = false
    }
}

// Carregar usuários
const loadUsers = async () => {
    try {
        const response = await axios.get('/api/admin/users', {
            headers: getHeaders()
        })

        users.value = response.data || []
    } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        showAlert('error', 'Erro ao carregar usuários')
    }
}

// Criar formulário
const createForm = async () => {
    try {
        isLoading.value = true

        const payload = {
            title: formData.value.title,
            description: formData.value.description,
            startDate: formData.value.startDate,
            endDate: formData.value.endDate,
            assignedUsers: formData.value.assignedUsers,
            sections: formData.value.sections.map((section, index) => ({
                title: section.title,
                orderIndex: index + 1,
                questions: section.questions.map((question, qIndex) => ({
                    title: question.title,
                    type: question.type?.toUpperCase() || 'TEXT',
                    description: question.description || '',
                    required: question.required || false,
                    options: question.options ? JSON.stringify(question.options) : null,
                    orderIndex: qIndex + 1
                }))
            }))
        }

        await axios.post('/api/forms', payload, {
            headers: getHeaders()
        })

        showAlert('success', 'Formulário criado com sucesso!')
        closeDialog()
        await loadForms()
    } catch (error) {
        console.error('Erro ao criar formulário:', error)
        showAlert('error', 'Erro ao criar formulário: ' + (error.response?.data || error.message))
    } finally {
        isLoading.value = false
    }
}

// Excluir formulário
const deleteForm = async (formId) => {
    if (!confirm('Tem certeza que deseja excluir este formulário?')) return

    try {
        await axios.delete(`/api/forms/${formId}`, {
            headers: getHeaders()
        })

        showAlert('success', 'Formulário excluído com sucesso!')
        await loadForms()
    } catch (error) {
        console.error('Erro ao excluir formulário:', error)
        showAlert('error', 'Erro ao excluir formulário')
    }
}

// Abrir diálogo
const openDialog = (form = null) => {
    if (form) {
        isEditMode.value = true
        currentFormId.value = form.id
        formData.value = { ...form }
    } else {
        isEditMode.value = false
        resetForm()
    }
    isFormDialogOpen.value = true
}

// Fechar diálogo
const closeDialog = () => {
    isFormDialogOpen.value = false
    resetForm()
}

// Resetar formulário
const resetForm = () => {
    formData.value = {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        assignedUsers: [],
        sections: [{
            title: 'Seção 1',
            questions: []
        }]
    }
}

// Adicionar questão
const addQuestion = (sectionIndex) => {
    formData.value.sections[sectionIndex].questions.push({
        title: '',
        type: 'text',
        description: '',
        required: false,
        options: []
    })
}

// Remover questão
const removeQuestion = (sectionIndex, questionIndex) => {
    formData.value.sections[sectionIndex].questions.splice(questionIndex, 1)
}

// Adicionar seção
const addSection = () => {
    formData.value.sections.push({
        title: `Seção ${formData.value.sections.length + 1}`,
        questions: []
    })
}

// Remover seção
const removeSection = (index) => {
    if (formData.value.sections.length > 1) {
        formData.value.sections.splice(index, 1)
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

// Ir para página de respostas
const goToResponses = () => {
    router.push('/forms/reply')
}

// Lifecycle
onMounted(() => {
    loadForms()
    loadUsers()
})
</script>

<template>
    <div>
        <!-- Header -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h2 class="text-h4 mb-1">Formulários</h2>
                <p class="text-medium-emphasis">Gerencie seus formulários dinâmicos</p>
            </div>
            <div class="d-flex gap-3">
                <VBtn color="info" variant="outlined" prepend-icon="ri-file-list-2-line" @click="goToResponses">
                    Responder Formulários
                </VBtn>
                <VBtn v-if="canCreateForms" color="primary" prepend-icon="ri-add-line" @click="openDialog()">
                    Novo Formulário
                </VBtn>
            </div>
        </div>

        <!-- Alerta -->
        <VAlert v-if="alert.show" :type="alert.type" closable class="mb-4" @click:close="alert.show = false">
            {{ alert.message }}
        </VAlert>

        <!-- Lista de formulários -->
        <VCard>
            <VCardText>
                <div v-if="isLoading" class="text-center py-8">
                    <VProgressCircular indeterminate color="primary" />
                    <p class="mt-4">Carregando formulários...</p>
                </div>

                <div v-else-if="forms.length === 0" class="text-center py-8">
                    <VIcon icon="ri-file-list-2-line" size="48" class="mb-4 text-disabled" />
                    <p class="text-disabled">Nenhum formulário encontrado</p>
                    <VBtn v-if="canCreateForms" color="primary" @click="openDialog()">
                        Criar Primeiro Formulário
                    </VBtn>
                </div>

                <div v-else>
                    <VRow>
                        <VCol v-for="form in forms" :key="form.id" cols="12" md="6" lg="4">
                            <VCard class="h-100">
                                <VCardTitle>{{ form.title }}</VCardTitle>
                                <VCardSubtitle v-if="form.description">
                                    {{ form.description }}
                                </VCardSubtitle>
                                <VCardText>
                                    <div class="mb-2">
                                        <VIcon icon="ri-calendar-line" size="16" class="me-2" />
                                        <span class="text-sm">{{ form.startDate }} - {{ form.endDate }}</span>
                                    </div>
                                    <div class="mb-2">
                                        <VIcon icon="ri-user-line" size="16" class="me-2" />
                                        <span class="text-sm">{{ form.assignedUsers?.length || 0 }} usuários</span>
                                    </div>
                                    <VChip :color="form.status === 'ACTIVE' ? 'success' : 'secondary'" size="small">
                                        {{ form.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                                    </VChip>
                                </VCardText>
                                <VCardActions>
                                    <VBtn size="small" color="primary" variant="outlined" @click="openDialog(form)">
                                        Editar
                                    </VBtn>
                                    <VBtn size="small" color="error" variant="outlined" @click="deleteForm(form.id)">
                                        Excluir
                                    </VBtn>
                                </VCardActions>
                            </VCard>
                        </VCol>
                    </VRow>
                </div>
            </VCardText>
        </VCard>

        <!-- Dialog para criar/editar formulário -->
        <VDialog v-model="isFormDialogOpen" max-width="800px" persistent scrollable>
            <VCard>
                <VCardTitle>
                    {{ isEditMode ? 'Editar Formulário' : 'Novo Formulário' }}
                </VCardTitle>

                <VCardText>
                    <VForm @submit.prevent="createForm">
                        <VRow>
                            <VCol cols="12">
                                <VTextField v-model="formData.title" label="Título do Formulário" required />
                            </VCol>

                            <VCol cols="12">
                                <VTextarea v-model="formData.description" label="Descrição" rows="3" />
                            </VCol>

                            <VCol cols="6">
                                <VTextField v-model="formData.startDate" label="Data de Início" type="date" required />
                            </VCol>

                            <VCol cols="6">
                                <VTextField v-model="formData.endDate" label="Data de Fim" type="date" required />
                            </VCol>

                            <VCol cols="12">
                                <VSelect v-model="formData.assignedUsers" :items="users" item-title="username"
                                    item-value="id" label="Usuários que podem responder" multiple chips
                                    closable-chips />
                            </VCol>
                        </VRow>

                        <!-- Seções -->
                        <div class="mt-6">
                            <div class="d-flex justify-space-between align-center mb-4">
                                <h4>Seções</h4>
                                <VBtn size="small" color="primary" variant="outlined" @click="addSection">
                                    Adicionar Seção
                                </VBtn>
                            </div>

                            <div v-for="(section, sectionIndex) in formData.sections" :key="sectionIndex"
                                class="border rounded pa-4 mb-4">
                                <div class="d-flex justify-space-between align-center mb-3">
                                    <VTextField v-model="section.title" label="Título da Seção" density="compact"
                                        class="flex-grow-1 me-2" />
                                    <VBtn v-if="formData.sections.length > 1" icon="ri-delete-bin-line" size="small"
                                        color="error" variant="text" @click="removeSection(sectionIndex)" />
                                </div>

                                <!-- Questões -->
                                <div class="ms-4">
                                    <div v-for="(question, questionIndex) in section.questions" :key="questionIndex"
                                        class="border-l-2 border-primary pl-4 mb-3">
                                        <div class="d-flex justify-space-between align-center mb-2">
                                            <VTextField v-model="question.title" label="Título da Questão"
                                                density="compact" class="flex-grow-1 me-2" />
                                            <VBtn icon="ri-delete-bin-line" size="small" color="error" variant="text"
                                                @click="removeQuestion(sectionIndex, questionIndex)" />
                                        </div>

                                        <VRow>
                                            <VCol cols="6">
                                                <VSelect v-model="question.type" :items="[
                                                    { title: 'Texto', value: 'text' },
                                                    { title: 'Texto Longo', value: 'textarea' },
                                                    { title: 'Número', value: 'number' },
                                                    { title: 'Data', value: 'date' },
                                                    { title: 'Múltipla Escolha', value: 'multiple' },
                                                    { title: 'Escolha Única', value: 'single' }
                                                ]" label="Tipo" density="compact" />
                                            </VCol>
                                            <VCol cols="6">
                                                <VCheckbox v-model="question.required" label="Obrigatório"
                                                    density="compact" />
                                            </VCol>
                                        </VRow>

                                        <VTextarea v-model="question.description" label="Descrição (opcional)" rows="2"
                                            density="compact" />
                                    </div>

                                    <VBtn size="small" color="primary" variant="outlined" prepend-icon="ri-add-line"
                                        @click="addQuestion(sectionIndex)">
                                        Adicionar Questão
                                    </VBtn>
                                </div>
                            </div>
                        </div>
                    </VForm>
                </VCardText>

                <VCardActions>
                    <VSpacer />
                    <VBtn color="secondary" variant="outlined" @click="closeDialog">
                        Cancelar
                    </VBtn>
                    <VBtn color="primary" :loading="isLoading" @click="createForm">
                        {{ isEditMode ? 'Atualizar' : 'Criar' }}
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
