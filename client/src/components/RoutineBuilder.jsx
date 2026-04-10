import { useState, useEffect, useRef } from 'react';

const DAY_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#ec4899', '#14b8a6',
];

const emptyDay = () => ({ name: '', exercises: [] });
const emptyExercise = () => ({ exercise: '', sets: 3, reps: 10, weight: 0 });

export default function RoutineBuilder({ token, exercises, onLoadDay }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [builderForm, setBuilderForm] = useState({
    name: '',
    description: '',
    days: [{ ...emptyDay(), name: 'Day 1' }],
  });
  const [expandedRoutine, setExpandedRoutine] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchStates, setSearchStates] = useState({});
  const [saveError, setSaveError] = useState('');

  // ── Load routines ──
  const loadRoutines = () => {
    setLoading(true);
    fetch('/api/routines', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setRoutines(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (token) loadRoutines(); }, [token]);

  // ── Reset builder form ──
  const resetBuilder = () => {
    setBuilderForm({ name: '', description: '', days: [{ ...emptyDay(), name: 'Day 1' }] });
    setSearchStates({});
    setEditingRoutineId(null);
    setSaveError('');
  };

  // ── Start editing an existing routine ──
  const handleEdit = (routine) => {
    setEditingRoutineId(routine.id);
    setBuilderForm({
      name: routine.name || '',
      description: routine.description || '',
      days: (routine.days && routine.days.length > 0)
        ? routine.days.map(d => ({
            name: d.name || '',
            exercises: (d.exercises || []).map(ex => ({
              exercise: ex.exercise,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
            })),
          }))
        : [{ ...emptyDay(), name: 'Day 1' }],
    });
    setSearchStates({});
    setSaveError('');
    setShowBuilder(true);
    setExpandedRoutine(null);
  };

  // ── Save routine (create or update) ──
  const handleSave = async () => {
    setSaveError('');
    if (!builderForm.name.trim()) { setSaveError('Please enter a routine name'); return; }
    const hasExercises = builderForm.days.some(d => d.exercises.length > 0);
    if (!hasExercises) { setSaveError('Add at least one exercise to a day'); return; }
    setSaving(true);
    try {
      const url = editingRoutineId ? `/api/routines/${editingRoutineId}` : '/api/routines';
      const method = editingRoutineId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: builderForm.name.trim(),
          description: builderForm.description.trim(),
          days: builderForm.days.map(d => ({
            name: d.name.trim() || 'Untitled Day',
            exercises: d.exercises.map(ex => ({
              exercise: ex.exercise,
              sets: Number(ex.sets) || 3,
              reps: Number(ex.reps) || 10,
              weight: Number(ex.weight) || 0,
            })),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || `Save failed (${res.status})`);
        return;
      }
      setShowBuilder(false);
      resetBuilder();
      loadRoutines();
    } catch (e) {
      setSaveError('Network error — check your connection');
      console.error('Failed to save routine:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete routine ──
  const handleDelete = async (id) => {
    await fetch(`/api/routines/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteConfirm(null);
    if (expandedRoutine === id) setExpandedRoutine(null);
    if (editingRoutineId === id) {
      setShowBuilder(false);
      resetBuilder();
    }
    loadRoutines();
  };

  // ── Load day ──
  const handleLoadDay = (day) => {
    if (onLoadDay) {
      // Pass full exercise plan (name + planned sets/reps/weight) so the
      // workouts page can pre-fill sets_data from the routine.
      onLoadDay(day.exercises.map(ex => ({
        exercise: ex.exercise,
        sets: Number(ex.sets) || 0,
        reps: Number(ex.reps) || 0,
        weight: Number(ex.weight) || 0,
      })));
    }
  };

  // ── Builder form helpers ──
  const updateDay = (dayIdx, field, value) => {
    setBuilderForm(f => ({
      ...f,
      days: f.days.map((d, i) => i === dayIdx ? { ...d, [field]: value } : d),
    }));
  };

  const addDay = () => {
    setBuilderForm(f => ({
      ...f,
      days: [...f.days, { ...emptyDay(), name: `Day ${f.days.length + 1}` }],
    }));
  };

  const removeDay = (dayIdx) => {
    setBuilderForm(f => ({
      ...f,
      days: f.days.filter((_, i) => i !== dayIdx),
    }));
  };

  const addExercise = (dayIdx, exerciseName) => {
    if (!exerciseName) return;
    setBuilderForm(f => ({
      ...f,
      days: f.days.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: [...d.exercises, { ...emptyExercise(), exercise: exerciseName }] }
          : d
      ),
    }));
    setSearchStates(s => ({ ...s, [dayIdx]: '' }));
  };

  const removeExercise = (dayIdx, exIdx) => {
    setBuilderForm(f => ({
      ...f,
      days: f.days.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) }
          : d
      ),
    }));
  };

  const updateExercise = (dayIdx, exIdx, field, value) => {
    setBuilderForm(f => ({
      ...f,
      days: f.days.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              exercises: d.exercises.map((ex, j) =>
                j === exIdx ? { ...ex, [field]: value } : ex
              ),
            }
          : d
      ),
    }));
  };

  const moveExercise = (dayIdx, exIdx, direction) => {
    const newIdx = exIdx + direction;
    setBuilderForm(f => ({
      ...f,
      days: f.days.map((d, i) => {
        if (i !== dayIdx) return d;
        if (newIdx < 0 || newIdx >= d.exercises.length) return d;
        const arr = [...d.exercises];
        [arr[exIdx], arr[newIdx]] = [arr[newIdx], arr[exIdx]];
        return { ...d, exercises: arr };
      }),
    }));
  };

  // ── Exercise search for builder ──
  const getSearchValue = (dayIdx) => searchStates[dayIdx] || '';
  const setSearchValue = (dayIdx, val) => setSearchStates(s => ({ ...s, [dayIdx]: val }));

  const getFilteredExercises = (dayIdx) => {
    const q = getSearchValue(dayIdx).toLowerCase();
    if (!q) return [];
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(q) ||
      ex.group.toLowerCase().includes(q) ||
      ex.muscles.toLowerCase().includes(q)
    ).slice(0, 8);
  };

  // ── Validity check ──
  const canSave = builderForm.name.trim() &&
    builderForm.days.some(d => d.exercises.length > 0);

  // ── Styles ──
  const s = {
    container: {
      width: '100%',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--text-primary)',
      margin: 0,
    },
    subtitle: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 4,
    },
    btnPrimary: {
      background: 'var(--accent)',
      color: '#fff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: 10,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    btnSecondary: {
      background: 'var(--bg-input)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
      padding: '10px 20px',
      borderRadius: 10,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnDanger: {
      background: 'var(--danger-dim, rgba(239,68,68,0.1))',
      color: 'var(--danger)',
      border: '1px solid transparent',
      padding: '6px 12px',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 12,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnEdit: {
      background: 'var(--accent-dim, rgba(34,197,94,0.1))',
      color: 'var(--accent)',
      border: '1px solid transparent',
      padding: '6px 12px',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 12,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnSmall: {
      padding: '6px 14px',
      fontSize: 13,
      borderRadius: 8,
    },
    card: {
      background: 'var(--bg-card)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      marginBottom: 16,
      transition: 'all 0.25s ease',
    },
    cardHover: {
      borderColor: 'var(--border-hover, var(--border))',
      transform: 'translateY(-1px)',
    },
    cardHeader: {
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    cardHeaderLeft: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1,
      minWidth: 0,
    },
    routineName: {
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--text-primary)',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    routineDesc: {
      fontSize: 13,
      color: 'var(--text-muted)',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    badge: {
      background: 'var(--accent-dim, rgba(34,197,94,0.1))',
      color: 'var(--accent)',
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    },
    dayCard: (colorIdx) => ({
      background: 'var(--bg-body)',
      borderRadius: 12,
      margin: '0 16px 12px',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${DAY_COLORS[colorIdx % DAY_COLORS.length]}`,
      overflow: 'hidden',
    }),
    dayHeader: {
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayName: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    exerciseRow: {
      padding: '8px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid var(--border)',
      fontSize: 13,
    },
    exerciseLabel: {
      color: 'var(--text-primary)',
      fontWeight: 500,
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    exerciseDetail: {
      color: 'var(--text-muted)',
      fontSize: 12,
      whiteSpace: 'nowrap',
      marginLeft: 12,
    },
    loadDayBtn: {
      background: 'var(--accent)',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'all 0.2s',
      width: '100%',
      margin: '0 16px 16px',
      maxWidth: 'calc(100% - 32px)',
    },
    expandIcon: (isExpanded) => ({
      color: 'var(--text-muted)',
      fontSize: 14,
      transition: 'transform 0.3s ease',
      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0,
      marginLeft: 12,
    }),
    expandContent: (isExpanded) => ({
      maxHeight: isExpanded ? 2000 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.4s ease',
      paddingTop: isExpanded ? 4 : 0,
      paddingBottom: isExpanded ? 4 : 0,
    }),
    // Builder styles
    formCard: {
      background: 'var(--bg-card)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      padding: 24,
      marginBottom: 16,
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      background: 'var(--bg-input)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      fontSize: 14,
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      background: 'var(--bg-input)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      fontSize: 14,
      outline: 'none',
      resize: 'vertical',
      minHeight: 60,
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box',
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      marginBottom: 6,
      display: 'block',
    },
    formGroup: {
      marginBottom: 16,
    },
    builderDayCard: (colorIdx) => ({
      background: 'var(--bg-body)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${DAY_COLORS[colorIdx % DAY_COLORS.length]}`,
      padding: 16,
      marginBottom: 12,
    }),
    builderDayHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    exerciseBuilder: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
    },
    exOrderBadge: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: 'var(--accent-dim, rgba(34,197,94,0.1))',
      color: 'var(--accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0,
    },
    exName: {
      flex: 1,
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      minWidth: 100,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    miniInput: {
      width: 56,
      padding: '6px 8px',
      background: 'var(--bg-input)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      fontSize: 13,
      textAlign: 'center',
      outline: 'none',
      boxSizing: 'border-box',
    },
    miniLabel: {
      fontSize: 10,
      color: 'var(--text-muted)',
      textAlign: 'center',
      marginTop: 2,
    },
    miniGroup: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    searchDropdown: {
      position: 'relative',
      width: '100%',
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      boxShadow: 'var(--shadow)',
      zIndex: 100,
      maxHeight: 240,
      overflowY: 'auto',
      marginTop: 4,
    },
    dropdownItem: {
      padding: '10px 14px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.15s',
      borderBottom: '1px solid var(--border)',
      fontSize: 13,
    },
    dropdownExName: {
      fontWeight: 500,
      color: 'var(--text-primary)',
    },
    dropdownExGroup: {
      fontSize: 11,
      color: 'var(--text-muted)',
      background: 'var(--bg-body)',
      padding: '2px 8px',
      borderRadius: 10,
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
      opacity: 0.5,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--text-primary)',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: 'var(--text-muted)',
      lineHeight: 1.6,
      maxWidth: 320,
      margin: '0 auto',
    },
    moveBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      padding: '2px 4px',
      fontSize: 14,
      lineHeight: 1,
      transition: 'color 0.15s',
    },
    deleteConfirmOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    deleteConfirmCard: {
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: 24,
      maxWidth: 360,
      width: '90%',
      boxShadow: 'var(--shadow)',
      textAlign: 'center',
    },
    cardHeaderActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    skeleton: {
      borderRadius: 16,
      height: 80,
      background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%)',
      backgroundSize: '200px 100%',
      animation: 'shimmer 1.5s infinite',
      marginBottom: 16,
    },
  };

  // ── Render ──
  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>My Routines</h2>
          <p style={s.subtitle}>
            {routines.length > 0
              ? `${routines.length} routine${routines.length !== 1 ? 's' : ''} saved`
              : 'Build your perfect split'}
          </p>
        </div>
        <button
          style={s.btnPrimary}
          onClick={() => {
            if (showBuilder) {
              setShowBuilder(false);
              resetBuilder();
            } else {
              resetBuilder();
              setShowBuilder(true);
            }
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {showBuilder ? 'Cancel' : '+ Create Routine'}
        </button>
      </div>

      {/* ── Builder Form ── */}
      {showBuilder && (
        <div style={s.formCard}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
            {editingRoutineId ? 'Edit Routine' : 'New Routine'}
          </h3>

          {/* Name */}
          <div style={s.formGroup}>
            <label style={s.label}>Routine Name *</label>
            <input
              style={s.input}
              type="text"
              placeholder="e.g. My PPL Split"
              value={builderForm.name}
              onChange={e => setBuilderForm(f => ({ ...f, name: e.target.value }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Description */}
          <div style={s.formGroup}>
            <label style={s.label}>Description</label>
            <textarea
              style={s.textarea}
              placeholder="Optional description for this routine..."
              value={builderForm.description}
              onChange={e => setBuilderForm(f => ({ ...f, description: e.target.value }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Days */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>
                Days ({builderForm.days.length})
              </label>
              <button
                style={{ ...s.btnPrimary, ...s.btnSmall }}
                onClick={addDay}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                + Add Day
              </button>
            </div>

            {builderForm.days.map((day, dayIdx) => (
              <div key={dayIdx} style={s.builderDayCard(dayIdx)}>
                {/* Day header */}
                <div style={s.builderDayHeader}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: DAY_COLORS[dayIdx % DAY_COLORS.length],
                    flexShrink: 0,
                  }} />
                  <input
                    style={{ ...s.input, flex: 1 }}
                    type="text"
                    placeholder={`Day ${dayIdx + 1} name`}
                    value={day.name}
                    onChange={e => updateDay(dayIdx, 'name', e.target.value)}
                    onFocus={e => e.target.style.borderColor = DAY_COLORS[dayIdx % DAY_COLORS.length]}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  {builderForm.days.length > 1 && (
                    <button
                      style={s.btnDanger}
                      onClick={() => removeDay(dayIdx)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-dim, rgba(239,68,68,0.1))'}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Exercise list */}
                {day.exercises.map((ex, exIdx) => (
                  <div key={exIdx} style={s.exerciseBuilder}>
                    <span style={s.exOrderBadge}>{exIdx + 1}</span>
                    <span style={s.exName} title={ex.exercise}>{ex.exercise}</span>
                    <div style={s.miniGroup}>
                      <input
                        style={s.miniInput}
                        type="number"
                        min="1"
                        value={ex.sets}
                        onChange={e => updateExercise(dayIdx, exIdx, 'sets', e.target.value)}
                      />
                      <span style={s.miniLabel}>sets</span>
                    </div>
                    <div style={s.miniGroup}>
                      <input
                        style={s.miniInput}
                        type="number"
                        min="1"
                        value={ex.reps}
                        onChange={e => updateExercise(dayIdx, exIdx, 'reps', e.target.value)}
                      />
                      <span style={s.miniLabel}>reps</span>
                    </div>
                    <div style={s.miniGroup}>
                      <input
                        style={s.miniInput}
                        type="number"
                        min="0"
                        step="0.5"
                        value={ex.weight}
                        onChange={e => updateExercise(dayIdx, exIdx, 'weight', e.target.value)}
                      />
                      <span style={s.miniLabel}>kg</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <button
                        style={s.moveBtn}
                        onClick={() => moveExercise(dayIdx, exIdx, -1)}
                        disabled={exIdx === 0}
                        title="Move up"
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        &#9650;
                      </button>
                      <button
                        style={s.moveBtn}
                        onClick={() => moveExercise(dayIdx, exIdx, 1)}
                        disabled={exIdx === day.exercises.length - 1}
                        title="Move down"
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        &#9660;
                      </button>
                    </div>
                    <button
                      style={{ ...s.moveBtn, color: 'var(--danger)', fontSize: 16 }}
                      onClick={() => removeExercise(dayIdx, exIdx)}
                      title="Remove exercise"
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      &#10005;
                    </button>
                  </div>
                ))}

                {/* Exercise search / add */}
                <div style={{ ...s.searchDropdown, marginTop: 8 }}>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="Search exercises to add..."
                    value={getSearchValue(dayIdx)}
                    onChange={e => setSearchValue(dayIdx, e.target.value)}
                    onFocus={e => e.target.style.borderColor = DAY_COLORS[dayIdx % DAY_COLORS.length]}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border)';
                      // Delay hiding so click can register
                      setTimeout(() => {
                        if (!document.activeElement || !e.target.parentNode.contains(document.activeElement)) {
                          setSearchValue(dayIdx, '');
                        }
                      }, 200);
                    }}
                  />
                  {getSearchValue(dayIdx) && getFilteredExercises(dayIdx).length > 0 && (
                    <div style={s.dropdown}>
                      {getFilteredExercises(dayIdx).map(ex => (
                        <div
                          key={ex.name}
                          style={s.dropdownItem}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => addExercise(dayIdx, ex.name)}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={s.dropdownExName}>{ex.name}</span>
                          <span style={s.dropdownExGroup}>{ex.group}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {getSearchValue(dayIdx) && getFilteredExercises(dayIdx).length === 0 && (
                    <div style={s.dropdown}>
                      <div style={{ ...s.dropdownItem, color: 'var(--text-muted)', justifyContent: 'center', cursor: 'default' }}>
                        No exercises found
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Save error */}
          {saveError && (
            <div style={{
              padding: '0.6rem 0.8rem',
              marginBottom: 10,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 500,
            }}>
              {saveError}
            </div>
          )}

          {/* Save / Cancel */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                ...s.btnPrimary,
                flex: 1,
                justifyContent: 'center',
                opacity: canSave ? 1 : 0.5,
                cursor: canSave ? 'pointer' : 'not-allowed',
              }}
              onClick={canSave ? handleSave : undefined}
              disabled={!canSave || saving}
              onMouseEnter={e => { if (canSave) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { if (canSave) e.currentTarget.style.opacity = '1'; }}
            >
              {saving ? 'Saving...' : (editingRoutineId ? 'Update Routine' : 'Save Routine')}
            </button>
            <button
              style={s.btnSecondary}
              onClick={() => {
                setShowBuilder(false);
                resetBuilder();
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div>
          {[1, 2].map(i => (
            <div key={i} style={s.skeleton} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && routines.length === 0 && !showBuilder && (
        <div style={{ ...s.formCard, ...s.emptyState }}>
          <div style={s.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <rect x="8" y="28" width="48" height="8" rx="4" fill="var(--accent)" opacity="0.2" />
              <rect x="4" y="20" width="6" height="24" rx="3" fill="var(--accent)" opacity="0.3" />
              <rect x="54" y="20" width="6" height="24" rx="3" fill="var(--accent)" opacity="0.3" />
              <rect x="2" y="24" width="10" height="4" rx="2" fill="var(--accent)" opacity="0.5" />
              <rect x="52" y="24" width="10" height="4" rx="2" fill="var(--accent)" opacity="0.5" />
              <rect x="2" y="36" width="10" height="4" rx="2" fill="var(--accent)" opacity="0.5" />
              <rect x="52" y="36" width="10" height="4" rx="2" fill="var(--accent)" opacity="0.5" />
              <circle cx="32" cy="32" r="4" fill="var(--accent)" opacity="0.6" />
            </svg>
          </div>
          <div style={s.emptyTitle}>No Routines Yet</div>
          <p style={s.emptyText}>
            Create your first workout routine to organize your training.
            Build a custom split with named days and exercises, then load
            any day directly into your session.
          </p>
          <button
            style={{ ...s.btnPrimary, margin: '20px auto 0', display: 'inline-flex' }}
            onClick={() => setShowBuilder(true)}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            + Create Your First Routine
          </button>
        </div>
      )}

      {/* ── Routine Cards ── */}
      {!loading && routines.map(routine => {
        const isExpanded = expandedRoutine === routine.id;

        return (
          <div
            key={routine.id}
            style={s.card}
            onMouseEnter={e => {
              if (!isExpanded) {
                e.currentTarget.style.borderColor = 'var(--border-hover, var(--border))';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Card Header */}
            <div
              style={s.cardHeader}
              onClick={() => setExpandedRoutine(isExpanded ? null : routine.id)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={s.cardHeaderLeft}>
                <h3 style={s.routineName}>{routine.name}</h3>
                {routine.description && (
                  <p style={s.routineDesc}>{routine.description}</p>
                )}
              </div>
              <div style={s.cardHeaderActions}>
                <span style={s.badge}>
                  {routine.days.length} day{routine.days.length !== 1 ? 's' : ''}
                </span>
                <button
                  style={s.btnEdit}
                  onClick={e => {
                    e.stopPropagation();
                    handleEdit(routine);
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-dim, rgba(34,197,94,0.1))'}
                >
                  Edit
                </button>
                <button
                  style={s.btnDanger}
                  onClick={e => {
                    e.stopPropagation();
                    setDeleteConfirm(routine.id);
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-dim, rgba(239,68,68,0.1))'}
                >
                  Delete
                </button>
                <span style={s.expandIcon(isExpanded)}>&#9660;</span>
              </div>
            </div>

            {/* Expanded Content */}
            <div style={s.expandContent(isExpanded)}>
              {isExpanded && routine.days.map((day, dayIdx) => (
                <div key={day.id} style={s.dayCard(dayIdx)}>
                  <div style={s.dayHeader}>
                    <span style={s.dayName}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: DAY_COLORS[dayIdx % DAY_COLORS.length],
                        marginRight: 8,
                      }} />
                      {day.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {day.exercises.map((ex, exIdx) => (
                    <div key={ex.id || exIdx} style={s.exerciseRow}>
                      <span style={s.exerciseLabel}>
                        <span style={{
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          marginRight: 8,
                          fontWeight: 600,
                        }}>
                          {exIdx + 1}.
                        </span>
                        {ex.exercise}
                      </span>
                      <span style={s.exerciseDetail}>
                        {ex.sets}x{ex.reps}
                        {ex.weight > 0 && ` @ ${ex.weight}kg`}
                      </span>
                    </div>
                  ))}
                  <button
                    style={s.loadDayBtn}
                    onClick={() => handleLoadDay(day)}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    Load Day
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div
          style={s.deleteConfirmOverlay}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={s.deleteConfirmCard}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                <circle cx="20" cy="20" r="18" fill="var(--danger-dim, rgba(239,68,68,0.1))" stroke="var(--danger)" strokeWidth="2" />
                <path d="M15 15L25 25M25 15L15 25" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Delete Routine?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              This will permanently delete this routine and all its days. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                style={{ ...s.btnSecondary, flex: 1 }}
                onClick={() => setDeleteConfirm(null)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
              >
                Cancel
              </button>
              <button
                style={{
                  ...s.btnDanger,
                  flex: 1,
                  padding: '10px 20px',
                  fontSize: 14,
                  borderRadius: 10,
                }}
                onClick={() => handleDelete(deleteConfirm)}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-dim, rgba(239,68,68,0.1))'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
