import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import type { MascotConfig } from '../core/mascots/config';
import type { GuidePose } from '../core/mascots/pose';
import type { CosmeticId } from '../core/gamification/types';
interface Props {
  config: MascotConfig;
  pose: MutableRefObject<GuidePose>;
  invalidate: MutableRefObject<(() => void) | null>;
  hat: CosmeticId;
  visible: boolean;
}
function Rig({ config, pose, invalidate, hat }: Props) {
  const group = useRef<Group>(null);
  const eye = useRef<Group>(null);
  const pupil = useRef<Group>(null);
  const { invalidate: redraw } = useThree();
  useEffect(() => {
    invalidate.current = redraw;
    return () => {
      invalidate.current = null;
    };
  }, [invalidate, redraw]);
  useFrame(() => {
    if (group.current) {
      group.current.position.y = pose.current.breathe;
      group.current.rotation.z =
        pose.current.expression === 'curious'
          ? 0.08
          : pose.current.expression === 'encourage'
            ? -0.06
            : 0;
    }
    if (eye.current) eye.current.scale.y = pose.current.blink;
    if (pupil.current)
      pupil.current.position.set(pose.current.lookX * 0.1, -pose.current.lookY * 0.09, 0);
  });
  const body = (y = 0, x = 0, width = 1.05, height = 1.1) => (
    <RoundedBox
      key={`${y}-${x}`}
      args={[width, height, 0.62]}
      radius={config.body === 'cursor' ? 0.06 : 0.15}
      smoothness={3}
      position={[x, y, 0]}
    >
      <meshStandardMaterial color={config.color} roughness={0.85} />
    </RoundedBox>
  );
  return (
    <group ref={group} rotation={[0, -0.1, 0]}>
      {config.body === 'stack' ? (
        <>
          {body(-0.35, 0, 1, 0.35)}
          {body(0, 0, 1.2, 0.35)}
          {body(0.35, 0, 1, 0.35)}
        </>
      ) : config.body === 'arrow' ? (
        <>
          <mesh position={[0, 0.33, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.65, 0.75, 4]} />
            <meshStandardMaterial color={config.color} roughness={0.85} />
          </mesh>
          {body(-0.28, 0, 0.65, 0.7)}
        </>
      ) : (
        body()
      )}
      {config.body === 'lantern' && (
        <>
          <mesh position={[0, 0.72, 0]}>
            <torusGeometry args={[0.23, 0.06, 8, 20, Math.PI]} />
            <meshStandardMaterial color={config.accent} />
          </mesh>
          {body(0.57, 0, 1.15, 0.13)}
        </>
      )}
      {config.body === 'cursor' && (
        <>
          {[-0.57, 0.57].map((x) => (
            <mesh key={x} position={[x, 0, 0.33]}>
              <boxGeometry args={[0.05, 0.8, 0.025]} />
              <meshStandardMaterial color={config.accent} />
            </mesh>
          ))}
          <mesh position={[0, -0.39, 0.34]}>
            <boxGeometry args={[0.2, 0.04, 0.025]} />
            <meshStandardMaterial color={config.accent} />
          </mesh>
        </>
      )}
      <group ref={eye} position={[0, 0.12, 0.33]}>
        <mesh scale={[1, 1, 0.2]}>
          <sphereGeometry args={[0.34, 24, 16]} />
          <meshStandardMaterial color="#F5F7F6" roughness={0.7} />
        </mesh>
        <group ref={pupil}>
          <mesh position={[0, 0, 0.07]} scale={[1, 1, 0.3]}>
            <sphereGeometry args={[0.16, 20, 12]} />
            <meshStandardMaterial color="#10201C" roughness={0.4} />
          </mesh>
          <mesh position={[0.04, 0.06, 0.12]}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </group>
      </group>
      {[-0.27, 0.27].map((x) => (
        <RoundedBox key={x} args={[0.3, 0.12, 0.4]} radius={0.05} position={[x, -0.6, 0.07]}>
          <meshStandardMaterial color={config.accent} />
        </RoundedBox>
      ))}
      <mesh position={[0, -0.38, 0.335]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.13, 0.014, 5, 15, Math.PI]} />
        <meshBasicMaterial color="#10201C" />
      </mesh>
      {hat === 'sunhat' && (
        <>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 0.25, 12]} />
            <meshStandardMaterial color="#FFE066" />
          </mesh>
          <mesh position={[0, 0.59, 0]}>
            <cylinderGeometry args={[0.49, 0.49, 0.055, 16]} />
            <meshStandardMaterial color="#805600" />
          </mesh>
        </>
      )}
      {hat === 'starcap' && (
        <group>
          <mesh position={[0, 0.76, 0]}>
            <coneGeometry args={[0.45, 0.4, 12]} />
            <meshStandardMaterial color="#507DF2" />
          </mesh>
          <mesh position={[0, 0.76, 0.29]}>
            <octahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial color="#FFE066" />
          </mesh>
        </group>
      )}
    </group>
  );
}
export default function MascotThree(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.15, 3.8], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 3, 4]} intensity={2} />
      <directionalLight position={[-2, 1, 2]} intensity={0.7} />
      <Rig {...props} />
    </Canvas>
  );
}
