/**
 * Entrada nativa (Android e iOS): direto ao roteador, como sempre foi.
 *
 * A entrada existe como arquivo próprio porque a web precisa de outra — ver
 * `index.web.js`, onde mora o motivo. O resolvedor do Metro escolhe pelo
 * sufixo de plataforma; este arquivo é o padrão.
 */
import 'expo-router/entry';
