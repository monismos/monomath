import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, DoubleSide, Vector3, SRGBColorSpace } from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import type { GraphSpec, ParsedGraph } from '../core/graphing/types';
import { clipGraphLine, graphPlotId, graphPosition } from '../core/graphing/coordinates';
import { evaluateAST } from '../core/graphing/evaluate';
import { anchorProjectors, projectedEntities } from '../core/renderers/anchors';
import { useStageHold, setStageHit } from '../core/notelets/stageHit';
function AxisLabel({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#ffffff'; context.strokeStyle = '#10201c'; context.lineWidth = 3;
      context.beginPath(); context.arc(64, 64, 55, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = '#10201c'; context.font = '600 78px "Bricolage Grotesque", sans-serif';
      context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 64, 64);
    }
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace; return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[.65, .65, 1]}><spriteMaterial map={texture} transparent toneMapped={false} /></sprite>;
}
function Plot({
  graph,
  parsed,
  traceX,
  sliceY,
  onInspect,
  onLost,
  reset,
}: {
  graph: GraphSpec;
  parsed: ParsedGraph;
  traceX: number;
  sliceY: number;
  onInspect: (x: number, y?: number) => void;
  onLost: () => void;
  reset: number;
}) {
  const { camera, gl, invalidate } = useThree(),
    controls = useRef<OrbitControlsType>(null),
    paused = useStageHold((s) => s.paused);
  gl.domElement.dataset.stageCanvas = 'true';
  const v = graph.viewport;
  const lines = useMemo(() => {
    const geometry = new BufferGeometry(),
      points: number[] = [];
    graph.segments.forEach((segment) => {
      for (let i = 1; i < segment.length; i++) {
        const a = segment[i - 1],
          b = segment[i];
        const clipped = clipGraphLine(graph.viewport, a, b);
        if (clipped)
          points.push(
            ...graphPosition(graph, clipped[0].x, clipped[0].y),
            ...graphPosition(graph, clipped[1].x, clipped[1].y),
          );
      }
    });
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    return geometry;
  }, [graph]);
  const surface = useMemo(() => {
    if (!graph.surface) return null;
    const geometry = new BufferGeometry(),
      points: number[] = [];
    for (let i = 0; i < graph.surface.vertices.length; i += 3)
      points.push(
        ...graphPosition(
          graph,
          graph.surface.vertices[i],
          graph.surface.vertices[i + 1],
          graph.surface.vertices[i + 2],
        ),
      );
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    geometry.setIndex(graph.surface.indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [graph]);
  useEffect(
    () => () => {
      lines.dispose();
      surface?.dispose();
    },
    [lines, surface],
  );
  useEffect(() => {
    controls.current?.reset();
    camera.position.set(7, 6, 7);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [reset, camera, invalidate]);
  useEffect(() => {
    invalidate();
  }, [graph, traceX, sliceY, invalidate]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  useFrame(() => {
    const id = graphPlotId(graph),
      rect = gl.domElement.getBoundingClientRect();
    const projector = (p: [number, number, number]) => {
      const sample = evaluateAST(parsed.ast, { ...graph.parameters, x: p[0], y: p[1] });
      const pos = graphPosition(
        graph,
        p[0],
        graph.mode === 'surface' || graph.mode === 'relation' ? p[1] : (sample.value ?? p[1]),
        graph.mode === 'surface' ? (sample.value ?? 0) : 0,
      );
      const point = new Vector3(...pos).project(camera);
      return {
        x: rect.left + ((point.x + 1) * rect.width) / 2,
        y: rect.top + ((1 - point.y) * rect.height) / 2,
      };
    };
    anchorProjectors.set(id, projector);
    projectedEntities.set(id, projector([traceX, sliceY, 0]));
    gl.domElement.dataset.cameraPosition = camera.position
      .toArray()
      .map((n) => n.toFixed(4))
      .join(',');
  });
  useEffect(
    () => () => {
      anchorProjectors.delete(graphPlotId(graph));
      projectedEntities.delete(graphPlotId(graph));
    },
    [graph],
  );
  const point = evaluateAST(parsed.ast, { ...graph.parameters, x: traceX, y: sliceY }),
    tracePos = graphPosition(
      graph,
      traceX,
      graph.mode === 'surface' ? sliceY : (point.value ?? 0),
      point.value ?? 0,
    );
  const pick = (event: { point: Vector3 }, commit: boolean) => {
    const x = v.xmin + ((event.point.x + 3.4) / 6.8) * (v.xmax - v.xmin),
      y = v.ymin + ((event.point.z + 3.4) / 6.8) * (v.ymax - v.ymin);
    setStageHit({
      entityId: graphPlotId(graph),
      p: [x, graph.mode === 'surface' || graph.mode === 'relation' ? y : 0, 0],
    });
    if (commit) onInspect(x, y);
  };
  const axisGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const y0 = Math.max(-3.4, Math.min(3.4, ((0 - v.ymin) / (v.ymax - v.ymin)) * 6.8 - 3.4)),
      x0 = Math.max(-3.4, Math.min(3.4, ((0 - v.xmin) / (v.xmax - v.xmin)) * 6.8 - 3.4));
    const floor = graph.mode === 'surface' ? -2.4 : -0.03;
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [-3.4, floor, y0, 3.4, floor, y0, x0, floor, -3.4, x0, floor, 3.4],
        3,
      ),
    );
    return geometry;
  }, [v, graph.mode]);
  useEffect(() => () => axisGeometry.dispose(), [axisGeometry]);
  return (
    <>
      <color attach="background" args={['#1f7a6b']} />
      <hemisphereLight args={['#fff', '#255c50', 1.5]} />
      <directionalLight position={[3, 8, 5]} intensity={2} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, graph.mode === 'surface' ? -2.5 : -0.06, 0]}
        onPointerDown={(event) => pick(event, false)}
        onClick={(event) => pick(event, true)}
      >
        <planeGeometry args={[7.4, 7.4]} />
        <meshStandardMaterial color="#eff4ed" side={DoubleSide} />
      </mesh>
      <gridHelper
        position={[0, graph.mode === 'surface' ? -2.44 : 0, 0]}
        args={[6.8, 10, '#b4c7bd', '#d6e1da']}
      />
      <lineSegments geometry={axisGeometry}>
        <lineBasicMaterial color="#10201c" />
      </lineSegments>
      {surface ? (
        <mesh
          geometry={surface}
          onPointerDown={(event) => pick(event, false)}
          onClick={(event) => pick(event, true)}
        >
          <meshStandardMaterial color="#ffcd65" side={DoubleSide} roughness={0.8} />
        </mesh>
      ) : (
        <lineSegments
          geometry={lines}
          onPointerDown={(event) => pick(event, false)}
          onClick={(event) => pick(event, true)}
        >
          <lineBasicMaterial color="#2f6bff" />
        </lineSegments>
      )}
      {point.valid &&
        graph.mode !== 'relation' &&
        graph.mode !== 'constantRelation' &&
        traceX >= v.xmin &&
        traceX <= v.xmax &&
        (graph.mode === 'surface'
          ? sliceY >= v.ymin && sliceY <= v.ymax
          : point.value! >= v.ymin && point.value! <= v.ymax) && (
          <mesh position={tracePos}>
            <sphereGeometry args={[0.09, 12, 10]} />
            <meshBasicMaterial color="#10201c" />
          </mesh>
        )}
      <AxisLabel text="x" position={[3.8, graph.mode === 'surface' ? -2.36 : 0, 0]} />
      <AxisLabel text="y" position={[0, graph.mode === 'surface' ? -2.36 : 0, 3.8]} />
      {graph.mode === 'surface' && <AxisLabel text="z" position={[0, 2.7, 0]} />}
      <OrbitControls
        ref={controls}
        enabled={!paused}
        enablePan={false}
        minDistance={6}
        maxDistance={16}
        minPolarAngle={0.2}
        maxPolarAngle={1.45}
        enableDamping
        dampingFactor={0.12}
      />
    </>
  );
}
export default function GraphThree(props: Parameters<typeof Plot>[0]) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [7, 6, 7], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      style={{ touchAction: 'none' }}
    >
      <Plot {...props} />
    </Canvas>
  );
}
