import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text } from '@react-three/drei';
import { ExtrudeGeometry, Shape, Vector3 } from 'three';
import type { Group, MeshStandardMaterial } from 'three';
import type { Entity, ResolvedState } from '../../scene/spec';
import type { ScenePlayer } from '../../scene/player';
import { palette } from '../../scene/spec';
import { projectedEntities, anchorProjectors } from '../anchors';
import { useStageHold, setStageHit } from '../../notelets/stageHit';
import localFont from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff';
function Piece({
  entity,
  selection,
  onSelect,
}: {
  entity: Entity;
  selection: string | null;
  onSelect: (id: string | null) => void;
}) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const { camera, gl } = useThree();
  const geometry = useMemo(() => {
    if (entity.kind !== 'slice') return undefined;
    const [start, end] = entity.arc ?? [0, Math.PI / 2];
    const radius = entity.size?.[0] ?? 1;
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(radius * Math.cos(start), radius * Math.sin(start));
    shape.absarc(0, 0, radius, start, end, false);
    shape.lineTo(0, 0);
    return new ExtrudeGeometry(shape, {
      depth: entity.size?.[1] ?? 0.25,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      curveSegments: 24,
    });
  }, [entity]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const selected = selection === (entity.tether ?? entity.id);
  const color = palette[entity.color] ?? palette.whole;
  useFrame(() => {
    if (!group.current) return;
    group.current.position.set(...entity.pos);
    group.current.scale.set(...(entity.scale ?? [1, 1, 1]));
    group.current.rotation.set(...(entity.rot ?? [0, 0, 0]));
    group.current.visible = (entity.opacity ?? 1) > 0.01;
    if (material.current) {
      material.current.opacity = entity.opacity ?? 1;
      material.current.emissiveIntensity = selected ? 0.3 : (entity.glow ?? 0);
    }
    const projected = group.current.getWorldPosition(new Vector3()).project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    projectedEntities.set(entity.id, {
      x: rect.left + ((projected.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - projected.y) * rect.height) / 2,
    });
    anchorProjectors.set(entity.id, (p) => {
      const point = new Vector3(...p);
      group.current?.localToWorld(point);
      point.project(camera);
      const bounds = gl.domElement.getBoundingClientRect();
      return {
        x: bounds.left + ((point.x + 1) * bounds.width) / 2,
        y: bounds.top + ((1 - point.y) * bounds.height) / 2,
      };
    });
  });
  const events = {
    onPointerOver: () => onSelect(entity.tether ?? entity.id),
    onPointerOut: () => onSelect(null),
    onClick: () => onSelect(entity.tether ?? entity.id),
    onPointerDown: (event: { point: Vector3 }) => {
      const p = group.current?.worldToLocal(event.point.clone());
      if (p) setStageHit({ entityId: entity.id, p: p.toArray() as [number, number, number] });
    },
  };
  const surface = (
    <meshStandardMaterial
      ref={material}
      color={color}
      transparent
      opacity={entity.opacity ?? 1}
      roughness={0.75}
      metalness={0.01}
      emissive="#FFE066"
      emissiveIntensity={selected ? 0.3 : (entity.glow ?? 0)}
    />
  );
  return (
    <group ref={group} position={entity.pos} {...events}>
      {entity.kind === 'label' || entity.kind === 'token' ? (
        <Text
          font={localFont}
          fontSize={0.26}
          color={color}
          rotation={[-Math.PI / 2, 0, 0]}
          anchorX="center"
          anchorY="middle"
        >
          {entity.text?.plain ?? ''}
        </Text>
      ) : entity.kind === 'slice' ? (
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          {surface}
        </mesh>
      ) : entity.kind === 'sphere' || entity.kind === 'lantern' ? (
        <mesh castShadow>
          <sphereGeometry args={[entity.size?.[0] ?? 0.3, 24, 16]} />
          {surface}
        </mesh>
      ) : (
        <RoundedBox
          args={entity.size ?? [0.6, 0.6, 0.6]}
          radius={0.05}
          smoothness={3}
          castShadow
          receiveShadow
        >
          {surface}
        </RoundedBox>
      )}
    </group>
  );
}
function CameraController({ flat, reset }: { flat: boolean; reset: number }) {
  const { camera, invalidate } = useThree();
  const target = useRef(new Vector3(0, 6, 7));
  const active = useRef(true);
  useEffect(() => {
    target.current.set(0, flat ? 11 : 6, flat ? 0.02 : 7);
    active.current = true;
    invalidate();
  }, [flat, reset, invalidate]);
  useFrame(() => {
    if (!active.current) return;
    camera.position.lerp(target.current, 0.14);
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.01) active.current = false;
    else invalidate();
  });
  return null;
}
interface Props {
  state: ResolvedState;
  player: ScenePlayer;
  selection: string | null;
  onSelect: (id: string | null) => void;
  flat: boolean;
  reset: number;
  onLost: () => void;
}
function Scene({ state, player, selection, onSelect, flat, reset, onLost }: Props) {
  const { gl, invalidate, camera } = useThree();
  useFrame(() => {
    gl.domElement.dataset.cameraPosition = camera.position
      .toArray()
      .map((v) => v.toFixed(4))
      .join(',');
  });
  const paused = useStageHold((s) => s.paused);
  useEffect(() => {
    invalidate();
    return player.subscribe(invalidate);
  }, [player, selection, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return (
    <>
      <color attach="background" args={['#1F7A6B']} />
      <hemisphereLight args={['#ffffff', '#255C50', 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[2, 8, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 3, -2]} intensity={0.65} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1F7A6B" roughness={1} />
      </mesh>
      <gridHelper args={[40, 80, '#318779', '#2B8071']} position={[0, -0.1, 0]} />
      {Object.values(state.entities).map((e) => (
        <Piece key={e.id} entity={e} selection={selection} onSelect={onSelect} />
      ))}
      <CameraController flat={flat} reset={reset} />
      <OrbitControls
        enabled={!paused}
        makeDefault
        minDistance={5}
        maxDistance={13}
        minPolarAngle={0.25}
        maxPolarAngle={1.35}
        minAzimuthAngle={-0.75}
        maxAzimuthAngle={0.75}
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
      />
    </>
  );
}
export default function ThreeStage(props: Props) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 6, 7], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      style={{ touchAction: 'none' }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
