import { createMongoAbility } from '@casl/ability';
import authService from '@/services/auth';

// Cria a habilidade inicial vazia
export const ability = createMongoAbility([]);

// Inicializa as regras de habilidade com base no usuário
export const initializeAbility = () => {
  try {
    const userData = authService.getCurrentUser();
    
    // ✅ CORREÇÃO: Se não houver dados do usuário, dar habilidades básicas
    if (!userData) {
      return createMongoAbility([]);
    }
    
    // ✅ CORREÇÃO: Dar habilidades básicas para todos os usuários autenticados
    let basicAbilities = [
      { action: 'read', subject: 'Calendar' },
      { action: 'manage', subject: 'Calendar' },
    ];
    
    // ✅ NOVO: Se for admin, adicionar permissões administrativas
    const isAdmin = userData.roles && userData.roles.includes('ROLE_ADMIN');
    if (isAdmin) {
      basicAbilities.push(
        { action: 'manage', subject: 'Users' },
        { action: 'read', subject: 'Users' },
        { action: 'manage', subject: 'all' }
      );
    }
    
    // ✅ CORREÇÃO: Se tem userAbilityRules, adicionar às básicas (não substituir)
    if (userData.userAbilityRules && Array.isArray(userData.userAbilityRules)) {
      const userAbilities = userData.userAbilityRules.map(rule => ({
        action: rule.action,
        subject: rule.subject,
        // Adicionar conditions para usuários comuns
        ...(rule.subject === 'Calendar' && rule.action === 'manage' && !isAdmin 
          ? { conditions: { userId: userData.id } } 
          : {})
      }));
      
      // Combinar abilities básicas com as do servidor
      basicAbilities = [...basicAbilities, ...userAbilities];
    }
    
    return createMongoAbility(basicAbilities);
  } catch (error) {
    console.error('Erro ao inicializar habilidades:', error);
    // ✅ FALLBACK: Sempre dar acesso ao Calendar
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
    
    // ✅ CORREÇÃO: Se não há dados, limpar mas manter Calendar
    if (!userData) {
      ability.update([
        { action: 'read', subject: 'Calendar' },
        { action: 'manage', subject: 'Calendar' }
      ]);
      return ability;
    }
    
    // ✅ CORREÇÃO: Usar initializeAbility que já tem toda a lógica
    const newAbility = initializeAbility();
    
    // Limpa e adiciona as novas regras
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
    // ✅ FALLBACK: Sempre dar acesso ao Calendar
    ability.update([
      { action: 'read', subject: 'Calendar' },
      { action: 'manage', subject: 'Calendar' }
    ]);
    return ability;
  }
};

// Exporta a habilidade
export default ability;
