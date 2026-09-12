'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';

/**
 * Os formulários do Clerk, cientes de quando rodam dentro do Lymark Desktop.
 *
 * O desktop é uma janela Electron que abre lymark.app; o preload dele expõe
 * `window.lymark` nesta origem. Dentro dela, "Continuar com Google" não tem
 * como terminar: o Google recusa login OAuth em navegador embutido, e o
 * reconhece por sinais que só o Chrome de verdade tem — deixa passar a tela
 * do e-mail e barra na seguinte ("Esse navegador ou app pode não ser
 * seguro"). Foi reproduzido com user agent e Client Hints do Chrome; brigar
 * com isso é enxugar gelo. Facebook e TikTok têm regras parecidas.
 *
 * Então, no desktop, os botões sociais e o "ou" somem e fica o e-mail com
 * código, que funciona. A detecção é num efeito, e não na renderização, para
 * o servidor e o cliente concordarem na primeira pintura (no servidor não há
 * `window`). Fora do desktop nada muda.
 *
 * Quando o login social pelo navegador do sistema existir (abrir o provedor
 * lá e voltar com um ticket do Clerk), os botões podem voltar.
 */
const WITHOUT_SOCIAL = {
  elements: {
    socialButtons: { display: 'none' },
    socialButtonsRoot: { display: 'none' },
    dividerRow: { display: 'none' },
  },
} as const;

function useInsideDesktop(): boolean {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    const bridge = (window as unknown as { lymark?: { platform?: string } }).lymark;
    setInside(bridge?.platform === 'desktop');
  }, []);
  return inside;
}

export function SignInForm(props: ComponentProps<typeof SignIn>) {
  const inside = useInsideDesktop();
  return <SignIn {...props} appearance={inside ? WITHOUT_SOCIAL : props.appearance} />;
}

export function SignUpForm(props: ComponentProps<typeof SignUp>) {
  const inside = useInsideDesktop();
  return <SignUp {...props} appearance={inside ? WITHOUT_SOCIAL : props.appearance} />;
}
