import Link from 'next/link';

import { AddressScene } from './_components/address-scene';
import { BrandScene } from './_components/brand-scene';
import { HeroScene } from './_components/hero-scene';

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
    note: 'Versão 1.3.0, distribuída a testadores antes da publicação na loja.',
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

const AUDIENCE = [
  {
    field: 'Vistoria e laudo',
    title: 'Imobiliária, seguradora, perícia',
    body: 'Entrada e saída de imóvel, avaria de veículo, sinistro. Dezenas de fotos do mesmo endereço no mesmo dia, que depois precisam ser distinguidas uma da outra — é para isso que serve o Código de Foto.',
  },
  {
    field: 'Obra e manutenção',
    title: 'Medição de avanço, antes e depois',
    body: 'A data carimbada na imagem é o que separa a foto do reparo feito hoje da foto do mesmo ponto no mês passado, quando as duas chegam juntas no relatório.',
  },
  {
    field: 'Serviço em campo',
    title: 'Assistência técnica, instalação, coleta',
    body: 'Comprovar que o técnico esteve no endereço, e a que horas. O carimbo vai na imagem, então sobrevive ao encaminhamento por WhatsApp — que apaga todo o resto.',
  },
  {
    field: 'Meio ambiente e agro',
    title: 'Ocorrência a céu aberto',
    body: 'Registro de campo em lugar sem referência visual, onde a única forma de dizer que ponto é aquele é o endereço que o GPS devolveu no momento da captura — corrigido por você, quando ele erra.',
  },
  {
    field: 'Ronda e portaria',
    title: 'Segurança, limpeza, zeladoria',
    body: 'O contrato diz de quanto em quanto tempo o posto é percorrido. A hora carimbada na foto de cada ponto é o que transforma a ronda em registro verificável, sem depender da planilha preenchida depois.',
  },
  {
    field: 'Entrega e coleta',
    title: 'Comprovação de destino',
    body: 'Mercadoria entregue, contêiner lacrado, material retirado. A foto sai dizendo em que endereço e a que horas — e é isso que a transportadora precisa mostrar quando o recebimento é contestado.',
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
            O Lymark carimba hora, data, dia da semana, endereço e um Código de Foto dentro da
            imagem. O arquivo já sai do aplicativo com a informação embutida — não é um dado que
            acompanha a foto e se perde no primeiro encaminhamento por WhatsApp.
          </p>
          <div className="meta">
            <span>Android</span>
            <span>Sem conta</span>
            <span>Sem servidor</span>
            <span>Português do Brasil</span>
          </div>
        </div>
        <HeroScene />
      </section>

      <section className="band alt">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            01
          </span>
          <h2>O GPS erra o número. Você corrige antes de carimbar.</h2>
        </div>

        <p className="lede">
          Você fotografou o número 1225 e o GPS devolveu 2000. Acontece em rua comprida, em
          condomínio e em qualquer lugar sem referência visual — e a foto nasce dizendo o endereço
          errado.
        </p>

        <AddressScene />

        <ol className="points">
          <li>O campo aceita edição a qualquer momento, antes de exportar.</li>
          <li>O que você digita prevalece sobre o que o GPS devolve.</li>
          <li>
            Sem localização ligada, o aplicativo continua inteiro: o endereço passa a ser digitado.
          </li>
        </ol>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            02
          </span>
          <h2>A marca de quem assina o registro</h2>
        </div>

        <p className="lede">
          A marca d’água identifica a organização responsável pelo registro — empresa, órgão público
          ou prestadora contratada. A pré-visualização usa a sua foto atual: o que aparece na tela é
          o que é exportado. O logotipo entra dentro da imagem, junto do horário e do endereço — não
          é etiqueta colada por cima nem dado anexo, que se perde no primeiro encaminhamento.
        </p>

        <BrandScene />

        <ol className="points">
          <li>Logotipo em PNG transparente, carimbado junto ao registro.</li>
          <li>Nome em duas partes, com cores independentes.</li>
          <li>Complemento livre: coordenadoria, unidade ou contrato.</li>
        </ol>

        <p className="note">
          A mesma foto pode sair com a marca de uma empresa privada ou com a identificação de um
          órgão público. Quem assina o documento continua sendo o profissional. Cada ajuste está
          descrito no <Link href="/manual">Manual de uso</Link>, com os tamanhos medidos.
        </p>
      </section>

      <section className="band alt">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            03
          </span>
          <h2>Para quem é</h2>
        </div>

        <p className="lede">
          Quem trabalha em campo entrega foto como comprovação — e a foto sozinha não diz quando nem
          onde foi tirada. O Lymark é para esses ofícios, em que a imagem precisa se explicar depois,
          longe de quem a tirou.
        </p>

        <div className="grid three" style={{ marginTop: '2.25rem' }}>
          {AUDIENCE.map((item) => (
            <div className="cell" key={item.field}>
              <p className="field">{item.field}</p>
              <h3>{item.title}</h3>
              <p className="who">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="note">
          Em todos eles o carimbo organiza e identifica — não certifica. Os campos são editáveis por
          decisão de projeto, e quem assina o documento continua sendo o profissional. Está escrito
          nos <Link href="/termos">Termos de Uso</Link>.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            04
          </span>
          <h2>O percurso de uma foto</h2>
        </div>

        <div className="grid three">
          <div className="cell">
            <p className="field">Capturar</p>
            <h3>Câmera ou galeria</h3>
            <p>
              O endereço começa a ser buscado assim que a foto entra. Os campos ficam abertos para
              ajuste enquanto isso.
            </p>
          </div>
          <div className="cell">
            <p className="field">Salvar</p>
            <h3>Vai para a galeria do aparelho</h3>
            <p>
              Fica junto com as outras fotos do celular, disponível para qualquer aplicativo —
              inclusive depois de desinstalar o Lymark.
            </p>
          </div>
          <div className="cell">
            <p className="field">Compartilhar</p>
            <h3>Abre a folha do sistema</h3>
            <p>
              WhatsApp, e-mail, Drive: o destino é escolhido pelo sistema operacional, e o aplicativo
              não participa do envio.
            </p>
          </div>
        </div>
      </section>

      <section className="band alt" id="dados">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            05
          </span>
          <h2>Onde os seus dados ficam</h2>
        </div>

        <div className="grid">
          <div className="cell">
            <p className="field">No aparelho</p>
            <h3>Fotos, endereços e histórico</h3>
            <p>
              O Lymark não tem servidor, não cria conta e não envia as suas fotos para lugar nenhum.
              O histórico fica em armazenamento do próprio aplicativo, e as coordenadas não são
              gravadas — nem nele, nem no arquivo exportado. O que fica registrado é o endereço em
              texto.
            </p>
          </div>
          <div className="cell">
            <p className="field">Fora do aparelho</p>
            <h3>Apenas a conversão de coordenada em endereço</h3>
            <p className="exchange" aria-hidden="true">
              <span>lat, lon</span>
              <span className="arrow">→</span>
              <span>endereço</span>
            </p>
            <p>
              Para transformar a latitude e a longitude num endereço legível, o sistema operacional
              consulta o serviço de geocodificação do Google ou da Apple. Isso acontece no momento em
              que você toca no botão de localizar: é a única informação que sai, e ela sai pelo
              sistema, não pelo aplicativo.
            </p>
          </div>
        </div>

        <p className="note">
          Está detalhado — inclusive o que isso significa sob a LGPD — na{' '}
          <Link href="/privacidade">Política de Privacidade</Link>. Desligar a permissão de
          localização mantém o aplicativo inteiramente funcional; apenas o campo de endereço passa a
          ser digitado à mão.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            06
          </span>
          <h2>Onde conseguir</h2>
        </div>

        <p className="lede">
          O Lymark está em testes no Android, antes da publicação na Google Play. As outras duas
          plataformas estão planejadas — e o aplicativo não coleta pagamento em nenhuma delas.
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
          <strong>Entre na lista de testadores do Android.</strong> Para acompanhar o lançamento ou
          relatar um problema, escreva para{' '}
          <a href="mailto:contato@lymark.app">contato@lymark.app</a>.
        </p>
      </section>
    </>
  );
}
