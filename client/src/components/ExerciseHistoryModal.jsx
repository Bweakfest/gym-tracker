import { useEffect, useState, useMemo } from 'react';
import { epley1RM, volumeFromSets } from '../utils/formulas';

export default function ExerciseHistoryModal({ exercise, token, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coachAnswer, setCoachAnswer] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachAsked, setCoachAsked] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    setLoading(true);
    fetch(`/api/workouts/history?exercise=${encodeURIComponent(exercise)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [exercise, token]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    let topWeight = 0, topDate = '', total = 0;
    let est1RM = 0;
    history.forEach(h => {
      const sets = (h.sets_data && h.sets_data.length)
        ? h.sets_data
        : [{ reps: h.reps || 0, weight: h.weight || 0 }];
      total += volumeFromSets(sets);
      sets.forEach(s => {
        const w = Number(s.weight) || 0;
        if (w > topWeight) { topWeight = w; topDate = h.date; }
        const oneRM = epley1RM(s.weight, s.reps);
        if (oneRM > est1RM) est1RM = oneRM;
      });
    });
    return {
      sessions: history.length,
      topWeight,
      totalVolume: total,
      est1RM: Math.round(est1RM * 10) / 10,
      topDate,
    };
  }, [history]);

  const chartData = useMemo(() => {
    return history.map(h => {
      const sets = (h.sets_data && h.sets_data.length)
        ? h.sets_data
        : [{ reps: h.reps || 0, weight: h.weight || 0 }];
      const vol = volumeFromSets(sets);
      const top = sets.reduce((m, x) => Math.max(m, Number(x.weight) || 0), 0);
      return { date: h.date, volume: vol, top };
    });
  }, [history]);

  const askCoach = async () => {
    setCoachLoading(true);
    setCoachAsked(true);
    try {
      const res = await fetch('/api/coach/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise }),
      });
      const data = await res.json();
      setCoachAnswer(data.reply || data.error || 'No response');
    } catch (e) {
      setCoachAnswer('Could not reach the coach. Check your connection.');
    } finally {
      setCoachLoading(false);
    }
  };

  // Chart
  const vW = 460, vH = 150, padL = 40, padR = 10, padT = 12, padB = 24;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;
  const maxVol = chartData.length ? Math.max(...chartData.map(d => d.volume)) * 1.1 || 100 : 100;

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h2>{exercise}</h2>
          <button className="history-modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <p>Loading history…</p>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <p>No sessions logged for this exercise yet.</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            {stats && (
              <div className="history-stats">
                <div className="history-stat">
                  <span className="history-stat-label">Sessions</span>
                  <span className="history-stat-value">{stats.sessions}</span>
                </div>
                <div className="history-stat">
                  <span className="history-stat-label">Top Weight</span>
                  <span className="history-stat-value">{stats.topWeight} kg</span>
                </div>
                <div className="history-stat">
                  <span className="history-stat-label">Est. 1RM</span>
                  <span className="history-stat-value">{stats.est1RM} kg</span>
                </div>
                <div className="history-stat">
                  <span className="history-stat-label">Total Volume</span>
                  <span className="history-stat-value">{stats.totalVolume.toLocaleString()} kg</span>
                </div>
              </div>
            )}

            {/* Volume chart */}
            {chartData.length >= 2 && (
              <div className="history-chart-wrap">
                <div className="history-chart-title">Volume over time</div>
                <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%">
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = padT + (plotH / 4) * i;
                    return <line key={i} x1={padL} y1={y} x2={vW - padR} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />;
                  })}
                  <polyline
                    points={chartData.map((d, i) => {
                      const x = padL + (i / Math.max(1, chartData.length - 1)) * plotW;
                      const y = padT + plotH - (d.volume / maxVol) * plotH;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {chartData.map((d, i) => {
                    const x = padL + (i / Math.max(1, chartData.length - 1)) * plotW;
                    const y = padT + plotH - (d.volume / maxVol) * plotH;
                    return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />;
                  })}
                </svg>
              </div>
            )}

            {/* Session list */}
            <div className="history-session-list">
              <div className="history-session-title">Recent Sessions</div>
              {[...history].reverse().slice(0, 15).map(h => {
                const sets = (h.sets_data && h.sets_data.length) ? h.sets_data : [{ reps: h.reps, weight: h.weight }];
                const top = sets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
                const vol = sets.reduce((s, x) => s + (Number(x.reps) || 0) * (Number(x.weight) || 0), 0);
                return (
                  <div key={h.id} className="history-session-row">
                    <span className="history-session-date">{h.date}</span>
                    <span className="history-session-sets">
                      {sets.map((s, i) => (
                        <span key={i} className="history-set-chip">{s.reps || 0}×{s.weight || 0}</span>
                      ))}
                    </span>
                    <span className="history-session-top">{top} kg</span>
                    <span className="history-session-vol">{vol.toLocaleString()} kg</span>
                  </div>
                );
              })}
            </div>

            {/* Ask coach about form */}
            <div className="history-coach-wrap">
              {!coachAsked ? (
                <button className="btn-secondary btn-sm" onClick={askCoach}>
                  🎯 Ask coach about form & technique
                </button>
              ) : coachLoading ? (
                <div className="coach-thinking">Coach is thinking…</div>
              ) : (
                <div className="history-coach-answer">
                  <div className="history-coach-title">Coach's form tips</div>
                  <p>{coachAnswer}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
