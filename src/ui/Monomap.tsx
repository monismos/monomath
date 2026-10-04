import { Icon } from './Icon';
import { features } from '../config/features';
import styles from './Monomap.module.css';
const labs = [
  ['fractions', 'Fractions', 'Mathematics', '◒'],
  ['sets', 'Sets', 'Mathematics', '∪'],
  ['logic', 'Truth Lanterns', 'Logic', '∧'],
  ['summation', 'Σ Summation', 'Statistics', '∑'],
  ['matrices', 'Matrices', 'Mathematics', '▦'],
  ['functions', 'Functions and graphs', 'Mathematics', 'ƒ'],
  ['distributions', 'Distributions and Galton', 'Statistics', '▥'],
  ['kinematics', 'Kinematics', 'Physics', '↗'],
  ['memory', 'Memory, types and control flow', 'Programming', '{ }'],
  ['algorithms', 'Algorithms and recursion', 'Programming', '↺'],
];
export default function Monomap() {
  return (
    <section className={styles.map} aria-labelledby="monomap-title">
      <header>
        <h1 id="monomap-title">Your Monomap</h1>
        <p>
          One small discovery leads to another. Completed labs open here as they pass their quality
          gates.
        </p>
      </header>
      <div className={styles.gems}>
        {labs.map(([id, title, domain, symbol]) => (
          <button
            key={id}
            disabled={id !== 'fractions' || !features.fractions}
            onClick={() => {
              location.hash = 'fractions';
            }}
            aria-label={`${title}: ${id === 'fractions' ? 'Open lab' : 'Coming soon'}`}
          >
            <span className={styles.gem}>{symbol}</span>
            <span>
              <small>{domain}</small>
              <strong>{title}</strong>
              <em>{id === 'fractions' ? 'Open lab' : 'Coming soon'}</em>
            </span>
            <Icon name={id === 'fractions' ? 'ArrowRight' : 'LockKeyhole'} size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}
