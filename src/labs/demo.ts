import type { SceneSpec } from '../core/scene/spec';
const tether = { token: 'part', entities: ['slice-0', 'slice-1', 'slice-2'], color: 'part' };
export const demo: SceneSpec = {
  id: 'hello-blocks',
  code: 'from fractions import Fraction\n\nwhole = 4\nselected = 3\npart = Fraction(selected, whole)\nprint(part)  # 3/4',
  entities: [
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `slice-${i}`,
      kind: 'slice' as const,
      pos: [0, 0.08, 0] as [number, number, number],
      size: [1.6, 0.3, 1.6] as [number, number, number],
      color: i < 3 ? 'part' : 'mint',
      arc: [(i * Math.PI) / 2 + 0.025, ((i + 1) * Math.PI) / 2 - 0.025] as [number, number],
      tether: i < 3 ? 'part' : 'whole',
      layers: {
        thing: { pos: [0, 0.08, 0] as [number, number, number] },
        shape: {
          pos: [i < 2 ? -0.08 : 0.08, 0.08, i % 2 ? -0.08 : 0.08] as [number, number, number],
        },
        symbol: {
          pos: [(i - 1.5) * 0.6, 0.08, 0] as [number, number, number],
          scale: [0.5, 0.5, 0.5] as [number, number, number],
        },
        code: { opacity: 0.1 },
      },
    })),
    {
      id: 'fraction-label',
      kind: 'label',
      pos: [0, 0, -2.15],
      color: 'paper',
      text: { plain: '3 of 4 equal pieces' },
      layers: {
        thing: { opacity: 0 },
        shape: { opacity: 1 },
        symbol: { text: { plain: '3/4' }, opacity: 1 },
        code: { opacity: 0 },
      },
    },
  ],
  steps: [
    {
      id: 'whole',
      title: 'Meet one whole',
      latexAfter: '\\htmlClass{tk-whole}{1}=\\frac{4}{4}',
      say: {
        quick: 'Four equal pieces make one whole.',
        standard: 'The pie is one whole. Cut it into four equal pieces. Each piece is one quarter.',
        deep: 'A fraction only works when each part has the same size. Four quarters cover exactly the same area as the uncut whole.',
      },
      ops: [],
      tethers: [tether, { token: 'whole', entities: ['slice-3'], color: 'mint' }],
      gaze: ['slice-0'],
      aria: 'One pie has four equal quarter slices.',
    },
    {
      id: 'shade',
      title: 'Choose three pieces',
      latexBefore: '\\frac{4}{4}',
      latexAfter: '\\frac{\\htmlClass{tk-part}{3}}{\\htmlClass{tk-whole}{4}}',
      say: {
        quick: 'Three pieces are three quarters.',
        standard:
          'The top number counts the selected pieces. The bottom number counts the equal pieces in one whole.',
        deep: 'The numerator is 3 and the denominator is 4. These values describe a ratio: three selected equal units out of four total equal units.',
      },
      ops: [{ t: 'tween', id: 'slice-3', to: { pos: [1, 0.08, 1] }, ms: 450 }],
      tethers: [tether, { token: 'whole', entities: ['slice-3'], color: 'mint' }],
      gaze: ['slice-3'],
      aria: 'Three quarters remain. One quarter slides aside.',
    },
    {
      id: 'unfold',
      title: 'Let the notation follow',
      latexAfter: '\\htmlClass{tk-part}{3}\\div\\htmlClass{tk-whole}{4}=0.75',
      say: {
        quick: 'Three quarters equals 0.75.',
        standard:
          'A fraction is also division. Split three wholes equally among four people, and each gets three quarters.',
        deep: 'The fraction, decimal, area, and short program all describe the same quantity. Move the dial to compare these representations without changing the value.',
      },
      ops: [{ t: 'pulse', ids: ['slice-0', 'slice-1', 'slice-2'] }],
      tethers: [tether, { token: 'whole', entities: ['slice-3'], color: 'mint' }],
      gaze: ['slice-0', 'slice-1', 'slice-2'],
      aria: 'The three selected slices pulse. Three quarters equals 0.75.',
    },
  ],
};
