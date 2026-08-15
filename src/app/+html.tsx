import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors } from '@/theme';
import { DEFAULT_LOCALE } from '@i18n/locales';

/**
 * O documento HTML que envolve o aplicativo na web.
 *
 * Existe porque o shell padrão do Expo publicava `<html lang="en">`: um leitor
 * de tela anunciava uma interface inteiramente em português com voz inglesa.
 *
 * Este arquivo roda **apenas na exportação estática**, no servidor. Não é
 * hidratado, então nada aqui pode depender do navegador nem de estado.
 *
 * Por isso o `lang` daqui é só o ponto de partida. O Expo publica uma
 * aplicação de página única: um único documento serve as doze línguas, e qual
 * delas será usada só se sabe quando o aparelho responde ou o disco devolve a
 * escolha da pessoa. Quem corrige é `applyDocumentLanguage`, chamado pelo
 * `LocaleProvider` — e é ele quem também põe o `dir="rtl"` do árabe.
 *
 * O valor fixo aqui é o idioma de origem, e não `pt-BR`, para bater com o
 * `lang={locale}` do site: as duas pontas passam a falar o mesmo código.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <meta
          name="description"
          content="Carimba hora, data, dia da semana, endereço e código de rastreio direto na foto."
        />

        {/*
          LIMITAÇÃO CONHECIDA: o documento sai com `<title>` vazio, e a aba do
          navegador mostra a URL.

          Não é por falta de título nas telas — todas têm (`Capturar`,
          `Galeria`, `Configurações`). O expo-router emite, como PRIMEIRO
          elemento do `<head>`, um `<title data-rh="true">` gerado pelo
          react-helmet, e ele sai vazio. Havendo dois, o navegador usa o
          primeiro, então escrever um `<title>` aqui não resolve — só deixa o
          documento inválido.

          O caminho documentado é o `<Head>` do `expo-router/head`. Foi testado
          nas duas posições, no layout raiz e dentro da rota, exportando e
          medindo `document.title` já hidratado: continua vazio nas duas.
          Resolver exige entender por que o helmet não recebe o valor — não
          cabia no esforço, e o defeito é cosmético.
        */}

        {/* Pinta a barra do navegador no mesmo tom do fundo do aplicativo, para
            a interface não terminar numa faixa clara no celular. */}
        <meta name="theme-color" content={colors.background} />

        {/*
          Desliga o scroll do body e faz a raiz ocupar a altura toda. Sem isto o
          `ScrollView` do react-native-web rola o documento inteiro em vez do
          próprio contêiner, e as abas fixas saem da tela ao rolar a galeria.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
