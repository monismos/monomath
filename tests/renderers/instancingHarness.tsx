import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ThreeStage from '../../src/core/renderers/three/ThreeStage';
import { ScenePlayer } from '../../src/core/scene/player';
import type { Entity, SceneSpec } from '../../src/core/scene/spec';
import { anchorProjectors } from '../../src/core/renderers/anchors';
import { stageHit, useStageHold } from '../../src/core/notelets/stageHit';
const slices = new URLSearchParams(location.search).get('kind') === 'slice';
const entities: Entity[] = Array.from({ length: 96 }, (_, index) => {
  const unit = Math.floor(index / 24),
    sector = index % 24,
    start = (sector * Math.PI) / 12 + 0.008;
  return {
    id: `part-${index}`,
    kind: slices ? 'slice' : 'block',
    pos: slices
      ? [((unit % 2) - 0.5) * 1.9, 0.03, (Math.floor(unit / 2) - 0.5) * 1.9]
      : [((index % 12) - 5.5) * 0.3, 0.03, (Math.floor(index / 12) - 3.5) * 0.3],
    size: slices ? [0.8, 0.18, 0.8] : [0.26, 0.18, 0.26],
    arc: [start, start + Math.PI / 12 - 0.016],
    color: index % 2 ? 'part' : 'whole',
    opacity: index % 2 ? 0.35 : 1,
    tether: `symbol-${index}`,
  };
});
const spec: SceneSpec = {
  id: 'render-budget',
  entities,
  steps: [
    {
      id: 'view',
      title: 'View',
      latexAfter: '',
      say: { quick: 'Parts.', standard: 'Equal parts.', deep: 'Ninety-six distinct equal pieces.' },
      aria: 'Ninety-six pieces.',
      ops: [],
      tethers: [],
    },
  ],
  code: '',
};
const player = new ScenePlayer(spec, 0, 0, 0);
const probe = {
  point: (index: number) => {
    const entity = player.state.entities[`part-${index}`];
    const middle = entity.arc ? (entity.arc[0] + entity.arc[1]) / 2 : 0;
    const p: [number, number, number] = slices
      ? [0.5 * Math.cos(middle), 0.198, -0.5 * Math.sin(middle)]
      : [0, 0.09, 0];
    return anchorProjectors.get(entity.id)?.(p);
  },
  update: () => {
    const entity = player.state.entities['part-0'];
    entity.opacity = 0;
    player.state.entities['part-1'].color = 'error';
    player.state.entities['part-1'].opacity = 1;
    document.dispatchEvent(new Event('renderer-update'));
  },
  hold: (value: boolean) => useStageHold.getState().setPaused(value),
  hit: () => stageHit,
};
declare global {
  interface Window {
    rendererProbe: typeof probe;
  }
}
window.rendererProbe = probe;
export default function Verification() {
  const [selection, setSelection] = useState<string | null>(null);
  const [active, setActive] = useState('');
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const update = () => {
      setActive('');
      setReset((value) => value + 1);
    };
    document.addEventListener('renderer-update', update);
    return () => document.removeEventListener('renderer-update', update);
  }, []);
  return (
    <div style={{ height: 700, width: 1000 }} data-selection={selection ?? ''} data-active={active}>
      <ThreeStage
        state={player.state}
        player={player}
        selection={selection}
        onSelect={setSelection}
        onActivate={setActive}
        flat={false}
        reset={reset}
        onLost={() => {
          throw new Error('WebGL context was lost.');
        }}
      />
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Verification />);
