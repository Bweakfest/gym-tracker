import { useState, useRef, useEffect } from 'react';

const QUICK_PROMPTS = [
  'Best biceps exercises',
  'High protein recipe',
  'Volume science explained',
  'Progressive overload tips',
  'Best tricep long head exercises',
  'Build a PPL program',
];

const RESPONSES = {
  'best biceps exercises': `Top 3 science-based biceps exercises:\n\n1. **Incline Dumbbell Curl** — stretches the long head maximally. 3-4 sets of 10-15 reps.\n\n2. **Preacher Curl** — peak contraction for the short head. 3 sets of 10-12 reps.\n\n3. **Cable Curl** — constant tension through full ROM. 3 sets of 12-15 reps.\n\nTip: Train biceps 2-3x per week with 10-20 sets total for optimal growth.`,
  'high protein recipe': `**Quick Chicken & Rice Bowl** (550 cal, 48g protein)\n\n- 200g chicken breast, grilled & sliced\n- 150g cooked rice\n- 1/2 avocado, sliced\n- Handful of spinach\n- Soy sauce + sriracha to taste\n\n**Macros:** 48g protein · 45g carbs · 18g fat\n\nMeal prep tip: Cook 5 portions of chicken on Sunday for the whole week.`,
  'volume science explained': `**Training Volume Science:**\n\nVolume = Sets × Reps × Weight\n\n- **Beginner:** 10-12 sets per muscle group per week\n- **Intermediate:** 14-18 sets per muscle group per week\n- **Advanced:** 18-25+ sets per muscle group per week\n\nKey principles:\n- Progressive overload > more volume\n- Quality reps matter more than total sets\n- Deload every 4-6 weeks to manage fatigue\n- Track volume to ensure you're progressing`,
  'progressive overload tips': `**Progressive Overload Methods:**\n\n1. **Add weight** — Most direct. Add 1-2.5 kg per session for compounds.\n\n2. **Add reps** — Stay at same weight, hit top of rep range, then increase weight.\n\n3. **Add sets** — Increase weekly volume by 1-2 sets per muscle group.\n\n4. **Improve tempo** — Slow eccentrics (3-4 sec) increase time under tension.\n\n5. **Reduce rest** — Same work in less time = higher density.\n\nBest approach: Use double progression (hit target reps → increase weight).`,
  'best tricep long head exercises': `**Top Long Head Tricep Exercises:**\n\n1. **Overhead Cable Extension** — Full stretch under load. 3-4 sets of 12-15.\n\n2. **Skull Crushers (incline)** — Great stretch at bottom. 3 sets of 10-12.\n\n3. **Single-arm Overhead DB Extension** — Unilateral focus. 3 sets of 12 each arm.\n\nThe long head crosses the shoulder joint, so overhead movements stretch it maximally for better growth stimulus.`,
  'build a ppl program': `**Push/Pull/Legs Split:**\n\n**Push (Mon/Thu):**\n- Bench Press 4×6-8\n- OHP 3×8-10\n- Incline DB Press 3×10-12\n- Lateral Raises 4×12-15\n- Tricep Pushdown 3×12-15\n\n**Pull (Tue/Fri):**\n- Deadlift 3×5 (or Barbell Row 4×6-8)\n- Pull-ups 3×8-12\n- Cable Row 3×10-12\n- Face Pulls 3×15-20\n- Barbell Curl 3×10-12\n\n**Legs (Wed/Sat):**\n- Squat 4×6-8\n- RDL 3×8-10\n- Leg Press 3×10-12\n- Leg Curl 3×10-12\n- Calf Raise 4×12-15\n\nRest Sunday. Progressive overload weekly.`,
};

function getResponse(input) {
  const lower = input.toLowerCase().trim();
  for (const [key, val] of Object.entries(RESPONSES)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  // Generic helpful response
  return `Great question! Here's what I'd suggest:\n\n- Focus on compound movements for maximum efficiency\n- Aim for 0.7-1g protein per pound of bodyweight\n- Progressive overload is the #1 driver of muscle growth\n- Sleep 7-9 hours for optimal recovery\n- Track your workouts and nutrition to measure progress\n\nAsk me about specific exercises, nutrition plans, or training programs for more detailed advice!`;
}

export default function Coach() {
  const [messages, setMessages] = useState([
    { role: 'coach', text: 'Ready. Ask me anything about training, nutrition, exercises, or recipes.' }
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (text) => {
    const q = text || input;
    if (!q.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: q }, { role: 'coach', text: getResponse(q) }]);
    setInput('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>AI Coach</h1>
          <p>Your personal fitness advisor</p>
        </div>
      </div>

      <div className="coach-banner">Your personal AI Coach — all answers appear right here inside the app.</div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button key={p} className="quick-prompt-btn" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      <div className="chat-container">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="chat-role">{m.role === 'coach' ? 'AI Coach' : 'You'}</div>
            <div className="chat-text">{m.text.split('\n').map((line, j) => (
              <span key={j}>{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}<br/></span>
            ))}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="Ask your coach..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="chat-send" onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}
