import type { Metadata } from 'next';
import { Link } from '../../../i18n/navigation';
import { canonicalFor } from '../../../i18n/urls';

/**
 * PENDENTE: esta página está escrita em português, direto no JSX, e é servida
 * também sob os onze prefixos de idioma. Quem abre `/de/privacidade` recebe
 * texto português.
 *
 * Enquanto for assim, o canônico aponta para a versão portuguesa — as doze
 * URLs servem o mesmo conteúdo, e sem isso seriam doze páginas duplicadas
 * disputando a mesma posição. É a declaração honesta do que existe, não a
 * solução: a solução é traduzir, e aí este canônico passa a ser por idioma,
 * como o da landing page.
 */
export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Como o aplicativo Lymark trata fotos, localização e histórico. O aplicativo não possui servidor, não cria conta e não transmite as suas fotos.',
  alternates: { canonical: canonicalFor('/privacidade', 'pt') },
};

export default function Privacidade() {
  return (
    <article className="doc">
      <h1>Política de Privacidade</h1>
      <p className="stamp-date">
        Última atualização: 2 de agosto de 2026 · Aplicativo Lymark, versão 1.1.0
      </p>

      <p className="intro">
        Esta política descreve como o aplicativo Lymark trata informações pessoais. Ela atende
        à Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD) e ao Regulamento
        (UE) 2016/679 (Regulamento Geral sobre a Proteção de Dados — RGPD/GDPR), e vale para o
        aplicativo distribuído sob o identificador <strong>com.lycosteam.lymark</strong> e para
        este site.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          01
        </span>
        Em uma frase
      </h2>
      <p>
        O Lymark <strong>não possui servidor, não cria conta de usuário e não transmite as
        suas fotos</strong>. Tudo o que o aplicativo produz — imagens, endereços, histórico e
        preferências — permanece armazenado no seu próprio aparelho, sob o seu controle.
      </p>
      <p>
        Existe uma única exceção, descrita no item 05: para converter as coordenadas do GPS em
        um endereço legível, o sistema operacional do aparelho consulta um serviço de
        geocodificação externo.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          02
        </span>
        A quem esta política se aplica
      </h2>
      <p>
        Aplica-se a qualquer pessoa que use o aplicativo ou visite este site. Para titulares no
        Brasil, o tratamento observa a LGPD e a fiscalização da Autoridade Nacional de Proteção
        de Dados (ANPD). Para titulares no Espaço Económico Europeu e no Reino Unido, observa o
        RGPD e o UK GDPR.
      </p>
      <p>
        <span className="todo">
          [Se o aplicativo for oferecido no Espaço Económico Europeu, o art. 27 do RGPD exige a
          nomeação de um representante estabelecido na UE — indicar aqui nome e contato, ou
          restringir a distribuição ao Brasil na Play Console e na App Store Connect.]
        </span>
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          03
        </span>
        Quem é o controlador
      </h2>
      <p>
        O controlador dos dados pessoais — <em>controller</em>, na terminologia do RGPD — é{' '}
        29.015.357 AMAD ALI HAMMOUD, inscrito sob o{' '}
        CNPJ 29.015.357/0001-25, com endereço em{' '}
        Avenida Ana Costa, 433, Gonzaga, Santos - SP.
      </p>
      <p>
        O encarregado pelo tratamento de dados pessoais, para os fins do art. 41 da LGPD, é{' '}
        Amad Ali Hammoud, contactável em{' '}
        <a href="mailto:contato@lymark.app">contato@lymark.app</a>. Dado o volume e a natureza do
        tratamento — que não envolve dados sensíveis em escala nem monitoramento sistemático —
        não há obrigação de designar um <em>Data Protection Officer</em> nos termos do art. 37
        do RGPD.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          04
        </span>
        Que informações o aplicativo trata
      </h2>
      <p>
        Todas as informações abaixo são gravadas exclusivamente na área privada do aplicativo
        dentro do aparelho, e nenhuma delas é enviada ao desenvolvedor.
      </p>

      <dl className="deftable">
        <div>
          <dt>Fotografias</dt>
          <dd>
            A imagem que você escolhe da galeria ou captura pela câmera, e o arquivo exportado
            com a marca d’água. Uma fotografia pode conter dados pessoais de terceiros — veja o
            item 11.
          </dd>
        </div>
        <div>
          <dt>Localização</dt>
          <dd>
            Latitude e longitude aproximadas, obtidas uma vez por captura, com a finalidade
            única de preencher o campo de endereço. As coordenadas não são gravadas: apenas o
            texto do endereço resultante é mantido, junto da foto.
          </dd>
        </div>
        <div>
          <dt>Data, hora e dia da semana</dt>
          <dd>Lidos do relógio do aparelho no momento da captura, e editáveis por você.</dd>
        </div>
        <div>
          <dt>Código de foto</dt>
          <dd>
            Sequência de catorze caracteres hexadecimais sorteada aleatoriamente. Não deriva de
            identificador do aparelho nem seu, e não permite rastreamento entre aplicativos.
          </dd>
        </div>
        <div>
          <dt>Histórico</dt>
          <dd>
            Registro das últimas duzentas exportações, contendo o caminho do arquivo no aparelho
            e os dados carimbados na imagem.
          </dd>
        </div>
        <div>
          <dt>Preferências</dt>
          <dd>Campos visíveis, posição, tamanho e demais opções de marca d’água.</dd>
        </div>
      </dl>

      <p style={{ marginTop: '1.5rem' }}>
        O aplicativo <strong>não coleta</strong>: nome, e-mail, telefone, documentos,
        identificador de publicidade, identificador de dispositivo, dados de contatos, agenda,
        histórico de navegação, métricas de uso, relatórios de falha ou qualquer outra
        informação sobre você ou sobre o seu aparelho. Não há SDK de análise, de publicidade,
        de atribuição ou de rastreamento embarcado.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          05
        </span>
        A única informação que sai do aparelho
      </h2>
      <p>
        Quando você concede a permissão de localização, o aplicativo pede ao sistema operacional
        que traduza as coordenadas do GPS em um endereço postal. Essa tradução — geocodificação
        reversa — é executada pelo próprio sistema operacional, que para isso envia as
        coordenadas ao seu provedor de mapas: <strong>Google</strong> nos aparelhos Android e{' '}
        <strong>Apple</strong> nos aparelhos iOS.
      </p>
      <p>
        Essa comunicação parte do sistema operacional, e não do Lymark. O aplicativo não recebe
        cópia dela, não a intermedeia e não tem acesso a nada além do endereço devolvido. O
        tratamento realizado por esses provedores é regido pelas políticas de privacidade deles.
      </p>
      <p>
        <strong>Nenhuma fotografia sai do aparelho por ação do aplicativo.</strong> Se você usar
        o botão Compartilhar, quem transmite a imagem é o aplicativo de destino que você escolher
        na folha de compartilhamento do sistema — mensageiro, e-mail, armazenamento em nuvem —
        sob a política de privacidade daquele aplicativo.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          06
        </span>
        Permissões solicitadas e por quê
      </h2>
      <dl className="deftable">
        <div>
          <dt>Câmera</dt>
          <dd>
            Para tirar a foto que receberá a marca d’água. Solicitada apenas quando você toca em
            “Tirar foto”. O aplicativo não solicita acesso ao microfone.
          </dd>
        </div>
        <div>
          <dt>Fotos e mídia</dt>
          <dd>
            Para escolher uma imagem existente e para gravar na galeria o arquivo exportado. O
            acesso é restrito a fotografias, e a permissão de gravação é usada apenas para
            escrever — o aplicativo não percorre nem lê a sua galeria.
          </dd>
        </div>
        <div>
          <dt>Localização em uso</dt>
          <dd>
            Para preencher o campo de endereço. Solicitada em primeiro plano, apenas durante o
            uso, e <strong>nunca em segundo plano</strong>.
          </dd>
        </div>
      </dl>
      <p style={{ marginTop: '1.5rem' }}>
        Todas as permissões são opcionais e revogáveis a qualquer momento nos ajustes do
        aparelho. Recusar a localização mantém o aplicativo plenamente funcional: o endereço
        passa a ser digitado por você. Recusar o acesso à galeria impede apenas o salvamento
        automático, e a foto continua podendo ser compartilhada.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          07
        </span>
        Bases legais e finalidades
      </h2>
      <p>
        O tratamento da localização ocorre mediante o seu <strong>consentimento</strong> — art.
        7º, I da LGPD e art. 6º(1)(a) do RGPD — manifestado na concessão da permissão do sistema
        e revogável a qualquer momento, sem prejuízo da licitude do tratamento anterior à
        revogação.
      </p>
      <p>
        O tratamento dos demais dados ocorre para a{' '}
        <strong>execução da funcionalidade que você solicitou</strong> — art. 7º, V da LGPD e
        art. 6º(1)(b) do RGPD —, já que sem eles não existe a marca d’água que o aplicativo se
        propõe a produzir.
      </p>
      <p>
        Não há tratamento fundado em legítimo interesse, nem para publicidade, criação de perfil,
        análise de comportamento ou qualquer finalidade secundária. Não há tratamento de
        categorias especiais de dados nem de dados sensíveis pelo desenvolvedor.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          08
        </span>
        Transferência internacional
      </h2>
      <p>
        O desenvolvedor não realiza transferência internacional de dados, porque não recebe
        dados. A consulta de geocodificação descrita no item 05 é feita pelo sistema operacional
        a provedores que podem processá-la fora do país do usuário, sob os mecanismos de
        transferência dos próprios provedores — cláusulas contratuais-tipo, no caso europeu.
      </p>
      <p>
        Este site é hospedado pela Vercel Inc., nos termos do item 14.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          09
        </span>
        Compartilhamento com terceiros
      </h2>
      <p>
        O desenvolvedor não compartilha, vende, aluga nem cede dados pessoais a terceiros, pela
        razão simples de que não os detém. Não há operador (<em>processor</em>) contratado para
        tratar dados do aplicativo.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          10
        </span>
        Armazenamento, retenção e segurança
      </h2>
      <p>
        Os dados ficam na área privada do aplicativo, protegida pelo isolamento entre aplicativos
        do sistema operacional e pela proteção de tela do aparelho. Na versão Android, a cópia de
        segurança automática do sistema está <strong>desativada</strong>, de modo que histórico e
        preferências não são enviados à conta Google do usuário.
      </p>
      <p>
        A retenção é integralmente controlada por você: os registros permanecem até que sejam
        apagados no próprio aplicativo, e o histórico descarta automaticamente os mais antigos ao
        ultrapassar duzentos itens, removendo também os arquivos correspondentes. Desinstalar o
        aplicativo elimina tudo o que ele armazenava. As fotos já salvas na galeria do aparelho
        pertencem à galeria e continuam lá — cabe a você removê-las se desejar.
      </p>
      <p>
        Nenhum sistema é infalível. Como o aplicativo não mantém banco de dados remoto, não existe
        repositório central passível de vazamento, e não há incidente de segurança a comunicar nos
        termos do art. 48 da LGPD ou do art. 33 do RGPD que possa decorrer de infraestrutura do
        desenvolvedor. O risco relevante é o acesso físico ao aparelho desbloqueado.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          11
        </span>
        Quando você fotografa outras pessoas
      </h2>
      <p>
        Ao fotografar pessoas identificáveis no exercício da sua atividade profissional,{' '}
        <strong>você</strong> se torna controlador daqueles dados perante os titulares
        retratados, e cabe a você a base legal, a informação e o atendimento aos direitos deles.
        O desenvolvedor não participa desse tratamento e não tem acesso às imagens.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          12
        </span>
        Seus direitos
      </h2>
      <p>
        O art. 18 da LGPD e os arts. 15 a 22 do RGPD asseguram a você os direitos de confirmação
        e acesso, correção, eliminação, anonimização, bloqueio, portabilidade, limitação do
        tratamento, oposição, revogação do consentimento e informação sobre compartilhamentos.
      </p>
      <p>
        Como os dados residem apenas no seu aparelho, esses direitos são exercidos diretamente no
        aplicativo: consultar e apagar registros na aba Galeria, corrigir qualquer campo antes de
        exportar, revogar a permissão de localização nos ajustes do sistema, e eliminar tudo
        desinstalando o aplicativo. O desenvolvedor não consegue acessar, exportar nem apagar
        esses dados por você — não por recusa, mas porque não os possui.
      </p>
      <p>
        Para dúvidas ou requerimentos formais, escreva para{' '}
        <a href="mailto:contato@lymark.app">contato@lymark.app</a>. Você também tem o direito de
        apresentar reclamação à <strong>ANPD</strong>, no Brasil, ou à autoridade de controlo do
        seu Estado-Membro, na União Europeia.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          13
        </span>
        Decisões automatizadas
      </h2>
      <p>
        Não há decisão automatizada, definição de perfil nem tratamento que produza efeitos
        jurídicos sobre você, nos termos do art. 20 da LGPD e do art. 22 do RGPD.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          14
        </span>
        Sobre este site
      </h2>
      <p>
        Este site <strong>não usa cookies</strong>, não possui analítica, não exibe publicidade e
        não integra botões de redes sociais. As fontes tipográficas são servidas pelo próprio
        domínio — nenhuma requisição do seu navegador é feita a servidores de terceiros, de modo
        que a visita não gera transferência de endereço IP a provedores externos.
      </p>
      <p>
        O site é hospedado pela <strong>Vercel Inc.</strong>, que na condição de operador registra
        dados técnicos de acesso — endereço IP, data, hora e recurso solicitado — pelo tempo
        necessário à segurança e ao funcionamento da hospedagem. A base legal é o legítimo
        interesse na manutenção da segurança do serviço, art. 7º, IX da LGPD e art. 6º(1)(f) do
        RGPD.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          15
        </span>
        Alterações desta política
      </h2>
      <p>
        Mudanças serão publicadas nesta página, com nova data de atualização. Alterações que
        modifiquem de forma relevante o tratamento de dados serão comunicadas também dentro do
        aplicativo antes de entrarem em vigor.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          16
        </span>
        Crianças e adolescentes
      </h2>
      <p>
        O Lymark é uma ferramenta de trabalho, destinada a maiores de 18 anos. Não é dirigido a
        crianças nem a adolescentes, e não coleta intencionalmente dados desse público.
      </p>

      <h2>
        <span className="num" aria-hidden="true">
          17
        </span>
        Lei aplicável
      </h2>
      <p>
        Esta política é regida pela lei brasileira, sem prejuízo da aplicação do RGPD aos
        titulares nele abrangidos. Fica eleito o foro do domicílio do titular.
      </p>

      <p className="note">
        Consulte também os <Link href="/termos">Termos de Uso</Link>.
      </p>
    </article>
  );
}
