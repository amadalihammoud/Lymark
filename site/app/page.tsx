import Link from 'next/link';

/*
 * Uma amostra do carimbo, desenhada com as mesmas proporções do aplicativo.
 * Não é uma captura de tela: enquanto não houver fotos reais de campo, uma
 * imagem montada seria uma promessa que o produto ainda não fez.
 */
function Specimen() {
  return (
    <div>
      <figure style={{ margin: 0 }}>
        <div className="specimen" role="img" aria-label="Amostra do carimbo do Lymark: hora 07:42, data 12 de agosto de 2026, quarta-feira, endereço em Guarujá e código de foto.">
          <p className="brand" aria-hidden="true">
            Ly<em>mark</em>
          </p>
          <p className="code" aria-hidden="true">
            98926A73655DC1
          </p>
          <div className="stamp" aria-hidden="true">
            <div className="row">
              <p className="clock">07:42</p>
              <div className="rule" />
              <div className="stack">
                <span>12 ago. 2026</span>
                <span>Qua</span>
              </div>
            </div>
            <p className="address">Av. Puglisi, 490 - Centro, Guarujá - SP, 11410-002</p>
          </div>
        </div>
        <figcaption className="caption">
          A barra âmbar começa e termina nos limites dos dígitos, não da caixa de texto.
        </figcaption>
      </figure>
    </div>
  );
}

/*
 * As três plataformas, com o estado real de cada uma. `href` nulo é o que
 * segura o lugar: enquanto não houver loja, o cartão mostra o estado em vez
 * de um botão que não leva a lugar nenhum — e no dia em que houver, basta
 * escrever a URL aqui para o botão aparecer.
 */
const PLATFORMS = [
  {
    os: 'Android',
    status: 'Em testes',
    testing: true,
    note: 'Versão 1.1.0, distribuída a testadores antes da publicação na loja.',
    store: 'Google Play',
    href: null as string | null,
  },
  {
    os: 'iOS',
    status: 'Planejado',
    testing: false,
    note: 'O carimbo é desenhado pelo mesmo motor gráfico nas duas plataformas. Não há data.',
    store: 'App Store',
    href: null as string | null,
  },
  {
    os: 'Desktop',
    status: 'Planejado',
    testing: false,
    note: 'Para carimbar em lote fotos que já estão no computador. Ainda não começou.',
    store: null,
    href: null as string | null,
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Registro fotográfico de campo</p>
          <h1>A foto sai do celular já dizendo quando, onde e o quê.</h1>
          <p className="lede">
            O Lymark carimba hora, data, dia da semana, endereço e um código de rastreio
            diretamente na imagem. O arquivo que sai do aplicativo já sai com a informação
            embutida — não é um dado que acompanha a foto e se perde no primeiro
            encaminhamento por WhatsApp.
          </p>
          <div className="meta">
            <span>Android</span>
            <span>Sem conta</span>
            <span>Sem servidor</span>
            <span>Português do Brasil</span>
          </div>
        </div>
        <Specimen />
      </section>

      <section className="band alt">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            01
          </span>
          <h2>Para quem é</h2>
        </div>

        <p className="lede">
          Quem trabalha em campo entrega foto como comprovação — e a foto sozinha não diz quando
          nem onde foi tirada. O Lymark é para esses ofícios, em que a imagem precisa se explicar
          depois, longe de quem a tirou.
        </p>

        <div className="grid" style={{ marginTop: '2.25rem' }}>
          <div className="cell">
            <p className="field">Vistoria e laudo</p>
            <h3>Imobiliária, seguradora, perícia</h3>
            <p className="who">
              Entrada e saída de imóvel, avaria de veículo, sinistro. Dezenas de fotos do mesmo
              endereço no mesmo dia, que depois precisam ser distinguidas uma da outra — é para
              isso que serve o código de foto.
            </p>
          </div>
          <div className="cell">
            <p className="field">Obra e manutenção</p>
            <h3>Medição de avanço, antes e depois</h3>
            <p className="who">
              A data carimbada na imagem é o que separa a foto do reparo feito hoje da foto do
              mesmo ponto no mês passado, quando as duas chegam juntas no relatório.
            </p>
          </div>
          <div className="cell">
            <p className="field">Serviço em campo</p>
            <h3>Assistência técnica, instalação, coleta</h3>
            <p className="who">
              Comprovar que o técnico esteve no endereço, e a que horas. O carimbo vai na imagem,
              então sobrevive ao encaminhamento por WhatsApp — que apaga todo o resto.
            </p>
          </div>
          <div className="cell">
            <p className="field">Meio ambiente e agro</p>
            <h3>Ocorrência a céu aberto</h3>
            <p className="who">
              Registro de campo em lugar sem referência visual, onde a única forma de dizer que
              ponto é aquele é o endereço que o GPS devolveu no momento da captura.
            </p>
          </div>
        </div>

        <p className="note">
          Em todos eles o carimbo organiza e identifica — não certifica. Os campos são editáveis
          por decisão de projeto, e quem assina o documento continua sendo o profissional. Está
          escrito nos <Link href="/termos">Termos de Uso</Link>.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            02
          </span>
          <h2>O que entra na imagem</h2>
        </div>

        <div className="grid three">
          <div className="cell">
            <p className="field">Hora e data</p>
            <h3>Do relógio do aparelho, no momento da captura</h3>
            <p>
              Um botão devolve os três campos ao instante atual quando a captura demorou
              mais do que o previsto. Todos permanecem editáveis.
            </p>
          </div>
          <div className="cell">
            <p className="field">Endereço</p>
            <h3>Preenchido pelo GPS, corrigível à mão</h3>
            <p>
              O logradouro é abreviado e o estado vira sigla, para o endereço caber em duas
              linhas sem cobrir a foto. Se você digitou antes do GPS responder, o que você
              escreveu prevalece.
            </p>
          </div>
          <div className="cell">
            <p className="field">Código de foto</p>
            <h3>Catorze caracteres, sorteados por gerador criptográfico</h3>
            <p>
              Serve para citar uma foto específica numa ordem de serviço ou num laudo. Vai
              girado na lateral direita ou junto ao bloco de dados, à sua escolha.
            </p>
          </div>
        </div>

        <p className="note">
          Cada campo é ligado ou desligado individualmente, e o bloco pode ser ancorado em
          qualquer um dos quatro cantos — em três tamanhos. A pré-visualização usa a sua
          foto atual, e não um exemplo genérico: o que aparece na tela é literalmente o que
          é exportado. Cada ajuste está descrito no <Link href="/manual">Manual de uso</Link>,
          com os tamanhos medidos.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            03
          </span>
          <h2>O percurso de uma foto</h2>
        </div>

        <div className="grid three">
          <div className="cell">
            <p className="field">Capturar</p>
            <h3>Câmera ou galeria</h3>
            <p>
              O endereço começa a ser buscado assim que a foto entra. Os campos ficam
              abertos para ajuste enquanto isso.
            </p>
          </div>
          <div className="cell">
            <p className="field">Salvar</p>
            <h3>Vai para a galeria do aparelho</h3>
            <p>
              Fica junto com as outras fotos do celular, disponível para qualquer aplicativo
              — inclusive depois de desinstalar o Lymark.
            </p>
          </div>
          <div className="cell">
            <p className="field">Compartilhar</p>
            <h3>Abre a folha do sistema</h3>
            <p>
              WhatsApp, e-mail, Drive: o destino é escolhido pelo sistema operacional, e o
              aplicativo não participa do envio.
            </p>
          </div>
        </div>

        <p className="note">
          As duas ações são separadas de propósito. Salvar e compartilhar resolvem problemas
          diferentes, e juntar as duas num botão só obrigaria quem quer apenas arquivar a
          passar por uma tela de envio.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            04
          </span>
          <h2>Onde os seus dados ficam</h2>
        </div>

        <div className="grid">
          <div className="cell">
            <p className="field">No aparelho</p>
            <h3>Fotos, endereços e histórico</h3>
            <p>
              O Lymark não tem servidor, não cria conta e não envia as suas fotos para lugar
              nenhum. O histórico guarda as últimas duzentas exportações em arquivos do
              próprio aplicativo.
            </p>
          </div>
          <div className="cell">
            <p className="field">Fora do aparelho</p>
            <h3>Apenas a conversão de coordenada em endereço</h3>
            <p>
              Para transformar a latitude e a longitude num endereço legível, o sistema
              operacional consulta o serviço de geocodificação do Google ou da Apple. É a
              única informação que sai, e ela sai pelo sistema, não pelo aplicativo.
            </p>
          </div>
        </div>

        <p className="note">
          Está detalhado — inclusive o que isso significa sob a LGPD — na{' '}
          <Link href="/privacidade">Política de Privacidade</Link>. Desligar a permissão de
          localização mantém o aplicativo inteiramente funcional; apenas o campo de endereço
          passa a ser digitado à mão.
        </p>
      </section>

      <section className="band alt">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            05
          </span>
          <h2>Onde conseguir</h2>
        </div>

        <p className="lede">
          O Lymark está na versão 1.1.0, em testes no Android antes da publicação na Google Play.
          As outras duas plataformas estão planejadas — e o aplicativo não coleta pagamento em
          nenhuma delas.
        </p>

        <div className="platforms">
          {PLATFORMS.map((platform) => (
            <div className="platform" key={platform.os}>
              <p className="os">{platform.os}</p>
              <p className={platform.testing ? 'status testing' : 'status'}>{platform.status}</p>
              <p>{platform.note}</p>
              <p className="cta">
                {platform.href ? (
                  <a className="store" href={platform.href}>
                    Baixar {platform.store ? `na ${platform.store}` : ''}
                  </a>
                ) : (
                  <span className="pending">
                    {platform.store
                      ? `O link da ${platform.store} aparece aqui na publicação.`
                      : 'A forma de distribuição ainda não foi definida.'}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <p className="note">
          Para entrar na lista de testadores do Android, acompanhar o lançamento ou relatar um
          problema, escreva para <a href="mailto:contato@lymark.app">contato@lymark.app</a>.
        </p>
      </section>
    </>
  );
}
