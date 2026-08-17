import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { ChoiceGrid } from '@/components/ui/choice-grid';
import { FieldRow } from '@/components/ui/field-row';
import { Note } from '@/components/ui/note';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useFeedback } from '@/contexts/feedback-context';
import { useGallery } from '@/contexts/gallery-context';
import { useLocalePreference } from '@/contexts/locale-context';
import { useSettings } from '@/contexts/settings-context';
import { photoToDataUri } from '@/features/report/embed-photos';
import { REPORT_NORMS, type ReportNorm } from '@/features/report/norms';
import { groupByProject, type Project } from '@/features/report/projects';
import { buildReportHtml, type ReportStrings } from '@/features/report/report-html';
import { buildSummaryCsv } from '@/features/report/summary-csv';
import { resolveExportedPhotoUri } from '@/features/watermark/photo-file';
import { resolveLogoUri } from '@/features/watermark/logo-file';
import { isDesktop } from '@/lib/file-storage';
import { HIT_TARGET, colors, radius, spacing, typography } from '@/theme';

/**
 * Relatório em PDF — a galeria organizada por obra, pronta para entregar.
 *
 * Desktop apenas, por decisão de produto (organização em relatórios "bem
 * completo" fica na versão de computador) e por mecânica: quem imprime é o
 * Chromium do Electron, via janela oculta e `printToPDF`.
 *
 * A tela não inventa entidade nova: os "projetos" são o agrupamento da
 * galeria pelo Código de Foto (`projects.ts`). Escolhe-se um projeto — ou
 * todas as fotos —, a norma de formatação (ABNT ou internacional), título e
 * responsável, e o documento sai com capa, tabela-resumo e um registro por
 * foto com os campos que foram DE FATO carimbados.
 */
/**
 * Os formatos de saída. PDF é a ENTREGA (paginação fixa, ninguém altera
 * sem querer); Word é para quem quer editar o texto antes de entregar; CSV
 * é a tabela-resumo para quem controla obra em planilha.
 */
const REPORT_FORMATS = ['pdf', 'word', 'csv', 'zip'] as const;

/**
 * Teto do canal de gravação do desktop (o handler `save-file` recusa acima
 * disto). O Word carrega as fotos embutidas, então é o único formato que
 * chega perto: um relatório de muitas fotos precisa sair em PDF ou ZIP.
 */
const WORD_MAX_BYTES = 50 * 1024 * 1024;

type ReportFormat = (typeof REPORT_FORMATS)[number];

export default function ReportScreen() {
  const t = useTranslations('app.report');

  if (!isDesktop()) {
    return (
      <Screen>
        <Text style={typography.screenTitle}>{t('unavailableTitle')}</Text>
        <Text style={typography.body}>{t('unavailableBody')}</Text>
      </Screen>
    );
  }

  return <DesktopReportScreen />;
}

function DesktopReportScreen() {
  const t = useTranslations('app.report');
  const tApp = useTranslations('app');
  const { locale } = useLocalePreference();
  const { entries } = useGallery();
  const { preferences } = useSettings();
  const { notify } = useFeedback();

  const projects = useMemo(() => groupByProject(entries), [entries]);

  /** `null` = todas as fotos; senão, o código do projeto escolhido. */
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [norm, setNorm] = useState<ReportNorm>('abnt');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  /**
   * O logo da capa é o da marca do carimbo, e é OPCIONAL: o interruptor só
   * aparece para quem tem logo configurado, e desligado o documento sai
   * sem ele — decisão de quem emite, como tudo no relatório.
   */
  const logoUri = preferences.brandLogoPath ? resolveLogoUri(preferences.brandLogoPath) : '';
  const [includeLogo, setIncludeLogo] = useState(true);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(
    `${preferences.brandParts[0].text}${preferences.brandParts[1].text}`.trim(),
  );
  const [busy, setBusy] = useState(false);

  const chosen: Project | null =
    selectedCode === null ? null : (projects.find((p) => p.code === selectedCode) ?? null);

  // Um projeto pode DEIXAR de existir enquanto a tela está aberta: apagar a
  // última foto de um código na galeria some com ele em `projects`. Sem esta
  // reconciliação, o relatório sairia, em silêncio, com a galeria INTEIRA
  // sob o título preparado para a obra que sumiu.
  //
  // Ajuste em tempo de render, não em efeito — o mesmo padrão do
  // capture-context: React reexecuta antes de pintar, sem cascata.
  if (selectedCode !== null && !projects.some((p) => p.code === selectedCode)) {
    setSelectedCode(null);
  }

  // As fotos do projeto já vêm da mais antiga para a mais nova (ordem de
  // leitura de um relatório). "Todas as fotos" precisa da MESMA ordem — a
  // galeria guarda da mais nova para a mais antiga, então aqui se ordena.
  const reportEntries = chosen
    ? chosen.entries
    : [...entries].sort((a, b) => a.exportedAt.localeCompare(b.exportedAt));

  const generate = async () => {
    const bridge = globalThis.window?.lymark;
    if (!bridge?.exportReportPdf || !bridge.saveFile || reportEntries.length === 0) return;
    // O ZIP tem canal próprio; sem ele, falhar dizendo — nunca cair no PDF e
    // entregar um arquivo sem as fotos que o usuário pediu no pacote.
    if (format === 'zip' && !bridge.exportProjectZip) {
      notify(t('failed'), 'warning');
      return;
    }

    setBusy(true);
    try {
      const strings: ReportStrings = {
        fields: {
          time: tApp('watermark.fields.time'),
          date: tApp('watermark.fields.date'),
          weekday: tApp('watermark.fields.weekday'),
          address: tApp('watermark.fields.address'),
          code: tApp('watermark.fields.code'),
        },
        summary: t('doc.summary'),
        photosSection: t('doc.photosSection'),
        photoLabel: (index) => t('doc.photo', { index }),
        exportedAt: t('doc.exportedAt'),
        generatedAt: t('doc.generatedAt'),
        totalPhotos: t('doc.totalPhotos'),
        author: t('doc.author'),
        code: tApp('watermark.fields.code'),
        declaration: t('doc.declaration'),
        signature: t('doc.signature'),
      };

      const stem = (chosen?.code ?? 'lymark')
        .replace(/[^\p{L}\p{N}-]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      const day = new Date().toISOString().slice(0, 10);
      const baseName = `${t('fileStem')}-${stem || 'lymark'}-${day}`;

      // O CSV nem monta o documento: é a tabela-resumo direto da galeria.
      if (format === 'csv') {
        const csv = buildSummaryCsv(reportEntries, {
          index: '#',
          fields: strings.fields,
          exportedAt: strings.exportedAt,
        });
        const result = await bridge.saveFile(
          new TextEncoder().encode(csv),
          `${baseName}.csv`,
          'text/csv',
        );
        if (result.status === 'saved') {
          notify(result.path ? t('saved', { path: result.path }) : t('savedShort'), 'neutral');
        } else if (result.status === 'failed') {
          notify(t('failed'), 'warning');
        }
        return;
      }

      // PDF resolve as fotos na impressão (`media://`); o Word precisa de
      // um arquivo que viaje sozinho, então as fotos entram como data-URI,
      // reduzidas (`embed-photos.ts`).
      const photos =
        format === 'word'
          ? await Promise.all(
              reportEntries.map(async (entry) => ({
                entry,
                src:
                  (await photoToDataUri(resolveExportedPhotoUri(entry.path))) ??
                  resolveExportedPhotoUri(entry.path),
              })),
            )
          : reportEntries.map((entry) => ({
              entry,
              src: resolveExportedPhotoUri(entry.path),
            }));

      const html = buildReportHtml(
        {
          norm,
          title: title.trim() || t('doc.title'),
          logoDataUri: includeLogo ? logoUri : '',
          author,
          code: chosen?.code ?? '',
          generatedAtLabel: new Date().toLocaleString(locale),
          photos,
          strings,
        },
        locale,
      );

      // O pacote do projeto: o PDF + as fotos originais, montados no
      // processo principal — daqui só vão o HTML e os NOMES dos arquivos.
      if (format === 'zip' && bridge.exportProjectZip) {
        const result = await bridge.exportProjectZip(
          html,
          `${baseName}.zip`,
          norm,
          t('doc.page'),
          reportEntries.map((entry) => entry.path.split('/').pop() ?? ''),
          `${baseName}.pdf`,
        );
        if (result.status === 'saved') {
          // Foto que não estava no disco não entra no pacote — e o pacote é
          // entregue como prova, então a ausência precisa ser dita.
          if (result.missing && result.missing > 0) {
            notify(t('zipMissing', { count: result.missing }), 'warning');
          } else {
            notify(result.path ? t('saved', { path: result.path }) : t('savedShort'), 'neutral');
          }
        } else if (result.status === 'failed') {
          notify(t('failed'), 'warning');
        }
        return;
      }

      // O Word viaja com as fotos embutidas; o canal de gravação tem teto de
      // 50 MB. Dizer o limite (e para onde ir) vale mais que um erro genérico
      // depois de minutos redimensionando fotos.
      if (format === 'word') {
        const bytes = new TextEncoder().encode(html);
        if (bytes.length > WORD_MAX_BYTES) {
          notify(t('wordTooBig'), 'warning');
          return;
        }
        const result = await bridge.saveFile(bytes, `${baseName}.doc`, 'application/msword');
        if (result.status === 'saved') {
          notify(result.path ? t('saved', { path: result.path }) : t('savedShort'), 'neutral');
        } else if (result.status === 'failed') {
          notify(t('failed'), 'warning');
        }
        return;
      }

      const result = await bridge.exportReportPdf(html, `${baseName}.pdf`, norm, t('doc.page'));

      if (result.status === 'saved') {
        notify(result.path ? t('saved', { path: result.path }) : t('savedShort'), 'neutral');
      } else if (result.status === 'failed') {
        notify(t('failed'), 'warning');
      }
    } finally {
      setBusy(false);
    }
  };

  if (entries.length === 0) {
    return (
      <Screen>
        <Text style={typography.screenTitle}>{t('title')}</Text>
        <Text style={typography.body}>{t('empty')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Section title={t('projectsSection')} padded>
        <ProjectRow
          label={t('allPhotos')}
          count={entries.length}
          selected={selectedCode === null}
          onPress={() => setSelectedCode(null)}
        />
        {projects.map((project) => (
          <ProjectRow
            key={project.code || ' uncoded'}
            label={project.code || t('uncoded')}
            count={project.entries.length}
            selected={selectedCode === project.code}
            onPress={() => setSelectedCode(project.code)}
          />
        ))}
      </Section>

      {/* ChoiceGrid, e não botões soltos: é o seletor de opção única do
          app, com papel de rádio e estado de seleção que o leitor de tela
          anuncia — a cor sozinha não diz qual está escolhido. */}
      <Section title={t('formatSection')} padded>
        <ChoiceGrid
          columns={2}
          selected={format}
          onSelect={setFormat}
          options={REPORT_FORMATS.map((option) => ({ value: option, label: t(`format.${option}`) }))}
        />
      </Section>

      {/* A norma formata o DOCUMENTO; o CSV é só a tabela, sem página. */}
      {format !== 'csv' ? (
        <Section title={t('normSection')} padded>
          <ChoiceGrid
            columns={2}
            selected={norm}
            onSelect={setNorm}
            options={REPORT_NORMS.map((option) => ({ value: option, label: t(`norm.${option}`) }))}
          />
          <Note>{t('normNote')}</Note>
        </Section>
      ) : null}

      {format !== 'csv' ? (
        <Section title={t('detailsSection')} padded>
          <FieldRow
            label={t('titleField')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('doc.title')}
          />
          <FieldRow label={t('authorField')} value={author} onChangeText={setAuthor} />
          {logoUri ? (
            <ToggleRow
              title={t('includeLogo')}
              description={t('includeLogoDescription')}
              value={includeLogo}
              onValueChange={setIncludeLogo}
              showDivider={false}
            />
          ) : null}
        </Section>
      ) : null}

      <Section title={t('generateSection')} padded>
        <Text style={typography.caption}>
          {tApp('gallery.count', { count: reportEntries.length })}
        </Text>
        <Button
          label={t('generate')}
          icon="document-text-outline"
          variant="accent"
          onPress={() => void generate()}
          loading={busy}
          disabled={reportEntries.length === 0}
        />
      </Section>
    </Screen>
  );
}

/**
 * Linha de escolha de projeto — código, contagem e o estado de seleção.
 *
 * Um `Pressable` próprio, e não um `Button`: a linha carrega dois textos com
 * pesos diferentes, e a lista pode ser longa — o desenho de lista com marca
 * de seleção à esquerda lê melhor que uma coluna de botões.
 */
function ProjectRow({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const tApp = useTranslations('app');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.projectRow,
        selected && styles.projectRowSelected,
        pressed && styles.projectRowPressed,
      ]}>
      <Text style={[typography.value, styles.projectLabel]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={typography.caption}>{tApp('gallery.count', { count })}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    // Alvo de toque mínimo do app (notebook com tela sensível ao toque roda
    // o Electron); as demais linhas de escolha já respeitam este piso.
    minHeight: HIT_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  projectRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  projectRowPressed: {
    opacity: 0.8,
  },
  projectLabel: {
    flexShrink: 1,
  },
});
