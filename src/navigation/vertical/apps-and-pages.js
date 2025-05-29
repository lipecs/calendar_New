// src/navigation/vertical/apps-and-pages.js
export default [
  { heading: 'Calendar' },
  {
    title: 'Calendar',
    icon: { icon: 'ri-calendar-line' },
    to: 'apps-calendar',
  },
  
  // Seção de usuário (mantido do antigo)
  // {
  //   title: 'User',
  //   icon: { icon: 'ri-user-line' },
  //   children: [
  //     { title: 'View', to: { name: 'apps-user-view-id', params: { id: 21 } } },
  //     { title: 'List', to: 'apps-user-list' },
  //   ],
  // },

  // Menu de gerenciamento de usuários - visível apenas para admins
  // {
  //   title: 'Users Management',
  //   icon: { icon: 'ri-user-settings-line' },
  //   to: 'admin-users',
  //   action: 'manage',
  //   subject: 'Users',
  // },

  // Seção de autenticação (mantido do antigo, mas comentado por padrão)
  // Descomente se necessário para desenvolvimento/testes
  /*
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
