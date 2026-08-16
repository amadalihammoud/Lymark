import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Manual de uso',
  description:
    'Como funciona cada ajuste do carimbo do Lymark: campos, posição, tamanho, cores, marca da empresa, logotipo, faixa de fundo, endereço por GPS e código de foto. Com os tamanhos medidos na própria geometria do carimbo.',
};

/*
 * A lista existe uma vez só: o sumário é gerado dela, e o número de cada
 * título vem do índice nela. Numerar à mão nos dois lugares é o tipo de
 * duplicação que sobrevive à primeira reordenação e desanda na segunda.
 */
const SECTIONS = [
  { id: 'anatomia', title: 'Anatomia do carimbo' },
  { id: 'campos', title: 'Campos carimbados' },
  { id: 'posicao', title: 'Posição e tamanho' },
  { id: 'cores', title: 'Cores' },
  { id: 'marca', title: 'Marca da empresa' },
  { id: 'logotipo', title: 'Logotipo: o arquivo certo' },
  { id: 'faixa', title: 'Faixa de fundo' },
  { id: 'endereco', title: 'Endereço e GPS' },
  { id: 'codigo', title: 'Código de Foto' },
  { id: 'galeria', title: 'Galeria' },
  { id: 'arquivo', title: 'O que sai no arquivo' },
  { id: 'privacidade', title: 'Privacidade' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function Heading({ id }: { id: SectionId }) {
  const index = SECTIONS.findIndex((section) => section.id === id);
  const section = SECTIONS[index];

  return (
    <h2>
      <span className="num" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      {section.title}
    </h2>
  );
}

/*
 * O carimbo desenhado em SVG, e não uma captura de tela: a captura envelhece
 * a cada ajuste de interface, e o que o diagrama precisa mostrar são as duas
 * linhas de alinhamento — que numa foto real ninguém enxerga.
 */
function Diagram() {
  return (
    <figure className="diagram">
      <svg
        viewBox="0 0 520 260"
        role="img"
        aria-label="Diagrama do carimbo: logotipo, nome e complemento acima da linha do relógio, com barra âmbar, data e dia da semana ao lado, endereço abaixo e código girado na lateral direita."
      >
        <rect
          x="0.5"
          y="0.5"
          width="519"
          height="259"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
        />

        <line x1="40" y1="44" x2="470" y2="44" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
        <line x1="40" y1="86" x2="470" y2="86" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
        <text className="dg-label" x="474" y="47" fill="currentColor" fillOpacity="0.55">
          topo do nome
        </text>
        <text className="dg-label" x="474" y="89" fill="currentColor" fillOpacity="0.55">
          base do complemento
        </text>

        <circle cx="61" cy="65" r="19" fill="var(--amber)" />
        <circle cx="61" cy="65" r="12" fill="var(--navy-800)" />
        <rect x="59" y="47" width="4" height="36" fill="var(--amber)" />

        <text className="dg-brand" x="96" y="66" fontSize="30" fill="currentColor">
          AUTO
        </text>
        <text className="dg-brand" x="169" y="66" fontSize="30" fill="var(--amber)">
          GLASS
        </text>
        <text className="dg-brand" x="96" y="85" fontSize="13" fill="currentColor" fillOpacity="0.7">
          Vidros e vistorias
        </text>

        <text className="dg-face" x="40" y="158" fontSize="62" fill="currentColor">
          21:55
        </text>
        <rect x="152" y="115" width="4" height="45" fill="var(--amber)" />
        <text className="dg-brand" x="170" y="130" fontSize="14" fill="currentColor" fontWeight="400">
          01 ago. 2026
        </text>
        <text className="dg-brand" x="170" y="158" fontSize="14" fill="currentColor" fontWeight="400">
          Sáb
        </text>

        <text className="dg-brand" x="40" y="188" fontSize="14" fill="currentColor" fontWeight="400">
          Av. Puglisi, 490 - Centro,
        </text>
        <text className="dg-brand" x="40" y="209" fontSize="14" fill="currentColor" fontWeight="400">
          Guarujá - SP, 11410-002
        </text>

        <text
          className="dg-brand"
          x="-215"
          y="500"
          fontSize="12"
          fill="currentColor"
          transform="rotate(-90)"
          letterSpacing="2"
        >
          98926A73655DC1
        </text>

        <line x1="152" y1="112" x2="152" y2="100" stroke="var(--amber)" strokeWidth="1.2" />
        <text className="dg-label" x="158" y="103" fill="var(--amber)">
          barra âmbar
        </text>
      </svg>
      <figcaption>
        As linhas tracejadas são a regra de alinhamento do logotipo: o topo dele acompanha o topo
        da primeira linha do nome, e a base, a linha de base do complemento. A barra âmbar segue a
        mesma lógica com os algarismos da hora.
      </figcaption>
    </figure>
  );
}

export default function Manual() {
  return (
    <article className="doc wide">
      <h1>Manual de uso</h1>
      <p className="stamp-date">Aplicativo Lymark, versão 1.3.0 (Android)</p>

      <p className="intro">
        O Lymark carimba hora, data, dia da semana, endereço e um código de rastreio sobre a
        fotografia — na resolução da própria câmera, e não na da tela. Este manual diz o que cada
        ajuste faz e, onde a pergunta é “qual tamanho”, responde com o número medido.
      </p>

      <nav className="toc" aria-label="Sumário">
        <h2>Seções</h2>
        <ol>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section className="section" id="anatomia">
        <Heading id="anatomia" />
        <p>
          Tudo que o Lymark desenha vive num bloco só, ancorado num canto da foto. De cima para
          baixo: a marca da empresa, a linha do relógio, o endereço e o código. O que muda de
          empresa para empresa é a marca, as cores e o fundo — a estrutura é a mesma.
        </p>
        <Diagram />
      </section>

      <section className="section" id="campos">
        <Heading id="campos" />
        <p>
          São cinco, e cada um pode ser ligado ou desligado em{' '}
          <strong>Preferências › Campos exibidos</strong>. Só entra na foto o campo que estiver
          ligado <em>e</em> tiver conteúdo — um endereço em branco não deixa linha vazia na imagem.
        </p>

        <dl className="deftable">
          <div>
            <dt>Hora</dt>
            <dd>O elemento dominante do carimbo. Formato 24 horas.</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>Ao lado da hora, acima do dia da semana.</dd>
          </div>
          <div>
            <dt>Dia da semana</dt>
            <dd>Abreviado. Abaixo da data, na mesma coluna.</dd>
          </div>
          <div>
            <dt>Endereço</dt>
            <dd>Quebra em várias linhas quando precisa. Editável sempre.</dd>
          </div>
          <div>
            <dt>Código de Foto</dt>
            <dd>
              14 caracteres hexadecimais. Ver a seção <a href="#codigo">09</a>.
            </dd>
          </div>
        </dl>

        <p>
          Desligar todos os campos é permitido: a tela avisa que a foto vai sair sem marca d’água
          nenhuma, e ela sai.
        </p>
      </section>

      <section className="section" id="posicao">
        <Heading id="posicao" />
        <p>
          O bloco é ancorado num dos quatro cantos. O padrão é o{' '}
          <strong>inferior esquerdo</strong>, que é onde ele menos compete com o assunto da foto —
          quem fotografa um imóvel ou um veículo costuma centralizá-lo no quadro.
        </p>

        <p>
          O tamanho do texto tem três níveis. Eles são proporcionais à foto, e não fixos em pixels:
          o mesmo ajuste dá um carimbo com a mesma presença numa foto de 8 MP e numa de 48 MP.
        </p>

        <div className="table-wrap">
          <table>
            <caption>Altura da hora, em pixels, por resolução da foto</caption>
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col" className="n">
                  Pequeno
                </th>
                <th scope="col" className="n">
                  Médio
                </th>
                <th scope="col" className="n">
                  Grande
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">8 MP (2448 × 3264)</th>
                <td className="n">146</td>
                <td className="n">191</td>
                <td className="n">233</td>
              </tr>
              <tr>
                <th scope="row">12 MP (3024 × 4032)</th>
                <td className="n">181</td>
                <td className="n">236</td>
                <td className="n">290</td>
              </tr>
              <tr>
                <th scope="row">48 MP (6000 × 8000)</th>
                <td className="n">359</td>
                <td className="n">465</td>
                <td className="n">574</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Os números acima são a altura do <strong>conjunto da marca</strong> — que é a mesma do
          logotipo. Servem de referência de escala para o carimbo inteiro.
        </p>
      </section>

      <section className="section" id="cores">
        <Heading id="cores" />
        <p>
          Duas escolhas independentes: a <strong>barra vertical</strong> (âmbar por padrão) e o{' '}
          <strong>texto</strong> (branco por padrão). Cada uma tem seis atalhos de um toque e, atrás
          deles, o espectro inteiro — matiz numa faixa, saturação e brilho num quadrado.
        </p>

        <div className="callout">
          <span className="label">Vale saber</span>
          <p>
            Mexer nas cores do carimbo <strong>não</strong> muda as cores do aplicativo. São
            perguntas diferentes: uma é a identidade que a empresa imprime na foto, a outra é a
            identidade da tela.
          </p>
        </div>

        <p>
          Todo texto do carimbo leva sombra, sempre. É ela que mantém o branco legível sobre céu,
          areia ou parede clara mesmo sem faixa de fundo. Ainda assim, cores de luminância média —
          cinzas, ocres — desaparecem sobre asfalto e sobre concreto: nesses casos, ou se escolhe um
          tom mais claro, ou se liga a faixa.
        </p>
      </section>

      <section className="section" id="marca">
        <Heading id="marca" />
        <p>
          O técnico não quer entregar ao cliente uma foto com a marca do fornecedor de software dele.
          A marca do carimbo é configurável, e tem três formatos.
        </p>

        <dl className="deftable">
          <div>
            <dt>Acima do relógio</dt>
            <dd>
              A assinatura completa: logotipo à esquerda, nome grande à direita e complemento menor
              embaixo. É o formato para quem entrega laudo ao cliente final.
            </dd>
          </div>
          <div>
            <dt>Num canto</dt>
            <dd>
              Uma linha discreta, com âncora própria — pode ficar num canto e os dados em outro. Não
              leva logotipo nem complemento: não há altura para eles.
            </dd>
          </div>
          <div>
            <dt>Nenhuma</dt>
            <dd>Foto limpa, sem marca de espécie alguma.</dd>
          </div>
        </dl>

        <h3>Nome em duas partes</h3>

        <p>
          O nome é dividido em <strong>duas partes</strong>, e não em duas palavras — cada uma com a
          sua cor. É o que permite “AutoGlass” e “TecnoSul”, que são uma palavra só em duas cores. As
          partes são desenhadas coladas: quem quiser espaço entre elas, digita o espaço.
        </p>

        <div className="table-wrap">
          <table>
            <caption>Limites de texto</caption>
            <thead>
              <tr>
                <th scope="col">Campo</th>
                <th scope="col" className="n">
                  Máximo
                </th>
                <th scope="col">Observação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Primeira parte</th>
                <td className="n">24</td>
                <td>Caracteres.</td>
              </tr>
              <tr>
                <th scope="row">Segunda parte</th>
                <td className="n">24</td>
                <td>Deixe vazia para uma marca de cor única.</td>
              </tr>
              <tr>
                <th scope="row">Complemento</th>
                <td className="n">40</td>
                <td>Maior, porque costuma ser uma frase curta.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Nome comprido tem o corpo reduzido até caber, junto com o logotipo e o complemento — o
          conjunto encolhe inteiro, mantendo a proporção. Nunca é cortado: cortar o nome de uma
          empresa na foto que ela entrega ao cliente é pior do que uma letra menor.
        </p>
      </section>

      <section className="section" id="logotipo">
        <Heading id="logotipo" />
        <p>
          Esta é a pergunta que mais aparece, então vem primeiro a resposta curta:{' '}
          <strong>PNG com fundo transparente, a partir de 600&nbsp;px no lado maior.</strong> O resto
          desta seção explica de onde sai esse número e o que acontece com cada tipo de arquivo.
        </p>

        <h3>Em que tamanho ele é desenhado</h3>

        <p>
          A altura do logotipo não é escolhida: ela sai do texto ao lado. O topo acompanha o topo da
          primeira linha do nome, e a base, a linha de base do complemento — a mesma regra que a
          barra âmbar usa com os algarismos da hora. Na prática, isso dá cerca de{' '}
          <strong>7% da altura da foto</strong>.
        </p>

        <div className="table-wrap">
          <table>
            <caption>Altura do logotipo desenhado, em pixels</caption>
            <thead>
              <tr>
                <th scope="col">Resolução da foto</th>
                <th scope="col" className="n">
                  Pequeno
                </th>
                <th scope="col" className="n">
                  Médio
                </th>
                <th scope="col" className="n">
                  Grande
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">HD (1920 × 1080)</th>
                <td className="n">53</td>
                <td className="n">67</td>
                <td className="n">81</td>
              </tr>
              <tr>
                <th scope="row">8 MP (2448 × 3264)</th>
                <td className="n">146</td>
                <td className="n">191</td>
                <td className="n">233</td>
              </tr>
              <tr>
                <th scope="row">12 MP paisagem (4032 × 3024)</th>
                <td className="n">146</td>
                <td className="n">188</td>
                <td className="n">233</td>
              </tr>
              <tr>
                <th scope="row">12 MP retrato (3024 × 4032)</th>
                <td className="n">181</td>
                <td className="n">236</td>
                <td className="n">290</td>
              </tr>
              <tr>
                <th scope="row">48 MP (6000 × 8000)</th>
                <td className="n">359</td>
                <td className="n">465</td>
                <td className="n">574</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          O maior valor da tabela é <strong>574&nbsp;px</strong>. Um arquivo a partir de 600&nbsp;px
          no lado maior nunca é ampliado, em nenhuma combinação de câmera e ajuste — daí a
          recomendação. Enviar mais que isso não faz mal: o Lymark guarda o arquivo com no máximo
          1024&nbsp;px no lado maior, e descarta o excedente na hora de importar.
        </p>

        <h3>A margem transparente é aparada sozinha</h3>

        <p>
          Quase todo logotipo exportado por um estúdio vem com folga em volta da marca. Se essa folga
          entrasse no carimbo, o alinhamento com o texto se perderia — em um caso medido, eram
          4&nbsp;px acima e 5&nbsp;px abaixo num conjunto de 88&nbsp;px, o bastante para o logotipo
          parecer afundado.
        </p>

        <p>
          Na importação, o Lymark varre a transparência do arquivo, acha a caixa da marca e recorta.
          Você não precisa preparar nada: envie o arquivo como ele está.
        </p>

        <h3>Proporção</h3>

        <p>
          Qualquer proporção é aceita e <strong>nenhuma é deformada</strong>. Até 2,4:1 o logotipo
          ocupa a altura inteira do conjunto. Mais largo que isso, ele perde altura em vez de invadir
          a foto, e é centrado na faixa do texto.
        </p>

        <div className="table-wrap">
          <table>
            <caption>Tamanho desenhado numa foto de 12 MP retrato, texto grande</caption>
            <thead>
              <tr>
                <th scope="col">Proporção do arquivo</th>
                <th scope="col" className="n">
                  Largura
                </th>
                <th scope="col" className="n">
                  Altura
                </th>
                <th scope="col">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1:2 (vertical)</th>
                <td className="n">145</td>
                <td className="n">290</td>
                <td />
              </tr>
              <tr>
                <th scope="row">1:1 (quadrado)</th>
                <td className="n">290</td>
                <td className="n">290</td>
                <td />
              </tr>
              <tr>
                <th scope="row">1,5:1</th>
                <td className="n">435</td>
                <td className="n">290</td>
                <td />
              </tr>
              <tr>
                <th scope="row">2:1</th>
                <td className="n">580</td>
                <td className="n">290</td>
                <td />
              </tr>
              <tr>
                <th scope="row">2,4:1</th>
                <td className="n">696</td>
                <td className="n">290</td>
                <td>limite da altura cheia</td>
              </tr>
              <tr>
                <th scope="row">3:1</th>
                <td className="n">696</td>
                <td className="n">232</td>
                <td>perde altura</td>
              </tr>
              <tr>
                <th scope="row">4:1</th>
                <td className="n">696</td>
                <td className="n">174</td>
                <td>perde altura</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="callout">
          <span className="label">JPG não serve</span>
          <p>
            Um JPG com fundo branco vira um <strong>retângulo branco</strong> sobre a foto. Não é
            defeito do aplicativo: o formato JPG não guarda transparência, então não há como
            distinguir o que é marca do que é fundo. O mesmo vale para PNG exportado com fundo
            chapado.
          </p>
          <p>
            Se você só tem o logotipo em JPG, peça ao seu designer o mesmo arquivo em{' '}
            <strong>PNG com fundo transparente</strong> — é uma exportação, não um trabalho novo.
          </p>
        </div>
      </section>

      <section className="section" id="faixa">
        <Heading id="faixa" />
        <p>
          Sobre uma parede branca ao sol, texto claro com sombra chega ao limite. A faixa de fundo
          resolve isso, e tem duas formas.
        </p>

        <dl className="deftable">
          <div>
            <dt>Atrás do texto</dt>
            <dd>
              Um cartão que acompanha o tamanho do carimbo, com folga em volta e cantos
              arredondáveis de 0 a 24.
            </dd>
          </div>
          <div>
            <dt>Faixa contínua</dt>
            <dd>
              Uma tarja reta que atravessa a foto de borda a borda e encosta na margem onde o
              carimbo está ancorado. Sobre cena carregada — obra, pátio, fachada cheia — ela lê como
              legenda do documento; o cartão flutuando, nesses casos, lê como adesivo colado por
              cima.
            </dd>
          </div>
          <div>
            <dt>Nenhuma</dt>
            <dd>Texto direto sobre a imagem, com sombra. É o padrão.</dd>
          </div>
        </dl>

        <p>
          As duas levam <strong>cor livre</strong> e <strong>transparência de 0 a 100%</strong>, em
          passos de 5. Zero por cento não é a faixa quebrada: é a faixa desligada sem perder os
          ajustes, para voltar a ligar quando a foto pedir.
        </p>

        <p>
          <strong>Onde a transparência costuma cair:</strong>
        </p>
        <ul>
          <li>
            <strong>50%</strong> — foto de tom médio; o carimbo lê e a imagem continua visível.
          </li>
          <li>
            <strong>75%</strong> — parede branca, areia, neve, céu estourado.
          </li>
          <li>
            <strong>100%</strong> — quando o documento importa mais que o pedaço de imagem coberto.
          </li>
        </ul>

        <p>
          O arredondamento vale só para o cartão. A faixa contínua é reta em cima e embaixo:
          arredondada, ela viraria um painel — meio-termo entre as duas opções, que embaralha a
          escolha entre elas.
        </p>
      </section>

      <section className="section" id="endereco">
        <Heading id="endereco" />
        <p>
          O endereço é preenchido pelo GPS num toque, e é <strong>sempre editável</strong>. Essa
          combinação é deliberada, e vale explicar por quê.
        </p>

        <p>
          Geocodificação reversa erra. Dentro de galpões e entre prédios altos, o sinal degrada; em
          rua com numeração irregular, o serviço chuta o vizinho. Um carimbo que só aceitasse o que o
          GPS devolveu produziria documentos com endereço errado — e sem forma de corrigir.
        </p>

        <div className="callout">
          <span className="label">Corrigir não é fraudar</span>
          <p>
            A correção manual é um instrumento de <strong>precisão</strong>, não de burla. O técnico
            que está de pé na porta do imóvel sabe o número melhor que o satélite. O que o carimbo
            afirma é o que o profissional atesta — e é ele que assina o laudo.
          </p>
        </div>

        <p>
          Quando a precisão do sinal passa de <strong>20 metros</strong> — cerca de duas casas de
          frente —, o aplicativo avisa que o número da fachada pode não ser confiável. Abaixo disso o
          geocodificador costuma acertar a porta.
        </p>

        <p>
          Se o GPS falhar por qualquer motivo — permissão negada, localização desligada, sem resposta
          a tempo, posição sem endereço conhecido —, a mensagem diz qual dos quatro aconteceu e o que
          fazer. Digitar à mão é sempre o caminho de saída.
        </p>
      </section>

      <section className="section" id="codigo">
        <Heading id="codigo" />
        <p>
          Um identificador de <strong>14 caracteres hexadecimais</strong> — <code>0-9</code> e{' '}
          <code>A-F</code> — sorteado por gerador criptográfico, e não por <code>Math.random</code>:
          duas fotos do mesmo dia não podem receber o mesmo código. Serve para referenciar uma foto
          específica fora do aplicativo, numa ordem de serviço, num laudo ou numa conversa.
        </p>

        <p>
          Ele pode ser digitado à mão, e o que você digitar é preservado: escolher outra foto não
          sorteia um código novo por cima do seu. Fora do campo, letras minúsculas viram maiúsculas e
          caracteres inválidos são descartados.
        </p>

        <p>
          <strong>Duas posições:</strong>
        </p>
        <ul>
          <li>
            <strong>Lateral direita</strong> — girado 90°, colado na borda. Não disputa espaço com o
            conteúdo da imagem. É o padrão.
          </li>
          <li>
            <strong>Junto aos dados</strong> — na última linha do bloco, abaixo do endereço.
          </li>
        </ul>
      </section>

      <section className="section" id="galeria">
        <Heading id="galeria" />
        <p>
          A aba Galeria guarda o histórico do que foi exportado, com data, endereço, código e a lista
          de campos que de fato foram carimbados naquela foto — e não os que estão ligados hoje.
        </p>

        <p>
          <strong>Uma vistoria produz dezenas de fotos, então:</strong>
        </p>
        <ul>
          <li>
            <strong>Busca</strong> por endereço, data ou código, sem diferenciar acento nem
            maiúscula. “sao paulo” encontra “São Paulo”.
          </li>
          <li>
            <strong>Seleção múltipla</strong> com toque longo, para salvar ou remover várias de uma
            vez.
          </li>
        </ul>

        <p>
          Remover do histórico não apaga o que já foi salvo na galeria do aparelho — são dois lugares
          diferentes, e o aviso na tela diz isso antes de confirmar.
        </p>
      </section>

      <section className="section" id="arquivo">
        <Heading id="arquivo" />
        <p>
          O carimbo é composto sobre o bitmap original da fotografia, na resolução da câmera. Um
          arquivo de 4096 × 3072 entra e sai com 4096 × 3072, carimbado. A tela não participa da
          exportação.
        </p>

        <dl className="deftable">
          <div>
            <dt>Formato</dt>
            <dd>JPEG, qualidade 92 — alto o bastante para não marcar o texto do carimbo.</dd>
          </div>
          <div>
            <dt>Resolução</dt>
            <dd>A mesma da fotografia de origem, sem redução.</dd>
          </div>
          <div>
            <dt>Onde fica</dt>
            <dd>
              Em armazenamento permanente do aplicativo, não no cache — o histórico não fica
              apontando para arquivos que o sistema apagou.
            </dd>
          </div>
        </dl>
      </section>

      <section className="section" id="privacidade">
        <Heading id="privacidade" />
        <p>
          <strong>Nada sai do aparelho.</strong> Não há conta, não há servidor, não há envio de fotos
          para lugar nenhum. O carimbo é desenhado localmente e o arquivo fica com você.
        </p>

        <p>
          A localização é usada para uma coisa só: traduzir a posição atual em texto de endereço, no
          momento em que você toca no botão. As <strong>coordenadas não são gravadas</strong> — nem
          no histórico, nem no arquivo. O que fica registrado é o endereço em texto, que é o que o
          documento precisa afirmar.
        </p>

        <p>
          Para revogar o acesso à localização ou às fotos, use as permissões do próprio sistema
          operacional. O aplicativo continua funcionando sem nenhuma das duas — com o endereço
          digitado à mão e a foto vinda da câmera.
        </p>

        <p>
          O tratamento de dados está detalhado, inclusive sob a LGPD, na{' '}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </section>

      <p className="colophon">
        Os números de tamanho foram medidos na própria geometria do carimbo, nas resoluções que as
        câmeras de telefone produzem — não são estimativas.
      </p>
    </article>
  );
}
