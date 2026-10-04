import { lazy, Suspense, useEffect, useState } from 'react';
import { brand } from './config/brand';
import { strings } from './config/strings';
import { useSettings } from './core/storage/settings';
import { applyTheme, themes } from './core/themes/themes';
import { Icon } from './ui/Icon';
import { Dialog } from './ui/Dialog';
import styles from './App.module.css';
import { useNotes } from './core/notelets/store';
const Workshop = lazy(() => import('./ui/Workshop'));
import Notelets from './ui/Notelets';
import { installAnchorIds } from './core/a11y/anchors';
import { Onboarding } from './ui/Onboarding';
import { useLesson } from './core/scene/store';
import { installProgressEvents } from './core/integration/progressEvents';
import { restoreNoteContext } from './core/notelets/context';
import Progress from './ui/Progress';
import { useGame } from './core/gamification/store';
import { LabBoundary } from './ui/LabBoundary';
const Echoes = lazy(() => import('./ui/Echoes'));
const TrophyShelf = lazy(() => import('./ui/TrophyShelf'));
const Philosophy = lazy(() => import('./ui/Philosophy'));
const EquationWorkspace = lazy(() => import('./ui/EquationWorkspace'));
const FractionLab = lazy(() => import('./ui/FractionLab'));
const Monomap = lazy(() => import('./ui/Monomap'));

const domains = [
  { name: 'Mathematics', symbol: '∑', color: '#2F6BFF' },
  { name: 'Logic', symbol: '∧', color: '#B27B00' },
  { name: 'Statistics', symbol: '▥', color: '#BC327B' },
  { name: 'Physics', symbol: '↗', color: '#D74B2E' },
  { name: 'Programming', symbol: '{ }', color: '#7B4DFF' },
];
function App() {
  const settings = useSettings();
  const xp = useGame((state) => state.xp);
  useEffect(installAnchorIds, []);
  useEffect(installProgressEvents, []);
  const notelets = useNotes();
  useEffect(() => {
    const restore = (event: Event) => {
      const screen = (event as CustomEvent<{ screen: string }>).detail.screen;
      if (screen === 'settings' || screen === 'help') setDialog(screen);
      if (screen === 'summary') useNotes.getState().set({ summary: true });
    };
    window.addEventListener('monomath:context', restore);
    return () => window.removeEventListener('monomath:context', restore);
  }, []);
  const [page, setPage] = useState(location.hash.slice(1) || 'workshop');
  const [dialog, setDialog] = useState<'settings' | 'help' | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    applyTheme(settings.theme);
    document.documentElement.style.fontSize = `${settings.textSize}%`;
  }, [settings.theme, settings.textSize]);
  useEffect(() => {
    const change = () => setPage(location.hash.slice(1) || 'workshop');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const navigate = (target: string) => {
    location.hash = target;
    setPage(target);
    setMenu(false);
  };
  return (
    <div className={styles.app}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to workshop
      </a>
      <aside
        className={`${styles.sidebar} ${menu ? styles.menuOpen : ''}`}
        aria-label="Main navigation"
      >
        <a href="#workshop" className={styles.wordmark} aria-label="Monomath home">
          m
          <span className={styles.logoEye}>
            <i />
          </span>
          nomath<span className={styles.logoDot}>.</span>
        </a>
        <div className={styles.railTag}>A little understanding. Made tangible.</div>
        <nav className={styles.nav}>
          <button
            className={page === 'workshop' ? styles.navActive : ''}
            onClick={() => navigate('workshop')}
          >
            <Icon name="FlaskConical" />
            {strings.workshop}
            <span className={styles.smallDot} />
          </button>
          <button
            className={page === 'map' ? styles.navActive : ''}
            onClick={() => navigate('map')}
          >
            <Icon name="Network" />
            {strings.map}
          </button>
          <button onClick={() => notelets.set({ summary: true })}>
            <Icon name="StickyNote" />
            {strings.notes}
            {notelets.notes.length > 0 && <span>{notelets.notes.length}</span>}
          </button>
          <button
            onClick={() => navigate('echoes')}
            className={page === 'echoes' ? styles.navActive : ''}
          >
            <Icon name="RotateCcw" />
            Echoes
          </button>
          <button
            onClick={() => navigate('trophies')}
            className={page === 'trophies' ? styles.navActive : ''}
          >
            <Icon name="Trophy" />
            Trophy shelf
          </button>
          <button
            onClick={() => navigate('equations')}
            className={page === 'equations' ? styles.navActive : ''}
          >
            <Icon name="Grid2X2" />
            Equation workspace
          </button>
          <button
            onClick={() => navigate('philosophy')}
            className={page === 'philosophy' ? styles.navActive : ''}
          >
            <Icon name="BookOpen" />
            Philosophy
          </button>
          <button
            onClick={() => navigate('fractions')}
            className={page === 'fractions' ? styles.navActive : ''}
          >
            <Icon name="Layers" />
            Fractions lab
          </button>
        </nav>
        <div className={styles.railSection}>Explore a little</div>
        <div className={styles.domains}>
          {domains.map((domain) => (
            <div key={domain.name}>
              <span style={{ color: domain.color }}>{domain.symbol}</span>
              {domain.name}
              {domain.name !== 'Mathematics' && <Icon name="LockKeyhole" size={13} />}
            </div>
          ))}
        </div>
        <div className={styles.railCard}>
          <div className={styles.tinyEye}>◉</div>
          <p>
            Big ideas.
            <br />
            <strong>Small discoveries.</strong>
          </p>
          <div>Take your time. You're in the right place.</div>
        </div>
        <div className={styles.railBottom}>
          <button onClick={() => setDialog('help')}>
            <Icon name="CircleHelp" />
            {strings.help}
          </button>
          <button onClick={() => setDialog('settings')}>
            <Icon name="Settings" />
            {strings.settings}
          </button>
          <span>
            <i />
            {strings.local}
          </span>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={`${styles.iconButton} ${styles.mobileMenu}`}
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Icon name="Menu" />
          </button>
          <div className={styles.breadcrumb}>
            Your workshop <Icon name="ChevronRight" size={14} />
            <strong>
              {page === 'map'
                ? 'Monomap'
                : page === 'trophies'
                  ? 'Trophy shelf'
                  : page === 'echoes'
                    ? 'Echoes'
                    : page === 'philosophy'
                      ? 'Philosophy'
                      : page === 'equations'
                        ? 'Equation workspace'
                        : 'Fractions'}
            </strong>
          </div>
          <div className={styles.topActions}>
            <button
              className={styles.iconButton}
              aria-label="Add notelet"
              onClick={() => notelets.set({ place: true })}
            >
              <Icon name="Plus" />
            </button>
            <span className={styles.localBadge}>
              <span /> Saved on this device
            </span>
            <button
              className={styles.iconButton}
              aria-label="Switch theme"
              onClick={() =>
                settings.set({ theme: settings.theme === 'bench' ? 'blueprint' : 'bench' })
              }
            >
              <Icon name={settings.theme === 'bench' ? 'Moon' : 'Sun'} />
            </button>
            <button
              className={styles.avatar}
              aria-label="Open settings"
              onClick={() => setDialog('settings')}
            >
              A
            </button>
          </div>
        </header>
        <main id="main" className={styles.main} tabIndex={-1}>
          {page === 'workshop' && <Onboarding />}
          <details className={styles.progressDrawer}>
            <summary>
              <Icon name="Zap" size={15} />
              Learning progress <span>{xp} XP</span>
            </summary>
            <Progress
              onEchoes={() => navigate('echoes')}
              onTrophies={() => navigate('trophies')}
              onTask={(target) => {
                navigate('workshop');
                if (target === 'notelet') notelets.set({ place: true });
                else
                  setTimeout(
                    () =>
                      document
                        .querySelector<HTMLElement>(
                          target === 'dial' ? '#unfold-dial' : '[data-entity-id]',
                        )
                        ?.focus(),
                    100,
                  );
              }}
            />
          </details>
          <LabBoundary key={page}>
            {page === 'philosophy' ? (
              <Suspense fallback={<p>Opening your lessons…</p>}>
                <Philosophy />
              </Suspense>
            ) : page === 'equations' ? (
              <Suspense fallback={<p>Opening the graph workspace…</p>}>
                <EquationWorkspace />
              </Suspense>
            ) : page === 'fractions' ? (
              <Suspense fallback={<p>Opening Fractions…</p>}>
                <FractionLab />
              </Suspense>
            ) : page === 'echoes' ? (
              <Suspense fallback={<p>Opening your Echoes…</p>}>
                <Echoes
                  onJumpNote={(id) => {
                    const note = useNotes.getState().notes.find((n) => n.id === id);
                    if (note) restoreNoteContext(note);
                  }}
                />
              </Suspense>
            ) : page === 'trophies' ? (
              <Suspense fallback={<p>Opening your trophy shelf…</p>}>
                <TrophyShelf />
              </Suspense>
            ) : page === 'map' ? (
              <Suspense fallback={<p>Opening your Monomap…</p>}>
                <Monomap />
              </Suspense>
            ) : (
              <>
                <div className={styles.pageTitle}>
                  <div>
                    <div className={styles.topicLabel}>
                      <span>◒</span> Mathematics <Icon name="ChevronRight" size={13} /> Parts of a
                      whole
                    </div>
                    <h1>Small pieces. Big picture.</h1>
                    <p>Start with something you can see. Let the symbols follow.</p>
                  </div>
                  <span className={styles.demoBadge}>
                    <Icon name="Sparkles" size={15} /> Live demo
                  </span>
                </div>
                <Suspense
                  fallback={
                    <div className={styles.foundationBench} aria-label="Loading your workbench" />
                  }
                >
                  <Workshop />
                </Suspense>
              </>
            )}
          </LabBoundary>
        </main>
        <footer className={styles.footer}>
          <span>One idea. Many ways to see it.</span>
          <span>
            Made with care by {brand.creator}
            <span className={styles.footerDot}>✳</span>
          </span>
        </footer>
      </div>
      <Suspense fallback={null}>
        <Notelets />
      </Suspense>
      {dialog === 'settings' && (
        <Dialog title="Make yourself at home" onClose={() => setDialog(null)}>
          <div className={styles.settingGroup}>
            <h3>Your bench</h3>
            <div className={styles.themeOptions}>
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  aria-pressed={settings.theme === theme.id}
                  onClick={() => settings.set({ theme: theme.id })}
                >
                  <span style={{ background: theme.mat }} />
                  {theme.name}
                  {settings.theme === theme.id && <Icon name="Check" size={16} />}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.settingRow}>
            Text size
            <select
              value={settings.textSize}
              onChange={(e) => settings.set({ textSize: Number(e.target.value) })}
            >
              <option value="100">100%</option>
              <option value="125">125%</option>
              <option value="150">150%</option>
              <option value="200">200%</option>
            </select>
          </label>
          <label className={styles.settingRow}>
            Learner level
            <select
              value={settings.level}
              onChange={(e) => {
                const level = e.target.value as typeof settings.level;
                settings.set({ level });
                useLesson
                  .getState()
                  .set({ dial: level === 'explorer' ? 0 : level === 'scholar' ? 1 : 2 });
              }}
            >
              <option value="explorer">Explorer</option>
              <option value="scholar">Scholar</option>
              <option value="researcher">Researcher</option>
            </select>
          </label>
          <label className={styles.settingRow}>
            Your guide
            <select
              value={settings.mascot}
              onChange={(e) => settings.set({ mascot: e.target.value as typeof settings.mascot })}
            >
              {['auto', 'moni', 'lumi', 'sig', 'vex', 'bit', 'quiet', 'off'].map((value) => (
                <option key={value} value={value}>
                  {value === 'auto'
                    ? 'Choose for this subject'
                    : value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.settingRow}>
            Guide dock
            <select
              value={settings.dock}
              onChange={(e) => settings.set({ dock: e.target.value as 'left' | 'right' })}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className={styles.settingRow}>
            Soft sounds
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => settings.set({ sound: e.target.checked })}
            />
          </label>
          <label className={styles.settingRow}>
            Read guide speech
            <input
              type="checkbox"
              checked={settings.speech}
              onChange={(e) => settings.set({ speech: e.target.checked })}
            />
          </label>
          <button
            onClick={() => {
              settings.set({ tutorialComplete: false, tutorialStep: 0 });
              setDialog(null);
              navigate('workshop');
            }}
          >
            Replay workshop tour
          </button>
          <p className={styles.privacy}>
            Notelet hold: {settings.holdDuration} ms
            <input
              aria-label="Notelet hold duration"
              type="range"
              min="350"
              max="900"
              step="50"
              value={settings.holdDuration}
              onChange={(e) => settings.set({ holdDuration: Number(e.target.value) })}
            />
          </p>
          <label className={styles.settingRow}>
            Reduced motion
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => settings.set({ reducedMotion: e.target.checked })}
            />
          </label>
          <label className={styles.settingRow}>
            Flat notelet carousel
            <input
              type="checkbox"
              checked={settings.flatCarousel}
              onChange={(e) => settings.set({ flatCarousel: e.target.checked })}
            />
          </label>
          <label className={styles.settingRow}>
            Haptic feedback
            <input
              type="checkbox"
              checked={settings.haptics}
              onChange={(e) => settings.set({ haptics: e.target.checked })}
            />
          </label>
          <p className={styles.privacy}>
            <Icon name="LockKeyhole" size={16} /> No accounts. No tracking. Everything stays here.
          </p>
        </Dialog>
      )}
      {dialog === 'help' && (
        <Dialog title="Welcome to your workshop" onClose={() => setDialog(null)}>
          <p>
            Turn the Unfold Dial to move from things to shapes, symbols, and code. Select a symbol
            or a piece to see how they connect. Use the arrows to step, or Space to play.
          </p>
          <p>
            Hold anywhere for half a second to leave a notelet. Press N at a focused control, or use
            Add notelet and tap a spot. Press S to open your collection; hold Shift to peek at pins.
            Use Tab to reach controls and arrow keys to move a slider. Your notes and preferences
            stay on this device.
          </p>
          <p>
            Open the Fractions lab for worked problems and challenges. The equation workspace draws
            supported real equations; Philosophy is a place to write your own lessons. Other
            teaching labs are marked Coming soon on the Monomap.
          </p>
        </Dialog>
      )}
    </div>
  );
}
export default App;
