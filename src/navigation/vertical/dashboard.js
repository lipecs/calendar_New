export default [
  // { heading: 'Settings', 
  //   to: 'admin-users',
  //   action: 'manage',
  //   subject: 'Users',
  // },
  {
    title: 'Dashboards',
    icon: { icon: 'ri-pie-chart-2-line' },
     to: 'dashboards-analytics',
    children: [
      // {
      //   title: 'CRM',
      //   to: 'dashboards-crm',
      // },
       {
         title: 'Analytics',
        to: 'dashboards-analytics',
     },
      // {
      //   title: 'eCommerce',
      //   to: 'dashboards-ecommerce',
      // } 
      // Mais opcao
      // {
      //   title: 'Academy',
      //   to: 'dashboards-academy',
      // },
      // { 
      //   title: 'Logistics',
      //   to: 'dashboards-logistics',
      // },
    ],
    badgeContent: '',
    badgeClass: 'bg-error',
  },
  

]
