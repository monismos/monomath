export type Domain = 'math' | 'logic' | 'stats' | 'physics' | 'code';
export type GuideId = 'moni' | 'lumi' | 'sig' | 'vex' | 'bit';
export type GuideMode = GuideId | 'auto' | 'quiet' | 'off';
export interface MascotConfig {
  id: GuideId;
  name: string;
  domain: Domain;
  body: 'bean' | 'lantern' | 'stack' | 'arrow' | 'cursor';
  color: string;
  accent: string;
  accessory: string;
}
export const cast: Record<GuideId, MascotConfig> = {
  moni: {
    id: 'moni',
    name: 'Moni',
    domain: 'math',
    body: 'bean',
    color: '#507DF2',
    accent: '#FFCD65',
    accessory: 'measuring feet',
  },
  lumi: {
    id: 'lumi',
    name: 'Lumi',
    domain: 'logic',
    body: 'lantern',
    color: '#FFB400',
    accent: '#805600',
    accessory: 'lantern handle',
  },
  sig: {
    id: 'sig',
    name: 'Sig',
    domain: 'stats',
    body: 'stack',
    color: '#E0449C',
    accent: '#FFCD65',
    accessory: 'three block body',
  },
  vex: {
    id: 'vex',
    name: 'Vex',
    domain: 'physics',
    body: 'arrow',
    color: '#FF795E',
    accent: '#507DF2',
    accessory: 'arrow tip',
  },
  bit: {
    id: 'bit',
    name: 'Bit',
    domain: 'code',
    body: 'cursor',
    color: '#A58AFF',
    accent: '#FFCD65',
    accessory: 'cursor bracket',
  },
};
const domainGuides: Record<Domain, GuideId> = {
  math: 'moni',
  logic: 'lumi',
  stats: 'sig',
  physics: 'vex',
  code: 'bit',
};
export function resolveGuide(mode: GuideMode, domain: Domain): MascotConfig | null {
  if (mode === 'off') return null;
  return cast[mode === 'auto' || mode === 'quiet' ? domainGuides[domain] : mode];
}
