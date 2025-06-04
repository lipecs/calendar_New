// src/plugins/casl/ability.js - ATUALIZADO
import { createMongoAbility } from '@casl/ability';
import authService from '@/services/auth';

// Cria a habilidade inicial vazia
export const ability = createMongoAbility([]);

// ✅ NOVO: Mapeamento de permissões por papel
const getRoleAbilities = (role, userId) => {
  const baseAbilities = [
    { action: 'read', subject: 'Calendar' },
    { action: 'manage', subject: 'Calendar', conditions: { userId } }
  ];

  switch (role) {
    case 'admin':
      return [
        { action: 'manage', subject: 'all' },
        { action: 'manage', subject: 'Users' },
        { action: 'manage', subject: 'Vendedores' },
        { action: 'manage', subject: 'Clientes' },
        ...baseAbilities
      ];

    case 'diretor':
      return [
        { action: 'manage', subject: 'Users' },
        { action: 'manage', subject: 'Vendedores' },
        { action: 'manage', subject: 'Clientes' },
        { action: 'read', subject: 'Reports' },
        ...baseAbilities
      ];

    case 'supervisor':
      return [
        { action: 'read', subject: 'Users' },
        { action: 'manage', subject: 'Vendedores' },
        { action: 'manage', subject: 'Clientes' },
        { action: 'read', subject: 'Reports' },
        ...baseAbilities
      ];

    case 'coordenador':
      return [
        { action: 'read', subject: 'Users' },
        { action: 'manage', subject: 'Vendedores' },
        { action: 'read', subject: 'Clientes' },
        ...baseAbilities
      ];

    case 'vendedor':
      return [
        { action: 'read', subject: 'Calendar' },
        { action: 'manage', subject: 'Calendar', conditions: { userId } },
        { action: 'read', subject: 'Clientes', conditions: { vendedorId: userId } }
      ];

    case 'user':
    default:
      return baseAbilities;
  }
};

// Inicializa as regras de habilidade com base no usuário
export const initializeAbility = () => {
  try {
    const userData = authService.getCurrentUser();
    
    if (!userData || !userData.userData) {
      return createMongoAbility([
        { action: 'read', subject: 'Calendar' },
        { action: 'manage', subject: 'Calendar' }
      ]);
    }

    const role = userData.userData.role || 'user';
    const userId = userData.userData.id;
    
    // ✅ NOVO: Obter habilidades baseadas no papel
    const roleAbilities = getRoleAbilities(role, userId);
    
    // Combinar com abilities do servidor se existirem
    if (userData.userAbilityRules && Array.isArray(userData.userAbilityRules)) {
      const serverAbilities = userData.userAbilityRules.map(rule => ({
        action: rule.action,
        subject: rule.subject,
        ...(rule.conditions ? { conditions: rule.conditions } : {})
      }));
      
      // Mesclar sem duplicar
      const combinedAbilities = [...roleAbilities];
      serverAbilities.forEach(serverRule => {
        const exists = combinedAbilities.some(roleRule => 
          roleRule.action === serverRule.action && 
          roleRule.subject === serverRule.subject
        );
        if (!exists) {
          combinedAbilities.push(serverRule);
        }
      });
      
      return createMongoAbility(combinedAbilities);
    }
    
    return createMongoAbility(roleAbilities);
  } catch (error) {
    console.error('Erro ao inicializar habilidades:', error);
    return createMongoAbility([
      { action: 'read', subject: 'Calendar' },
      { action: 'manage', subject: 'Calendar' }
    ]);
  }
};

// Atualiza a habilidade com base no usuário atual
export const updateAbility = () => {
  try {
    const userData = authService.getCurrentUser();
    
    if (!userData || !userData.userData) {
      ability.update([
        { action: 'read', subject: 'Calendar' },
        { action: 'manage', subject: 'Calendar' }
      ]);
      return ability;
    }
    
    const newAbility = initializeAbility();
    ability.update(newAbility.rules);
    
    // Salva no cookie para persistência
    try {
      const cookieRef = useCookie('userAbilityRules');
      cookieRef.value = newAbility.rules;
    } catch (cookieError) {
      console.warn('Não foi possível salvar no cookie:', cookieError);
    }
    
    return ability;
  } catch (error) {
    console.error('Erro ao atualizar habilidades:', error);
    ability.update([
      { action: 'read', subject: 'Calendar' },
      { action: 'manage', subject: 'Calendar' }
    ]);
    return ability;
  }
};

// ✅ NOVO: Função auxiliar para verificar permissões específicas
export const canAccess = (action, subject, conditions = null) => {
  try {
    if (conditions) {
      return ability.can(action, subject, conditions);
    }
    return ability.can(action, subject);
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
};

// Exporta a habilidade
export default ability;
