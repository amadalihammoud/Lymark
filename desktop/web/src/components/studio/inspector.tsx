import { useState, type ReactNode } from "react";
import { Upload, X } from "lucide-react";
import { useTranslations } from "use-intl";

import { ColorField } from "@/components/studio/color-field";
import { Segmented } from "@/components/studio/segmented";
import { Button } from "@/components/ui/button";
import { locateAddress, reverseGeocode } from "@/lib/locate";
import { cn } from "@/lib/utils";
import type {
  FieldKey,
  InspectorTab,
  StampCorner,
  StampSize,
} from "@/store/studio";
import { formatPlace, parsePlace, useStudio } from "@/store/studio";

const CORNER_IDS: StampCorner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-micro font-medium uppercase tracking-wide text-slate">
      {children}
    </p>
  );
}

function TextAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-caption text-slate hover:text-ink"
    >
      {children}
    </button>
  );
}

function QuadrantMap({
  value,
  onSelect,
  extra,
}: {
  value: string;
  onSelect: (id: StampCorner) => void;
  extra?: { value: string; label: string; onSelect: () => void; active: boolean };
}) {
  const t = useTranslations("app.watermark");
  const media = useStudio((s) => s.media);
  const cornerLabel = (id: StampCorner) => t(`positions.${id}`);
  const active = extra?.active ? extra.label : cornerLabel(value as StampCorner);
  const url = media?.kind === "image" ? media.url : "";
  const [failed, setFailed] = useState("");
  const photo = Boolean(url) && failed !== url;

  return (
    <div className="space-y-2">
      <div className="relative h-40 overflow-hidden rounded-md bg-navy-900 shadow-[var(--shadow-border)]">
        {photo ? (
          <img
            key={url}
            src={url}
            alt=""
            onError={() => setFailed(url)}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0">
          <span className="absolute inset-x-0 top-1/2 h-px bg-hairline/80" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-hairline/80" />
        </div>
        <div className="relative grid h-full grid-cols-2 grid-rows-2">
          {CORNER_IDS.map((id) => {
            const on = value === id && !extra?.active;
            return (
              <button
                key={id}
                type="button"
                aria-label={cornerLabel(id)}
                aria-pressed={on}
                onClick={() => onSelect(id)}
                className={cn(
                  "h-full w-full min-h-0 transition-colors duration-[var(--motion-quick)]",
                  on ? "bg-ink/20 shadow-[inset_0_0_0_1px_var(--color-amber)]" : "hover:bg-lift",
                )}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-mist">{active}</p>
        {extra ? (
          <button
            type="button"
            onClick={extra.onSelect}
            className={cn(
              "relative pb-0.5 text-caption font-medium",
              extra.active ? "text-ink" : "text-slate hover:text-ink",
            )}
          >
            {extra.label}
            {extra.active ? (
              <span className="absolute inset-x-0 bottom-0 h-px bg-amber" />
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FieldChips() {
  const t = useTranslations("app.mesa");
  const tw = useTranslations("app.watermark");
  const visible = useStudio((s) => s.visible);
  const toggleField = useStudio((s) => s.toggleField);
  const band = useStudio((s) => s.band);
  const setBand = useStudio((s) => s.setBand);
  const fields: { id: FieldKey; label: string }[] = [
    { id: "time", label: tw("fields.time") },
    { id: "date", label: tw("fields.date") },
    { id: "weekday", label: tw("fields.weekday") },
    { id: "address", label: tw("fields.address") },
    { id: "code", label: tw("fields.code") },
    { id: "brand", label: t("tabBrand") },
  ];

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {fields.map((f) => {
        const on = visible[f.id];
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggleField(f.id)}
            className={cn(
              "relative pb-0.5 text-caption font-medium",
              on ? "text-ink" : "text-slate hover:text-mist",
            )}
          >
            {f.label}
            {on ? <span className="absolute inset-x-3 bottom-0 h-px bg-amber" /> : null}
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={band}
        onClick={() => setBand(!band)}
        className={cn(
          "relative pb-0.5 text-caption font-medium",
          band ? "text-ink" : "text-slate hover:text-mist",
        )}
      >
        {t("band")}
        {band ? <span className="absolute inset-x-0 bottom-0 h-px bg-amber" /> : null}
      </button>
    </div>
  );
}

function MarcaTab() {
  const t = useTranslations("app.mesa");
  const tw = useTranslations("app.watermark");
  const fields = useStudio((s) => s.fields);
  const setField = useStudio((s) => s.setField);
  const colorA = useStudio((s) => s.colorA);
  const colorB = useStudio((s) => s.colorB);
  const setColorA = useStudio((s) => s.setColorA);
  const setColorB = useStudio((s) => s.setColorB);
  const logoUrl = useStudio((s) => s.logoUrl);
  const setLogo = useStudio((s) => s.setLogo);
  const logoScale = useStudio((s) => s.logoScale);
  const setLogoScale = useStudio((s) => s.setLogoScale);
  const logoAt = useStudio((s) => s.logoAt);
  const setLogoAt = useStudio((s) => s.setLogoAt);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Label>{t("nameOnPhoto")}</Label>
        <div className="space-y-2">
          <input
            value={fields.brandLy}
            onChange={(e) => setField("brandLy", e.target.value)}
            className="field"
            aria-label={tw("brandFirstPart")}
          />
          <ColorField label="Ly" value={colorA} onChange={setColorA} hideLabel />
        </div>
        <div className="space-y-2">
          <input
            value={fields.brandMark}
            onChange={(e) => setField("brandMark", e.target.value)}
            className="field"
            aria-label={tw("brandSecondPart")}
          />
          <ColorField label="mark" value={colorB} onChange={setColorB} hideLabel />
        </div>
      </section>

      <section className="space-y-2">
        <Label>{tw("complement")}</Label>
        <input
          value={fields.complement}
          onChange={(e) => setField("complement", e.target.value)}
          placeholder={t("complementHint")}
          className="field"
        />
      </section>

      <section className="space-y-2">
        <Label>{tw("logoPick")}</Label>
        {logoUrl ? (
          <div className="flex items-center gap-3 border border-hairline px-3 py-3">
            <img src={logoUrl} alt="" className="h-10 w-auto max-w-24 object-contain" />
            <Button variant="ghost" size="sm" onClick={() => setLogo(null)}>
              {tw("logoRemove")}
            </Button>
          </div>
        ) : (
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 border border-hairline text-caption text-slate hover:border-mist hover:text-ink">
            <Upload className="size-4" />
            {t("sendLogo")}
            <span className="text-micro text-slate">{t("logoHint")}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setLogo(String(reader.result));
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {logoUrl ? (
          <>
            <p className="text-micro text-slate">
              {t("logoSize", { percent: Math.round(logoScale * 100) })}
            </p>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={Math.round(logoScale * 100)}
              onChange={(e) => setLogoScale(Number(e.target.value) / 100)}
              className="w-full accent-amber"
            />
            <Label>{tw("logoPosition")}</Label>
            <QuadrantMap
              value={logoAt === "block" ? "" : logoAt}
              onSelect={(id) => setLogoAt(id)}
              extra={{
                value: "block",
                label: tw("logoPositionBlock"),
                onSelect: () => setLogoAt("block"),
                active: logoAt === "block",
              }}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}

function AparenciaTab() {
  const t = useTranslations("app.mesa");
  const tw = useTranslations("app.watermark");
  const corner = useStudio((s) => s.corner);
  const size = useStudio((s) => s.size);
  const visible = useStudio((s) => s.visible);
  const codePlacement = useStudio((s) => s.codePlacement);
  const ink = useStudio((s) => s.ink);
  const accent = useStudio((s) => s.accent);
  const setCorner = useStudio((s) => s.setCorner);
  const setSize = useStudio((s) => s.setSize);
  const setCodePlacement = useStudio((s) => s.setCodePlacement);
  const setInk = useStudio((s) => s.setInk);
  const setAccent = useStudio((s) => s.setAccent);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <Label>{tw("positionTitle")}</Label>
        <QuadrantMap value={corner} onSelect={setCorner} />
      </section>

      <section className="space-y-2">
        <Label>{tw("sizeTitle")}</Label>
        <Segmented
          value={size}
          onChange={setSize}
          options={[
            { id: "sm" satisfies StampSize, label: tw("sizes.small") },
            { id: "md", label: tw("sizes.medium") },
            { id: "lg", label: tw("sizes.large") },
          ]}
        />
      </section>

      <section className="space-y-3">
        <ColorField label={tw("textColor")} value={ink} onChange={setInk} />
        <ColorField label={t("bar")} value={accent} onChange={setAccent} />
      </section>

      <section className="space-y-2">
        <Label>{t("onPhoto")}</Label>
        <FieldChips />
      </section>

      {visible.code ? (
        <section className="space-y-2">
          <Label>{tw("fields.code")}</Label>
          <Segmented
            value={codePlacement}
            onChange={setCodePlacement}
            options={[
              { id: "side", label: t("codeSide") },
              { id: "block", label: tw("codePlacements.block") },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}

function DadosTab() {
  const t = useTranslations("app.mesa");
  const tw = useTranslations("app.watermark");
  const fields = useStudio((s) => s.fields);
  const setField = useStudio((s) => s.setField);
  const setPlace = useStudio((s) => s.setPlace);
  const locating = useStudio((s) => s.locating);
  const setLocating = useStudio((s) => s.setLocating);
  const syncClock = useStudio((s) => s.syncClock);
  const regenCode = useStudio((s) => s.regenCode);
  const media = useStudio((s) => s.media);
  const addressSource = useStudio((s) => s.addressSource);

  async function onLocate() {
    setLocating(true);
    try {
      if (media?.gps) {
        const found = await reverseGeocode(media.gps.lat, media.gps.lng);
        setPlace({ ...found, source: "exif" });
      } else {
        const found = await locateAddress();
        setPlace({ ...found, source: "device" });
      }
    } catch {
      setPlace({
        address: t("locateFailed"),
        city: fields.city,
        source: "manual",
      });
    } finally {
      setLocating(false);
    }
  }

  const sourceHint =
    addressSource === "exif"
      ? t("sourceExif")
      : addressSource === "device"
        ? t("sourceDevice")
        : addressSource === "demo"
          ? t("sourceDemo")
          : t("sourceManual");

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <Label>{tw("fields.address")}</Label>
        <textarea
          value={formatPlace(fields.address, fields.city)}
          onChange={(e) => {
            const next = parsePlace(e.target.value);
            setPlace({ ...next, source: "manual" });
          }}
          rows={3}
          placeholder={t("addressPlaceholder")}
          className="field min-h-16 resize-none"
        />
        <TextAction onClick={() => void onLocate()}>
          {locating
            ? t("locating")
            : media?.gps
              ? t("usePhotoGps")
              : t("useDeviceGps")}
        </TextAction>
        <p className="text-caption text-slate">{sourceHint}</p>
      </section>

      <section className="space-y-2">
        <Label>{t("clockAndCode")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={fields.time}
            onChange={(e) => setField("time", e.target.value)}
            className="field tabular-nums"
          />
          <input
            value={fields.weekday}
            onChange={(e) => setField("weekday", e.target.value)}
            className="field"
          />
        </div>
        <input
          value={fields.date}
          onChange={(e) => setField("date", e.target.value)}
          className="field"
        />
        <input
          value={fields.code}
          onChange={(e) => setField("code", e.target.value.toUpperCase())}
          className="field font-mono tracking-wider"
        />
        <div className="flex flex-wrap gap-x-4 pt-1">
          <TextAction onClick={syncClock}>{t("clockNow")}</TextAction>
          <TextAction onClick={regenCode}>{t("anotherCode")}</TextAction>
        </div>
        {media?.capturedAt ? (
          <p className="text-caption text-slate">{t("clockFromPhoto")}</p>
        ) : null}
      </section>
    </div>
  );
}

export function Inspector() {
  const t = useTranslations("app.mesa");
  const open = useStudio((s) => s.inspectorOpen);
  const tab = useStudio((s) => s.inspectorTab);
  const setInspectorTab = useStudio((s) => s.setInspectorTab);
  const setInspector = useStudio((s) => s.setInspector);
  const tabs: { id: InspectorTab; label: string }[] = [
    { id: "marca", label: t("tabBrand") },
    { id: "aparencia", label: t("tabLook") },
    { id: "dados", label: t("tabData") },
  ];

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-s border-hairline bg-navy-800 transition-[width,opacity] duration-[var(--motion-fast)] ease-[var(--ease-out)] max-sm:absolute max-sm:end-0 max-sm:z-10 max-sm:h-full max-sm:shadow-[var(--shadow-panel)]",
        open ? "w-inspector opacity-100" : "w-0 opacity-0 border-s-0",
      )}
      aria-hidden={!open}
    >
      <div className="flex h-full w-inspector flex-col">
        <header className="flex items-center gap-2 px-4 pt-3">
          <div className="min-w-0 flex-1">
            <Segmented value={tab} onChange={setInspectorTab} options={tabs} />
          </div>
          <button
            type="button"
            onClick={() => setInspector(false)}
            className="relative flex size-7 shrink-0 items-center justify-center text-slate hover:text-ink after:absolute after:inset-[-6px]"
            aria-label={t("closePanel")}
          >
            <X className="size-3.5" />
          </button>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-5">
          {tab === "marca" ? <MarcaTab /> : null}
          {tab === "aparencia" ? <AparenciaTab /> : null}
          {tab === "dados" ? <DadosTab /> : null}
        </div>
      </div>
    </aside>
  );
}
