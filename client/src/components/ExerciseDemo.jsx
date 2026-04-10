// ExerciseDemo — CDN gym photo for each exercise, SVG anatomy fallback
import { useState } from 'react';

const CDN = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Map every Nexero exercise name → free-exercise-db folder ID
const IMAGE_MAP = {
  // ── Chest ──────────────────────────────────────────
  'Barbell Bench Press':       'Barbell_Bench_Press_-_Medium_Grip',
  'Incline Barbell Press':     'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Decline Barbell Press':     'Decline_Barbell_Bench_Press',
  'Dumbbell Bench Press':      'Dumbbell_Bench_Press',
  'Incline Dumbbell Press':    'Incline_Dumbbell_Press',
  'Decline Dumbbell Press':    'Decline_Dumbbell_Bench_Press',
  'Dumbbell Fly':              'Dumbbell_Flyes',
  'Incline Dumbbell Fly':      'Incline_Dumbbell_Flyes',
  'Cable Crossover':           'Cable_Crossover',
  'Low Cable Fly':             'Low_Cable_Crossover',
  'Pec Deck':                  'Butterfly',
  'Machine Chest Press':       'Machine_Bench_Press',
  'Smith Machine Bench Press': 'Smith_Machine_Bench_Press',
  'Push-ups':                  'Pushups',
  'Dips (Chest)':              'Dips_-_Chest_Version',
  'Landmine Press':            'Single-Arm_Linear_Jammer',
  'Svend Press':               'Svend_Press',
  'Lever Chest Press':         'Leverage_Chest_Press',
  'Lever Incline Press':       'Leverage_Incline_Chest_Press',
  'Lever Decline Press':       'Leverage_Decline_Chest_Press',
  'Lever Seated Fly':          'Butterfly',
  'Incline Cable Fly':         'Incline_Cable_Flye',

  // ── Back ───────────────────────────────────────────
  'Barbell Row':               'Bent_Over_Barbell_Row',
  'Pendlay Row':               'Bent_Over_Barbell_Row',
  'Dumbbell Row':              'One-Arm_Dumbbell_Row',
  'Chest-Supported Row':       'Lying_T-Bar_Row',
  'T-Bar Row':                 'T-Bar_Row_with_Handle',
  'Pull-ups':                  'Pullups',
  'Chin-ups':                  'Chin-Up',
  'Neutral Grip Pull-ups':     'V-Bar_Pullup',
  'Lat Pulldown':              'Wide-Grip_Lat_Pulldown',
  'Close Grip Pulldown':       'Underhand_Cable_Pulldowns',
  'Straight Arm Pulldown':     'Straight-Arm_Pulldown',
  'Seated Cable Row':          'Seated_Cable_Rows',
  'Single Arm Cable Row':      'Seated_One-arm_Cable_Pulley_Rows',
  'Machine Row':               'Leverage_Iso_Row',
  'Deadlift':                  'Barbell_Deadlift',
  'Rack Pull':                 'Rack_Pulls',
  'Inverted Row':              'Inverted_Row',
  'Meadows Row':               'One-Arm_Long_Bar_Row',
  'Seal Row':                  'Lying_Cambered_Barbell_Row',
  'Pullover (Back)':           'Straight-Arm_Dumbbell_Pullover',
  'Kettlebell Row':            'One-Arm_Kettlebell_Row',
  'Lever Row':                 'Leverage_Iso_Row',
  'Lever High Row':            'Leverage_High_Row',
  'Lever Lat Pulldown':        'Wide-Grip_Lat_Pulldown',
  'V-Bar Pulldown':            'V-Bar_Pulldown',
  'Wide Grip Lat Pulldown':    'Wide-Grip_Lat_Pulldown',
  'Cable Pullover':            'Rope_Straight-Arm_Pulldown',
  'Assisted Pull-up':          'Chin-Up',
  'Trap Bar Deadlift':         'Trap_Bar_Deadlift',

  // ── Shoulders ──────────────────────────────────────
  'Overhead Press':             'Standing_Military_Press',
  'Push Press':                 'Push_Press',
  'Dumbbell Shoulder Press':    'Dumbbell_Shoulder_Press',
  'Arnold Press':               'Arnold_Dumbbell_Press',
  'Lateral Raise':              'Side_Lateral_Raise',
  'Cable Lateral Raise':        'One-Arm_Side_Laterals',
  'Front Raise':                'Front_Dumbbell_Raise',
  'Rear Delt Fly':              'Seated_Bent-Over_Rear_Delt_Raise',
  'Face Pull':                  'Face_Pull',
  'Reverse Pec Deck':           'Reverse_Machine_Flyes',
  'Machine Shoulder Press':     'Machine_Shoulder_Military_Press',
  'Smith Machine OHP':          'Smith_Machine_Overhead_Shoulder_Press',
  'Upright Row':                'Upright_Barbell_Row',
  'Cable Rear Delt Fly':        'Cable_Rear_Delt_Fly',
  'Lu Raise':                   'Side_Laterals_to_Front_Raise',
  'Kettlebell Press':           'One-Arm_Kettlebell_Military_Press_To_The_Side',
  'Handstand Push-ups':         'Handstand_Push-Ups',
  'Band Pull-apart':            'Reverse_Flyes',
  'Lever Seated Shoulder Press': 'Leverage_Shoulder_Press',
  'Lever Lateral Raise':        'Side_Lateral_Raise',
  'Plate Front Raise':          'Standing_Front_Barbell_Raise_Over_Head',
  'Cable Y-Raise':              'Cable_Rear_Delt_Fly',

  // ── Biceps ─────────────────────────────────────────
  'Barbell Curl':              'Barbell_Curl',
  'EZ Bar Curl':               'EZ-Bar_Curl',
  'Dumbbell Curl':             'Dumbbell_Bicep_Curl',
  'Incline Dumbbell Curl':     'Incline_Dumbbell_Curl',
  'Hammer Curl':               'Hammer_Curls',
  'Concentration Curl':        'Concentration_Curls',
  'Preacher Curl':             'Preacher_Curl',
  'Cable Curl':                'Standing_Biceps_Cable_Curl',
  'Cable Hammer Curl':         'Cable_Hammer_Curls_-_Rope_Attachment',
  'Spider Curl':               'Spider_Curl',
  'Machine Curl':              'Machine_Bicep_Curl',
  'Drag Curl':                 'Drag_Curl',
  'Cross Body Curl':           'Cross_Body_Hammer_Curl',
  'Bayesian Curl':             'Standing_One-Arm_Cable_Curl',
  'Kettlebell Curl':           'Standing_Inner-Biceps_Curl',
  'Lever Preacher Curl':       'Machine_Preacher_Curls',
  'Lever Bicep Curl':          'Machine_Bicep_Curl',
  'Reverse Barbell Curl':      'Reverse_Barbell_Curl',

  // ── Triceps ────────────────────────────────────────
  'Tricep Pushdown':            'Triceps_Pushdown',
  'Rope Pushdown':              'Triceps_Pushdown_-_Rope_Attachment',
  'Overhead Cable Extension':   'Triceps_Overhead_Extension_with_Rope',
  'Skull Crushers':             'EZ-Bar_Skullcrusher',
  'Close Grip Bench Press':     'Close-Grip_Barbell_Bench_Press',
  'Dumbbell Kickback':          'Tricep_Dumbbell_Kickback',
  'Overhead Dumbbell Extension':'Standing_Dumbbell_Triceps_Extension',
  'Dips (Triceps)':             'Dips_-_Triceps_Version',
  'Diamond Push-ups':           'Push-Ups_-_Close_Triceps_Position',
  'Machine Tricep Extension':   'Machine_Triceps_Extension',
  'JM Press':                   'JM_Press',
  'Single Arm Pushdown':        'Reverse_Grip_Triceps_Pushdown',
  'French Press':               'Lying_Triceps_Press',
  'Lever Tricep Extension':     'Machine_Triceps_Extension',
  'Dip Machine':                'Dip_Machine',
  'Bench Dips':                 'Bench_Dips',

  // ── Quads ──────────────────────────────────────────
  'Barbell Back Squat':         'Barbell_Squat',
  'Front Squat':                'Front_Barbell_Squat',
  'Goblet Squat':               'Goblet_Squat',
  'Leg Press':                  'Leg_Press',
  'Hack Squat':                 'Hack_Squat',
  'Leg Extension':              'Leg_Extensions',
  'Bulgarian Split Squat':      'Bulgarian_Split_Squat',
  'Walking Lunge':              'Dumbbell_Lunges',
  'Reverse Lunge':              'Dumbbell_Rear_Lunge',
  'Smith Machine Squat':        'Smith_Machine_Squat',
  'Sissy Squat':                'Weighted_Sissy_Squat',
  'Step-ups':                   'Dumbbell_Step_Ups',
  'Kettlebell Squat':           'Goblet_Squat',
  'Belt Squat':                 'Hack_Squat',
  'Pistol Squat':               'Smith_Machine_Pistol_Squat',
  'Pendulum Squat':             'Narrow_Stance_Hack_Squats',
  'Lever Leg Extension':        'Leg_Extensions',
  'Lever Squat':                'Hack_Squat',
  'V-Squat':                    'Narrow_Stance_Hack_Squats',

  // ── Hamstrings ─────────────────────────────────────
  'Romanian Deadlift':          'Romanian_Deadlift',
  'Dumbbell Romanian Deadlift': 'Stiff-Legged_Dumbbell_Deadlift',
  'Stiff Leg Deadlift':         'Stiff-Legged_Barbell_Deadlift',
  'Lying Leg Curl':             'Lying_Leg_Curls',
  'Seated Leg Curl':            'Seated_Leg_Curl',
  'Nordic Hamstring Curl':      'Natural_Glute_Ham_Raise',
  'Good Morning':               'Good_Morning',
  'Single Leg Deadlift':        'Stiff-Legged_Dumbbell_Deadlift',
  'Kettlebell Swing':           'One-Arm_Kettlebell_Swings',
  'Cable Pull-through':         'Pull_Through',
  'Glute Ham Raise':            'Glute_Ham_Raise',
  'Lever Lying Leg Curl':       'Lying_Leg_Curls',
  'Lever Seated Leg Curl':      'Seated_Leg_Curl',

  // ── Glutes ─────────────────────────────────────────
  'Barbell Hip Thrust':         'Barbell_Hip_Thrust',
  'Dumbbell Hip Thrust':        'Barbell_Hip_Thrust',
  'Cable Kickback':             'One-Legged_Cable_Kickback',
  'Glute Bridge':               'Single_Leg_Glute_Bridge',
  'Cable Hip Abduction':        'Thigh_Abductor',
  'Hip Abduction Machine':      'Thigh_Abductor',
  'Sumo Deadlift':              'Sumo_Deadlift',
  'Frog Pump':                  'Pelvic_Tilt_Into_Bridge',
  'Smith Machine Hip Thrust':   'Smith_Machine_Hip_Raise',
  'Band Clamshell':             'Thigh_Abductor',
  'Donkey Kick':                'Rear_Leg_Raises',
  'Hip Thrust Machine':         'Barbell_Hip_Thrust',
  'Lever Hip Extension':        'One-Legged_Cable_Kickback',
  'Hip Adduction Machine':      'Thigh_Adductor',
  'Reverse Hyperextension':     'Reverse_Hyperextension',

  // ── Calves ─────────────────────────────────────────
  'Standing Calf Raise':        'Standing_Calf_Raises',
  'Seated Calf Raise':          'Seated_Calf_Raise',
  'Smith Machine Calf Raise':   'Smith_Machine_Calf_Raise',
  'Leg Press Calf Raise':       'Calf_Press_On_The_Leg_Press_Machine',
  'Single Leg Calf Raise':      'Standing_Dumbbell_Calf_Raise',
  'Dumbbell Calf Raise':        'Standing_Dumbbell_Calf_Raise',
  'Tibialis Raise':             'Rocking_Standing_Calf_Raise',
  'Lever Standing Calf Raise':  'Standing_Calf_Raises',
  'Lever Seated Calf Raise':    'Seated_Calf_Raise',

  // ── Core ───────────────────────────────────────────
  'Plank':                      'Plank',
  'Cable Crunch':               'Cable_Crunch',
  'Hanging Leg Raise':          'Hanging_Leg_Raise',
  'Hanging Knee Raise':         'Hanging_Leg_Raise',
  'Ab Wheel Rollout':           'Ab_Roller',
  'Decline Sit-ups':            'Decline_Crunch',
  'Russian Twist':              'Russian_Twist',
  'Pallof Press':               'Pallof_Press',
  'Woodchop':                   'Standing_Cable_Wood_Chop',
  'Dead Bug':                   'Dead_Bug',
  'Side Plank':                 'Side_Bridge',
  'Dragon Flag':                'Hanging_Leg_Raise',
  'Machine Crunch':             'Weighted_Crunches',
  'Bicycle Crunch':             'Air_Bike',
  'L-Sit':                      'Seated_Flat_Bench_Leg_Pull-In',
  'Suitcase Carry':             'Farmers_Walk',
  'Hyperextension':             'Hyperextensions_Back_Extensions',
  'Lever Crunch':               'Weighted_Crunches',
  "Captain's Chair Leg Raise":  'Hanging_Leg_Raise',

  // ── Forearms ───────────────────────────────────────
  'Wrist Curl':                 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench',
  'Reverse Wrist Curl':         'Palms-Down_Wrist_Curl_Over_A_Bench',
  'Reverse Curl':               'Reverse_Barbell_Curl',
  'Farmer Walk':                'Farmers_Walk',
  'Dead Hang':                  'One_Handed_Hang',
  'Plate Pinch':                'Plate_Pinch',
  'Behind-the-Back Wrist Curl': 'Standing_Palms-Up_Barbell_Behind_The_Back_Wrist_Curl',

  // ── Traps ──────────────────────────────────────────
  'Barbell Shrug':              'Barbell_Shrug',
  'Dumbbell Shrug':             'Dumbbell_Shrug',
  'Trap Bar Shrug':             'Barbell_Shrug',
  'Cable Shrug':                'Barbell_Shrug',
  'Overhead Shrug':             'Barbell_Shrug',
  'Face Pull (Traps)':          'Face_Pull',
  'Kettlebell Shrug':           'Dumbbell_Shrug',
  'Smith Machine Shrug':        'Smith_Machine_Behind_the_Back_Shrug',
  'Lever Shrug':                'Leverage_Shrug',

  // ── Cardio ─────────────────────────────────────────
  'Treadmill Run':              'Running_Treadmill',
  'Incline Walk':               'Walking_Treadmill',
  'Stairmaster':                'Stairmaster',
  'Rowing Machine':             'Rowing_Stationary',
  'Assault Bike':               'Recumbent_Bike',
  'Stationary Bike':            'Recumbent_Bike',
  'Elliptical':                 'Elliptical_Trainer',
  'Jump Rope':                  'Rope_Jumping',
  'Battle Ropes':               'Sledgehammer_Swings',
  'Box Jumps':                  'Box_Jump_Multiple_Response',
  'Burpees':                    'Star_Jump',
  'Mountain Climbers':          'Mountain_Climbers',
  'Sled Push':                  'Sled_Push',
  'Sprints':                    'Wind_Sprints',
  'Swimming':                   'Rowing_Stationary',
  'Cycling':                    'Recumbent_Bike',
};

// ── Group colors for SVG fallback ─────────────────────────────────────────────
const GROUP_COLOR = {
  Chest: '#ef4444', Back: '#22c55e', Shoulders: '#f97316', Biceps: '#6366f1',
  Triceps: '#a855f7', Quads: '#22c55e', Hamstrings: '#eab308', Glutes: '#f43f5e',
  Calves: '#14b8a6', Core: '#ef4444', Forearms: '#fb923c', Traps: '#38bdf8', Cardio: '#f97316',
};

// ── SVG Fallback: group icon ──────────────────────────────────────────────────
function FallbackIcon({ group }) {
  const color = GROUP_COLOR[group] || '#64748b';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', background: '#0a1628' }}>
      <circle cx="50" cy="28" r="12" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
      <path d="M 30,44 Q 30,38 40,36 L 60,36 Q 70,38 70,44 L 72,72 L 58,72 L 56,90 L 44,90 L 42,72 L 28,72 Z"
        fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
      <path d="M 30,44 L 14,62 M 70,44 L 86,62" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
      <text x="50" y="98" textAnchor="middle" fontSize="8" fill={color} fontFamily="Inter, system-ui, sans-serif"
        fontWeight="600" letterSpacing="1" opacity="0.6">
        {group?.toUpperCase()}
      </text>
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ExerciseDemo({ group, name, exercise }) {
  const [imgError, setImgError] = useState(false);
  const exerciseName = name || exercise;
  const imageId = IMAGE_MAP[exerciseName];

  if (!imageId || imgError) {
    return <FallbackIcon group={group} />;
  }

  return (
    <img
      src={`${CDN}/${imageId}/0.jpg`}
      alt={exerciseName}
      loading="lazy"
      onError={() => setImgError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
}
