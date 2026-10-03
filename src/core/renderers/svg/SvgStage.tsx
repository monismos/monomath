import { useEffect, useRef } from 'react';
import type { Entity, ResolvedState } from '../../scene/spec';
import { palette } from '../../scene/spec';
import { worldToScreen } from '../projection';
import type { ScenePlayer } from '../../scene/player';
import { projectedEntities, anchorProjectors } from '../anchors';
function entityPath(entity: Entity) {
  const [a, b] = entity.arc ?? [0, Math.PI / 2];
  const radius = (entity.size?.[0] ?? 1) * 72;
  const start = [radius * Math.cos(a), radius * Math.sin(a)];
  const end = [radius * Math.cos(b), radius * Math.sin(b)];
  return `M 0 0 L ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${b - a > Math.PI ? 1 : 0} 1 ${end[0]} ${end[1]} Z`;
}
export default function SvgStage({
  state,
  selection,
  onSelect,
  player,
}: {
  state: ResolvedState;
  selection: string | null;
  onSelect: (id: string | null) => void;
  player: ScenePlayer;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const update = () => {
      ref.current?.querySelectorAll<SVGElement>('[data-entity-id]').forEach((node) => {
        const entity = state.entities[node.dataset.entityId!];
        if (!entity) return;
        const p = worldToScreen(entity.pos);
        node.setAttribute(
          'transform',
          `translate(${p.x} ${p.y}) scale(${entity.scale?.[0] ?? 1} ${entity.scale?.[2] ?? 1})`,
        );
        node.setAttribute('opacity', String(entity.opacity ?? 1));
        const rect = node.getBoundingClientRect();
        projectedEntities.set(entity.id, {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        });
        anchorProjectors.set(entity.id, (p) => {
          const matrix = (node as SVGGElement).getScreenCTM();
          if (!matrix) return { x: rect.x, y: rect.y };
          const point = new DOMPoint(p[0] * 72, -p[2] * 72).matrixTransform(matrix);
          return { x: point.x, y: point.y };
        });
        const shape = node.firstElementChild as SVGElement | null;
        if (shape) shape.style.filter = (entity.glow ?? 0) > 0.2 ? 'brightness(1.3)' : '';
      });
    };
    update();
    return player.subscribe(update);
  }, [state, player]);
  return (
    <svg
      ref={ref}
      viewBox="0 0 700 440"
      aria-label="Interactive 2D workbench"
      role="group"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        <filter id="object-shadow">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#072D25" floodOpacity=".23" />
        </filter>
      </defs>
      {Object.values(state.entities)
        .sort((a, b) => a.pos[1] - b.pos[1])
        .map((entity) => {
          const fill = palette[entity.color] ?? palette.whole;
          const p = worldToScreen(entity.pos);
          return (
            <g
              key={entity.id}
              data-entity-id={entity.id}
              data-anchor-id={`entity-${entity.id}`}
              transform={`translate(${p.x} ${p.y})`}
              opacity={entity.opacity ?? 1}
              filter="url(#object-shadow)"
              tabIndex={entity.kind === 'label' ? -1 : 0}
              role={entity.kind === 'label' ? undefined : 'button'}
              aria-label={entity.text?.plain ?? `${entity.color} ${entity.kind}`}
              onPointerEnter={() => onSelect(entity.tether ?? entity.id)}
              onPointerLeave={() => onSelect(null)}
              onClick={() => onSelect(entity.tether ?? entity.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(entity.tether ?? entity.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              {entity.kind === 'slice' ? (
                <path
                  d={entityPath(entity)}
                  fill={fill}
                  stroke={selection === (entity.tether ?? entity.id) ? '#FFE066' : '#ffffff75'}
                  strokeWidth={selection === (entity.tether ?? entity.id) ? 4 : 1.2}
                />
              ) : entity.kind === 'sphere' || entity.kind === 'lantern' ? (
                <circle r={(entity.size?.[0] ?? 0.35) * 72} fill={fill} />
              ) : entity.kind === 'label' || entity.kind === 'token' ? (
                <text
                  textAnchor="middle"
                  fill={fill}
                  fontFamily="Bricolage Grotesque"
                  fontSize="23"
                  fontWeight="600"
                >
                  {entity.text?.plain}
                </text>
              ) : (
                <rect
                  x={-(entity.size?.[0] ?? 0.6) * 36}
                  y={-(entity.size?.[2] ?? 0.6) * 36}
                  width={(entity.size?.[0] ?? 0.6) * 72}
                  height={(entity.size?.[2] ?? 0.6) * 72}
                  rx="5"
                  fill={fill}
                  stroke={selection === (entity.tether ?? entity.id) ? '#FFE066' : '#ffffff40'}
                  strokeWidth={selection === (entity.tether ?? entity.id) ? 4 : 1}
                />
              )}
            </g>
          );
        })}
    </svg>
  );
}
