import { useState, useEffect } from 'react';

// ── Calorie estimates per minute by exercise (rough averages for ~75 kg person)
const CARDIO_CAL_PER_MIN = {
  'Treadmill Run': 10, 'Incline Walk': 6, 'Stairmaster': 9, 'Rowing Machine': 8,
  'Assault Bike': 12, 'Stationary Bike': 7, 'Elliptical': 8, 'Jump Rope': 12,
  'Battle Ropes': 10, 'Box Jumps': 10, 'Burpees': 10, 'Mountain Climbers': 8,
  'Sled Push': 10, 'Sprints': 15, 'Swimming': 8, 'Cycling': 7,
};
const STRENGTH_CAL_PER_MIN = 5;

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function WorkoutReportCard({ show, workouts, durationSeconds, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) setTimeout(() => setVisible(true), 10);
    else setVisible(false);
  }, [show]);

  if (!show) return null;

  // Split workouts
  const cardioWorkouts = workouts.filter(w => w.muscle_group === 'Cardio');
  const strengthWorkouts = workouts.filter(w => w.muscle_group !== 'Cardio');

  // Cardio stats
  let totalCardioMin = 0;
  let totalCardioCal = 0;
  cardioWorkouts.forEach(w => {
    const cd = w.sets_data?.[0];
    if (cd && cd.duration_min) {
      const min = Number(cd.duration_min) || 0;
      totalCardioMin += min;
      // Use user-entered calories, or estimate
      if (cd.calories && Number(cd.calories) > 0) {
        totalCardioCal += Number(cd.calories);
      } else {
        const rate = CARDIO_CAL_PER_MIN[w.exercise] || 8;
        totalCardioCal += Math.round(min * rate);
      }
    }
  });

  // Strength stats
  const totalVolume = strengthWorkouts.reduce((sum, w) => {
    if (w.sets_data && w.sets_data.length > 0) {
      return sum + w.sets_data.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
    }
    return sum + (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
  }, 0);

  const totalSets = strengthWorkouts.reduce((sum, w) => {
    if (w.sets_data && w.sets_data.length > 0) return sum + w.sets_data.length;
    return sum + (w.sets || 0);
  }, 0);

  // Strength calories: estimate based on session duration minus cardio time
  const strengthMinutes = Math.max(0, Math.floor(durationSeconds / 60) - totalCardioMin);
  const strengthCal = Math.round(strengthMinutes * STRENGTH_CAL_PER_MIN);
  const totalCalories = totalCardioCal + strengthCal;

  // Unique muscle groups worked
  const muscleGroups = [...new Set(strengthWorkouts.map(w => w.muscle_group).filter(Boolean))];

  return (
    <div className={`report-card-overlay ${visible ? 'visible' : ''}`} onClick={onClose}>
      <div className="report-card" onClick={e => e.stopPropagation()}>
        <div className="report-card-header">
          <h2>Workout Complete</h2>
          <p className="report-card-subtitle">Great session! Here's your summary.</p>
        </div>

        <div className="report-card-stats">
          {/* Duration */}
          <div className="report-stat-block report-stat-duration">
            <span className="report-stat-icon">&#9201;</span>
            <div className="report-stat-info">
              <span className="report-stat-value">{formatDuration(durationSeconds)}</span>
              <span className="report-stat-label">Duration</span>
            </div>
          </div>

          {/* Calories */}
          <div className="report-stat-block report-stat-calories">
            <span className="report-stat-icon">&#128293;</span>
            <div className="report-stat-info">
              <span className="report-stat-value">{totalCalories.toLocaleString()}</span>
              <span className="report-stat-label">Calories Burned</span>
            </div>
          </div>

          {/* Exercises */}
          <div className="report-stat-block report-stat-exercises">
            <span className="report-stat-icon">&#127947;</span>
            <div className="report-stat-info">
              <span className="report-stat-value">{workouts.length}</span>
              <span className="report-stat-label">Exercises</span>
            </div>
          </div>
        </div>

        {/* Breakdown sections */}
        <div className="report-card-breakdown">
          {/* Strength section */}
          {strengthWorkouts.length > 0 && (
            <div className="report-section">
              <h4 className="report-section-title">Strength</h4>
              <div className="report-section-chips">
                <span className="report-chip">{totalSets} sets</span>
                <span className="report-chip">{totalVolume.toLocaleString()} kg volume</span>
                <span className="report-chip">~{strengthCal} cal</span>
              </div>
              <div className="report-exercise-list">
                {strengthWorkouts.map(w => (
                  <div key={w.id} className="report-exercise-row">
                    <span className="report-ex-name">{w.exercise}</span>
                    <span className="report-ex-detail">
                      {w.sets_data && w.sets_data.length > 0
                        ? w.sets_data.map((s, i) => `${s.reps}x${s.weight}`).join(', ')
                        : `${w.sets}x${w.reps}@${w.weight}kg`
                      }
                    </span>
                  </div>
                ))}
              </div>
              {muscleGroups.length > 0 && (
                <div className="report-muscles-row">
                  {muscleGroups.map(g => (
                    <span key={g} className="report-muscle-chip">{g}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cardio section */}
          {cardioWorkouts.length > 0 && (
            <div className="report-section">
              <h4 className="report-section-title">Cardio</h4>
              <div className="report-section-chips">
                <span className="report-chip">{totalCardioMin} min</span>
                <span className="report-chip">~{totalCardioCal} cal</span>
              </div>
              <div className="report-exercise-list">
                {cardioWorkouts.map(w => {
                  const cd = w.sets_data?.[0] || {};
                  const parts = [`${cd.duration_min || 0}min`];
                  if (cd.distance_km) parts.push(`${cd.distance_km}km`);
                  if (cd.avg_speed) parts.push(`${cd.avg_speed}km/h`);
                  if (cd.incline) parts.push(`${cd.incline}%`);
                  if (cd.avg_heart_rate) parts.push(`${cd.avg_heart_rate}bpm avg`);
                  if (cd.calories) parts.push(`${cd.calories}cal`);
                  return (
                    <div key={w.id} className="report-exercise-row">
                      <span className="report-ex-name">{w.exercise}</span>
                      <span className="report-ex-detail">{parts.join(' · ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button className="btn-primary report-card-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
