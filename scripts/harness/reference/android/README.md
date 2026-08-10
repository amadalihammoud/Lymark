# Referência do aparelho

Esta pasta guarda a **única verdade** sobre como o carimbo deve sair: as imagens produzidas por um Android real rodando o aplicativo, mais os relatórios de geometria correspondentes.

Enquanto ela estiver vazia, a paridade com o mobile **não está verificada**. O comparador avisa isso em toda execução, e com `--require-device` ele reprova. Nunca preencha esta pasta com imagem gerada fora do aparelho, e nunca renomeie um arquivo gerado em outro lugar para parecer que veio daqui.

## O que precisa estar aqui

Para cada um dos quatro casos da fixture:

```
portrait-3000x4000.png    landscape-4000x3000.png
portrait-3000x4000.json   landscape-4000x3000.json
square-2000x2000.png      highres-6000x4000.png
square-2000x2000.json     highres-6000x4000.json
```

## Como produzir

**Aparelho físico, não emulador.** O emulador desenha sobre a GPU da máquina anfitriã, que não é a do celular. Como referência autoritativa, ele entregaria uma verdade que nenhum usuário vê.

1. Gere o APK sem precisar de SDK local — o perfil já existe no `eas.json`:

   ```
   npx eas build -p android --profile preview
   ```

2. Instale no aparelho e abra a rota de referência, disponível apenas em `__DEV__`. Ela roda a fixture pelo caminho de código real (`renderStampedPhoto`), com as fotos de teste embutidas como assets e os valores fixos de `lib/fixture.js` — sem passar pelo seletor de imagens, para que a entrada seja idêntica à das outras plataformas.

   > **Esta rota ainda não existe.** É o próximo passo do harness. Até ela ser escrita, o passo 2 descreve o protocolo pretendido, não algo que já esteja no aplicativo — e por isso esta pasta continua vazia.

3. Puxe o resultado:

   ```
   adb pull /sdcard/Android/data/com.lymark.app/files/harness ./scripts/harness/reference/android
   ```

4. Confira que cada `.json` traz o commit e a versão gravados, e versione tudo.

## Quando refazer

Sempre que o desenho do carimbo mudar — geometria, tipografia, sombra, cores ou preferências padrão. O `commit` gravado em cada `.json` permite detectar referência velha: se ele apontar para antes da última mudança no carimbo, a referência está obsoleta e precisa ser regerada.

Não é para rodar a cada commit. O portão de geometria roda sempre e é barato; este aqui é caro e raro, e só ele fecha a pergunta que interessa de verdade.
