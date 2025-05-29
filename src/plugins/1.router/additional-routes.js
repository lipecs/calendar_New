export const redirects = [
  {
    path: '/',
    name: 'index',
    redirect: to => {
      return { name: 'apps-calendar' };
    },
  },
  {
    path: '/pages/user-profile',
    name: 'pages-user-profile',
    redirect: () => ({ name: 'pages-user-profile-tab', params: { tab: 'profile' } }),
  },
  {
    path: '/pages/account-settings',
    name: 'pages-account-settings',
    redirect: () => ({ name: 'pages-account-settings-tab', params: { tab: 'account' } }),
  },
];

export const routes = [
  // Rota de gerenciamento de usuários (apenas para admin)
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/pages/admin/users.vue'),
    meta: {
      adminRequired: true,
      action: 'manage',
      subject: 'Users',
      pageTitle: 'Gerenciamento de Usuários',
    },
  },
  
  // Página de acesso negado
  {
    path: '/not-authorized',
    name: 'not-authorized',
    component: () => import('@/pages/not-authorized.vue'),
    meta: {
      layout: 'blank',
      public: true,
      pageTitle: 'Acesso Negado',
    },
  }
]
