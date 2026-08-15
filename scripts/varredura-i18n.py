# -*- coding: utf-8 -*-
"""Varredura de texto fixo em português no código do aplicativo.

A primeira medição procurava só strings com acento e passou direto por
"Salva apenas no Lymark" e "Tente novamente" — texto de interface sem uma
única letra acentuada. Esta versão olha para onde o texto é usado, e não para
como ele é escrito: rótulos, títulos, mensagens e literais em JSX.
"""
import re, glob, sys

# Onde texto de interface aparece.
CAMPOS = re.compile(
    r"""(?:title|dialogTitle|message|label|shortLabel|actionLabel|description|rationale|tagline|placeholder)\s*[:=]\s*(['"])(.+?)\1"""
)

# Texto escondido num ternário dentro de uma propriedade:
#   label={cond ? 'Escolher da galeria' : 'Escolher foto'}
TERNARIO = re.compile(r"""\?\s*(['"])(.+?)\1\s*:\s*(['"])(.+?)\3""")
JSX = re.compile(r""">\s*([A-ZÀ-Ú][^<>{}\n]{3,})\s*<""")

# `Promise<...>`, `Record<...>` e afins casam com a regra de JSX porque um
# genérico também é texto entre sinais de maior e menor. São tipo, não
# interface.
TIPOS = re.compile(r'^(Promise|Record|Array|Map|Set|Partial|Pick|Omit|Readonly)$')
NOTIFY = re.compile(r"""notify\(\s*(['"])(.+?)\1""")

IGNORAR = re.compile(r'^[\s\W\d]*$|^[a-z-]+$')

achados = []
for f in sorted(glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)):
    if '__tests__' in f:
        continue
    for n, line in enumerate(open(f, encoding='utf-8'), 1):
        st = line.strip()
        if st.startswith('*') or st.startswith('//'):
            continue
        for m in CAMPOS.finditer(line):
            texto = m.group(2)
            if not IGNORAR.match(texto):
                achados.append((f, n, texto))
        for m in NOTIFY.finditer(line):
            achados.append((f, n, m.group(2)))
        for m in TERNARIO.finditer(line):
            for texto in (m.group(2), m.group(4)):
                if not IGNORAR.match(texto) and ' ' in texto:
                    achados.append((f, n, texto))
        for m in JSX.finditer(line):
            texto = m.group(1).strip()
            if not IGNORAR.match(texto) and not TIPOS.match(texto):
                achados.append((f, n, texto))

por_arquivo = {}
for f, n, texto in achados:
    por_arquivo.setdefault(f, []).append((n, texto))

for f in sorted(por_arquivo, key=lambda k: -len(por_arquivo[k])):
    print('%3d  %s' % (len(por_arquivo[f]), f))
    if '--detalhe' in sys.argv:
        for n, texto in por_arquivo[f]:
            print('       %4d  %s' % (n, texto[:88]))

print('---')
print('total:', len(achados), 'em', len(por_arquivo), 'arquivos')
