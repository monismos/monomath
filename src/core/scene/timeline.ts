import type {Entity,ResolvedState,SceneSpec} from './spec';
import { layers } from './spec';
import {easing,interpolateEntity} from './tween';
export function resolveTimeline(spec:SceneSpec,stepIndex:number,localTime=1,dialT=0):ResolvedState {
  const index=Math.max(0,Math.min(spec.steps.length-1,Math.floor(stepIndex)));
  const entities:Record<string,Entity>=Object.fromEntries(spec.entities.map(e=>[e.id,{...e,pos:[...e.pos]}]));
  let focus:string[]=[];
  for(let i=0;i<=index;i++)for(const op of spec.steps[i].ops){const t=i===index?Math.max(0,Math.min(1,localTime)):1;
    if(op.t==='add')entities[op.entity.id]={...op.entity};
    if(op.t==='remove'&&t>=1)delete entities[op.id];
    if(op.t==='tween'&&entities[op.id])entities[op.id]=interpolateEntity(entities[op.id],op.to,easing(t,op.ease));
    if(op.t==='morph'){if(entities[op.from])entities[op.from].opacity=1-t;if(entities[op.to])entities[op.to].opacity=t;}
    if(op.t==='pulse')op.ids.forEach(id=>{if(entities[id])entities[id].glow=Math.sin(t*Math.PI);});
    if(op.t==='camera')focus=op.focus;
  }
  const dial=Math.max(0,Math.min(3,dialT));const layer=Math.floor(dial);const amount=dial-layer;
  Object.keys(entities).forEach(id=>{const base=entities[id];if(!base.layers)return;const initial=spec.entities.find(entity=>entity.id===id)??base;const layered=(override:Partial<Entity>|undefined):Entity=>{const entity={...base,...override};if(override?.pos)entity.pos=base.pos.map((value,i)=>value+override.pos![i]-initial.pos[i]) as Entity['pos'];return entity;};const from=layered(base.layers[layers[layer]]);const to=layered(base.layers[layers[Math.min(3,layer+1)]]);entities[id]=interpolateEntity(from,to,amount);});
  return {entities,stepIndex:index,dialT:dial,focus};
}
