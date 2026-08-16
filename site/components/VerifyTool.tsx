'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { extractSeal, stripSeal } from '../../src/features/attest/jpeg-seal';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  parseReceipt,
  signedPortion,
} from '../../src/features/attest/receipt';

/**
 * A verificação — inteira no navegador (`docs/AUTENTICIDADE.md` §4).
 *
 * O arquivo NUNCA sai da máquina de quem verifica: o selo é extraído, o
 * hash recalculado e a assinatura Ed25519 conferida com WebCrypto, contra a
 * chave pública embutida na página no build. Custo de servidor zero, e a
 * promessa de privacidade vale também para quem recebe a foto.
 *
 * Os vereditos separam as três camadas do desenho: o selo atesta
 * integridade e emissão; o conteúdo declarado é do emissor — e a página
 * diz isso em toda verificação positiva, sem exceção.
 */

type Verdict =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'sealed'; account: string; issuedAt: Date; previewUrl: string }
  | { kind: 'no-seal' }
  | { kind: 'tampered' }
  | { kind: 'unsupported' }
  | { kind: 'not-configured' };

const PUBLIC_KEY = process.env.NEXT_PUBLIC_ATTEST_PUBLIC_KEY ?? '';

async function verifyFile(file: File): Promise<Verdict> {
  if (!PUBLIC_KEY) return { kind: 'not-configured' };

  const bytes = new Uint8Array(await file.arrayBuffer());

  const receipt = extractSeal(bytes);
  if (!receipt) return { kind: 'no-seal' };

  const parsed = parseReceipt(receipt);
  if (!parsed) return { kind: 'tampered' };

  // O hash cobre o arquivo SEM o segmento do selo — a mesma regra da
  // emissão, pelo mesmo código.
  const stripped = stripSeal(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', stripped.slice().buffer));
  if (bytesToBase64Url(digest) !== parsed.payload.h) return { kind: 'tampered' };

  let valid: boolean;
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      base64UrlToBytes(PUBLIC_KEY.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
        .slice()
        .buffer,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    valid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      base64UrlToBytes(parsed.signatureB64).slice().buffer,
      new TextEncoder().encode(signedPortion(parsed.payloadB64)),
    );
  } catch {
    // Navegador sem Ed25519 no WebCrypto — raro em 2026, mas dito, não mudo.
    return { kind: 'unsupported' };
  }
  if (!valid) return { kind: 'tampered' };

  return {
    kind: 'sealed',
    account: parsed.payload.sub,
    issuedAt: new Date(parsed.payload.iat * 1000),
    previewUrl: URL.createObjectURL(file),
  };
}

export default function VerifyTool() {
  const t = useTranslations('site.verify');
  const locale = useLocale();
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const check = async (file: File | undefined) => {
    if (!file) return;
    if (verdict.kind === 'sealed') URL.revokeObjectURL(verdict.previewUrl);
    setVerdict({ kind: 'checking' });
    setVerdict(await verifyFile(file));
  };

  return (
    <div className="verify-tool">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg"
        hidden
        onChange={(event) => void check(event.target.files?.[0])}
      />
      <p className="cta account-open-app">
        <button type="button" className="verify-pick" onClick={() => inputRef.current?.click()}>
          {t('pick')}
        </button>
      </p>
      <p className="account-note">{t('privacyNote')}</p>

      {verdict.kind === 'checking' ? <p className="account-note">{t('checking')}</p> : null}

      {verdict.kind === 'sealed' ? (
        <div className="verify-result verify-ok">
          <h2>{t('sealedTitle')}</h2>
          <p>
            {t('sealedBody', {
              account: verdict.account,
              date: verdict.issuedAt.toLocaleString(locale),
            })}
          </p>
          <p className="account-note">{t('declarationNote')}</p>
          {/* A pessoa lê o carimbo com os próprios olhos — a página não
              interpreta a imagem, só a mostra. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={verdict.previewUrl} alt={t('previewAlt')} className="verify-preview" />
        </div>
      ) : null}

      {verdict.kind === 'no-seal' ? (
        <div className="verify-result">
          <h2>{t('noSealTitle')}</h2>
          <p>{t('noSealBody')}</p>
        </div>
      ) : null}

      {verdict.kind === 'tampered' ? (
        <div className="verify-result verify-bad">
          <h2>{t('tamperedTitle')}</h2>
          <p>{t('tamperedBody')}</p>
        </div>
      ) : null}

      {verdict.kind === 'unsupported' ? (
        <p className="account-note">{t('unsupported')}</p>
      ) : null}
      {verdict.kind === 'not-configured' ? (
        <p className="account-note">{t('notConfigured')}</p>
      ) : null}
    </div>
  );
}
