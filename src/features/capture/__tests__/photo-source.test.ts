import { describeAsset } from '../photo-source';

describe('describeAsset', () => {
  const base = { uri: 'file:///a', width: 1920, height: 1080 };

  it('foto sai sem `kind` — é o padrão, e o rascunho antigo não tem o campo', () => {
    expect(describeAsset({ ...base, type: 'image' })).toEqual(base);
    expect(describeAsset(base)).toEqual(base);
  });

  it('vídeo sai marcado, com a duração em milissegundos', () => {
    expect(describeAsset({ ...base, type: 'video', duration: 12_500 })).toEqual({
      ...base,
      kind: 'video',
      durationMs: 12_500,
    });
  });

  it('duração desconhecida fica ausente em vez de virar zero', () => {
    expect(describeAsset({ ...base, type: 'video', duration: null })).toEqual({
      ...base,
      kind: 'video',
    });
    expect(describeAsset({ ...base, type: 'video', duration: 0 })).toEqual({
      ...base,
      kind: 'video',
    });
  });
});
