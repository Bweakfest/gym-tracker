import { useState, useEffect, useCallback } from 'react';

// A standard arithmetic calculator (digits, +, −, ×, ÷, decimal, =).
// Uses string-based accumulation and Number() for evaluation to avoid
// floating-point quirks on intermediate display.

const OPERATORS = { '+': (a, b) => a + b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => b === 0 ? NaN : a / b };

function formatDisplay(n) {
  if (n === '' || n == null) return '0';
  if (typeof n === 'number') {
    if (!Number.isFinite(n)) return 'Error';
    // trim trailing zeros, keep up to 6 decimals
    return Number(n.toFixed(6)).toString();
  }
  return String(n);
}

export default function Calculator({ initialValue = null, onApply, onClose }) {
  const [display, setDisplay] = useState(
    initialValue != null && initialValue !== '' ? String(initialValue) : '0'
  );
  const [prev, setPrev] = useState(null);       // previous operand (number)
  const [op, setOp] = useState(null);           // pending operator
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [overwrite, setOverwrite] = useState(true); // next digit replaces display

  // Prevent page scroll while open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const pressDigit = useCallback((d) => {
    setJustEvaluated(false);
    if (overwrite) {
      setDisplay(d === '.' ? '0.' : d);
      setOverwrite(false);
      return;
    }
    if (d === '.') {
      if (display.includes('.')) return;
      setDisplay(display + '.');
      return;
    }
    if (display === '0') {
      setDisplay(d);
    } else {
      if (display.length >= 14) return; // cap length
      setDisplay(display + d);
    }
  }, [display, overwrite]);

  const pressOperator = useCallback((newOp) => {
    const current = parseFloat(display);
    if (prev != null && op && !overwrite) {
      const result = OPERATORS[op](prev, current);
      setDisplay(formatDisplay(result));
      setPrev(Number.isFinite(result) ? result : 0);
    } else {
      setPrev(current);
    }
    setOp(newOp);
    setOverwrite(true);
    setJustEvaluated(false);
  }, [display, prev, op, overwrite]);

  const pressEquals = useCallback(() => {
    if (prev == null || !op) return;
    const current = parseFloat(display);
    const result = OPERATORS[op](prev, current);
    setDisplay(formatDisplay(result));
    setPrev(null);
    setOp(null);
    setOverwrite(true);
    setJustEvaluated(true);
  }, [display, prev, op]);

  const pressClear = useCallback(() => {
    setDisplay('0');
    setPrev(null);
    setOp(null);
    setOverwrite(true);
    setJustEvaluated(false);
  }, []);

  const pressBackspace = useCallback(() => {
    if (justEvaluated || overwrite) return;
    const next = display.length > 1 ? display.slice(0, -1) : '0';
    setDisplay(next === '-' ? '0' : next);
  }, [display, justEvaluated, overwrite]);

  const pressSign = useCallback(() => {
    if (display === '0') return;
    setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
  }, [display]);

  const pressPercent = useCallback(() => {
    const n = parseFloat(display);
    if (!Number.isFinite(n)) return;
    setDisplay(formatDisplay(n / 100));
    setOverwrite(true);
  }, [display]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') { pressDigit(e.key); e.preventDefault(); return; }
      if (e.key === '.') { pressDigit('.'); e.preventDefault(); return; }
      if (e.key === '+') { pressOperator('+'); e.preventDefault(); return; }
      if (e.key === '-') { pressOperator('-'); e.preventDefault(); return; }
      if (e.key === '*' || e.key === 'x' || e.key === 'X') { pressOperator('×'); e.preventDefault(); return; }
      if (e.key === '/') { pressOperator('÷'); e.preventDefault(); return; }
      if (e.key === 'Enter' || e.key === '=') { pressEquals(); e.preventDefault(); return; }
      if (e.key === 'Backspace') { pressBackspace(); e.preventDefault(); return; }
      if (e.key === 'Escape') { onClose(); e.preventDefault(); return; }
      if (e.key === '%') { pressPercent(); e.preventDefault(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pressDigit, pressOperator, pressEquals, pressBackspace, pressPercent, onClose]);

  const handleApply = () => {
    let value;
    if (prev != null && op) {
      // If the user pressed Use while an operation is pending, auto-evaluate first
      const current = parseFloat(display);
      const result = OPERATORS[op](prev, current);
      value = result;
    } else {
      value = parseFloat(display);
    }
    if (!Number.isFinite(value)) return;
    // Round to 2 decimals for weight
    const rounded = Math.round(value * 100) / 100;
    onApply(rounded);
    onClose();
  };

  return (
    <div className="calc-backdrop" onClick={onClose}>
      <div className="calc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calc-header">
          <h3>Calculator</h3>
          <button type="button" className="recipe-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="calc-display">
          {op && prev != null && (
            <div className="calc-display-history">{formatDisplay(prev)} {op}</div>
          )}
          <div className="calc-display-main">{display}</div>
        </div>

        <div className="calc-grid">
          <button type="button" className="calc-btn calc-btn-fn" onClick={pressClear}>C</button>
          <button type="button" className="calc-btn calc-btn-fn" onClick={pressSign}>+/−</button>
          <button type="button" className="calc-btn calc-btn-fn" onClick={pressPercent}>%</button>
          <button type="button" className="calc-btn calc-btn-op" onClick={() => pressOperator('÷')}>÷</button>

          <button type="button" className="calc-btn" onClick={() => pressDigit('7')}>7</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('8')}>8</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('9')}>9</button>
          <button type="button" className="calc-btn calc-btn-op" onClick={() => pressOperator('×')}>×</button>

          <button type="button" className="calc-btn" onClick={() => pressDigit('4')}>4</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('5')}>5</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('6')}>6</button>
          <button type="button" className="calc-btn calc-btn-op" onClick={() => pressOperator('-')}>−</button>

          <button type="button" className="calc-btn" onClick={() => pressDigit('1')}>1</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('2')}>2</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('3')}>3</button>
          <button type="button" className="calc-btn calc-btn-op" onClick={() => pressOperator('+')}>+</button>

          <button type="button" className="calc-btn" onClick={() => pressDigit('0')} style={{ gridColumn: 'span 2' }}>0</button>
          <button type="button" className="calc-btn" onClick={() => pressDigit('.')}>.</button>
          <button type="button" className="calc-btn calc-btn-eq" onClick={pressEquals}>=</button>
        </div>

        <div className="calc-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleApply}>
            Use {formatDisplay(parseFloat(display))}
          </button>
        </div>
      </div>
    </div>
  );
}
