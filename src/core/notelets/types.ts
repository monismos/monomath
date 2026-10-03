import type { Vec3 } from '../scene/spec';
import type { LessonContext } from '../scene/store';
import type { ThemeId } from '../themes/themes';
export const noteColors = {
  sun: '#FFE78E',
  mint: '#C2E7D5',
  sky: '#C2DEFA',
  rose: '#FFD3D6',
  lilac: '#DED0FC',
  slate: '#DCE2E6',
};
export interface Notelet {
  id: string;
  text: string;
  color: keyof typeof noteColors;
  emoji?: string;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
  echo?: boolean;
  context: LessonContext & {
    route: string;
    screen: string;
    dimension: '2d' | '3d';
    theme: ThemeId;
  };
  anchor: {
    type: 'screen' | 'world';
    anchorId?: string;
    entityId?: string;
    p?: Vec3;
    nx: number;
    ny: number;
  };
  thumb?: string;
  topicHidden?: boolean;
}
export function validNote(value: unknown): value is Notelet {
  if (!value || typeof value !== 'object') return false;
  const n = value as Partial<Notelet>;
  return (
    typeof n.id === 'string' &&
    typeof n.text === 'string' &&
    n.text.length <= 500 &&
    !!n.color &&
    Object.hasOwn(noteColors, n.color) &&
    Number.isFinite(n.createdAt) &&
    Number.isFinite(n.updatedAt) &&
    !!n.context &&
    ['workshop', 'map', 'trophies'].includes(n.context.route) &&
    typeof n.context.problem === 'string' &&
    typeof n.context.labId === 'string' &&
    typeof n.context.screen === 'string' &&
    (n.context.selection === null || typeof n.context.selection === 'string') &&
    ['bench', 'blueprint', 'mono', 'chalkboard', 'neon', 'observatory', 'contrast'].includes(
      n.context.theme,
    ) &&
    Number.isFinite(n.context.step) &&
    n.context.step >= 0 &&
    Number.isInteger(n.context.step) &&
    Number.isFinite(n.context.dial) &&
    n.context.dial >= 0 &&
    n.context.dial <= 3 &&
    ['2d', '3d'].includes(n.context.dimension) &&
    !!n.anchor &&
    ['screen', 'world'].includes(n.anchor.type) &&
    (!n.anchor.p ||
      (Array.isArray(n.anchor.p) &&
        n.anchor.p.length === 3 &&
        n.anchor.p.every(Number.isFinite))) &&
    (!n.thumb ||
      (typeof n.thumb === 'string' &&
        /^data:image\/(png|svg\+xml)[;,]/.test(n.thumb) &&
        n.thumb.length < 500000)) &&
    Number.isFinite(n.anchor.nx) &&
    Number.isFinite(n.anchor.ny) &&
    n.anchor.nx >= 0 &&
    n.anchor.nx <= 1 &&
    n.anchor.ny >= 0 &&
    n.anchor.ny <= 1
  );
}
