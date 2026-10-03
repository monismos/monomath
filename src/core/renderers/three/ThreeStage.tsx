import {useEffect,useMemo,useRef} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import { ExtrudeGeometry, Shape, Vector3 } from 'three';
import type { Mesh } from 'three';
import type {Entity,ResolvedState} from '../../scene/spec';
import {palette} from '../../scene/spec';
import {easing} from '../../scene/tween';

function Piece({entity,selection,onSelect}: {entity:Entity;selection:string|null;onSelect:(id:string|null)=>void}) {
  const mesh=useRef<Mesh>(null);
  const {invalidate}=useThree();const start=useRef(0);const origin=useRef(new Vector3(...entity.pos));
  const geometry=useMemo(()=>{if(entity.kind!=='slice')return undefined;const [start,end]=entity.arc??[0,Math.PI/2];const radius=entity.size?.[0]??1;const shape=new Shape();shape.moveTo(0,0);shape.lineTo(radius*Math.cos(start),radius*Math.sin(start));shape.absarc(0,0,radius,start,end,false);shape.lineTo(0,0);return new ExtrudeGeometry(shape,{depth:entity.size?.[1]??.25,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:24});},[entity]);
  useEffect(()=>()=>geometry?.dispose(),[geometry]);
  useEffect(()=>{start.current=performance.now();if(mesh.current)origin.current.copy(mesh.current.position);invalidate();},[entity,invalidate]);
  useFrame(()=>{if(mesh.current){const progress=Math.min(1,(performance.now()-start.current)/400);mesh.current.position.copy(origin.current).lerp(new Vector3(...entity.pos),easing(progress));mesh.current.scale.set(...(entity.scale??[1,1,1]));if(progress<1)invalidate();}});
  const selected=selection===(entity.tether??entity.id);const color=palette[entity.color]??palette.whole;
  if(entity.kind==='label'||entity.kind==='token'||(entity.opacity??1)<.01)return null;
  const events={onPointerOver:()=>onSelect(entity.tether??entity.id),onPointerOut:()=>onSelect(null),onClick:()=>onSelect(entity.tether??entity.id)};
  const material=<meshStandardMaterial color={color} transparent opacity={entity.opacity??1} roughness={.7} metalness={.02} emissive={selected?'#FFE066':'#000000'} emissiveIntensity={selected?.25:0}/>;
  if(entity.kind==='slice')return <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI/2,0,0]} position={entity.pos} castShadow receiveShadow {...events}>{material}</mesh>;
  if(entity.kind==='sphere'||entity.kind==='lantern')return <mesh ref={mesh} position={entity.pos} castShadow {...events}><sphereGeometry args={[entity.size?.[0]??.3,24,16]}/>{material}</mesh>;
  return <RoundedBox ref={mesh} position={entity.pos} args={entity.size??[.6,.6,.6]} radius={.05} smoothness={3} castShadow receiveShadow {...events}>{material}</RoundedBox>;
}
function CameraController({flat,reset}: {flat:boolean;reset:number}) {const {camera,invalidate}=useThree();const target=useRef(new Vector3(0,6,7));const active=useRef(true);useEffect(()=>{target.current.set(0,flat?11:6,flat?.02:7);active.current=true;invalidate();},[flat,reset,invalidate]);useFrame(()=>{if(!active.current)return;camera.position.lerp(target.current,.14);camera.lookAt(0,0,0);if(camera.position.distanceTo(target.current)<.01)active.current=false;else invalidate();});return null;}
function Scene({state,selection,onSelect,flat,reset,onLost}:{state:ResolvedState;selection:string|null;onSelect:(id:string|null)=>void;flat:boolean;reset:number;onLost:()=>void}) {const {gl,invalidate}=useThree();useEffect(()=>{invalidate();},[state,selection,invalidate]);useEffect(()=>{const canvas=gl.domElement;const lost=(event:Event)=>{event.preventDefault();onLost();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onLost]);return <><color attach="background" args={['#1F7A6B']}/><hemisphereLight args={['#ffffff','#255C50',.9]}/><ambientLight intensity={.3}/><directionalLight position={[2,8,4]} intensity={1.6} castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.0005}/><directionalLight position={[-5,3,-2]} intensity={1}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]} receiveShadow><planeGeometry args={[40,40]}/><meshStandardMaterial color="#1F7A6B" roughness={1}/></mesh><gridHelper args={[40,80,'#318779','#2B8071']} position={[0,-.105,0]}/>{Object.values(state.entities).map(e=><Piece key={e.id} entity={e} selection={selection} onSelect={onSelect}/>)}<CameraController flat={flat} reset={reset}/><OrbitControls makeDefault minDistance={5} maxDistance={13} minPolarAngle={.25} maxPolarAngle={1.35} minAzimuthAngle={-.75} maxAzimuthAngle={.75} enablePan={false} enableDamping dampingFactor={.12}/></>;}
export default function ThreeStage(props:{state:ResolvedState;selection:string|null;onSelect:(id:string|null)=>void;flat:boolean;reset:number;onLost:()=>void}) {return <Canvas shadows frameloop="demand" dpr={[1,1.5]} camera={{position:[0,6,7],fov:42}} gl={{antialias:true,powerPreference:'low-power'}} style={{touchAction:'none'}}><Scene {...props}/></Canvas>;}

