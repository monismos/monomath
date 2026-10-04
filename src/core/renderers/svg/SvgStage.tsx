import { useEffect, useId, useRef } from 'react';
import type { Entity, ResolvedState, Vec3 } from '../../scene/spec';
import { palette, entityVisible, entityCenter } from '../../scene/spec';
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
const facePoints = (entity: Entity, face: number[]) =>
  face
    .map((index) => {
      const point = entity.points![index];
      return `${point[0] * 72},${-point[2] * 72 - point[1] * 43.2}`;
    })
    .join(' ');
export default function SvgStage({
  state,
  selection,
  onSelect,
  player,
  onActivate,
  onStagePoint,
  onStageZoom,
}: {
  state: ResolvedState;
  selection: string | null;
  onSelect: (id: string | null) => void;
  player: ScenePlayer;
  onActivate?: (id: string) => void;
  onStagePoint?: (point: Vec3) => void;
  onStageZoom?: (factor: number) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const shadowId = useId();
  const drag = useRef<{ x: number; y: number; id: number }>();
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const point = (x: number, y: number) => {
    const matrix = ref.current?.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(x, y).matrixTransform(matrix.inverse());
    onStagePoint?.([(p.x - 350) / 72, 0, (235 - p.y) / 60]);
  };
  useEffect(() => {
    const node = ref.current;
    if (!node || !onStageZoom) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      onStageZoom(Math.exp(-event.deltaY * 0.002));
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [onStageZoom]);
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
        const visible = entityVisible(entity);
        node.style.pointerEvents = visible ? 'auto' : 'none';
        node.setAttribute('aria-hidden', String(!visible));
        node.setAttribute('tabindex', entity.kind === 'label' || !visible ? '-1' : '0');
        node.setAttribute('transform', transform(entity));
        node.setAttribute('opacity', String(entity.opacity ?? 1));
        node.setAttribute('aria-label', entity.text?.plain ?? `${entity.color} ${entity.kind}`);
        if (entity.points && entity.faces)
          node.querySelectorAll<SVGPolygonElement>('[data-face]').forEach((polygon) => {
            polygon.setAttribute(
              'points',
              facePoints(entity, entity.faces![Number(polygon.dataset.face)]),
            );
          });
        const textNode = node.querySelector('text');
        if (textNode && textNode.textContent !== entity.text?.plain)
          textNode.textContent = entity.text?.plain ?? '';
        const rect = node.getBoundingClientRect();
        const matrix = (node as SVGGElement).getScreenCTM?.();
        const center = entityCenter(entity);
        const origin =
          matrix && typeof DOMPoint !== 'undefined'
            ? new DOMPoint(center[0] * 72, -center[2] * 72 - center[1] * 43.2).matrixTransform(
                matrix,
              )
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
      onClick={(event) => {
        const id = (event.target as Element)
          .closest('[data-entity-id]')
          ?.getAttribute('data-entity-id');
        if (onStagePoint && (!id || ['trace', 'tangent'].includes(id)))
          point(event.clientX, event.clientY);
      }}
      onPointerDown={(event) => {
        if (!onStagePoint && !onStageZoom) return;
        touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.current.size === 2) {
          const [a, b] = [...touches.current.values()];
          pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
        }
        if (
          (event.target as Element).closest('[data-entity-id="trace"], [data-entity-id="tangent"]')
        ) {
          drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={(event) => {
        if (touches.current.has(event.pointerId))
          touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.current.size === 2 && onStageZoom) {
          const [a, b] = [...touches.current.values()],
            distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch.current > 0) onStageZoom(distance / pinch.current);
          pinch.current = distance;
          return;
        }
        const start = drag.current;
        if (
          start &&
          start.id === event.pointerId &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        )
          point(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        touches.current.delete(event.pointerId);
        pinch.current = 0;
        drag.current = undefined;
      }}
      onPointerCancel={(event) => {
        touches.current.delete(event.pointerId);
        pinch.current = 0;
        drag.current = undefined;
      }}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'visible',
        touchAction: onStagePoint || onStageZoom ? 'none' : undefined,
      }}
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
          const visible = entityVisible(entity);
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
              {entity.kind === 'mesh' && entity.points && entity.faces ? (
                entity.faces.map((face, index) => (
                  <polygon
                    key={index}
                    data-face={index}
                    points={facePoints(entity, face)}
                    fill={fill}
                    fillOpacity={0.7}
                    stroke={selection === (entity.tether ?? entity.id) ? '#FFE066' : '#ffffff90'}
                    strokeWidth={selection === (entity.tether ?? entity.id) ? 3 : 1}
                  />
                ))
              ) : entity.kind === 'slice' ? (
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
