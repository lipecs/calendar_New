export default [
  {
    title: 'Pages',
    icon: { icon: 'ri-file-list-2-line' },
    children: [
      {
        title: 'User Profile',
        icon: { icon: 'ri-account-circle-line' },
        to: { name: 'pages-user-profile-tab', params: { tab: 'profile' } },
      },
     
      {
        title: 'Authentication',
        icon: { icon: 'ri-lock-line' },
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
      {
        title: 'Wizard Pages',
        icon: { icon: 'ri-more-fill' },
        children: [
          { title: 'Checkout', to: { name: 'wizard-examples-checkout' } },
          { title: 'Property Listing', to: { name: 'wizard-examples-property-listing' } },
          { title: 'Create Deal', to: { name: 'wizard-examples-create-deal' } },
        ],
      },
      { title: 'Dialog Examples', icon: { icon: 'ri-file-copy-line' }, to: 'pages-dialog-examples' },
      
    ],
  },
]
