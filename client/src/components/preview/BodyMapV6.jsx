import { useEffect, useRef } from 'react';

// Inline SVG so document.querySelectorAll inside the parent React tree can
// reach the muscle paths. (An <object data="...svg"> creates a separate
// document and would not be reachable.)
export default function BodyMapV6({ muscles }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.querySelectorAll('.muscle').forEach((el) => {
      el.setAttribute('fill', 'url(#muscleIdle)');
      el.removeAttribute('filter');
    });

    if (!muscles) return;

    muscles.primary?.forEach((id) => {
      const el = root.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;
      el.setAttribute('fill', 'url(#primaryGrad)');
      el.setAttribute('filter', 'url(#glow)');
    });

    muscles.secondary?.forEach((id) => {
      const el = root.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;
      el.setAttribute('fill', 'url(#secondaryGrad)');
    });
  }, [muscles]);

  return (
    <div className="body-wrapper" ref={rootRef} style={{ width: '100%', maxWidth: 900, aspectRatio: '600 / 820', maxHeight: 'calc(100vh - 100px)' }}>
      <svg viewBox="0 0 600 820" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="muscleIdle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b2a44" />
            <stop offset="100%" stopColor="#15223a" />
          </linearGradient>
          <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6a3d" />
            <stop offset="100%" stopColor="#d63f1a" />
          </linearGradient>
          <linearGradient id="secondaryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7b955" />
            <stop offset="100%" stopColor="#b8801f" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== FRONT VIEW (left) ===== */}
        <g transform="translate(0,0)">
          <text x="150" y="20" fill="#5b7099" fontSize="12" textAnchor="middle">FRONT</text>
          {/* Head */}
          <circle cx="150" cy="70" r="34" fill="#13202f" />
          {/* Neck */}
          <rect x="138" y="100" width="24" height="18" fill="#13202f" />
          {/* Torso outline */}
          <path d="M95 130 L205 130 L215 290 L195 410 L105 410 L85 290 Z" fill="#13202f" />
          {/* Legs outline */}
          <path d="M105 410 L195 410 L205 700 L165 720 L150 720 L150 430 Z" fill="#13202f" />
          <path d="M150 430 L150 720 L135 720 L95 700 L105 410 Z" fill="#13202f" />
          {/* Arms outline */}
          <path d="M85 145 L60 175 L50 320 L70 340 L90 200 Z" fill="#13202f" />
          <path d="M215 145 L240 175 L250 320 L230 340 L210 200 Z" fill="#13202f" />

          {/* MUSCLES */}
          {/* Shoulders (front delts) */}
          <ellipse id="shoulder_left" className="muscle" cx="92" cy="160" rx="22" ry="20" fill="url(#muscleIdle)" />
          <ellipse id="shoulder_right" className="muscle" cx="208" cy="160" rx="22" ry="20" fill="url(#muscleIdle)" />
          {/* Chest */}
          <path id="chest" className="muscle"
                d="M105 165 Q150 155 195 165 L198 230 Q150 250 102 230 Z"
                fill="url(#muscleIdle)" />
          {/* Biceps */}
          <ellipse id="biceps_left" className="muscle" cx="70" cy="230" rx="14" ry="32" fill="url(#muscleIdle)" />
          <ellipse id="biceps_right" className="muscle" cx="230" cy="230" rx="14" ry="32" fill="url(#muscleIdle)" />
          {/* Quads */}
          <path id="quads_left" className="muscle"
                d="M108 420 Q132 420 145 430 L150 600 Q130 610 110 600 Z"
                fill="url(#muscleIdle)" />
          <path id="quads_right" className="muscle"
                d="M150 430 Q170 420 192 420 L190 600 Q170 610 150 600 Z"
                fill="url(#muscleIdle)" />
        </g>

        {/* ===== BACK VIEW (right) ===== */}
        <g transform="translate(300,0)">
          <text x="150" y="20" fill="#5b7099" fontSize="12" textAnchor="middle">BACK</text>
          {/* Head */}
          <circle cx="150" cy="70" r="34" fill="#13202f" />
          {/* Neck */}
          <rect x="138" y="100" width="24" height="18" fill="#13202f" />
          {/* Torso outline */}
          <path d="M95 130 L205 130 L215 290 L195 410 L105 410 L85 290 Z" fill="#13202f" />
          {/* Legs outline */}
          <path d="M105 410 L195 410 L205 700 L165 720 L150 720 L150 430 Z" fill="#13202f" />
          <path d="M150 430 L150 720 L135 720 L95 700 L105 410 Z" fill="#13202f" />
          {/* Arms outline */}
          <path d="M85 145 L60 175 L50 320 L70 340 L90 200 Z" fill="#13202f" />
          <path d="M215 145 L240 175 L250 320 L230 340 L210 200 Z" fill="#13202f" />

          {/* MUSCLES */}
          {/* Lats — single shape spanning both sides of the upper back */}
          <path id="lats" className="muscle"
                d="M100 170 Q150 180 200 170 L210 290 Q150 305 90 290 Z"
                fill="url(#muscleIdle)" />
          {/* Triceps */}
          <ellipse id="triceps_left" className="muscle" cx="70" cy="230" rx="14" ry="32" fill="url(#muscleIdle)" />
          <ellipse id="triceps_right" className="muscle" cx="230" cy="230" rx="14" ry="32" fill="url(#muscleIdle)" />
          {/* Glutes */}
          <path id="glutes" className="muscle"
                d="M108 410 Q150 400 192 410 L195 470 Q150 485 105 470 Z"
                fill="url(#muscleIdle)" />
        </g>
      </svg>
    </div>
  );
}
