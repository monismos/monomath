import {describe,it,expect} from 'vitest';
import {resolveTimeline} from './timeline';
import type {SceneSpec} from './spec';
import {demo} from '../../labs/demo';
const spec:SceneSpec={id:'test',code:'',entities:[{id:'a',kind:'block',pos:[0,0,0],color:'whole',layers:{symbol:{pos:[4,0,0],opacity:0}}}],steps:[{id:'step',title:'Move',latexAfter:'1',say:{quick:'Move',standard:'Move a block',deep:'Move the block right'},aria:'block moves',tethers:[],ops:[{t:'tween',id:'a',to:{pos:[2,0,0]}}]}]};
describe('seekable scene timeline',()=>{it('seeking forward and back resolves exactly the same state',()=>{const first=resolveTimeline(spec,0,.25,.5);resolveTimeline(spec,0,1,3);expect(resolveTimeline(spec,0,.25,.5)).toEqual(first);expect(spec.entities[0].pos).toEqual([0,0,0]);});it('interpolates between adjacent layers continuously',()=>{expect(resolveTimeline(spec,0,1,1.5).entities.a.pos[0]).toBe(4);});});
it('preserves step movement when applying a layer layout',()=>{expect(resolveTimeline(demo,1,1,0).entities['slice-3'].pos).toEqual([1,.08,1]);});
it('a pulse has a visible middle and an exact resting endpoint',()=>{expect(resolveTimeline(demo,2,.5,0).entities['slice-0'].glow).toBe(1);expect(resolveTimeline(demo,2,1,0).entities['slice-0'].glow).toBeCloseTo(0);});

