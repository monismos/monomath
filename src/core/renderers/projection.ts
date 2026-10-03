import type {Vec3} from '../scene/spec';
export const worldToScreen=(pos:Vec3)=>({x:350+pos[0]*72,y:235-pos[2]*60-pos[1]*36});
