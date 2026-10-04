import { useEffect, useRef, useId } from 'react';
import type { GraphSpec, ParsedGraph } from './types';
import { evaluateAST } from './evaluate';
import { anchorProjectors, projectedEntities } from '../renderers/anchors';
import { setStageHit } from '../notelets/stageHit';
import { graphPlotId } from './coordinates';
export function GraphSvg({
  graph,
  parsed,
  traceX,
  sliceY,
  onInspect,
}: {
  graph: GraphSpec;
  parsed: ParsedGraph;
  traceX: number;
  sliceY: number;
  onInspect: (x: number, y?: number) => void;
}) {
  const ref = useRef<SVGSVGElement>(null),
    clip = useId().replace(/:/g, '');
  const v = graph.viewport,
    m = 44,
    w = 700,
    h = 440;
  const sx = (x: number) => m + ((x - v.xmin) / (v.xmax - v.xmin)) * (w - 2 * m);
  const sy = (y: number) => h - m - ((y - v.ymin) / (v.ymax - v.ymin)) * (h - 2 * m);
  const trace = evaluateAST(parsed.ast, { ...graph.parameters, x: traceX, y: sliceY });
  useEffect(() => {
    const project = (p: [number, number, number]) => {
      const x = p[0],
        value =
          graph.mode === 'surface'
            ? p[1]
            : graph.mode === 'relation'
              ? p[1]
              : evaluateAST(parsed.ast, { ...graph.parameters, x, y: 0 }).value;
      const matrix = ref.current?.getScreenCTM();
      if (!matrix) return { x: 0, y: 0 };
      const point = new DOMPoint(sx(x), sy(value ?? 0)).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    };
    const id = graphPlotId(graph);
    anchorProjectors.set(id, project);
    projectedEntities.set(id, project([traceX, sliceY, 0]));
    return () => {
      anchorProjectors.delete(id);
      projectedEntities.delete(id);
    };
  });
  const inspect = (event: React.PointerEvent<SVGSVGElement>) => {
    const matrix = ref.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = Math.max(
      v.xmin,
      Math.min(v.xmax, v.xmin + ((point.x - m) / (w - 2 * m)) * (v.xmax - v.xmin)),
    );
    const y = Math.max(
      v.ymin,
      Math.min(v.ymax, v.ymin + ((h - m - point.y) / (h - 2 * m)) * (v.ymax - v.ymin)),
    );
    setStageHit({
      entityId: graphPlotId(graph),
      p: [x, graph.mode === 'surface' || graph.mode === 'relation' ? y : 0, 0],
    });
  };
  const click = (event: React.MouseEvent<SVGSVGElement>) => {
    const matrix = ref.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onInspect(
      Math.max(
        v.xmin,
        Math.min(v.xmax, v.xmin + ((point.x - m) / (w - 2 * m)) * (v.xmax - v.xmin)),
      ),
      Math.max(
        v.ymin,
        Math.min(v.ymax, v.ymin + ((h - m - point.y) / (h - 2 * m)) * (v.ymax - v.ymin)),
      ),
    );
  };
  const surface = graph.surface,
    heat = [];
  if (surface) {
    const n = surface.resolution,
      stride = Math.max(1, Math.ceil(n / 32));
    for (let j = 0; j < n; j += stride)
      for (let i = 0; i < n; i += stride) {
        const id = j * (n + 1) + i;
        let safe = true;
        for (let jj = j; jj < Math.min(n, j + stride); jj++)
          for (let ii = i; ii < Math.min(n, i + stride); ii++)
            if (!surface.cellValid[jj * n + ii]) safe = false;
        if (!surface.valid[id] || !safe) continue;
        const z = surface.heights[id],
          t = Math.max(0, Math.min(1, (z - v.zmin) / (v.zmax - v.zmin)));
        heat.push(
          <rect
            key={id}
            x={sx(v.xmin + (i * (v.xmax - v.xmin)) / n)}
            y={sy(v.ymin + (Math.min(n, j + stride) * (v.ymax - v.ymin)) / n)}
            width={((w - 2 * m) * stride) / n + 0.3}
            height={((h - 2 * m) * stride) / n + 0.3}
            fill={`hsl(${174 - t * 130} 65% ${35 + t * 25}%)`}
          />,
        );
      }
  }
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={
        graph.mode === 'surface'
          ? 'Surface heatmap on labelled x and y axes, with selected y slice'
          : 'Sampled graph on labelled x and y axes'
      }
      onPointerDown={inspect}
      onClick={click}
      style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} />
        </clipPath>
      </defs>
      <rect width={w} height={h} fill="var(--surface)" rx="12" />
      {Array.from({ length: 11 }, (_, i) => {
        const x = v.xmin + (i * (v.xmax - v.xmin)) / 10,
          y = v.ymin + (i * (v.ymax - v.ymin)) / 10;
        return (
          <g key={i}>
            <line x1={sx(x)} y1={m} x2={sx(x)} y2={h - m} stroke="var(--rule)" />
            <line x1={m} y1={sy(y)} x2={w - m} y2={sy(y)} stroke="var(--rule)" />
            {i % 2 === 0 && (
              <>
                <text
                  x={sx(x)}
                  y={h - m + 20}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="11"
                >
                  {Number(x.toPrecision(3))}
                </text>
                <text x={m - 8} y={sy(y) + 4} textAnchor="end" fill="var(--muted)" fontSize="11">
                  {Number(y.toPrecision(3))}
                </text>
              </>
            )}
          </g>
        );
      })}
      <g clipPath={`url(#${clip})`}>
        {heat}
        <line x1={sx(0)} y1={m} x2={sx(0)} y2={h - m} stroke="var(--ink)" strokeWidth="1.5" />
        <line x1={m} y1={sy(0)} x2={w - m} y2={sy(0)} stroke="var(--ink)" strokeWidth="1.5" />
        {graph.segments.map((segment, i) => (
          <polyline
            key={i}
            points={segment.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ))}
        {graph.mode === 'surface' ? (
          <line
            x1={m}
            x2={w - m}
            y1={sy(sliceY)}
            y2={sy(sliceY)}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeDasharray="7 5"
          />
        ) : (
          trace.valid &&
          graph.mode !== 'relation' && (
            <>
              <line
                x1={sx(traceX)}
                x2={sx(traceX)}
                y1={m}
                y2={h - m}
                stroke="var(--mat)"
                strokeDasharray="5 5"
              />
              <circle
                cx={sx(traceX)}
                cy={sy(trace.value!)}
                r="6"
                fill="var(--glow)"
                stroke="var(--ink)"
                strokeWidth="2"
              />
            </>
          )
        )}
      </g>
      <text x={w - 20} y={h - m + 5} fill="var(--ink)" fontSize="14">
        x
      </text>
      <text x={m - 5} y="23" fill="var(--ink)" fontSize="14">
        y
      </text>
      {graph.outcome === 'all' && (
        <text x={w / 2} y={h / 2} textAnchor="middle" fill="var(--ink)" fontSize="19">
          Every point in this view satisfies this relation.
        </text>
      )}
    </svg>
  );
}
