import type {Ease,Entity,Vec3} from './spec';
export function easing(t:number,ease:Ease='inOut') { const x=Math.max(0,Math.min(1,t)); if(ease==='linear')return x;if(ease==='outCubic')return 1-(1-x)**3;if(ease==='outBack'){const c=1.70158;return 1+(c+1)*(x-1)**3+c*(x-1)**2;}return x<.5?2*x*x:1-(-2*x+2)**2/2; }
export function interpolateEntity(a:Entity,b:Partial<Entity>,t:number):Entity {
  const mix=(x:number,y:number)=>x+(y-x)*t;
  const vector=(x:Vec3,y:Vec3):Vec3=>x.map((v,i)=>mix(v,y[i])) as Vec3;
  const result={...a,...(t>=.5?b:{})};
  for(const key of ['pos','rot','scale','size'] as const)if(b[key])result[key]=vector(a[key]??(key==='scale'?[1,1,1]:[0,0,0]),b[key]!);
  for(const key of ['opacity','glow'] as const)if(b[key]!==undefined)result[key]=mix(a[key]??(key==='opacity'?1:0),b[key]!);
  return result;
}
