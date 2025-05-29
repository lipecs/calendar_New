import { useAbility } from '@casl/vue';

/**
 * Returns ability result if ACL is configured or else just return true
 * We should allow passing string | undefined to can because for admin ability we omit defining action & subject
 *
 * Useful if you don't know if ACL is configured or not
 * Used in @core files to handle absence of ACL without errors
 *
 * @param {string} action CASL Actions // https://casl.js.org/v4/en/guide/intro#basics
 * @param {string} subject CASL Subject // https://casl.js.org/v4/en/guide/intro#basics
 */
export const can = (action, subject) => {
  // ✅ CORREÇÃO: Se não tem action ou subject, sempre permitir
  if (!action || !subject) {
    return true;
  }
  
  const vm = getCurrentInstance()
  if (!vm)
    return true; // ✅ CORREÇÃO: Mudado de false para true
  const localCan = vm.proxy && '$can' in vm.proxy
  
  return localCan ? vm.proxy?.$can(action, subject) : true
}

/**
 * Check if user can view item based on it's ability
 * Based on item's action and subject & Hide group if all of it's children are hidden
 * @param {object} item navigation object item
 */
export const canViewNavMenuGroup = item => {
  // ✅ CORREÇÃO: Se não tem action/subject, sempre mostrar
  if (!item.action || !item.subject) {
    return true;
  }
  
  // Se tem children, verificar se algum é visível
  if (item.children && item.children.length > 0) {
    const hasAnyVisibleChild = item.children.some(i => can(i.action, i.subject))
    return can(item.action, item.subject) && hasAnyVisibleChild;
  }
  
  // Se não tem children, verificar apenas a permissão do item
  return can(item.action, item.subject);
}

export const canNavigate = to => {
  const ability = useAbility()
  
  return to.matched.some(route => ability.can(route.meta.action, route.meta.subject))
}
