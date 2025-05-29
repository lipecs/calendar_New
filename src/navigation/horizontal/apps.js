export default [
  {
    title: 'Home',
    icon: { icon: 'ri-mail-open-line' },
    children: [
      {
        title: 'Calendar',
        to: 'apps-calendar',
        icon: { icon: 'ri-calendar-line' },
      },
   
      {
        title: 'Email',
        icon: { icon: 'ri-mail-line' },
        to: 'apps-email',
      },
      {
        title: 'Chat',
        icon: { icon: 'ri-message-line' },
        to: 'apps-chat',
      },
     
      {
        title: 'User',
        icon: { icon: 'ri-user-line' },
        children: [
          { title: 'List', to: 'apps-user-list' },
          { title: 'View', to: { name: 'apps-user-view-id', params: { id: 21 } } },
        ],
      },
      {
        title: 'Roles & Permissions',
        icon: { icon: 'ri-shield-user-line' },
        children: [
          { title: 'Roles', to: 'apps-roles' },
          { title: 'Permissions', to: 'apps-permissions' },
        ],
      },
    ],
  },
]
