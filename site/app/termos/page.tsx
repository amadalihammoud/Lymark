import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Condições de uso do aplicativo Lymark: o que ele faz, o que ele não faz, e de quem é a responsabilidade sobre o conteúdo das fotos.',
};

export default function Termos() {
  return (
    <article className="doc">
      <h1>Termos de Uso</h1>
      <p className="stamp-date">
        Última atualização: 2 de agosto de 2026 · Aplicativo Lymark, versão 1.3.0 (Android)
      </p>

      <p className="intro">
        Estes termos regem o uso do aplicativo Lymark, distribuído sob o identificador{' '}
        <strong>com.lycosteam.lymark</strong> por{' '}
        29.015.357 AMAD ALI HAMMOUD,{' '}
        CNPJ 29.015.357/0001-25. Ao instalar ou usar o aplicativo, você
        concorda com o que está escrito aqui.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          01
        </span>
        O que o aplicativo faz
      </h2>
      <p>
        O Lymark sobrepõe a uma fotografia um conjunto de informações — hora, data, dia da
        semana, endereço e um código de identificação — e gera um novo arquivo de imagem com
        essas informações incorporadas aos pixels. É uma ferramenta de organização e registro
        de trabalho de campo.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          02
        </span>
        O que o aplicativo não faz
      </h2>
      <p>
        Este item é o mais importante destes termos, e pedimos que seja lido com atenção.
      </p>
      <ul>
        <li>
          <strong>O aplicativo não certifica nem autentica nada.</strong> Ele não é perícia
          técnica, não emite documento com fé pública e não constitui prova pericial. O
          carimbo registra o que foi informado no momento da captura — não atesta a
          veracidade daquilo.
        </li>
        <li>
          <strong>Todos os campos são editáveis pelo usuário.</strong> Hora, data, endereço e
          código podem ser alterados livremente antes da exportação, por decisão de projeto:
          o profissional precisa poder corrigir um endereço que o GPS errou. A consequência é
          que o valor carimbado reflete o que o usuário decidiu carimbar.
        </li>
        <li>
          <strong>A hora vem do relógio do aparelho</strong>, que pode estar incorreto ou ter
          sido ajustado manualmente. Não há sincronização com servidor de tempo confiável.
        </li>
        <li>
          <strong>O endereço é uma estimativa.</strong> A precisão depende do sinal de GPS e
          da base de dados do provedor de mapas do sistema operacional.
        </li>
        <li>
          <strong>O código de foto não é registro em cartório.</strong> É um identificador
          aleatório para referência interna, sem qualquer valor probatório.
        </li>
      </ul>
      <p>
        Se o seu caso de uso exige prova com valor jurídico oponível a terceiros, procure ata
        notarial ou serviço de certificação digital com carimbo de tempo — o Lymark não
        substitui nenhum dos dois.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          03
        </span>
        Suas responsabilidades
      </h2>
      <ul>
        <li>
          Você é o único responsável pelas fotografias que captura, pelo conteúdo que
          carimba nelas e pelo uso que faz dos arquivos gerados.
        </li>
        <li>
          Ao fotografar pessoas, propriedades ou ambientes de terceiros, cabe a você obter as
          autorizações necessárias e observar o direito de imagem, o sigilo profissional e a
          Lei Geral de Proteção de Dados Pessoais em relação aos titulares retratados.
        </li>
        <li>
          É vedado usar o aplicativo para fabricar registro falso, induzir alguém a erro,
          simular a execução de serviço não prestado ou praticar qualquer ato ilícito.
        </li>
        <li>
          Cabe a você manter cópias de segurança do que considerar importante. O aplicativo
          guarda um histórico local limitado, que não é backup.
        </li>
      </ul>

      <h2>
        <span className="num" aria-hidden="true">
          04
        </span>
        Licença de uso
      </h2>
      <p>
        Concedemos a você uma licença pessoal, revogável, não exclusiva e intransferível para
        instalar e usar o aplicativo, inclusive para fins profissionais. Não é permitido
        descompilar, modificar, redistribuir ou comercializar o aplicativo, no todo ou em
        parte.
      </p>
      <p>
        <strong>As suas fotos são suas.</strong> Não reivindicamos nenhum direito sobre as
        imagens que você captura ou gera. O nome, a marca e a identidade visual do Lymark
        permanecem de titularidade do desenvolvedor.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          05
        </span>
        Disponibilidade e atualizações
      </h2>
      <p>
        O aplicativo é fornecido no estado em que se encontra. Não há garantia de
        funcionamento ininterrupto, de compatibilidade com todo e qualquer aparelho, nem
        compromisso de prazo para correções ou novas versões. Funcionalidades podem ser
        alteradas ou descontinuadas.
      </p>
      <p>
        A qualidade da imagem exportada depende do aparelho e do sistema operacional, e pode
        apresentar resolução inferior à da fotografia original.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          06
        </span>
        Limitação de responsabilidade
      </h2>
      <p>
        Na máxima extensão permitida pela legislação brasileira, o desenvolvedor não responde
        por perdas indiretas, lucros cessantes, perda de dados ou prejuízos decorrentes de
        decisões tomadas com base nas informações carimbadas — inclusive de contestação, em
        juízo ou fora dele, do conteúdo de uma fotografia gerada pelo aplicativo.
      </p>
      <p>
        Esta limitação <strong>não afasta</strong> os direitos assegurados ao consumidor pela
        Lei nº 8.078/1990, nem a responsabilidade por dolo ou culpa grave.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          07
        </span>
        Encerramento
      </h2>
      <p>
        Você pode encerrar o uso a qualquer momento desinstalando o aplicativo, o que elimina
        os dados por ele armazenados. Não há conta a cancelar nem assinatura a rescindir.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          08
        </span>
        Alterações destes termos
      </h2>
      <p>
        Alterações serão publicadas nesta página com nova data de atualização. O uso
        continuado após a publicação significa concordância com a versão vigente.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          09
        </span>
        Lei aplicável e foro
      </h2>
      <p>
        Aplica-se a lei brasileira. Fica eleito o foro do domicílio do usuário para dirimir
        controvérsias decorrentes destes termos.
      </p>

      <p className="note">
        Sobre o tratamento de dados, veja a{' '}
        <Link href="/privacidade">Política de Privacidade</Link>. Dúvidas:{' '}
        <a href="mailto:contato@lymark.app">contato@lymark.app</a>.
      </p>
    </article>
  );
}
