import { useState, useEffect } from 'react';

// Kg plates commonly found in gyms. Each pair adds 2 * weight to the total.
const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_OPTIONS = [
  { label: 'Barbell 20 kg', value: 20 },
  { label: 'Barbell 15 kg', value: 15 },
  { label: 'EZ Bar 10 kg', value: 10 },
  { label: 'No bar / Dumbbell', value: 0 },
];

export default function PlateCalculator({ initialBarWeight = 20, initialTotal = null, onApply, onClose }) {
  const [barWeight, setBarWeight] = useState(initialBarWeight || 20);
  const [plates, setPlates] = useState([]); // array of plate weights; each entry is ONE pair

  // Prevent page scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const total = barWeight + plates.reduce((s, p) => s + p * 2, 0);

  const addPlate = (p) => setPlates(prev => [...prev, p]);
  const removePlate = (index) => setPlates(prev => prev.filter((_, i) => i !== index));
  const clearPlates = () => setPlates([]);

  const handleApply = () => {
    onApply(total);
    onClose();
  };

  // Sort plates biggest-first for display
  const sortedPlates = [...plates].map((p, i) => ({ weight: p, originalIndex: i }))
    .sort((a, b) => b.weight - a.weight);

  return (
    <div className="plate-calc-backdrop" onClick={onClose}>
      <div className="plate-calc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plate-calc-header">
          <h3>Plate Calculator</h3>
          <button type="button" className="recipe-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Total display */}
        <div className="plate-calc-total">
          <span className="plate-calc-total-num">{total}</span>
          <span className="plate-calc-total-unit">kg</span>
        </div>
        {initialTotal != null && initialTotal !== '' && Number(initialTotal) !== total && (
          <div className="plate-calc-current">Current value: {initialTotal} kg</div>
        )}

        {/* Bar selection */}
        <div className="plate-calc-section">
          <div className="plate-calc-label">Bar</div>
          <div className="plate-calc-bar-options">
            {BAR_OPTIONS.map(b => (
              <button
                key={b.value}
                type="button"
                className={`plate-calc-bar-btn ${barWeight === b.value ? 'active' : ''}`}
                onClick={() => setBarWeight(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plate add buttons */}
        <div className="plate-calc-section">
          <div className="plate-calc-label">Add plate (one per side)</div>
          <div className="plate-calc-plate-grid">
            {DEFAULT_PLATES.map(p => (
              <button
                key={p}
                type="button"
                className="plate-calc-plate-btn"
                onClick={() => addPlate(p)}
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        {/* Loaded plates */}
        <div className="plate-calc-section">
          <div className="plate-calc-label-row">
            <span className="plate-calc-label">Loaded plates ({plates.length * 2} total)</span>
            {plates.length > 0 && (
              <button type="button" className="plate-calc-clear" onClick={clearPlates}>Clear</button>
            )}
          </div>
          {plates.length === 0 ? (
            <div className="plate-calc-empty">Tap a plate above to load it on the bar.</div>
          ) : (
            <div className="plate-calc-chips">
              {sortedPlates.map(({ weight, originalIndex }) => (
                <button
                  key={`${originalIndex}-${weight}`}
                  type="button"
                  className="plate-calc-chip"
                  onClick={() => removePlate(originalIndex)}
                  title="Tap to remove"
                >
                  {weight} kg × 2 <span className="plate-calc-chip-x">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="plate-calc-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleApply}>
            Use {total} kg
          </button>
        </div>
      </div>
    </div>
  );
}
