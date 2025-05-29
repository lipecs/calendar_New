import authService from '@/services/auth';
import { updateAbility } from '@/plugins/casl/ability';

export const setupGuards = router => {
  router.beforeEach(async (to, from) => {
    try {
      // Verificar se é uma rota pública
      if (to.meta.public || to.meta.unauthenticatedOnly) {
        return;
      }

      // Verificar se o usuário está autenticado
      if (!authService.isAuthenticated()) {
        return { name: 'login' };
      }

      // Atualizar habilidades do usuário
      updateAbility();

      // Verificar permissões específicas para rotas que requerem admin
      if (to.meta.adminRequired && !authService.isAdmin()) {
        return { name: 'not-authorized' };
      }

      // Verificar permissões CASL se definidas
      if (to.meta.action && to.meta.subject) {
        const { ability } = await import('@/plugins/casl/ability');
        if (!ability.can(to.meta.action, to.meta.subject)) {
          return { name: 'not-authorized' };
        }
      }

      // Continuar para a rota solicitada
      return;
    } catch (error) {
      console.error('Erro no guard de rota:', error);
      return { name: 'login' };
    }
  });
};
