import { useEffect, useId, useRef } from 'react';
import type { Entity, ResolvedState } from '../../scene/spec';
import { palette } from '../../scene/spec';
import { worldToScreen } from '../projection';
import type { ScenePlayer } from '../../scene/player';
import { projectedEntities, anchorProjectors } from '../anchors';
import { setStageHit } from '../../notelets/stageHit';
// Preserve the notelet's 72 px local coordinates while matching the world's 60 px z projection.
const depthScale = 60 / 72;
function transform(entity: Entity) {
  const p = worldToScreen(entity.pos);
  const angle = ((entity.rot?.[1] ?? 0) * 180) / Math.PI;
  return `translate(${p.x} ${p.y}) scale(1 ${depthScale}) rotate(${angle}) scale(${entity.scale?.[0] ?? 1} ${entity.scale?.[2] ?? 1})`;
}
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
  onActivate,
}: {
  state: ResolvedState;
  selection: string | null;
  onSelect: (id: string | null) => void;
  player: ScenePlayer;
  onActivate?: (id: string) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const shadowId = useId();
  useEffect(() => {
    const ids = Object.keys(state.entities);
    const update = () => {
      ref.current?.querySelectorAll<SVGElement>('[data-entity-id]').forEach((node) => {
        const entity = state.entities[node.dataset.entityId!];
        if (!entity) {
          node.setAttribute('opacity', '0');
          node.style.pointerEvents = 'none';
          node.setAttribute('aria-hidden', 'true');
          node.setAttribute('tabindex', '-1');
          return;
        }
        const visible = (entity.opacity ?? 1) > 0.01;
        node.style.pointerEvents = visible ? 'auto' : 'none';
        node.setAttribute('aria-hidden', String(!visible));
        node.setAttribute('tabindex', entity.kind === 'label' || !visible ? '-1' : '0');
        node.setAttribute('transform', transform(entity));
        node.setAttribute('opacity', String(entity.opacity ?? 1));
        const rect = node.getBoundingClientRect();
        const matrix = (node as SVGGElement).getScreenCTM?.();
        const origin =
          matrix && typeof DOMPoint !== 'undefined'
            ? new DOMPoint(0, 0).matrixTransform(matrix)
            : null;
        projectedEntities.set(
          entity.id,
          origin
            ? { x: origin.x, y: origin.y }
            : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
        );
        anchorProjectors.set(entity.id, (p) => {
          const matrix = (node as SVGGElement).getScreenCTM?.();
          if (!matrix) return { x: rect.x, y: rect.y };
          const point = new DOMPoint(p[0] * 72, -p[2] * 72).matrixTransform(matrix);
          return { x: point.x, y: point.y };
        });
        const shape = node.firstElementChild as SVGElement | null;
        if (shape) {
          shape.style.filter = (entity.glow ?? 0) > 0.2 ? 'brightness(1.3)' : '';
          shape.setAttribute('fill', palette[entity.color] ?? palette.whole);
        }
      });
    };
    update();
    const unsubscribe = player.subscribe(update);
    return () => {
      unsubscribe();
      ids.forEach((id) => {
        projectedEntities.delete(id);
        anchorProjectors.delete(id);
      });
    };
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
        <filter id={shadowId}>
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#072D25" floodOpacity=".23" />
        </filter>
      </defs>
      {Object.values(state.entities)
        .sort((a, b) => a.pos[1] - b.pos[1])
        .map((entity) => {
          const fill = palette[entity.color] ?? palette.whole;
          const visible = (entity.opacity ?? 1) > 0.01;
          return (
            <g
              key={entity.id}
              data-entity-id={entity.id}
              data-anchor-id={`entity-${entity.id}`}
              transform={transform(entity)}
              opacity={entity.opacity ?? 1}
              filter={`url(#${shadowId})`}
              tabIndex={entity.kind === 'label' || !visible ? -1 : 0}
              aria-hidden={!visible}
              role={entity.kind === 'label' ? undefined : 'button'}
              aria-label={entity.text?.plain ?? `${entity.color} ${entity.kind}`}
              onPointerEnter={() => onSelect(entity.tether ?? entity.id)}
              onPointerLeave={() => onSelect(null)}
              onClick={() =>
                onActivate ? onActivate(entity.id) : onSelect(entity.tether ?? entity.id)
              }
              onPointerDown={(event) => {
                const matrix = event.currentTarget.getScreenCTM();
                if (!matrix) return;
                const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(
                  matrix.inverse(),
                );
                setStageHit({ entityId: entity.id, p: [local.x / 72, 0, -local.y / 72] });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onActivate) onActivate(entity.id);
                  else onSelect(entity.tether ?? entity.id);
                }
              }}
              style={{ cursor: 'pointer', pointerEvents: visible ? 'auto' : 'none' }}
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
