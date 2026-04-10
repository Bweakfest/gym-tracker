import { useState, useMemo, useRef, useEffect } from 'react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LABEL_WIDTH = 28;
const HEADER_HEIGHT = 18;
const CELL_GAP = 3;
const MIN_CELL = 11;
const MAX_CELL = 22;
const MIN_WEEKS = 10;
const MAX_WEEKS = 28;

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCellColor(volume, maxVolume) {
  if (!volume || volume === 0) return 'var(--bg-hover)';
  const ratio = volume / maxVolume;
  if (ratio <= 0.25) return 'rgba(34, 197, 94, 0.2)';
  if (ratio <= 0.5) return 'rgba(34, 197, 94, 0.4)';
  if (ratio <= 0.75) return 'rgba(34, 197, 94, 0.7)';
  return '#22c55e';
}

export default function StreakHeatmap({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width so we can scale the grid to fill it
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute weeks and cellSize to fill the available width
  const { weeks, cellSize, cellStep } = useMemo(() => {
    if (!containerWidth) {
      return { weeks: 16, cellSize: 14, cellStep: 14 + CELL_GAP };
    }
    const avail = Math.max(0, containerWidth - LABEL_WIDTH - 4);
    const targetStep = 17; // slightly chunky cells for a modern look
    let w = Math.round(avail / targetStep);
    w = Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, w));
    const step = avail / w;
    const size = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(step - CELL_GAP)));
    return { weeks: w, cellSize: size, cellStep: size + CELL_GAP };
  }, [containerWidth]);

  // Build lookup map for O(1) access by date string
  const dataMap = useMemo(() => {
    const map = new Map();
    data.forEach(d => map.set(d.date, d));
    return map;
  }, [data]);

  // Find the max volume across all entries for relative intensity
  const maxVolume = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.volume || 0), 1);
  }, [data]);

  // Generate the full grid of dates for the past N weeks
  // Grid ends at the current week's Sunday, starts N weeks before that Monday
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    // Find the Monday of the current week
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = (dayOfWeek + 6) % 7; // how many days since last Monday
    const currentMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);

    // Start from N weeks ago (Monday)
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

    // Build columns (each column = one week, Mon-Sun)
    const cols = [];
    const labels = []; // { col, label } for month headers
    let prevMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const weekDates = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        weekDates.push(date);
      }
      cols.push(weekDates);

      // Check if a new month starts in this week's Monday
      const monday = weekDates[0];
      if (monday.getMonth() !== prevMonth) {
        labels.push({ col: w, label: MONTH_NAMES[monday.getMonth()] });
        prevMonth = monday.getMonth();
      }
    }

    return { grid: cols, monthLabels: labels };
  }, [weeks]);

  const todayStr = toDateStr(new Date());
  const gridWidth = LABEL_WIDTH + weeks * cellStep;

  function handleMouseEnter(e, dateStr, entry) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      dateStr,
      count: entry ? entry.count : 0,
      volume: entry ? entry.volume : 0,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        className="streak-heatmap-scroll"
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            minWidth: gridWidth,
            position: 'relative',
          }}
        >
          {/* Month labels row */}
          <div style={{
            position: 'relative',
            paddingLeft: LABEL_WIDTH,
            height: HEADER_HEIGHT,
            marginBottom: 2,
          }}>
            {monthLabels.map((ml, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + ml.col * cellStep,
                  top: 0,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  lineHeight: '1',
                  userSelect: 'none',
                }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          {/* Grid body: day labels + cells */}
          <div style={{ display: 'flex' }}>
            {/* Day labels column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              width: LABEL_WIDTH,
              flexShrink: 0,
            }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: cellSize,
                    marginBottom: CELL_GAP,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: '1',
                    userSelect: 'none',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {grid.map((weekDates, colIdx) => (
              <div
                key={colIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {weekDates.map((date, rowIdx) => {
                  const dateStr = toDateStr(date);
                  const entry = dataMap.get(dateStr);
                  const volume = entry ? entry.volume : 0;
                  const isToday = dateStr === todayStr;
                  const isFuture = date > new Date();

                  return (
                    <div
                      key={rowIdx}
                      onMouseEnter={(e) => handleMouseEnter(e, dateStr, entry)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        marginRight: CELL_GAP,
                        marginBottom: CELL_GAP,
                        borderRadius: 3,
                        backgroundColor: isFuture
                          ? 'transparent'
                          : getCellColor(volume, maxVolume),
                        border: isToday
                          ? '1px solid var(--accent)'
                          : isFuture
                            ? '1px dashed var(--border)'
                            : '1px solid transparent',
                        cursor: isFuture ? 'default' : 'pointer',
                        transition: 'background-color 0.15s ease',
                        opacity: isFuture ? 0.3 : 1,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow)',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltip.dateStr}</div>
          {tooltip.count > 0 ? (
            <>
              <div style={{ color: 'var(--text-secondary)' }}>
                {tooltip.count} exercise{tooltip.count !== 1 ? 's' : ''}
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 500 }}>
                {tooltip.volume.toLocaleString()} kg volume
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No workout</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingLeft: LABEL_WIDTH,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: ratio === 0
                ? 'var(--bg-hover)'
                : getCellColor(ratio * maxVolume, maxVolume),
              border: '1px solid var(--border)',
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>More</span>
      </div>
    </div>
  );
}
