// src/navigation/vertical/apps-and-pages.js - ATUALIZADO com restrições de acesso
export default [
  { heading: 'Apps' },
  {
    title: 'Calendar',
    icon: { icon: 'ri-calendar-line' },
    to: 'apps-calendar',
  },
  { heading: 'Forms' },
{
  title: 'Formulários',
  icon: { icon: 'ri-file-list-2-line' },
  children: [
    {
      title: 'Gerenciar',
      to: 'formularios',
      icon: { icon: 'ri-settings-2-line' }
    },
    {
      title: 'Responder',
      to: 'responder',
      icon: { icon: 'ri-file-check-line' }
    }
  ]
},
  { 
    heading: 'Profiles',
    // Mostrar seção apenas para admins ou quando houver itens visíveis
  },
  {
    title: 'Profile',
    icon: { icon: 'ri-user-line' },
    children: [
      { 
        title: 'My Profile', 
        to: { name: 'apps-user-view-id', params: { id: 21 } },
        // Sem restrição - todos podem ver o próprio perfil
      },

      { 
        title: 'Salesperson', 
        to: { name: 'pages-icons', params: { id: 21 } },
        action: 'manage',
        subject: 'Salespeople',
        // Será filtrado pelo sistema de permissões
      },

      { 
        title: 'Clients', 
        to: { name: 'pages-pricing', params: { id: 21 } },
        action: 'manage', 
        subject: 'clients',
        // Será filtrado pelo sistema de permissões
      },
    ],
  },
  { 
    heading: 'Administration',
    action: 'manage',
    subject: 'Users',
  },
  {
    title: 'Users Management',
    icon: { icon: 'ri-user-settings-line' },
    to: 'admin-users',
    action: 'manage',
    subject: 'Users',
  },


  /*
  { heading: 'Desenvolvimento' },
  {
    title: 'Authentication',
    icon: { icon: 'ri-shield-keyhole-line' },
    children: [
      {
        title: 'Login',
        children: [
          { title: 'Login v1', to: 'pages-authentication-login-v1', target: '_blank' },
          { title: 'Login v2', to: 'pages-authentication-login-v2', target: '_blank' },
        ],
      },
      {
        title: 'Register',
        children: [
          { title: 'Register v1', to: 'pages-authentication-register-v1', target: '_blank' },
          { title: 'Register v2', to: 'pages-authentication-register-v2', target: '_blank' },
          { title: 'Register Multi-Steps', to: 'pages-authentication-register-multi-steps', target: '_blank' },
        ],
      },
      {
        title: 'Verify Email',
        children: [
          { title: 'Verify Email v1', to: 'pages-authentication-verify-email-v1', target: '_blank' },
          { title: 'Verify Email v2', to: 'pages-authentication-verify-email-v2', target: '_blank' },
        ],
      },
      {
        title: 'Forgot Password',
        children: [
          { title: 'Forgot Password v1', to: 'pages-authentication-forgot-password-v1', target: '_blank' },
          { title: 'Forgot Password v2', to: 'pages-authentication-forgot-password-v2', target: '_blank' },
        ],
      },
      {
        title: 'Reset Password',
        children: [
          { title: 'Reset Password v1', to: 'pages-authentication-reset-password-v1', target: '_blank' },
          { title: 'Reset Password v2', to: 'pages-authentication-reset-password-v2', target: '_blank' },
        ],
      },
    ],
  },
  */
]
