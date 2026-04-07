const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Maps our exercise names to the free-exercise-db folder names
const IMAGE_MAP = {
  'Barbell Bench Press': 'Barbell_Bench_Press_-_Medium_Grip',
  'Incline DB Press': 'Incline_Dumbbell_Flyes',
  'Cable Crossover': 'Cable_Crossover',
  'Pec Deck': 'Butterfly',
  'Barbell Row': 'Bent_Over_Barbell_Row',
  'Pull-ups': 'Pullups',
  'Lat Pulldown': 'Close-Grip_Front_Lat_Pulldown',
  'Cable Row': 'Seated_Cable_Rows',
  'Barbell Squat': 'Barbell_Squat',
  'Romanian Deadlift': 'Romanian_Deadlift',
  'Leg Press': 'Leg_Press',
  'Leg Curl': 'Lying_Leg_Curls',
  'Overhead Press': 'Barbell_Shoulder_Press',
  'Lateral Raise': 'Side_Lateral_Raise',
  'Face Pull': 'Face_Pull',
  'Barbell Curl': 'Barbell_Curl',
  'Incline DB Curl': 'Alternate_Incline_Dumbbell_Curl',
  'Preacher Curl': 'Preacher_Curl',
  'Tricep Pushdown': 'Triceps_Pushdown',
  'Skull Crushers': 'EZ-Bar_Skullcrusher',
  'Overhead Extension': 'Cable_Rope_Overhead_Triceps_Extension',
  'Plank': 'Plank',
  'Cable Crunch': 'Cable_Crunch',
};

export default function ExerciseDemo({ exercise }) {
  const folder = IMAGE_MAP[exercise];
  if (!folder) return <div className="exercise-anim-placeholder">💪</div>;

  const img0 = `${IMG_BASE}/${folder}/0.jpg`;
  const img1 = `${IMG_BASE}/${folder}/1.jpg`;

  return (
    <div className="exercise-anim-images">
      <img src={img0} alt={exercise} className="exercise-img img-a" loading="lazy" />
      <img src={img1} alt={exercise} className="exercise-img img-b" loading="lazy" />
    </div>
  );
}
