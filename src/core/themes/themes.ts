export type ThemeId = 'bench' | 'mono' | 'blueprint' | 'chalkboard' | 'neon' | 'observatory' | 'contrast';
export interface Theme { id: ThemeId; name: string; paper: string; surface: string; ink: string; muted: string; rule: string; mat: string; accent: string; glow: string; }
export const themes: Theme[] = [
  {id:'bench',name:'Bench',paper:'#F5F7F6',surface:'#FFFFFF',ink:'#10201C',muted:'#5C6B65',rule:'#DCE3DF',mat:'#1F7A6B',accent:'#2F6BFF',glow:'#FFE066'},
  {id:'blueprint',name:'Blueprint',paper:'#101F3E',surface:'#172B50',ink:'#F2F7FF',muted:'#AFBED8',rule:'#31476B',mat:'#183E72',accent:'#8DBBFF',glow:'#FFE066'},
];
export function applyTheme(id: ThemeId) { const theme = themes.find(t => t.id === id) ?? themes[0]; Object.entries(theme).forEach(([key, value]) => document.documentElement.style.setProperty(`--${key}`, value)); document.documentElement.dataset.theme = theme.id; }
