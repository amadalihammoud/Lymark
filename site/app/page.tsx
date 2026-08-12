import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';

/*
 * Uma amostra do carimbo, desenhada com as mesmas proporcoes do aplicativo.
 * Nao e uma captura de tela: enquanto nao houver fotos reais de campo, uma
 * imagem montada seria uma promessa que o produto ainda nao fez.
 */
function Specimen() {
  return (
    <div>
      <figure style={{ margin: 0 }}>
        <div className="specimen" role="img" aria-label="Amostra do carimbo do Lymark: hora 07:42, data 12 de agosto de 2026, quarta feira, endereco em Guaruja e codigo de foto.">
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
            <p className="address">Av. Puglisi, 490 - Centro, Guaruja - SP, 11410-002</p>
          </div>
        </div>
        <figcaption className="caption">
          A barra ambar comeca e termina nos limites dos digitos, nao da caixa de texto.
        </figcaption>
      </figure>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Registro fotografico de campo</p>
          <h1>A foto sai do celular ja dizendo quando, onde e o que.</h1>
          <p className="lede">
            O Lymark carimba hora, data, dia da semana, endereco e um codigo de rastreio
            diretamente na imagem. O arquivo que sai do aplicativo ja sai com a informacao
            embutida - nao e um dado que acompanha a foto e se perde no primeiro
            encaminhamento por WhatsApp.
          </p>
          <div className="cta">
            <SignedIn>
              <a href="https://app.lymark.app">
                Abrir o app no navegador
              </a>
              <span className="note">Nada para instalar.</span>
            </SignedIn>
            <SignedOut>
              <Link href="/login" style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--accent)',
                color: '#000',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '500'
              }}>
                Entrar para acessar
              </Link>
            </SignedOut>
          </div>

          <div className="meta">
            <span>Android e navegador</span>
            <span>Sem conta</span>
            <span>Sem servidor</span>
            <span>Portugues do Brasil</span>
          </div>
        </div>
        <Specimen />
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            01
          </span>
          <h2>O que entra na imagem</h2>
        </div>

        <div className="grid three">
          <div className="cell">
            <p className="field">Hora e data</p>
            <h3>Do relogio do aparelho, no momento da captura</h3>
            <p>
              Um botao devolve os tres campos ao instante atual quando a captura demorou
              mais do que o previsto. Todos permanecem editaveis.
            </p>
          </div>
          <div className="cell">
            <p className="field">Endereco</p>
            <h3>Preenchido pelo GPS, corrigivel a mao</h3>
            <p>
              O logradouro e abreviado e o estado vira sigla, para o endereco caber em duas
              linhas sem cobrir a foto. Se voce digitou antes do GPS responder, o que voce
              escreveu prevalece.
            </p>
          </div>
          <div className="cell">
            <p className="field">Codigo de foto</p>
            <h3>Catorze caracteres, sorteados por gerador criptografico</h3>
            <p>
              Serve para citar uma foto especifica numa ordem de servico ou num laudo. Vai
              girado na lateral direita ou junto ao bloco de dados, a sua escolha.
            </p>
          </div>
        </div>

        <p className="note">
          Cada campo e ligado ou desligado individualmente, e o bloco pode ser ancorado em
          qualquer um dos quatro cantos - em tres tamanhos. A pre visualizacao usa a sua
          foto atual, e nao um exemplo generico: o que aparece na tela e literalmente o que
          e exportado.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            02
          </span>
          <h2>O percurso de uma foto</h2>
        </div>

        <div className="grid three">
          <div className="cell">
            <p className="field">Capturar</p>
            <h3>Camera ou galeria</h3>
            <p>
              O endereco comeca a ser buscado assim que a foto entra. Os campos ficam
              abertos para ajuste enquanto isso.
            </p>
          </div>
          <div className="cell">
            <p className="field">Salvar</p>
            <h3>Vai para a galeria do aparelho</h3>
            <p>
              Fica junto com as outras fotos do celular, disponivel para qualquer aplicativo
              - inclusive depois de desinstalar o Lymark.
            </p>
          </div>
          <div className="cell">
            <p className="field">Compartilhar</p>
            <h3>Abre a folha do sistema</h3>
            <p>
              WhatsApp, e-mail, Drive: o destino e escolhido pelo sistema operacional, e o
              aplicativo nao participa do envio.
            </p>
          </div>
        </div>

        <p className="note">
          As duas acoes sao separadas de proposito. Salvar e compartilhar resolvem problemas
          diferentes, e juntar as duas num botao so obrigaria quem quer apenas arquivar a
          passar por uma tela de envio.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            03
          </span>
          <h2>Onde os seus dados ficam</h2>
        </div>

        <div className="grid">
          <div className="cell">
            <p className="field">No aparelho</p>
            <h3>Fotos, enderecos e historico</h3>
            <p>
              O Lymark nao tem servidor, nao cria conta e nao envia as suas fotos para lugar
              nenhum. O historico guarda as ultimas duzentas exportacoes em arquivos do
              proprio aplicativo.
            </p>
          </div>
          <div className="cell">
            <p className="field">Fora do aparelho</p>
            <h3>Apenas a conversao de coordenada em endereco</h3>
            <p>
              Para transformar a latitude e a longitude num endereco legivel, o sistema
              operacional consulta o servico de geocodificacao do Google ou da Apple. E a
              unica informacao que sai, e ela sai pelo sistema, nao pelo aplicativo.
            </p>
          </div>
        </div>

        <p className="note">
          Esta detalhado - inclusive o que isso significa sob a LGPD - na{' '}
          <Link href="/privacidade">Politica de Privacidade</Link>. Desligar a permissao de
          localizacao mantem o aplicativo inteiramente funcional; apenas o campo de endereco
          passa a ser digitado a mao.
        </p>
      </section>

      <section className="band">
        <div className="band-head">
          <span className="num" aria-hidden="true">
            04
          </span>
          <h2>Disponibilidade</h2>
        </div>
        <p className="lede">
          O Lymark esta na versao 1.3.0, em testes no Android antes da publicacao na Google
          Play. Nao ha versao para iOS nem versao web, e o aplicativo nao coleta pagamento.
        </p>
        <p className="note">
          Para acompanhar o lancamento ou relatar um problema, escreva para{' '}
          <a href="mailto:contato@lymark.app">contato@lymark.app</a>.
        </p>
      </section>
    </>
  );
}