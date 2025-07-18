// src/services/formService.js
import axios from 'axios'
import authService from './auth'

const API_URL = `${import.meta.env.VITE_API_URL}/forms`

class FormService {
  constructor() {
    this.setupInterceptors()
  }

  setupInterceptors() {
    // Interceptor para adicionar token de autenticação
    axios.interceptors.request.use(
      (config) => {
        const token = authService.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Interceptor para lidar com respostas
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          authService.logout()
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  getAuthHeaders() {
    const token = authService.getToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  // ============ FORMULÁRIOS ============

  // Buscar todos os formulários (para admins)
  async getAllForms() {
    try {
      console.log('📋 Buscando todos os formulários...')
      const response = await axios.get(API_URL, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulários carregados:', response.data?.length || 0)
      return response.data || []
    } catch (error) {
      console.error('❌ Erro ao buscar formulários:', error)
      throw error
    }
  }

  // Buscar formulários disponíveis para o usuário atual
  async getAvailableForms() {
    try {
      console.log('📋 Buscando formulários disponíveis...')
      const response = await axios.get(`${API_URL}/available`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulários disponíveis carregados:', response.data?.length || 0)
      return response.data || []
    } catch (error) {
      console.error('❌ Erro ao buscar formulários disponíveis:', error)
      throw error
    }
  }

  // Buscar formulário por ID
  async getFormById(formId) {
    try {
      console.log('📋 Buscando formulário por ID:', formId)
      const response = await axios.get(`${API_URL}/${formId}`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulário carregado:', response.data?.title)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao buscar formulário:', error)
      throw error
    }
  }

  // Criar novo formulário
  async createForm(formData) {
    try {
      console.log('➕ Criando novo formulário:', formData.title)
      const response = await axios.post(API_URL, formData, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulário criado com sucesso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao criar formulário:', error)
      throw error
    }
  }

  // Atualizar formulário existente
  async updateForm(formId, formData) {
    try {
      console.log('📝 Atualizando formulário:', formId)
      const response = await axios.put(`${API_URL}/${formId}`, formData, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulário atualizado com sucesso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao atualizar formulário:', error)
      throw error
    }
  }

  // Excluir formulário
  async deleteForm(formId) {
    try {
      console.log('🗑️ Excluindo formulário:', formId)
      const response = await axios.delete(`${API_URL}/${formId}`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulário excluído com sucesso')
      return response.data
    } catch (error) {
      console.error('❌ Erro ao excluir formulário:', error)
      throw error
    }
  }

  // Duplicar formulário
  async duplicateForm(formId) {
    try {
      console.log('📋 Duplicando formulário:', formId)
      const response = await axios.post(`${API_URL}/${formId}/duplicate`, {}, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Formulário duplicado com sucesso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao duplicar formulário:', error)
      throw error
    }
  }

  // ============ RESPOSTAS ============

  // Buscar respostas do usuário atual
  async getMyResponses() {
    try {
      console.log('📝 Buscando minhas respostas...')
      const response = await axios.get(`${API_URL}/responses/my`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Respostas carregadas:', response.data?.length || 0)
      return response.data || []
    } catch (error) {
      console.error('❌ Erro ao buscar respostas:', error)
      throw error
    }
  }

  // Buscar todas as respostas de um formulário (para admins)
  async getFormResponses(formId) {
    try {
      console.log('📊 Buscando respostas do formulário:', formId)
      const response = await axios.get(`${API_URL}/${formId}/responses`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Respostas do formulário carregadas:', response.data?.length || 0)
      return response.data || []
    } catch (error) {
      console.error('❌ Erro ao buscar respostas do formulário:', error)
      throw error
    }
  }

  // Buscar resposta específica por ID
  async getResponseById(responseId) {
    try {
      console.log('📝 Buscando resposta por ID:', responseId)
      const response = await axios.get(`${API_URL}/responses/${responseId}`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Resposta carregada:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao buscar resposta:', error)
      throw error
    }
  }

  // Salvar rascunho de resposta
  async saveDraft(responseData) {
    try {
      console.log('💾 Salvando rascunho da resposta...')
      const response = await axios.post(`${API_URL}/responses/draft`, responseData, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Rascunho salvo com sucesso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao salvar rascunho:', error)
      throw error
    }
  }

  // Enviar resposta do formulário
  async submitForm(responseData) {
    try {
      console.log('📤 Enviando resposta do formulário...')
      const response = await axios.post(`${API_URL}/responses`, responseData, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Resposta enviada com sucesso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao enviar resposta:', error)
      throw error
    }
  }

  // Atualizar resposta existente
  async updateResponse(responseId, responseData) {
    try {
      console.log('📝 Atualizando resposta:', responseId)
      const response = await axios.put(`${API_URL}/responses/${responseId}`, responseData, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Resposta atualizada com sucesso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao atualizar resposta:', error)
      throw error
    }
  }

  // Excluir resposta
  async deleteResponse(responseId) {
    try {
      console.log('🗑️ Excluindo resposta:', responseId)
      const response = await axios.delete(`${API_URL}/responses/${responseId}`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Resposta excluída com sucesso')
      return response.data
    } catch (error) {
      console.error('❌ Erro ao excluir resposta:', error)
      throw error
    }
  }

  // ============ ANÁLISES E RELATÓRIOS ============

  // Buscar estatísticas de um formulário
  async getFormStats(formId) {
    try {
      console.log('📊 Buscando estatísticas do formulário:', formId)
      const response = await axios.get(`${API_URL}/${formId}/stats`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Estatísticas carregadas:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error)
      throw error
    }
  }

  // Exportar respostas para Excel
  async exportResponses(formId, format = 'excel') {
    try {
      console.log('📥 Exportando respostas do formulário:', formId)
      const response = await axios.get(`${API_URL}/${formId}/export`, {
        headers: this.getAuthHeaders(),
        params: { format },
        responseType: 'blob'
      })
      
      console.log('✅ Respostas exportadas com sucesso')
      
      // Criar e baixar arquivo
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `formulario_${formId}_respostas.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      
      return response.data
    } catch (error) {
      console.error('❌ Erro ao exportar respostas:', error)
      throw error
    }
  }


  // Validar formulário antes de salvar
  validateForm(formData) {
    const errors = []

    // Validar campos obrigatórios
    if (!formData.title?.trim()) {
      errors.push('Título é obrigatório')
    }

    if (!formData.startDate) {
      errors.push('Data de início é obrigatória')
    }

    if (!formData.endDate) {
      errors.push('Data de fim é obrigatória')
    }

    if (!formData.assignedUsers || formData.assignedUsers.length === 0) {
      errors.push('Selecione pelo menos um usuário')
    }

    if (!formData.sections || formData.sections.length === 0) {
      errors.push('Adicione pelo menos uma seção')
    }

    // Validar seções
    formData.sections?.forEach((section, sectionIndex) => {
      if (!section.title?.trim()) {
        errors.push(`Seção ${sectionIndex + 1}: Título é obrigatório`)
      }

      if (!section.questions || section.questions.length === 0) {
        errors.push(`Seção ${sectionIndex + 1}: Adicione pelo menos uma questão`)
      }

      // Validar questões
      section.questions?.forEach((question, questionIndex) => {
        if (!question.title?.trim()) {
          errors.push(`Seção ${sectionIndex + 1}, Questão ${questionIndex + 1}: Título é obrigatório`)
        }

        if (!question.type) {
          errors.push(`Seção ${sectionIndex + 1}, Questão ${questionIndex + 1}: Tipo é obrigatório`)
        }

        // Validar opções para questões de múltipla escolha
        if (['multiple', 'single', 'select'].includes(question.type)) {
          if (!question.options || question.options.length === 0) {
            errors.push(`Seção ${sectionIndex + 1}, Questão ${questionIndex + 1}: Adicione pelo menos uma opção`)
          }

          // Verificar se todas as opções estão preenchidas
          const emptyOptions = question.options?.filter(option => !option?.trim())
          if (emptyOptions && emptyOptions.length > 0) {
            errors.push(`Seção ${sectionIndex + 1}, Questão ${questionIndex + 1}: Todas as opções devem ser preenchidas`)
          }
        }
      })
    })

    // Validar datas
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (startDate >= endDate) {
        errors.push('Data de fim deve ser posterior à data de início')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validar resposta antes de enviar
  validateResponse(formData, responseData) {
    const errors = []

    // Verificar questões obrigatórias
    formData.sections?.forEach((section, sectionIndex) => {
      section.questions?.forEach((question, questionIndex) => {
        if (question.required) {
          const response = responseData.responses[question.id]
          
          if (response === null || response === undefined || response === '') {
            errors.push(`${section.title} - ${question.title}: Campo obrigatório`)
          }
          
          // Verificar arrays vazios (múltipla escolha)
          if (Array.isArray(response) && response.length === 0) {
            errors.push(`${section.title} - ${question.title}: Selecione pelo menos uma opção`)
          }
        }
      })
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }


  // Processar dados do formulário para envio
  processFormData(formData) {
    return {
      ...formData,
      sections: formData.sections?.map(section => ({
        ...section,
        questions: section.questions?.map(question => ({
          ...question,
          options: question.options?.filter(option => option?.trim()) || []
        }))
      }))
    }
  }

  // Gerar ID único para questões
  generateQuestionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Calcular progresso da resposta
  calculateProgress(formData, responseData) {
    const totalQuestions = formData.sections?.reduce((total, section) => {
      return total + (section.questions?.length || 0)
    }, 0) || 0

    const answeredQuestions = Object.values(responseData.responses || {}).filter(response => {
      if (Array.isArray(response)) {
        return response.length > 0
      }
      return response !== null && response !== undefined && response !== ''
    }).length
    
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  }

  // Formatar data para exibição
  formatDate(dateString) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Formatar data e hora para exibição
  formatDateTime(dateString) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  // Verificar se formulário está ativo
  isFormActive(form) {
    const now = new Date()
    const startDate = new Date(form.startDate)
    const endDate = new Date(form.endDate)
    
    return now >= startDate && now <= endDate && form.status === 'active'
  }

  // Obter cor do status
  getStatusColor(status) {
    const colors = {
      'active': 'success',
      'inactive': 'secondary',
      'draft': 'warning',
      'completed': 'success',
      'expired': 'error'
    }
    return colors[status] || 'secondary'
  }

  // Obter texto do status
  getStatusText(status) {
    const texts = {
      'active': 'Ativo',
      'inactive': 'Inativo',
      'draft': 'Rascunho',
      'completed': 'Concluído',
      'expired': 'Expirado'
    }
    return texts[status] || status
  }
}

const formService = new FormService()
export default formService
