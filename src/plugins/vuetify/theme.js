export const staticPrimaryColor = '#28995a' // Verde médio para botões
export const staticPrimaryDarkenColor = '#1f7847' // Verde mais escuro para hover
export const themes = {
  light: {
    dark: false,
    colors: {
      'primary': staticPrimaryColor,
      'on-primary': '#fff',
      'primary-darken-1': staticPrimaryDarkenColor,
      'secondary': '#000000', // Preto para cor secundária
      'secondary-darken-1': '#333333', // Preto mais claro para hover
      'on-secondary': '#fff',
      'success': '#4CAF50', // Changed to material green
      'success-darken-1': '#388E3C', // Darker green
      'on-success': '#fff',
      'info': '#00BCD4', // Changed to cyan
      'info-darken-1': '#0097A7', // Darker cyan
      'on-info': '#fff',
      'warning': '#FFC107', // Changed to amber
      'warning-darken-1': '#FFA000', // Darker amber
      'on-warning': '#fff',
      'error': '#F44336', // Changed to material red
      'error-darken-1': '#D32F2F', // Darker red
      'on-error': '#fff',
      'background': '#f1faf9', // gelo mais claro/suave para fundo do site
      'on-background': '#212121', // Texto escuro para contraste com fundo claro
      'surface': '#ffffff', // Branco para layouts
      'on-surface': '#212121',
      'grey-50': '#FAFAFA',
      'grey-100': '#F5F5F5',
      'grey-200': '#EEEEEE',
      'grey-300': '#E0E0E0',
      'grey-400': '#BDBDBD',
      'grey-500': '#9E9E9E',
      'grey-600': '#757575',
      'grey-700': '#616161',
      'grey-800': '#424242',
      'grey-900': '#212121',
      'perfect-scrollbar-thumb': '#28995a',
      'skin-bordered-background': '#ffffff',
      'skin-bordered-surface': '#ffffff',
      'expansion-panel-text-custom-bg': '#f2fbf3',
      'track-bg': '#d9f0dd',
      'chat-bg': '#f2fbf3',
    },
    variables: {
      'code-color': '#2196F3', // Changed to blue
      'overlay-scrim-background': '#212121',
      'tooltip-background': '#212121',
      'overlay-scrim-opacity': 0.5,
      'hover-opacity': 0.04,
      'focus-opacity': 0.1,
      'selected-opacity': 0.08,
      'activated-opacity': 0.16,
      'pressed-opacity': 0.14,
      'dragged-opacity': 0.1,
      'disabled-opacity': 0.4,
      'border-color': '#2E263D',
      'border-opacity': 0.12,
      'table-header-color': '#EEEEEE',
      'high-emphasis-opacity': 0.9,
      'medium-emphasis-opacity': 0.7,

      // 👉 shadows
      'shadow-key-umbra-color': '#212121',
      'shadow-xs-opacity': '0.16',
      'shadow-sm-opacity': '0.18',
      'shadow-md-opacity': '0.20',
      'shadow-lg-opacity': '0.22',
      'shadow-xl-opacity': '0.24',
    },
  },
  
    dark: {
      dark: true,
      colors: {
        'primary': staticPrimaryColor,
        'on-primary': '#ffffff',
        'primary-darken-1': staticPrimaryDarkenColor,
    
        'secondary': '#ffffff', // Texto claro como secundário
        'secondary-darken-1': '#cccccc',
        'on-secondary': '#121212',
    
        'success': '#4CAF50',
        'success-darken-1': '#388E3C',
        'on-success': '#ffffff',
    
        'info': '#00BCD4',
        'info-darken-1': '#0097A7',
        'on-info': '#ffffff',
    
        'warning': '#FFC107',
        'warning-darken-1': '#FFA000',
        'on-warning': '#000000',
    
        'error': '#F44336',
        'error-darken-1': '#D32F2F',
        'on-error': '#ffffff',
    
        'background': '#121212', // Fundo escuro neutro
        'on-background': '#e0f2e9', // Texto suave esverdeado
    
        'surface': '#1e1e1e', // Painéis, cartões
        'on-surface': '#e0f2e9',
    
        'grey-50': '#2A2A2A',
        'grey-100': '#323232',
        'grey-200': '#424242',
        'grey-300': '#5E5E5E',
        'grey-400': '#757575',
        'grey-500': '#9E9E9E',
        'grey-600': '#BDBDBD',
        'grey-700': '#D0D0D0',
        'grey-800': '#E0E0E0',
        'grey-900': '#F5F5F5',
    
        'perfect-scrollbar-thumb': '#28995a',
        'skin-bordered-background': '#1a1a1a',
        'skin-bordered-surface': '#1a1a1a',
    
        'expansion-panel-text-custom-bg': '#1c2d24',
        'track-bg': '#1f3127',
        'chat-bg': '#1c2d24',
      },
    
      variables: {
        'code-color': '#42A5F5',
        'overlay-scrim-background': '#000000',
        'tooltip-background': '#2a2a2a',
    
        'overlay-scrim-opacity': 0.5,
        'hover-opacity': 0.05,
        'focus-opacity': 0.08,
        'selected-opacity': 0.1,
        'activated-opacity': 0.12,
        'pressed-opacity': 0.14,
        'disabled-opacity': 0.4,
        'dragged-opacity': 0.1,
    
        'border-color': '#ffffff',
        'border-opacity': 0.55,
        'table-header-color': '#1c1c1c',
    
        'high-emphasis-opacity': 0.95,
        'medium-emphasis-opacity': 0.7,
    
        'shadow-key-umbra-color': '#000000',
        'shadow-xs-opacity': '0.18',
        'shadow-sm-opacity': '0.20',
        'shadow-md-opacity': '0.22',
        'shadow-lg-opacity': '0.24',
        'shadow-xl-opacity': '0.26',
      },
    }
}
