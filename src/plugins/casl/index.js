import { abilitiesPlugin } from '@casl/vue';
import { ability, updateAbility } from './ability';

export default function (app) {
  // Registra o plugin de habilidades
  app.use(abilitiesPlugin, ability, {
    useGlobalProperties: true,
  });

  // Atualiza a habilidade na inicialização
  updateAbility();
}
