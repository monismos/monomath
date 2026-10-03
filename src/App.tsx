import { useEffect, useState } from 'react';
import { brand } from './config/brand';
import { strings } from './config/strings';
import { useSettings } from './core/storage/settings';
import { applyTheme, themes } from './core/themes/themes';
import { Icon } from './ui/Icon';
import { Dialog } from './ui/Dialog';
import styles from './App.module.css';

const domains=[{name:'Mathematics',symbol:'∑',color:'#2F6BFF'},{name:'Logic',symbol:'∧',color:'#B27B00'},{name:'Statistics',symbol:'▥',color:'#BC327B'},{name:'Physics',symbol:'↗',color:'#D74B2E'},{name:'Programming',symbol:'{ }',color:'#7B4DFF'}];
function App() {
  const settings=useSettings();
  const [page,setPage]=useState(location.hash.slice(1)||'workshop');
  const [dialog,setDialog]=useState<'settings'|'help'|null>(null);
  const [menu,setMenu]=useState(false);
  const [parts,setParts]=useState(3);
  useEffect(()=>{applyTheme(settings.theme);document.documentElement.style.fontSize=`${settings.textSize}%`;},[settings.theme,settings.textSize]);
  useEffect(()=>{const change=()=>setPage(location.hash.slice(1)||'workshop');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  const navigate=(target:string)=>{location.hash=target;setPage(target);setMenu(false);};
  return <div className={styles.app}>
    <a className="skip-link" href="#main">Skip to workshop</a>
    <aside className={`${styles.sidebar} ${menu?styles.menuOpen:''}`} aria-label="Main navigation">
      <a href="#workshop" className={styles.wordmark} aria-label="Monomath home">m<span className={styles.logoEye}><i/></span>nomath<span className={styles.logoDot}>.</span></a>
      <div className={styles.railTag}>A little understanding. Made tangible.</div>
      <nav className={styles.nav}>
        <button className={page==='workshop'?styles.navActive:''} onClick={()=>navigate('workshop')}><Icon name="FlaskConical"/>{strings.workshop}<span className={styles.smallDot}/></button>
        <button className={page==='map'?styles.navActive:''} onClick={()=>navigate('map')}><Icon name="Network"/>{strings.map}</button>
      </nav>
      <div className={styles.railSection}>Explore a little</div>
      <div className={styles.domains}>{domains.map(domain=><div key={domain.name}><span style={{color:domain.color}}>{domain.symbol}</span>{domain.name}<Icon name="LockKeyhole" size={13}/></div>)}</div>
      <div className={styles.railCard}><div className={styles.tinyEye}>◉</div><p>Big ideas.<br/><strong>Small discoveries.</strong></p><div>Take your time. You're in the right place.</div></div>
      <div className={styles.railBottom}><button onClick={()=>setDialog('help')}><Icon name="CircleHelp"/>{strings.help}</button><button onClick={()=>setDialog('settings')}><Icon name="Settings"/>{strings.settings}</button><span><i/>{strings.local}</span></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}><button className={`${styles.iconButton} ${styles.mobileMenu}`} aria-label="Open navigation" onClick={()=>setMenu(!menu)}><Icon name="Menu"/></button><div className={styles.breadcrumb}>Your workshop <Icon name="ChevronRight" size={14}/><strong>{page==='map'?'Monomap':'Fractions'}</strong></div><div className={styles.topActions}><span className={styles.localBadge}><span/> Saved on this device</span><button className={styles.iconButton} aria-label="Switch theme" onClick={()=>settings.set({theme:settings.theme==='bench'?'blueprint':'bench'})}><Icon name={settings.theme==='bench'?'Moon':'Sun'}/></button><button className={styles.avatar} aria-label="Open settings" onClick={()=>setDialog('settings')}>A</button></div></header>
      <main id="main" className={styles.main}>
      {page==='map'?<><div className={styles.pageTitle}><div><h1>Your Monomap</h1><p>One small discovery leads to another.</p></div></div><div className={styles.foundationMap}><div className={styles.mapLine}/>{domains.map((domain,index)=><div key={domain.name} style={{transform:`translate(${index%2?100:-100}px, 0)`}}><span style={{color:domain.color}}>{domain.symbol}</span><h3>{domain.name}</h3><p>Coming soon</p></div>)}</div></>:<>
      <div className={styles.pageTitle}><div><div className={styles.topicLabel}><span>◒</span> Mathematics <Icon name="ChevronRight" size={13}/> Parts of a whole</div><h1>Small pieces. Big picture.</h1><p>Start with something you can see. Let the symbols follow.</p></div><span className={styles.demoBadge}><Icon name="Sparkles" size={15}/> Live demo</span></div>
      <div className={styles.foundationBench} aria-label="Interactive fraction demo"><div className={styles.stageTop}><span><i/> Your workbench</span><span>One whole, four equal pieces</span></div><svg viewBox="0 0 700 370" role="img" aria-label={`${parts} out of 4 pieces shaded`}><defs><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity=".16"/></filter></defs><g transform="translate(350 175)" filter="url(#shadow)">{Array.from({length:4},(_,i)=>{const a=i*Math.PI/2;const b=(i+1)*Math.PI/2;return <path key={i} d={`M 0 0 L ${120*Math.cos(a)} ${120*Math.sin(a)} A 120 120 0 0 1 ${120*Math.cos(b)} ${120*Math.sin(b)} Z`} fill={i<parts?'#FFE066':'#D4E7DF'} stroke="#1F7A6B" strokeWidth="5"/>;})}</g><text x="350" y="340" textAnchor="middle" fill="white" fontFamily="Bricolage Grotesque" fontSize="32">{parts}/4</text></svg><div className={styles.demoControl}><label htmlFor="parts">How much of the whole?</label><input id="parts" type="range" min="0" max="4" step="1" value={parts} onChange={e=>setParts(Number(e.target.value))}/><span>{parts} of 4 pieces</span></div></div>
      <div className={styles.benchFoot}><span><Icon name="Eye" size={16}/> See it. Touch it. Then read it.</span><span>Made for curious minds.</span></div>
      </>}
      </main>
      <footer className={styles.footer}><span>One idea. Many ways to see it.</span><span>Made with care by {brand.creator}<span className={styles.footerDot}>✳</span></span></footer>
    </div>
    {dialog==='settings'&&<Dialog title="Make yourself at home" onClose={()=>setDialog(null)}><div className={styles.settingGroup}><h3>Your bench</h3><div className={styles.themeOptions}>{themes.map(theme=><button key={theme.id} aria-pressed={settings.theme===theme.id} onClick={()=>settings.set({theme:theme.id})}><span style={{background:theme.mat}}/>{theme.name}{settings.theme===theme.id&&<Icon name="Check" size={16}/>}</button>)}</div></div><label className={styles.settingRow}>Text size<select value={settings.textSize} onChange={e=>settings.set({textSize:Number(e.target.value)})}><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option></select></label><p className={styles.privacy}><Icon name="LockKeyhole" size={16}/> No accounts. No tracking. Everything stays here.</p></Dialog>}
    {dialog==='help'&&<Dialog title="Welcome to your workshop" onClose={()=>setDialog(null)}><p>Move the slider to shade equal pieces of a whole. Three pieces out of four means three quarters.</p><p>Use Tab to reach controls and arrow keys to move a slider. Switch themes in Settings. Your preferences are saved on this device.</p><p>The other labs are marked Coming soon while they are being built.</p></Dialog>}
  </div>;
}
export default App;
