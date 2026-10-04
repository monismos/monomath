import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text } from '@react-three/drei';
import {
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  DynamicDrawUsage,
  ExtrudeGeometry,
  InstancedBufferAttribute,
  Matrix4,
  Object3D,
  Shape,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Group, InstancedMesh, MeshStandardMaterial } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Entity, ResolvedState } from '../../scene/spec';
import type { ScenePlayer } from '../../scene/player';
import { palette, entityVisible, entityCenter } from '../../scene/spec';
import { projectedEntities, anchorProjectors } from '../anchors';
import { useStageHold, setStageHit } from '../../notelets/stageHit';
import localFont from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff';
function Piece({
  entity,
  selection,
  onSelect,
  onActivate,
}: {
  entity: Entity;
  selection: string | null;
  onSelect: (id: string | null) => void;
  onActivate?: (id: string) => void;
}) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const text = useRef<{
    gpuAccelerateSDF: boolean;
    fillOpacity: number;
    color: string | Color;
    text: string;
    sync: (callback?: () => void) => void;
    geometry?: { instanceCount: number };
  } | null>(null);
  const { camera, gl, invalidate } = useThree();
  const geometry = useMemo(() => {
    if (entity.kind === 'mesh' && entity.points && entity.faces) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(entity.points.flat(), 3));
      geometry.setIndex(
        entity.faces.flatMap((face) =>
          face.slice(1, -1).flatMap((_, index) => [face[0], face[index + 1], face[index + 2]]),
        ),
      );
      geometry.computeVertexNormals();
      return geometry;
    }
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
      curveSegments: Math.max(2, Math.ceil(((end - start) / (2 * Math.PI)) * 24)),
    });
  }, [entity]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(
    () => () => {
      projectedEntities.delete(entity.id);
      anchorProjectors.delete(entity.id);
    },
    [entity.id],
  );
  const selected = selection === (entity.tether ?? entity.id);
  const color = palette[entity.color] ?? palette.whole;
  useFrame(() => {
    if (!group.current) return;
    group.current.position.set(...entity.pos);
    group.current.scale.set(...(entity.scale ?? [1, 1, 1]));
    group.current.rotation.set(...(entity.rot ?? [0, 0, 0]));
    group.current.visible = entityVisible(entity);
    if (material.current) {
      material.current.color.set(palette[entity.color] ?? palette.whole);
      material.current.opacity = entity.opacity ?? 1;
      material.current.emissiveIntensity = selected ? 0.3 : (entity.glow ?? 0);
    }
    if (entity.kind === 'mesh' && geometry && entity.points) {
      const position = geometry.getAttribute('position');
      entity.points.forEach((point, index) => position.setXYZ(index, ...point));
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
    if (text.current) {
      text.current.fillOpacity = entity.opacity ?? 1;
      text.current.color = palette[entity.color] ?? palette.whole;
      if (text.current.text !== (entity.text?.plain ?? '')) {
        text.current.text = entity.text?.plain ?? '';
        text.current.sync(invalidate);
      }
    }
    const projected = group.current
      .localToWorld(new Vector3(...entityCenter(entity)))
      .project(camera);
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
    onClick: () => (onActivate ? onActivate(entity.id) : onSelect(entity.tether ?? entity.id)),
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
      side={entity.kind === 'mesh' ? DoubleSide : undefined}
    />
  );
  return (
    <group ref={group} position={entity.pos} {...events}>
      {entity.kind === 'label' || entity.kind === 'token' ? (
        <Text
          ref={(value: typeof text.current) => {
            text.current = value;
            if (value) {
              value.gpuAccelerateSDF = false;
              // Troika starts with an unbounded instance count before its first glyph layout.
              if (value.geometry && !Number.isFinite(value.geometry.instanceCount))
                value.geometry.instanceCount = 0;
            }
          }}
          font={localFont}
          fontSize={0.26}
          color={color}
          rotation={[-Math.PI / 2, 0, 0]}
          anchorX="center"
          anchorY="middle"
        >
          {entity.text?.plain ?? ''}
        </Text>
      ) : entity.kind === 'mesh' ? (
        <mesh geometry={geometry} receiveShadow>
          {surface}
        </mesh>
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
/** Many small equal pieces share geometry, while their ids and local notelet coordinates stay distinct. */
function InstancedPieces({
  entities,
  selection,
  onSelect,
  onActivate,
  template,
}: {
  entities: Entity[];
  selection: string | null;
  onSelect: (id: string | null) => void;
  onActivate?: (id: string) => void;
  template?: Entity;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const { camera, gl } = useThree();
  const geometry = useMemo(() => {
    let value: RoundedBoxGeometry | ExtrudeGeometry;
    if (template?.kind === 'slice') {
      const radius = template.size?.[0] ?? 1;
      const [start, end] = template.arc ?? [0, Math.PI / 2];
      const shape = new Shape();
      shape.moveTo(0, 0);
      shape.lineTo(radius, 0);
      shape.absarc(0, 0, radius, 0, end - start, false);
      shape.lineTo(0, 0);
      value = new ExtrudeGeometry(shape, {
        depth: template.size?.[1] ?? 0.25,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.018,
        curveSegments: Math.max(2, Math.ceil(((end - start) / (2 * Math.PI)) * 24)),
      });
      value.rotateX(-Math.PI / 2);
    } else value = new RoundedBoxGeometry(1, 1, 1, 2, 0.07);
    value.setAttribute(
      'instanceOpacity',
      new InstancedBufferAttribute(new Float32Array(entities.length).fill(1), 1).setUsage(
        DynamicDrawUsage,
      ),
    );
    return value;
  }, [entities.length, template]);
  const tools = useMemo(
    () => ({
      object: new Object3D(),
      color: new Color(),
      highlight: new Color(palette.highlight),
      size: new Vector3(),
      point: new Vector3(),
      instance: new Matrix4(),
      arcRotation: new Matrix4(),
      groupMatrices: entities.map(() => new Matrix4()),
    }),
    [entities],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    entities.forEach((entity, index) => {
      anchorProjectors.set(entity.id, (p) => {
        const projected = new Vector3(...p).applyMatrix4(tools.groupMatrices[index]);
        mesh.current?.localToWorld(projected);
        projected.project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((projected.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - projected.y) * rect.height) / 2,
        };
      });
    });
    return () =>
      entities.forEach((entity) => {
        projectedEntities.delete(entity.id);
        anchorProjectors.delete(entity.id);
      });
  }, [entities, tools, camera, gl]);
  useFrame(() => {
    const current = mesh.current;
    if (!current) return;
    const opacity = geometry.getAttribute('instanceOpacity') as InstancedBufferAttribute;
    const rect = gl.domElement.getBoundingClientRect();
    entities.forEach((entity, index) => {
      const alpha = entity.opacity ?? 1;
      tools.object.position.set(...entity.pos);
      tools.object.rotation.set(...(entity.rot ?? [0, 0, 0]));
      if (alpha > 0.01) tools.object.scale.set(...(entity.scale ?? [1, 1, 1]));
      else tools.object.scale.set(0, 0, 0);
      tools.object.updateMatrix();
      tools.groupMatrices[index].copy(tools.object.matrix);
      tools.instance.copy(tools.object.matrix);
      if (template?.kind === 'slice')
        tools.instance.multiply(tools.arcRotation.makeRotationY(entity.arc?.[0] ?? 0));
      else tools.instance.scale(tools.size.set(...(entity.size ?? [0.6, 0.6, 0.6])));
      current.setMatrixAt(index, tools.instance);
      tools.color.set(palette[entity.color] ?? palette.whole);
      if (selection === (entity.tether ?? entity.id)) tools.color.lerp(tools.highlight, 0.3);
      else if ((entity.glow ?? 0) > 0)
        tools.color.lerp(tools.highlight, Math.min(0.25, entity.glow! * 0.15));
      current.setColorAt(index, tools.color);
      opacity.setX(index, alpha);
      tools.point.set(...entity.pos);
      current.localToWorld(tools.point);
      tools.point.project(camera);
      projectedEntities.set(entity.id, {
        x: rect.left + ((tools.point.x + 1) * rect.width) / 2,
        y: rect.top + ((1 - tools.point.y) * rect.height) / 2,
      });
    });
    current.instanceMatrix.needsUpdate = true;
    if (current.instanceColor) current.instanceColor.needsUpdate = true;
    opacity.needsUpdate = true;
    current.computeBoundingSphere();
  });
  const hit = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    const entity = event.instanceId === undefined ? undefined : entities[event.instanceId];
    if (!entity || (entity.opacity ?? 1) <= 0.01) return undefined;
    event.stopPropagation();
    return entity;
  };
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, entities.length]}
      castShadow
      receiveShadow
      onPointerOver={(event) => {
        const entity = hit(event);
        if (entity) onSelect(entity.tether ?? entity.id);
      }}
      onPointerOut={() => onSelect(null)}
      onClick={(event) => {
        const entity = hit(event);
        if (entity) {
          if (onActivate) onActivate(entity.id);
          else onSelect(entity.tether ?? entity.id);
        }
      }}
      onPointerDown={(event) => {
        const entity = hit(event);
        if (!entity || event.instanceId === undefined || !mesh.current) return;
        const point = mesh.current
          .worldToLocal(event.point.clone())
          .applyMatrix4(tools.groupMatrices[event.instanceId].clone().invert());
        setStageHit({ entityId: entity.id, p: point.toArray() as [number, number, number] });
      }}
    >
      <meshStandardMaterial
        transparent
        roughness={0.75}
        metalness={0.01}
        depthWrite={false}
        customProgramCacheKey={() => 'monomath-instance-opacity-v1'}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;',
            )
            .replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;',
            );
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
            .replace(
              '#include <color_fragment>',
              '#include <color_fragment>\ndiffuseColor.a *= vInstanceOpacity;',
            );
        }}
      />
    </instancedMesh>
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
  onActivate?: (id: string) => void;
  flat: boolean;
  reset: number;
  onLost: () => void;
}
function Scene({ state, player, selection, onSelect, onActivate, flat, reset, onLost }: Props) {
  const { gl, invalidate, camera } = useThree();
  gl.domElement.dataset.stageCanvas = 'true';
  useFrame(() => {
    gl.domElement.dataset.cameraPosition = camera.position
      .toArray()
      .map((v) => v.toFixed(4))
      .join(',');
    gl.domElement.dataset.renderCalls = String(gl.info.render.calls);
    gl.domElement.dataset.renderTriangles = String(gl.info.render.triangles);
  });
  const paused = useStageHold((s) => s.paused);
  const pieces = useMemo(() => Object.values(state.entities), [state]);
  const blocks = useMemo(
    () =>
      pieces.filter(
        (entity) => entity.kind === 'block' || entity.kind === 'bar' || entity.kind === 'crate',
      ),
    [pieces],
  );
  const batched = blocks.length >= 50;
  const sliceBatches = useMemo(() => {
    const slices = pieces.filter((entity) => entity.kind === 'slice');
    if (slices.length < 50) return [];
    const groups = new Map<string, Entity[]>();
    slices.forEach((entity) => {
      const [start, end] = entity.arc ?? [0, Math.PI / 2];
      const key = [entity.size?.[0] ?? 1, entity.size?.[1] ?? 0.25, end - start]
        .map((value) => value.toFixed(6))
        .join(':');
      const group = groups.get(key) ?? [];
      group.push(entity);
      groups.set(key, group);
    });
    return [...groups.entries()];
  }, [pieces]);
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
      {batched && (
        <InstancedPieces
          entities={blocks}
          selection={selection}
          onSelect={onSelect}
          onActivate={onActivate}
        />
      )}
      {sliceBatches.map(([key, entities]) => (
        <InstancedPieces
          key={key}
          entities={entities}
          template={entities[0]}
          selection={selection}
          onSelect={onSelect}
          onActivate={onActivate}
        />
      ))}
      {pieces
        .filter(
          (entity) =>
            (!batched || !blocks.includes(entity)) &&
            (!sliceBatches.length || entity.kind !== 'slice'),
        )
        .map((e) => (
          <Piece
            key={e.id}
            entity={e}
            selection={selection}
            onSelect={onSelect}
            onActivate={onActivate}
          />
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
