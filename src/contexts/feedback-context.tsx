import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Dialog, type DialogAction } from '@/components/ui/dialog';
import { Toast, type ToastMessage } from '@/components/ui/toast';

/**
 * As mensagens do app, num lugar só.
 *
 * Antes tudo passava pelo `Alert` do sistema — caixa cinza, botão verde-água,
 * fonte do Android — o que fazia o aplicativo parecer emprestar a tela a outro
 * programa. E, pior que a aparência: confirmação de sucesso interrompia o
 * trabalho para pedir um toque no OK.
 *
 * Aqui a separação é por **função**, não por estilo:
 *
 * - `notify` — deu certo. Aparece na base da tela e some sozinho.
 * - `ask` — precisa de decisão. Trava a tela, porque é isso que uma bifurcação
 *   exige.
 *
 * Quem quiser só avisar de um erro sem oferecer escolha usa `ask` com uma
 * única ação: continua sendo uma leitura obrigatória, e é o certo quando a
 * mensagem traz uma instrução.
 */

type DialogRequest = {
  title: string;
  message?: string;
  actions: DialogAction[];
};

type FeedbackContextValue = {
  notify: (text: string, tone?: ToastMessage['tone']) => void;
  ask: (request: DialogRequest) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'neutral') => {
    // Objeto novo a cada chamada: dois avisos com o mesmo texto seguidos
    // precisam reiniciar a animação, e não passar despercebidos.
    setToast({ text, tone });
  }, []);

  const ask = useCallback((request: DialogRequest) => {
    setDialog(request);
  }, []);

  const value = useMemo(() => ({ notify, ask }), [notify, ask]);

  return (
    <FeedbackContext value={value}>
      {children}

      <Dialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        actions={dialog?.actions ?? []}
        onDismiss={() => setDialog(null)}
      />

      <Toast message={toast} onHide={() => setToast(null)} />
    </FeedbackContext>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback precisa estar dentro de FeedbackProvider.');
  }
  return context;
}
