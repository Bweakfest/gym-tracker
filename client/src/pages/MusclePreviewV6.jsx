import { useState } from 'react';
import BodyMapV6 from '../components/preview/BodyMapV6';
import { exerciseMap } from '../lib/muscleMap';

const labelStyle = { textTransform: 'capitalize' };

export default function MusclePreviewV6() {
  const [selected, setSelected] = useState(null);
  const muscles = selected ? exerciseMap[selected] : null;

  return (
    <div style={styles.app}>
      <div style={styles.panel}>
        <h2 style={styles.h2}>Exercises</h2>
        {Object.keys(exerciseMap).map((ex) => {
          const isActive = ex === selected;
          return (
            <button
              key={ex}
              onClick={() => setSelected(ex)}
              style={{ ...styles.button, ...(isActive ? styles.buttonActive : null) }}
            >
              <span style={labelStyle}>{ex.replaceAll('_', ' ')}</span>
            </button>
          );
        })}
        <button
          onClick={() => setSelected(null)}
          style={{ ...styles.button, marginTop: 24, opacity: 0.7 }}
        >
          Reset
        </button>

        <div style={styles.legend}>
          <div style={styles.legendRow}>
            <span style={{ ...styles.swatch, background: 'linear-gradient(#ff6a3d,#d63f1a)' }} />
            <span>Primary</span>
          </div>
          <div style={styles.legendRow}>
            <span style={{ ...styles.swatch, background: 'linear-gradient(#f7b955,#b8801f)' }} />
            <span>Secondary</span>
          </div>
        </div>
      </div>

      <div style={styles.bodyWrapper}>
        <BodyMapV6 muscles={muscles} />
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    minHeight: 'calc(100vh - 60px)',
    background: '#0d1524',
    color: 'white',
    fontFamily: 'Inter, sans-serif',
  },
  panel: {
    width: 260,
    padding: 20,
    borderRight: '1px solid #1b2a44',
  },
  h2: { marginTop: 0, marginBottom: 16, fontSize: 18 },
  button: {
    width: '100%',
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    border: 'none',
    background: '#1b2a44',
    color: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 14,
  },
  buttonActive: {
    background: '#24395f',
    boxShadow: '0 0 0 2px #ff6a3d inset',
  },
  bodyWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  legend: {
    marginTop: 24,
    fontSize: 13,
    color: '#9fb0cc',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  legendRow: { display: 'flex', alignItems: 'center', gap: 10 },
  swatch: { width: 18, height: 18, borderRadius: 4, display: 'inline-block' },
};
