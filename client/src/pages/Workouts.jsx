import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { todayStr } from '../utils/date';
import ExerciseDemo from '../components/ExerciseDemo';
import MuscleMap from '../components/MuscleMap';
import PRCelebration from '../components/PRCelebration';
import SessionRating from '../components/SessionRating';
import { OverloadToggle, OverloadBanner } from '../components/ProgressOverload';
import OneRepMax from '../components/OneRepMax';
import RoutineBuilder from '../components/RoutineBuilder';
import ExerciseHistoryModal from '../components/ExerciseHistoryModal';
import WarmupSuggestions from '../components/WarmupSuggestions';
import { getSwapSuggestions } from '../utils/exerciseSwap';
import WorkoutReportCard from '../components/WorkoutReportCard';
import Calculator from '../components/Calculator';

// ─── Exercise Library ──────────────────────────────────────────────────────

const MUSCLE_GROUPS = ['All','Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core','Forearms','Traps','Cardio'];
const EQUIPMENT_TYPES = ['All','Barbell','Dumbbell','Cable','Machine','Bodyweight','Kettlebell','EZ Bar','Smith Machine','Band','Other'];

const EXERCISES = [
  // ── Chest ──────────────────────────────────────────
  { name: 'Barbell Bench Press',         group: 'Chest', equipment: 'Barbell',       muscles: 'Pecs, anterior deltoid, triceps' },
  { name: 'Incline Barbell Press',       group: 'Chest', equipment: 'Barbell',       muscles: 'Upper pecs, anterior delt' },
  { name: 'Decline Barbell Press',       group: 'Chest', equipment: 'Barbell',       muscles: 'Lower pecs, triceps' },
  { name: 'Dumbbell Bench Press',        group: 'Chest', equipment: 'Dumbbell',      muscles: 'Pecs, anterior deltoid' },
  { name: 'Incline Dumbbell Press',      group: 'Chest', equipment: 'Dumbbell',      muscles: 'Upper pecs, anterior delt' },
  { name: 'Decline Dumbbell Press',      group: 'Chest', equipment: 'Dumbbell',      muscles: 'Lower pecs, triceps' },
  { name: 'Dumbbell Fly',                group: 'Chest', equipment: 'Dumbbell',      muscles: 'Pectoralis major, anterior delt' },
  { name: 'Incline Dumbbell Fly',        group: 'Chest', equipment: 'Dumbbell',      muscles: 'Upper pecs, serratus' },
  { name: 'Cable Crossover',             group: 'Chest', equipment: 'Cable',         muscles: 'Pecs, serratus anterior' },
  { name: 'Low Cable Fly',               group: 'Chest', equipment: 'Cable',         muscles: 'Upper pecs, anterior delt' },
  { name: 'Pec Deck',                    group: 'Chest', equipment: 'Machine',       muscles: 'Pectoralis major' },
  { name: 'Machine Chest Press',         group: 'Chest', equipment: 'Machine',       muscles: 'Pecs, triceps, anterior delt' },
  { name: 'Smith Machine Bench Press',   group: 'Chest', equipment: 'Smith Machine', muscles: 'Pecs, anterior delt, triceps' },
  { name: 'Push-ups',                    group: 'Chest', equipment: 'Bodyweight',    muscles: 'Pecs, triceps, anterior delt' },
  { name: 'Dips (Chest)',                group: 'Chest', equipment: 'Bodyweight',    muscles: 'Lower pecs, triceps, anterior delt' },
  { name: 'Landmine Press',              group: 'Chest', equipment: 'Barbell',       muscles: 'Upper pecs, anterior delt' },
  { name: 'Svend Press',                 group: 'Chest', equipment: 'Other',         muscles: 'Inner pecs, anterior delt' },

  // ── Back ───────────────────────────────────────────
  { name: 'Barbell Row',                 group: 'Back', equipment: 'Barbell',        muscles: 'Lats, rhomboids, traps' },
  { name: 'Pendlay Row',                 group: 'Back', equipment: 'Barbell',        muscles: 'Lats, rhomboids, erectors' },
  { name: 'Dumbbell Row',                group: 'Back', equipment: 'Dumbbell',       muscles: 'Lats, rhomboids, rear delt' },
  { name: 'Chest-Supported Row',         group: 'Back', equipment: 'Dumbbell',       muscles: 'Lats, rhomboids, rear delt' },
  { name: 'T-Bar Row',                   group: 'Back', equipment: 'Barbell',        muscles: 'Lats, rhomboids, traps' },
  { name: 'Pull-ups',                    group: 'Back', equipment: 'Bodyweight',     muscles: 'Lats, biceps, rear delt' },
  { name: 'Chin-ups',                    group: 'Back', equipment: 'Bodyweight',     muscles: 'Lats, biceps, lower traps' },
  { name: 'Neutral Grip Pull-ups',       group: 'Back', equipment: 'Bodyweight',     muscles: 'Lats, brachialis, rear delt' },
  { name: 'Lat Pulldown',                group: 'Back', equipment: 'Cable',          muscles: 'Latissimus dorsi, biceps' },
  { name: 'Close Grip Pulldown',         group: 'Back', equipment: 'Cable',          muscles: 'Lats, lower traps, biceps' },
  { name: 'Straight Arm Pulldown',       group: 'Back', equipment: 'Cable',          muscles: 'Lats, teres major' },
  { name: 'Seated Cable Row',            group: 'Back', equipment: 'Cable',          muscles: 'Lats, rhomboids, traps' },
  { name: 'Single Arm Cable Row',        group: 'Back', equipment: 'Cable',          muscles: 'Lats, rhomboids, rear delt' },
  { name: 'Machine Row',                 group: 'Back', equipment: 'Machine',        muscles: 'Lats, rhomboids' },
  { name: 'Deadlift',                    group: 'Back', equipment: 'Barbell',        muscles: 'Erectors, glutes, hamstrings, traps' },
  { name: 'Rack Pull',                   group: 'Back', equipment: 'Barbell',        muscles: 'Upper back, traps, erectors' },
  { name: 'Inverted Row',                group: 'Back', equipment: 'Bodyweight',     muscles: 'Lats, rhomboids, rear delt' },
  { name: 'Meadows Row',                 group: 'Back', equipment: 'Barbell',        muscles: 'Lats, teres major, rear delt' },
  { name: 'Seal Row',                    group: 'Back', equipment: 'Barbell',        muscles: 'Lats, rhomboids, rear delt' },
  { name: 'Pullover (Back)',             group: 'Back', equipment: 'Dumbbell',       muscles: 'Lats, teres major, serratus' },
  { name: 'Kettlebell Row',              group: 'Back', equipment: 'Kettlebell',     muscles: 'Lats, rhomboids, rear delt' },

  // ── Shoulders ──────────────────────────────────────
  { name: 'Overhead Press',              group: 'Shoulders', equipment: 'Barbell',       muscles: 'Anterior delt, lateral delt, triceps' },
  { name: 'Push Press',                  group: 'Shoulders', equipment: 'Barbell',       muscles: 'Delts, triceps, upper chest' },
  { name: 'Dumbbell Shoulder Press',     group: 'Shoulders', equipment: 'Dumbbell',      muscles: 'Anterior delt, lateral delt, triceps' },
  { name: 'Arnold Press',                group: 'Shoulders', equipment: 'Dumbbell',      muscles: 'All three delt heads, triceps' },
  { name: 'Lateral Raise',               group: 'Shoulders', equipment: 'Dumbbell',      muscles: 'Lateral deltoid' },
  { name: 'Cable Lateral Raise',         group: 'Shoulders', equipment: 'Cable',         muscles: 'Lateral deltoid' },
  { name: 'Front Raise',                 group: 'Shoulders', equipment: 'Dumbbell',      muscles: 'Anterior deltoid' },
  { name: 'Rear Delt Fly',               group: 'Shoulders', equipment: 'Dumbbell',      muscles: 'Posterior deltoid, rhomboids' },
  { name: 'Face Pull',                   group: 'Shoulders', equipment: 'Cable',         muscles: 'Rear delt, rotator cuff, traps' },
  { name: 'Reverse Pec Deck',            group: 'Shoulders', equipment: 'Machine',       muscles: 'Posterior deltoid, rhomboids' },
  { name: 'Machine Shoulder Press',      group: 'Shoulders', equipment: 'Machine',       muscles: 'Anterior delt, triceps' },
  { name: 'Smith Machine OHP',           group: 'Shoulders', equipment: 'Smith Machine', muscles: 'Anterior delt, triceps' },
  { name: 'Upright Row',                 group: 'Shoulders', equipment: 'Barbell',       muscles: 'Lateral delt, traps' },
  { name: 'Cable Rear Delt Fly',         group: 'Shoulders', equipment: 'Cable',         muscles: 'Posterior deltoid' },
  { name: 'Lu Raise',                    group: 'Shoulders', equipment: 'Dumbbell',      muscles: 'Lateral delt, anterior delt' },
  { name: 'Kettlebell Press',            group: 'Shoulders', equipment: 'Kettlebell',    muscles: 'Delts, triceps, core' },
  { name: 'Handstand Push-ups',          group: 'Shoulders', equipment: 'Bodyweight',    muscles: 'Anterior delt, triceps, traps' },
  { name: 'Band Pull-apart',             group: 'Shoulders', equipment: 'Band',          muscles: 'Rear delt, rhomboids, rotator cuff' },

  // ── Biceps ─────────────────────────────────────────
  { name: 'Barbell Curl',                group: 'Biceps', equipment: 'Barbell',      muscles: 'Biceps brachii' },
  { name: 'EZ Bar Curl',                 group: 'Biceps', equipment: 'EZ Bar',       muscles: 'Biceps brachii, brachialis' },
  { name: 'Dumbbell Curl',               group: 'Biceps', equipment: 'Dumbbell',     muscles: 'Biceps brachii' },
  { name: 'Incline Dumbbell Curl',       group: 'Biceps', equipment: 'Dumbbell',     muscles: 'Long head biceps' },
  { name: 'Hammer Curl',                 group: 'Biceps', equipment: 'Dumbbell',     muscles: 'Brachialis, brachioradialis' },
  { name: 'Concentration Curl',          group: 'Biceps', equipment: 'Dumbbell',     muscles: 'Biceps brachii peak' },
  { name: 'Preacher Curl',               group: 'Biceps', equipment: 'EZ Bar',       muscles: 'Short head biceps' },
  { name: 'Cable Curl',                  group: 'Biceps', equipment: 'Cable',        muscles: 'Biceps brachii' },
  { name: 'Cable Hammer Curl',           group: 'Biceps', equipment: 'Cable',        muscles: 'Brachialis, brachioradialis' },
  { name: 'Spider Curl',                 group: 'Biceps', equipment: 'Dumbbell',     muscles: 'Short head biceps' },
  { name: 'Machine Curl',                group: 'Biceps', equipment: 'Machine',      muscles: 'Biceps brachii' },
  { name: 'Drag Curl',                   group: 'Biceps', equipment: 'Barbell',      muscles: 'Long head biceps' },
  { name: 'Cross Body Curl',             group: 'Biceps', equipment: 'Dumbbell',     muscles: 'Brachialis, biceps' },
  { name: 'Bayesian Curl',               group: 'Biceps', equipment: 'Cable',        muscles: 'Long head biceps' },
  { name: 'Kettlebell Curl',             group: 'Biceps', equipment: 'Kettlebell',   muscles: 'Biceps brachii' },

  // ── Triceps ────────────────────────────────────────
  { name: 'Tricep Pushdown',             group: 'Triceps', equipment: 'Cable',       muscles: 'Triceps lateral head' },
  { name: 'Rope Pushdown',               group: 'Triceps', equipment: 'Cable',       muscles: 'Triceps lateral & medial head' },
  { name: 'Overhead Cable Extension',    group: 'Triceps', equipment: 'Cable',       muscles: 'Triceps long head' },
  { name: 'Skull Crushers',              group: 'Triceps', equipment: 'EZ Bar',      muscles: 'Triceps long head' },
  { name: 'Close Grip Bench Press',      group: 'Triceps', equipment: 'Barbell',     muscles: 'Triceps, inner chest' },
  { name: 'Dumbbell Kickback',           group: 'Triceps', equipment: 'Dumbbell',    muscles: 'Triceps lateral head' },
  { name: 'Overhead Dumbbell Extension', group: 'Triceps', equipment: 'Dumbbell',    muscles: 'Triceps long head' },
  { name: 'Dips (Triceps)',              group: 'Triceps', equipment: 'Bodyweight',  muscles: 'Triceps, anterior delt' },
  { name: 'Diamond Push-ups',            group: 'Triceps', equipment: 'Bodyweight',  muscles: 'Triceps, inner chest' },
  { name: 'Machine Tricep Extension',    group: 'Triceps', equipment: 'Machine',     muscles: 'Triceps' },
  { name: 'JM Press',                    group: 'Triceps', equipment: 'Barbell',     muscles: 'Triceps, anterior delt' },
  { name: 'Single Arm Pushdown',         group: 'Triceps', equipment: 'Cable',       muscles: 'Triceps lateral head' },
  { name: 'French Press',                group: 'Triceps', equipment: 'EZ Bar',      muscles: 'Triceps long head' },

  // ── Quads ──────────────────────────────────────────
  { name: 'Barbell Back Squat',          group: 'Quads', equipment: 'Barbell',       muscles: 'Quads, glutes, adductors' },
  { name: 'Front Squat',                 group: 'Quads', equipment: 'Barbell',       muscles: 'Quads, core, upper back' },
  { name: 'Goblet Squat',                group: 'Quads', equipment: 'Dumbbell',      muscles: 'Quads, glutes, core' },
  { name: 'Leg Press',                   group: 'Quads', equipment: 'Machine',       muscles: 'Quads, glutes' },
  { name: 'Hack Squat',                  group: 'Quads', equipment: 'Machine',       muscles: 'Quads, glutes' },
  { name: 'Leg Extension',               group: 'Quads', equipment: 'Machine',       muscles: 'Quadriceps' },
  { name: 'Bulgarian Split Squat',       group: 'Quads', equipment: 'Dumbbell',      muscles: 'Quads, glutes, adductors' },
  { name: 'Walking Lunge',               group: 'Quads', equipment: 'Dumbbell',      muscles: 'Quads, glutes, hamstrings' },
  { name: 'Reverse Lunge',               group: 'Quads', equipment: 'Dumbbell',      muscles: 'Quads, glutes' },
  { name: 'Smith Machine Squat',         group: 'Quads', equipment: 'Smith Machine', muscles: 'Quads, glutes' },
  { name: 'Sissy Squat',                 group: 'Quads', equipment: 'Bodyweight',    muscles: 'Quadriceps, hip flexors' },
  { name: 'Step-ups',                    group: 'Quads', equipment: 'Dumbbell',      muscles: 'Quads, glutes' },
  { name: 'Kettlebell Squat',            group: 'Quads', equipment: 'Kettlebell',    muscles: 'Quads, glutes, core' },
  { name: 'Belt Squat',                  group: 'Quads', equipment: 'Machine',       muscles: 'Quads, glutes, adductors' },
  { name: 'Pistol Squat',                group: 'Quads', equipment: 'Bodyweight',    muscles: 'Quads, glutes, balance' },
  { name: 'Pendulum Squat',              group: 'Quads', equipment: 'Machine',       muscles: 'Quads, glutes' },

  // ── Hamstrings ─────────────────────────────────────
  { name: 'Romanian Deadlift',           group: 'Hamstrings', equipment: 'Barbell',  muscles: 'Hamstrings, glutes, erectors' },
  { name: 'Dumbbell Romanian Deadlift',  group: 'Hamstrings', equipment: 'Dumbbell', muscles: 'Hamstrings, glutes' },
  { name: 'Stiff Leg Deadlift',          group: 'Hamstrings', equipment: 'Barbell',  muscles: 'Hamstrings, erectors' },
  { name: 'Lying Leg Curl',              group: 'Hamstrings', equipment: 'Machine',  muscles: 'Hamstrings' },
  { name: 'Seated Leg Curl',             group: 'Hamstrings', equipment: 'Machine',  muscles: 'Hamstrings' },
  { name: 'Nordic Hamstring Curl',       group: 'Hamstrings', equipment: 'Bodyweight', muscles: 'Hamstrings' },
  { name: 'Good Morning',                group: 'Hamstrings', equipment: 'Barbell',  muscles: 'Hamstrings, erectors, glutes' },
  { name: 'Single Leg Deadlift',         group: 'Hamstrings', equipment: 'Dumbbell', muscles: 'Hamstrings, glutes, balance' },
  { name: 'Kettlebell Swing',            group: 'Hamstrings', equipment: 'Kettlebell', muscles: 'Hamstrings, glutes, erectors' },
  { name: 'Cable Pull-through',          group: 'Hamstrings', equipment: 'Cable',    muscles: 'Hamstrings, glutes' },
  { name: 'Glute Ham Raise',             group: 'Hamstrings', equipment: 'Bodyweight', muscles: 'Hamstrings, glutes, erectors' },

  // ── Glutes ─────────────────────────────────────────
  { name: 'Barbell Hip Thrust',          group: 'Glutes', equipment: 'Barbell',     muscles: 'Gluteus maximus, hamstrings' },
  { name: 'Dumbbell Hip Thrust',         group: 'Glutes', equipment: 'Dumbbell',    muscles: 'Gluteus maximus' },
  { name: 'Cable Kickback',              group: 'Glutes', equipment: 'Cable',       muscles: 'Gluteus maximus, hamstrings' },
  { name: 'Glute Bridge',                group: 'Glutes', equipment: 'Bodyweight',  muscles: 'Gluteus maximus' },
  { name: 'Cable Hip Abduction',         group: 'Glutes', equipment: 'Cable',       muscles: 'Gluteus medius, minimus' },
  { name: 'Hip Abduction Machine',       group: 'Glutes', equipment: 'Machine',     muscles: 'Gluteus medius, minimus' },
  { name: 'Sumo Deadlift',               group: 'Glutes', equipment: 'Barbell',     muscles: 'Glutes, adductors, quads' },
  { name: 'Frog Pump',                   group: 'Glutes', equipment: 'Bodyweight',  muscles: 'Gluteus maximus' },
  { name: 'Smith Machine Hip Thrust',    group: 'Glutes', equipment: 'Smith Machine', muscles: 'Gluteus maximus' },
  { name: 'Band Clamshell',              group: 'Glutes', equipment: 'Band',        muscles: 'Gluteus medius, hip rotators' },
  { name: 'Donkey Kick',                 group: 'Glutes', equipment: 'Bodyweight',  muscles: 'Gluteus maximus' },

  // ── Calves ─────────────────────────────────────────
  { name: 'Standing Calf Raise',         group: 'Calves', equipment: 'Machine',     muscles: 'Gastrocnemius' },
  { name: 'Seated Calf Raise',           group: 'Calves', equipment: 'Machine',     muscles: 'Soleus' },
  { name: 'Smith Machine Calf Raise',    group: 'Calves', equipment: 'Smith Machine', muscles: 'Gastrocnemius' },
  { name: 'Leg Press Calf Raise',        group: 'Calves', equipment: 'Machine',     muscles: 'Gastrocnemius, soleus' },
  { name: 'Single Leg Calf Raise',       group: 'Calves', equipment: 'Bodyweight',  muscles: 'Gastrocnemius, soleus' },
  { name: 'Dumbbell Calf Raise',         group: 'Calves', equipment: 'Dumbbell',    muscles: 'Gastrocnemius' },
  { name: 'Tibialis Raise',              group: 'Calves', equipment: 'Bodyweight',  muscles: 'Tibialis anterior' },

  // ── Core ───────────────────────────────────────────
  { name: 'Plank',                       group: 'Core', equipment: 'Bodyweight',    muscles: 'Transverse abdominis, erectors' },
  { name: 'Cable Crunch',                group: 'Core', equipment: 'Cable',         muscles: 'Rectus abdominis' },
  { name: 'Hanging Leg Raise',           group: 'Core', equipment: 'Bodyweight',    muscles: 'Lower abs, hip flexors' },
  { name: 'Hanging Knee Raise',          group: 'Core', equipment: 'Bodyweight',    muscles: 'Lower abs, hip flexors' },
  { name: 'Ab Wheel Rollout',            group: 'Core', equipment: 'Other',         muscles: 'Rectus abdominis, serratus' },
  { name: 'Decline Sit-ups',             group: 'Core', equipment: 'Bodyweight',    muscles: 'Rectus abdominis, hip flexors' },
  { name: 'Russian Twist',               group: 'Core', equipment: 'Bodyweight',    muscles: 'Obliques, rectus abdominis' },
  { name: 'Pallof Press',                group: 'Core', equipment: 'Cable',         muscles: 'Obliques, transverse abdominis' },
  { name: 'Woodchop',                    group: 'Core', equipment: 'Cable',         muscles: 'Obliques, serratus, core' },
  { name: 'Dead Bug',                    group: 'Core', equipment: 'Bodyweight',    muscles: 'Transverse abdominis, core' },
  { name: 'Side Plank',                  group: 'Core', equipment: 'Bodyweight',    muscles: 'Obliques, QL' },
  { name: 'Dragon Flag',                 group: 'Core', equipment: 'Bodyweight',    muscles: 'Rectus abdominis, core' },
  { name: 'Machine Crunch',              group: 'Core', equipment: 'Machine',       muscles: 'Rectus abdominis' },
  { name: 'Bicycle Crunch',              group: 'Core', equipment: 'Bodyweight',    muscles: 'Obliques, rectus abdominis' },
  { name: 'L-Sit',                       group: 'Core', equipment: 'Bodyweight',    muscles: 'Abs, hip flexors, quads' },
  { name: 'Suitcase Carry',              group: 'Core', equipment: 'Dumbbell',      muscles: 'Obliques, grip, core' },

  // ── Forearms ───────────────────────────────────────
  { name: 'Wrist Curl',                  group: 'Forearms', equipment: 'Barbell',    muscles: 'Wrist flexors' },
  { name: 'Reverse Wrist Curl',          group: 'Forearms', equipment: 'Barbell',    muscles: 'Wrist extensors' },
  { name: 'Reverse Curl',                group: 'Forearms', equipment: 'EZ Bar',     muscles: 'Brachioradialis, wrist extensors' },
  { name: 'Farmer Walk',                 group: 'Forearms', equipment: 'Dumbbell',   muscles: 'Forearms, grip, traps, core' },
  { name: 'Dead Hang',                   group: 'Forearms', equipment: 'Bodyweight', muscles: 'Grip, forearm flexors' },
  { name: 'Plate Pinch',                 group: 'Forearms', equipment: 'Other',      muscles: 'Finger flexors, thumb' },
  { name: 'Behind-the-Back Wrist Curl',  group: 'Forearms', equipment: 'Barbell',    muscles: 'Wrist flexors' },

  // ── Traps ──────────────────────────────────────────
  { name: 'Barbell Shrug',               group: 'Traps', equipment: 'Barbell',      muscles: 'Upper trapezius' },
  { name: 'Dumbbell Shrug',              group: 'Traps', equipment: 'Dumbbell',     muscles: 'Upper trapezius' },
  { name: 'Trap Bar Shrug',              group: 'Traps', equipment: 'Other',        muscles: 'Upper trapezius' },
  { name: 'Cable Shrug',                 group: 'Traps', equipment: 'Cable',        muscles: 'Upper trapezius' },
  { name: 'Overhead Shrug',              group: 'Traps', equipment: 'Barbell',      muscles: 'Lower & mid traps' },
  { name: 'Face Pull (Traps)',           group: 'Traps', equipment: 'Cable',        muscles: 'Mid traps, rear delts' },
  { name: 'Kettlebell Shrug',            group: 'Traps', equipment: 'Kettlebell',   muscles: 'Upper trapezius' },

  // ── Cardio ─────────────────────────────────────────
  { name: 'Treadmill Run',               group: 'Cardio', equipment: 'Machine',     muscles: 'Full body, cardiovascular' },
  { name: 'Incline Walk',                group: 'Cardio', equipment: 'Machine',     muscles: 'Glutes, hamstrings, cardio' },
  { name: 'Stairmaster',                 group: 'Cardio', equipment: 'Machine',     muscles: 'Quads, glutes, calves, cardio' },
  { name: 'Rowing Machine',              group: 'Cardio', equipment: 'Machine',     muscles: 'Full body, lats, cardio' },
  { name: 'Assault Bike',                group: 'Cardio', equipment: 'Machine',     muscles: 'Full body, cardiovascular' },
  { name: 'Stationary Bike',             group: 'Cardio', equipment: 'Machine',     muscles: 'Quads, hamstrings, cardio' },
  { name: 'Elliptical',                  group: 'Cardio', equipment: 'Machine',     muscles: 'Full body, low impact cardio' },
  { name: 'Jump Rope',                   group: 'Cardio', equipment: 'Other',       muscles: 'Calves, shoulders, cardio' },
  { name: 'Battle Ropes',                group: 'Cardio', equipment: 'Other',       muscles: 'Shoulders, core, cardio' },
  { name: 'Box Jumps',                   group: 'Cardio', equipment: 'Bodyweight',  muscles: 'Quads, glutes, explosive power' },
  { name: 'Burpees',                     group: 'Cardio', equipment: 'Bodyweight',  muscles: 'Full body, cardiovascular' },
  { name: 'Mountain Climbers',           group: 'Cardio', equipment: 'Bodyweight',  muscles: 'Core, shoulders, cardio' },
  { name: 'Sled Push',                   group: 'Cardio', equipment: 'Other',       muscles: 'Quads, glutes, full body' },

  // ── Lever / Machine Extras ─────────────────────────
  { name: 'Lever Chest Press',             group: 'Chest', equipment: 'Machine',       muscles: 'Pecs, triceps, anterior delt' },
  { name: 'Lever Incline Press',           group: 'Chest', equipment: 'Machine',       muscles: 'Upper pecs, anterior delt, triceps' },
  { name: 'Lever Decline Press',           group: 'Chest', equipment: 'Machine',       muscles: 'Lower pecs, triceps' },
  { name: 'Lever Seated Fly',             group: 'Chest', equipment: 'Machine',       muscles: 'Pectoralis major, anterior delt' },
  { name: 'Incline Cable Fly',            group: 'Chest', equipment: 'Cable',         muscles: 'Upper pecs, anterior delt' },
  { name: 'Lever Row',                    group: 'Back', equipment: 'Machine',        muscles: 'Lats, rhomboids, traps' },
  { name: 'Lever High Row',               group: 'Back', equipment: 'Machine',        muscles: 'Upper lats, rhomboids, rear delt' },
  { name: 'Lever Lat Pulldown',           group: 'Back', equipment: 'Machine',        muscles: 'Latissimus dorsi, biceps' },
  { name: 'V-Bar Pulldown',               group: 'Back', equipment: 'Cable',          muscles: 'Lats, biceps, brachialis' },
  { name: 'Wide Grip Lat Pulldown',       group: 'Back', equipment: 'Cable',          muscles: 'Lats, teres major' },
  { name: 'Cable Pullover',               group: 'Back', equipment: 'Cable',          muscles: 'Lats, teres major, serratus' },
  { name: 'Assisted Pull-up',             group: 'Back', equipment: 'Machine',        muscles: 'Lats, biceps, rear delt' },
  { name: 'Trap Bar Deadlift',            group: 'Back', equipment: 'Other',          muscles: 'Erectors, glutes, hamstrings, traps' },
  { name: 'Lever Seated Shoulder Press',  group: 'Shoulders', equipment: 'Machine',   muscles: 'Anterior delt, lateral delt, triceps' },
  { name: 'Lever Lateral Raise',          group: 'Shoulders', equipment: 'Machine',   muscles: 'Lateral deltoid' },
  { name: 'Plate Front Raise',            group: 'Shoulders', equipment: 'Other',     muscles: 'Anterior deltoid' },
  { name: 'Cable Y-Raise',                group: 'Shoulders', equipment: 'Cable',     muscles: 'Lateral delt, rear delt, traps' },
  { name: 'Lever Preacher Curl',          group: 'Biceps', equipment: 'Machine',      muscles: 'Biceps brachii, brachialis' },
  { name: 'Lever Bicep Curl',             group: 'Biceps', equipment: 'Machine',      muscles: 'Biceps brachii' },
  { name: 'Reverse Barbell Curl',         group: 'Biceps', equipment: 'Barbell',      muscles: 'Brachioradialis, biceps' },
  { name: 'Lever Tricep Extension',       group: 'Triceps', equipment: 'Machine',     muscles: 'Triceps' },
  { name: 'Dip Machine',                  group: 'Triceps', equipment: 'Machine',     muscles: 'Triceps, lower pecs, anterior delt' },
  { name: 'Bench Dips',                   group: 'Triceps', equipment: 'Bodyweight',  muscles: 'Triceps, anterior delt' },
  { name: 'Lever Leg Extension',          group: 'Quads', equipment: 'Machine',       muscles: 'Quadriceps' },
  { name: 'Lever Squat',                  group: 'Quads', equipment: 'Machine',       muscles: 'Quads, glutes, core' },
  { name: 'V-Squat',                      group: 'Quads', equipment: 'Machine',       muscles: 'Quads, glutes' },
  { name: 'Lever Lying Leg Curl',         group: 'Hamstrings', equipment: 'Machine',  muscles: 'Hamstrings' },
  { name: 'Lever Seated Leg Curl',        group: 'Hamstrings', equipment: 'Machine',  muscles: 'Hamstrings' },
  { name: 'Hip Thrust Machine',           group: 'Glutes', equipment: 'Machine',      muscles: 'Gluteus maximus, hamstrings' },
  { name: 'Lever Hip Extension',          group: 'Glutes', equipment: 'Machine',      muscles: 'Gluteus maximus, hamstrings' },
  { name: 'Hip Adduction Machine',        group: 'Glutes', equipment: 'Machine',      muscles: 'Adductors' },
  { name: 'Reverse Hyperextension',       group: 'Glutes', equipment: 'Machine',      muscles: 'Glutes, hamstrings, erectors' },
  { name: 'Lever Standing Calf Raise',    group: 'Calves', equipment: 'Machine',      muscles: 'Gastrocnemius' },
  { name: 'Lever Seated Calf Raise',      group: 'Calves', equipment: 'Machine',      muscles: 'Soleus' },
  { name: 'Hyperextension',               group: 'Core', equipment: 'Bodyweight',     muscles: 'Erectors, glutes, hamstrings' },
  { name: 'Lever Crunch',                 group: 'Core', equipment: 'Machine',        muscles: 'Rectus abdominis' },
  { name: "Captain's Chair Leg Raise",    group: 'Core', equipment: 'Bodyweight',     muscles: 'Lower abs, hip flexors' },
  { name: 'Smith Machine Shrug',          group: 'Traps', equipment: 'Smith Machine', muscles: 'Upper trapezius' },
  { name: 'Lever Shrug',                  group: 'Traps', equipment: 'Machine',       muscles: 'Upper trapezius' },
  { name: 'Sprints',                      group: 'Cardio', equipment: 'Bodyweight',   muscles: 'Quads, hamstrings, glutes, cardio' },
  { name: 'Swimming',                     group: 'Cardio', equipment: 'Other',        muscles: 'Full body, shoulders, cardio' },
  { name: 'Cycling',                      group: 'Cardio', equipment: 'Machine',      muscles: 'Quads, hamstrings, calves, cardio' },
];

// ─── Pre-built Workout Plans ───────────────────────────────────────────────

const WORKOUT_PLANS = [
  {
    id: 'ppl', name: 'Push / Pull / Legs', icon: '🔁', freq: '6 days · Intermediate',
    desc: 'The gold standard for hypertrophy. Each muscle trained 2×/week with high volume. Run as PPL–PPL–Rest.',
    days: [
      { name: 'Push A (Heavy)', exercises: ['Barbell Bench Press','Overhead Press','Incline Dumbbell Press','Dumbbell Fly','Lateral Raise','Tricep Pushdown','Skull Crushers'] },
      { name: 'Pull A (Heavy)', exercises: ['Deadlift','Barbell Row','Lat Pulldown','Seated Cable Row','Face Pull','Barbell Curl','Hammer Curl'] },
      { name: 'Legs A (Quad focus)', exercises: ['Barbell Back Squat','Leg Press','Leg Extension','Walking Lunge','Lying Leg Curl','Standing Calf Raise','Cable Crunch'] },
      { name: 'Push B (Volume)', exercises: ['Dumbbell Bench Press','Cable Crossover','Arnold Press','Cable Lateral Raise','Pec Deck','Rope Pushdown','Overhead Dumbbell Extension'] },
      { name: 'Pull B (Volume)', exercises: ['Dumbbell Row','Pull-ups','Close Grip Pulldown','Straight Arm Pulldown','Rear Delt Fly','EZ Bar Curl','Bayesian Curl'] },
      { name: 'Legs B (Ham/Glute focus)', exercises: ['Romanian Deadlift','Hack Squat','Bulgarian Split Squat','Seated Leg Curl','Barbell Hip Thrust','Seated Calf Raise','Hanging Leg Raise'] },
    ],
  },
  {
    id: 'upper-lower', name: 'Upper / Lower Split', icon: '⚡', freq: '4 days · All levels',
    desc: 'Train upper body twice and lower body twice per week. Excellent strength and size balance with plenty of recovery.',
    days: [
      { name: 'Upper A (Strength)', exercises: ['Barbell Bench Press','Barbell Row','Overhead Press','Lat Pulldown','Dumbbell Curl','Skull Crushers','Face Pull'] },
      { name: 'Lower A (Strength)', exercises: ['Barbell Back Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise','Plank','Cable Crunch'] },
      { name: 'Upper B (Hypertrophy)', exercises: ['Incline Dumbbell Press','Seated Cable Row','Dumbbell Shoulder Press','Pull-ups','Cable Crossover','Hammer Curl','Rope Pushdown'] },
      { name: 'Lower B (Hypertrophy)', exercises: ['Front Squat','Barbell Hip Thrust','Hack Squat','Seated Leg Curl','Bulgarian Split Squat','Seated Calf Raise','Hanging Knee Raise'] },
    ],
  },
  {
    id: 'phul', name: 'PHUL', icon: '🏋️', freq: '4 days · Intermediate',
    desc: 'Power Hypertrophy Upper Lower — blend heavy compound days with higher-rep hypertrophy days for strength AND size.',
    days: [
      { name: 'Upper Power', exercises: ['Barbell Bench Press','Barbell Row','Overhead Press','Lat Pulldown','Barbell Curl','Skull Crushers'] },
      { name: 'Lower Power', exercises: ['Barbell Back Squat','Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise'] },
      { name: 'Upper Hypertrophy', exercises: ['Incline Dumbbell Press','Dumbbell Row','Dumbbell Shoulder Press','Cable Crossover','Seated Cable Row','Preacher Curl','Rope Pushdown','Lateral Raise'] },
      { name: 'Lower Hypertrophy', exercises: ['Front Squat','Romanian Deadlift','Hack Squat','Leg Extension','Seated Leg Curl','Seated Calf Raise','Hanging Leg Raise'] },
    ],
  },
  {
    id: 'full-body', name: 'Full Body 3×/week', icon: '🔥', freq: '3 days · Beginner',
    desc: 'Hit every muscle group each session. Ideal for beginners or those with limited gym time. Rest days between sessions.',
    days: [
      { name: 'Day A', exercises: ['Barbell Back Squat','Barbell Bench Press','Barbell Row','Overhead Press','Romanian Deadlift','Barbell Curl','Plank'] },
      { name: 'Day B', exercises: ['Deadlift','Incline Dumbbell Press','Pull-ups','Dumbbell Shoulder Press','Leg Press','Tricep Pushdown','Hanging Knee Raise'] },
      { name: 'Day C', exercises: ['Front Squat','Dumbbell Bench Press','Seated Cable Row','Lateral Raise','Lying Leg Curl','Hammer Curl','Cable Crunch'] },
    ],
  },
  {
    id: 'arnold', name: 'Arnold Split', icon: '💪', freq: '6 days · Advanced',
    desc: 'Arnold Schwarzenegger\'s classic split — Chest/Back, Shoulders/Arms, Legs. Each muscle hit 2×/week with high volume.',
    days: [
      { name: 'Chest & Back A', exercises: ['Barbell Bench Press','Incline Dumbbell Press','Pull-ups','Barbell Row','Dumbbell Fly','Seated Cable Row','Cable Crossover'] },
      { name: 'Shoulders & Arms A', exercises: ['Overhead Press','Lateral Raise','Rear Delt Fly','Barbell Curl','Skull Crushers','Hammer Curl','Rope Pushdown'] },
      { name: 'Legs A', exercises: ['Barbell Back Squat','Leg Press','Leg Extension','Lying Leg Curl','Romanian Deadlift','Standing Calf Raise','Hanging Leg Raise'] },
      { name: 'Chest & Back B', exercises: ['Incline Barbell Press','Dumbbell Bench Press','Lat Pulldown','Dumbbell Row','Pec Deck','Straight Arm Pulldown'] },
      { name: 'Shoulders & Arms B', exercises: ['Arnold Press','Cable Lateral Raise','Face Pull','EZ Bar Curl','Overhead Cable Extension','Preacher Curl','Tricep Pushdown'] },
      { name: 'Legs B', exercises: ['Front Squat','Hack Squat','Bulgarian Split Squat','Seated Leg Curl','Barbell Hip Thrust','Seated Calf Raise','Cable Crunch'] },
    ],
  },
  {
    id: 'bro-split', name: '5-Day Bro Split', icon: '🎯', freq: '5 days · Intermediate',
    desc: 'Classic bodybuilder split — one muscle group per day. Maximum volume per muscle with a full week of recovery.',
    days: [
      { name: 'Chest', exercises: ['Barbell Bench Press','Incline Dumbbell Press','Decline Barbell Press','Dumbbell Fly','Cable Crossover','Pec Deck','Push-ups'] },
      { name: 'Back', exercises: ['Deadlift','Barbell Row','Pull-ups','Lat Pulldown','Seated Cable Row','Dumbbell Row','Barbell Shrug'] },
      { name: 'Shoulders', exercises: ['Overhead Press','Lateral Raise','Rear Delt Fly','Arnold Press','Face Pull','Upright Row','Front Raise'] },
      { name: 'Arms', exercises: ['Barbell Curl','Skull Crushers','Hammer Curl','Rope Pushdown','Preacher Curl','Overhead Dumbbell Extension','Concentration Curl','Dips (Triceps)'] },
      { name: 'Legs', exercises: ['Barbell Back Squat','Romanian Deadlift','Leg Press','Leg Extension','Lying Leg Curl','Barbell Hip Thrust','Standing Calf Raise','Seated Calf Raise'] },
    ],
  },
  {
    id: 'starting-strength', name: 'Starting Strength', icon: '⚔️', freq: '3 days · Beginner',
    desc: 'Mark Rippetoe\'s legendary novice program. Three heavy compound lifts per session. Add weight every workout.',
    days: [
      { name: 'Workout A', exercises: ['Barbell Back Squat','Barbell Bench Press','Deadlift'] },
      { name: 'Workout B', exercises: ['Barbell Back Squat','Overhead Press','Barbell Row'] },
    ],
  },
  {
    id: 'phat', name: 'PHAT', icon: '⚡', freq: '5 days · Advanced',
    desc: 'Power Hypertrophy Adaptive Training by Layne Norton. 2 power days + 3 hypertrophy days for the ultimate combo.',
    days: [
      { name: 'Upper Power', exercises: ['Barbell Bench Press','Pendlay Row','Overhead Press','Lat Pulldown','Barbell Curl','Skull Crushers'] },
      { name: 'Lower Power', exercises: ['Barbell Back Squat','Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise'] },
      { name: 'Back & Shoulders', exercises: ['Dumbbell Row','Seated Cable Row','Close Grip Pulldown','Dumbbell Shoulder Press','Lateral Raise','Face Pull','Cable Rear Delt Fly'] },
      { name: 'Lower Hypertrophy', exercises: ['Hack Squat','Front Squat','Leg Extension','Romanian Deadlift','Seated Leg Curl','Barbell Hip Thrust','Seated Calf Raise'] },
      { name: 'Chest & Arms', exercises: ['Incline Dumbbell Press','Dumbbell Bench Press','Cable Crossover','Preacher Curl','Hammer Curl','Rope Pushdown','Overhead Cable Extension'] },
    ],
  },
];

// ─── Volume helper ─────────────────────────────────────────────────────────

function calcVolume(w) {
  if (w.sets_data && w.sets_data.length > 0) {
    return w.sets_data.reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0);
  }
  return (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
}

// ─── Cardio calorie-per-minute estimates (avg ~75 kg person) ──────────────
const CARDIO_CAL_PER_MIN = {
  'Treadmill Run': 10, 'Incline Walk': 6, 'Stairmaster': 9, 'Rowing Machine': 8,
  'Assault Bike': 12, 'Stationary Bike': 7, 'Elliptical': 8, 'Jump Rope': 12,
  'Battle Ropes': 10, 'Box Jumps': 10, 'Burpees': 10, 'Mountain Climbers': 8,
  'Sled Push': 10, 'Sprints': 15, 'Swimming': 8, 'Cycling': 7,
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function Workouts() {
  const { token } = useAuth();
  const { t } = useLang();

  // Library filters
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [search, setSearch] = useState('');

  // Workout data
  const [workouts, setWorkouts] = useState([]);
  // Log form (multi-set)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exercise: '', group: '', muscles: '', setsData: [{ reps: '', weight: '' }] });

  // Session per-set editing
  const [editingId, setEditingId] = useState(null);
  const [editSetsData, setEditSetsData] = useState([]);

  // PR celebration
  const [prData, setPrData] = useState(null);

  // Workout plans
  const [expandedPlan, setExpandedPlan] = useState(null);

  // Volume chart
  const [chartExercise, setChartExercise] = useState('');
  const [chartData, setChartData] = useState([]);

  // Superset linking mode
  const [linkingMode, setLinkingMode] = useState(false);
  const [linkingBase, setLinkingBase] = useState(null);

  // Session refresh counter (to reload rating when saved)
  const [ratingRefresh, setRatingRefresh] = useState(0);

  // Settings (auto rest timer)
  const [userSettings, setUserSettings] = useState({ auto_rest_timer: true, default_rest_duration: 90, bar_weight: 20 });

  // Previous session data for the current form exercise
  const [lastSession, setLastSession] = useState(null);

  // Goals per exercise
  const [goals, setGoals] = useState([]);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');

  // Exercise history modal
  const [historyExercise, setHistoryExercise] = useState(null);

  // Plate calculator target: null = closed, or { scope: 'form'|'active', setIndex, workoutId? }
  const [plateCalc, setPlateCalc] = useState(null);

  // AI Coach session analysis
  const [coachInsight, setCoachInsight] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  // Swap suggestions modal
  const [swapExercise, setSwapExercise] = useState(null);

  // Volume by muscle group
  const [muscleVolume, setMuscleVolume] = useState({});

  // Cardio form (when selecting a cardio exercise)
  const [cardioForm, setCardioForm] = useState({
    duration_min: '', distance_km: '', calories: '',
    avg_speed: '', incline: '', avg_heart_rate: '', max_heart_rate: '', resistance: '', steps: '',
  });

  // Session timer
  const [sessionStart, setSessionStart] = useState(() => {
    const saved = sessionStorage.getItem('nexero_session_start');
    return saved ? Number(saved) : null;
  });
  const [sessionElapsed, setSessionElapsed] = useState(0);

  // Workout report card
  const [showReport, setShowReport] = useState(false);
  const [reportDuration, setReportDuration] = useState(0);

  // ── Data loading ──
  const load = () =>
    fetch('/api/workouts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setWorkouts);

  const loadGoals = () =>
    fetch('/api/goals/exercise', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setGoals(Array.isArray(d) ? d : []))
      .catch(() => setGoals([]));

  const loadSettings = () =>
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s) setUserSettings(s); })
      .catch(() => {});

  const loadMuscleVolume = () =>
    fetch('/api/volume-by-muscle?days=7', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : {})
      .then(d => setMuscleVolume(d || {}))
      .catch(() => setMuscleVolume({}));

  useEffect(() => {
    load();
    loadGoals();
    loadSettings();
    loadMuscleVolume();
  }, [token]);

  // ── Session timer tick ──
  useEffect(() => {
    if (!sessionStart) return;
    const tick = () => setSessionElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // ── Exercise selection ──
  const selectExercise = async (ex) => {
    setForm({ exercise: ex.name, group: ex.group, muscles: ex.muscles, setsData: [{ reps: '', weight: '' }] });
    setCardioForm({ duration_min: '', distance_km: '', calories: '', avg_speed: '', incline: '', avg_heart_rate: '', max_heart_rate: '', resistance: '', steps: '' });
    setShowForm(true);
    setShowGoalInput(false);
    setGoalWeightInput('');
    setCoachInsight('');
    // Fetch last session for "Previous" button
    try {
      const res = await fetch(`/api/workouts/last?exercise=${encodeURIComponent(ex.name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLastSession(data);
      } else {
        setLastSession(null);
      }
    } catch (_) {
      setLastSession(null);
    }
  };

  // ── Load previous session data into form ──
  const loadPreviousSession = () => {
    if (!lastSession) return;
    const sets = (lastSession.sets_data && lastSession.sets_data.length > 0)
      ? lastSession.sets_data.map(s => ({ reps: s.reps ?? '', weight: s.weight ?? '' }))
      : [{ reps: lastSession.reps || '', weight: lastSession.weight || '' }];
    setForm(f => ({ ...f, setsData: sets }));
  };

  // ── Form set management ──
  const updateFormSet = (i, field, val) =>
    setForm(f => ({ ...f, setsData: f.setsData.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }));
  const addFormSet = () =>
    setForm(f => ({ ...f, setsData: [...f.setsData, { reps: '', weight: '' }] }));
  const removeFormSet = (i) =>
    setForm(f => ({ ...f, setsData: f.setsData.filter((_, idx) => idx !== i) }));

  // ── Submit workout ──
  const [saveError, setSaveError] = useState('');
  const handleSubmit = async () => {
    setSaveError('');
    if (!form.exercise) return;
    const isCardio = form.group === 'Cardio' || EXERCISES.find(e => e.name === form.exercise)?.group === 'Cardio';

    // Start session timer on first exercise of the day
    if (!sessionStart) {
      const now = Date.now();
      setSessionStart(now);
      sessionStorage.setItem('nexero_session_start', String(now));
    }

    if (isCardio) {
      // ── Cardio submit ──
      const durMin = Number(cardioForm.duration_min) || 0;
      if (durMin <= 0) return;
      let cal = Number(cardioForm.calories) || 0;
      if (!cal) {
        const rate = CARDIO_CAL_PER_MIN[form.exercise] || 8;
        cal = Math.round(durMin * rate);
      }

      const cardioData = { duration_min: durMin, calories: cal };
      // Only include optional fields if the user entered them
      if (cardioForm.distance_km) cardioData.distance_km = Number(cardioForm.distance_km);
      if (cardioForm.avg_speed) cardioData.avg_speed = Number(cardioForm.avg_speed);
      if (cardioForm.incline) cardioData.incline = Number(cardioForm.incline);
      if (cardioForm.avg_heart_rate) cardioData.avg_heart_rate = Number(cardioForm.avg_heart_rate);
      if (cardioForm.max_heart_rate) cardioData.max_heart_rate = Number(cardioForm.max_heart_rate);
      if (cardioForm.resistance) cardioData.resistance = Number(cardioForm.resistance);
      if (cardioForm.steps) cardioData.steps = Number(cardioForm.steps);

      try {
        const res = await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            exercise: form.exercise,
            is_cardio: true,
            sets_data: [cardioData],
            muscle_group: 'Cardio',
            duration: durMin * 60,
            date: todayStr(),
          }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
      } catch (err) {
        setSaveError(err.message || 'Could not save. Check your connection.');
        return;
      }

      setShowForm(false);
      load();
      loadMuscleVolume();
      return;
    }

    // ── Strength submit ──
    const setsData = form.setsData
      .filter(s => s.reps || s.weight)
      .map(s => ({
        reps: Number(s.reps) || 0,
        weight: Number(s.weight) || 0,
      }));
    if (setsData.length === 0) return;

    // Find current PR for this exercise before saving
    const maxNewWeight = Math.max(...setsData.map(s => s.weight));
    const prevPR = workouts
      .filter(w => w.exercise === form.exercise)
      .reduce((max, w) => {
        if (w.sets_data && w.sets_data.length > 0) {
          const wMax = Math.max(...w.sets_data.map(s => Number(s.weight) || 0));
          return Math.max(max, wMax);
        }
        return Math.max(max, Number(w.weight) || 0);
      }, 0);

    const exerciseMeta = EXERCISES.find(e => e.name === form.exercise);
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          exercise: form.exercise,
          sets_data: setsData,
          muscle_group: exerciseMeta?.group || null,
          date: todayStr(),
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
    } catch (err) {
      setSaveError(err.message || 'Could not save. Check your connection.');
      return;
    }

    // Check for new PR
    if (maxNewWeight > 0 && maxNewWeight > prevPR) {
      setPrData({
        exercise: form.exercise,
        newWeight: maxNewWeight,
        oldWeight: prevPR > 0 ? prevPR : null,
      });
    }

    // Check if goal was achieved (first time)
    const goal = goals.find(g => g.exercise === form.exercise);
    if (goal && !goal.celebrated && maxNewWeight >= Number(goal.target_weight)) {
      const hitSet = setsData.find(s => s.weight >= goal.target_weight && s.reps >= (goal.target_reps || 1));
      if (hitSet) {
        await fetch(`/api/goals/exercise/${goal.id}/celebrate`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        setPrData({
          exercise: `🎯 GOAL HIT: ${form.exercise}`,
          newWeight: hitSet.weight,
          oldWeight: null,
        });
        loadGoals();
      }
    }

    // Auto-start rest timer if enabled
    if (userSettings.auto_rest_timer) {
      window.dispatchEvent(new CustomEvent('nexero:rest-start', {
        detail: { seconds: userSettings.default_rest_duration || 90 },
      }));
    }

    setShowForm(false);
    load();
    loadMuscleVolume();
  };

  // ── Finish Workout ──
  const finishWorkout = () => {
    const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
    setReportDuration(elapsed);
    setShowReport(true);
  };

  const closeReport = () => {
    setShowReport(false);
    // Reset session timer
    setSessionStart(null);
    setSessionElapsed(0);
    sessionStorage.removeItem('nexero_session_start');
  };

  // ── Format session timer display ──
  const formatTimer = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // ── Session editing ──
  const startEdit = (w) => {
    setEditingId(w.id);
    if (w.sets_data && w.sets_data.length > 0) {
      setEditSetsData(w.sets_data.map(s => ({
        reps: s.reps ?? '',
        weight: s.weight ?? '',
      })));
    } else {
      setEditSetsData(Array.from({ length: w.sets || 1 }, () => ({ reps: w.reps || '', weight: w.weight || '' })));
    }
  };
  const saveEdit = async (id) => {
    const setsData = editSetsData.map(s => ({
      reps: Number(s.reps) || 0,
      weight: Number(s.weight) || 0,
    }));
    await fetch(`/api/workouts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sets_data: setsData }),
    });
    setEditingId(null);
    load();
    loadMuscleVolume();
  };

  // ── Save goal for current form exercise ──
  const saveGoal = async () => {
    const w = parseFloat(goalWeightInput);
    if (!w || w <= 0 || !form.exercise) return;
    await fetch('/api/goals/exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exercise: form.exercise, target_weight: w, target_reps: 1 }),
    });
    setShowGoalInput(false);
    setGoalWeightInput('');
    loadGoals();
  };

  // ── AI Coach: analyze current session ──
  const askCoachAboutSession = async () => {
    setCoachLoading(true);
    setCoachInsight('');
    try {
      const res = await fetch('/api/coach/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: todayStr() }),
      });
      const data = await res.json();
      setCoachInsight(data.reply || data.error || 'No response');
    } catch (e) {
      setCoachInsight('Could not reach coach. Check your connection.');
    } finally {
      setCoachLoading(false);
    }
  };
  const updateEditSet = (i, field, val) =>
    setEditSetsData(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const addEditSet = () => setEditSetsData(prev => [...prev, { reps: '', weight: '' }]);
  const removeEditSet = (i) => setEditSetsData(prev => prev.filter((_, idx) => idx !== i));

  // ── Superset linking ──
  const startLinking = (baseWorkout) => {
    setLinkingMode(true);
    setLinkingBase(baseWorkout);
  };

  const finishLinking = async (targetWorkout) => {
    if (!linkingBase || targetWorkout.id === linkingBase.id) {
      setLinkingMode(false);
      setLinkingBase(null);
      return;
    }
    // Use an existing superset group if either is linked, or create a new one
    const existingGroup = linkingBase.superset_group || targetWorkout.superset_group;
    const groupId = existingGroup || Date.now();
    const toLink = [linkingBase.id, targetWorkout.id];
    await fetch('/api/workouts/superset', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workout_ids: toLink, superset_group: groupId }),
    });
    setLinkingMode(false);
    setLinkingBase(null);
    load();
  };

  const unlinkSuperset = async (id) => {
    await fetch(`/api/workouts/superset/unlink/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  const cancelLinking = () => {
    setLinkingMode(false);
    setLinkingBase(null);
  };

  const remove = async (id) => {
    await fetch(`/api/workouts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  // ── Templates ──
  const today = todayStr();
  const todayWorkouts = workouts.filter(w => w.date === today);
  const totalVolume = todayWorkouts.reduce((s, w) => s + calcVolume(w), 0);

  // ── Plan "Load Day" ──
  // Accepts either an array of exercise names (from template plans) OR an
  // array of { exercise, sets, reps, weight } objects (from user routines).
  // When planned sets/reps exist, we pre-fill sets_data so the server
  // validation accepts the row; otherwise we use reps:1 as a placeholder so
  // the entry shows up and the user can edit it.
  const loadPlanDay = async (exercisesInput) => {
    const date = todayStr();
    // Normalize to objects
    const normalized = (exercisesInput || []).map(item =>
      typeof item === 'string'
        ? { exercise: item, sets: 3, reps: 1, weight: 0 }
        : {
            exercise: item.exercise,
            sets: Number(item.sets) > 0 ? Number(item.sets) : 3,
            reps: Number(item.reps) > 0 ? Number(item.reps) : 1,
            weight: Number(item.weight) || 0,
          }
    ).filter(x => x.exercise);

    const alreadyLogged = new Set(todayWorkouts.map(w => w.exercise));
    const toAdd = normalized.filter(n => !alreadyLogged.has(n.exercise));
    if (toAdd.length === 0) { await load(); return; }

    try {
      const results = await Promise.all(
        toAdd.map(ex => {
          const setsData = Array.from({ length: ex.sets }, () => ({
            reps: ex.reps,
            weight: ex.weight,
          }));
          return fetch('/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ exercise: ex.exercise, sets_data: setsData, date }),
          }).then(async r => {
            if (!r.ok) {
              const msg = await r.text().catch(() => '');
              return { ok: false, exercise: ex.exercise, msg };
            }
            return { ok: true };
          });
        })
      );
      const failures = results.filter(r => !r.ok);
      if (failures.length > 0) {
        alert(`Could not load ${failures.length} exercise(s): ${failures.map(f => f.exercise).join(', ')}`);
      }
    } catch (err) {
      alert('Failed to load day: ' + (err?.message || 'network error'));
    }
    await load();
  };

  // ── Volume chart ──
  const loadChart = async (exercise) => {
    setChartExercise(exercise);
    if (!exercise) { setChartData([]); return; }
    const data = await fetch(`/api/workouts/volume?exercise=${encodeURIComponent(exercise)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    setChartData(data);
  };

  // ── Library filter ──
  const filtered = EXERCISES.filter(ex =>
    (selectedGroup === 'All' || ex.group === selectedGroup) &&
    (selectedEquipment === 'All' || ex.equipment === selectedEquipment) &&
    (search === '' || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.muscles.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Chart SVG ──
  const loggedExercises = [...new Set(workouts.map(w => w.exercise))].sort();
  const vW = 500, vH = 200, padL = 50, padR = 15, padT = 20, padB = 35;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;
  const maxVol = chartData.length ? Math.max(...chartData.map(d => d.volume)) * 1.1 : 100;
  const gridLines = 4;

  // ── Determine if the currently selected exercise is cardio ──
  const isCardioExercise = (() => {
    if (form.group === 'Cardio') return true;
    if (!form.exercise) return false;
    const ex = EXERCISES.find(e => e.name === form.exercise);
    return ex?.group === 'Cardio';
  })();

  // ── MuscleMap exercises enriched with metadata ──
  const muscleMapData = todayWorkouts.map(w => {
    const ex = EXERCISES.find(e => e.name === w.exercise);
    return { exercise: w.exercise, group: ex?.group || '', muscles: ex?.muscles || '' };
  });

  return (
    <div className="page">
      {/* PR Celebration Modal */}
      <PRCelebration
        show={!!prData}
        exercise={prData?.exercise || ''}
        newWeight={prData?.newWeight || 0}
        oldWeight={prData?.oldWeight}
        onClose={() => setPrData(null)}
      />

      {/* Workout Report Card */}
      <WorkoutReportCard
        show={showReport}
        workouts={todayWorkouts}
        durationSeconds={reportDuration}
        onClose={closeReport}
      />

      <div className="page-header">
        <div>
          <h1>{t('workouts')}</h1>
          <p>{t('workoutsSub')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? t('cancel') : `+ ${t('logWorkout')}`}
        </button>
      </div>

      <div className="workout-layout">
        {/* ── LEFT: Exercise Library ── */}
        <div className="exercise-library">
          <div className="form-card">
            <h3>{t('exerciseLibrary')} <span className="exercise-count">{filtered.length}</span></h3>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <input type="text" placeholder={t('searchExercises')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-section">
              <label className="filter-label">Muscle Group</label>
              <div className="chips">
                {MUSCLE_GROUPS.map(g => (
                  <button key={g} className={`chip ${selectedGroup === g ? 'sel' : ''}`} onClick={() => setSelectedGroup(g)}>{g}</button>
                ))}
              </div>
            </div>
            <div className="filter-section">
              <label className="filter-label">Equipment</label>
              <div className="chips">
                {EQUIPMENT_TYPES.map(eq => (
                  <button key={eq} className={`chip ${selectedEquipment === eq ? 'sel' : ''}`} onClick={() => setSelectedEquipment(eq)}>{eq}</button>
                ))}
              </div>
            </div>
            <div className="exercise-list">
              {filtered.map(ex => (
                <div key={ex.name} className="exercise-card">
                  <div className="exercise-card-main" onClick={() => selectExercise(ex)}>
                    <div className="exercise-icon">
                      <ExerciseDemo exercise={ex.name} group={ex.group} />
                    </div>
                    <div className="exercise-info">
                      <div className="exercise-name">{ex.name}</div>
                      <div className="exercise-meta">
                        <span className="equipment-tag">{ex.equipment}</span>
                        <span>{ex.group}</span>
                      </div>
                      <div className="exercise-muscles">{ex.muscles}</div>
                    </div>
                  </div>
                  <button
                    className="exercise-kebab"
                    title="View history"
                    onClick={(e) => { e.stopPropagation(); setHistoryExercise(ex.name); }}
                  >
                    ⋯
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Log form + Session + Timer + Templates ── */}
        <div className="workout-right">

          {/* Multi-set log form */}
          {showForm && (
            <div className="form-card">
              <div className="log-form-header">
                <h3 style={{ margin: 0 }}>{form.exercise || t('newWorkout')}</h3>
                {form.exercise && (
                  <div className="log-form-header-actions">
                    <button
                      className="btn-secondary btn-sm"
                      title="View swap suggestions"
                      onClick={() => setSwapExercise(form.exercise)}
                    >
                      ↔ Swap
                    </button>
                    <button
                      className="btn-secondary btn-sm"
                      title="View history"
                      onClick={() => setHistoryExercise(form.exercise)}
                    >
                      📊 History
                    </button>
                  </div>
                )}
              </div>
              {form.muscles && <p className="exercise-muscles" style={{ marginBottom: '0.75rem' }}>{form.muscles}</p>}

              {/* Previous session banner — strength only */}
              {!isCardioExercise && lastSession && (
                <div className="prev-session-banner">
                  <div className="prev-session-info">
                    <span className="prev-session-label">Last session</span>
                    <span className="prev-session-date">{lastSession.date}</span>
                    <span className="prev-session-sets">
                      {(lastSession.sets_data || []).map((s, i) => (
                        <span key={i} className="prev-set-chip">{s.reps}×{s.weight}</span>
                      ))}
                    </span>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={loadPreviousSession}>
                    ↩ Previous
                  </button>
                </div>
              )}

              {/* Exercise goal UI — strength only */}
              {!isCardioExercise && form.exercise && (() => {
                const g = goals.find(x => x.exercise === form.exercise);
                if (g) {
                  const topCurrent = Math.max(0, ...form.setsData.map(s => Number(s.weight) || 0));
                  const pct = Math.min(100, Math.round((topCurrent / g.target_weight) * 100));
                  return (
                    <div className="form-goal-bar">
                      <div className="form-goal-label">
                        <span>🎯 Goal: {g.target_weight} kg × {g.target_reps || 1}</span>
                        {g.celebrated && <span className="form-goal-achieved">✓ Achieved!</span>}
                      </div>
                      <div className="pr-goal-bar">
                        <div className="pr-goal-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }
                if (showGoalInput) {
                  return (
                    <div className="form-goal-input">
                      <input
                        type="number"
                        placeholder="Target weight (kg)"
                        step="0.5"
                        min="0"
                        value={goalWeightInput}
                        onChange={(e) => setGoalWeightInput(e.target.value)}
                      />
                      <button className="btn-primary btn-sm" onClick={saveGoal}>Save Goal</button>
                      <button className="btn-secondary btn-sm" onClick={() => setShowGoalInput(false)}>×</button>
                    </div>
                  );
                }
                return (
                  <button
                    className="btn-link form-goal-set-btn"
                    onClick={() => setShowGoalInput(true)}
                  >
                    🎯 Set weight goal
                  </button>
                );
              })()}

              {isCardioExercise ? (
                /* ── Cardio Form ── */
                <>
                  <div className="cardio-form">
                    {/* Primary metrics — Duration & Calories */}
                    <div className="cardio-primary">
                      <div className="cardio-primary-field">
                        <div className="cardio-field-icon">&#9201;</div>
                        <div className="cardio-field-body">
                          <label className="cardio-label">Duration *</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="30" min="1"
                              value={cardioForm.duration_min}
                              onChange={e => setCardioForm(f => ({ ...f, duration_min: e.target.value }))} />
                            <span className="cardio-unit">min</span>
                          </div>
                        </div>
                      </div>
                      <div className="cardio-primary-field">
                        <div className="cardio-field-icon" style={{ color: '#f97316' }}>&#128293;</div>
                        <div className="cardio-field-body">
                          <label className="cardio-label">Calories</label>
                          <div className="cardio-input-unit">
                            <input type="number"
                              placeholder={cardioForm.duration_min ? `~${Math.round(Number(cardioForm.duration_min) * (CARDIO_CAL_PER_MIN[form.exercise] || 8))}` : '0'}
                              min="0"
                              value={cardioForm.calories}
                              onChange={e => setCardioForm(f => ({ ...f, calories: e.target.value }))} />
                            <span className="cardio-unit">cal</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary metrics grid */}
                    <div className="cardio-metrics-section">
                      <span className="cardio-section-label">Performance</span>
                      <div className="cardio-metrics-grid">
                        <div className="cardio-metric-field">
                          <label>Distance</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0" step="0.1"
                              value={cardioForm.distance_km}
                              onChange={e => setCardioForm(f => ({ ...f, distance_km: e.target.value }))} />
                            <span className="cardio-unit">km</span>
                          </div>
                        </div>
                        <div className="cardio-metric-field">
                          <label>Avg Speed</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0" step="0.1"
                              value={cardioForm.avg_speed}
                              onChange={e => setCardioForm(f => ({ ...f, avg_speed: e.target.value }))} />
                            <span className="cardio-unit">km/h</span>
                          </div>
                        </div>
                        <div className="cardio-metric-field">
                          <label>Incline</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0" step="0.5"
                              value={cardioForm.incline}
                              onChange={e => setCardioForm(f => ({ ...f, incline: e.target.value }))} />
                            <span className="cardio-unit">%</span>
                          </div>
                        </div>
                        <div className="cardio-metric-field">
                          <label>Resistance</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0"
                              value={cardioForm.resistance}
                              onChange={e => setCardioForm(f => ({ ...f, resistance: e.target.value }))} />
                            <span className="cardio-unit">lvl</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Heart rate section */}
                    <div className="cardio-metrics-section">
                      <span className="cardio-section-label">Heart Rate</span>
                      <div className="cardio-metrics-grid">
                        <div className="cardio-metric-field">
                          <label>Average</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0"
                              value={cardioForm.avg_heart_rate}
                              onChange={e => setCardioForm(f => ({ ...f, avg_heart_rate: e.target.value }))} />
                            <span className="cardio-unit">bpm</span>
                          </div>
                        </div>
                        <div className="cardio-metric-field">
                          <label>Max</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0"
                              value={cardioForm.max_heart_rate}
                              onChange={e => setCardioForm(f => ({ ...f, max_heart_rate: e.target.value }))} />
                            <span className="cardio-unit">bpm</span>
                          </div>
                        </div>
                        <div className="cardio-metric-field">
                          <label>Steps</label>
                          <div className="cardio-input-unit">
                            <input type="number" placeholder="—" min="0"
                              value={cardioForm.steps}
                              onChange={e => setCardioForm(f => ({ ...f, steps: e.target.value }))} />
                            <span className="cardio-unit">steps</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {saveError && (
                    <div role="alert" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 12px', borderRadius: 8, marginTop: 12, fontSize: '0.85rem' }}>
                      {saveError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>{t('addToSession')}</button>
                    <button className="btn-secondary" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                  </div>
                </>
              ) : (
                /* ── Strength Form ── */
                <>
                  {/* Smart warm-up suggestions */}
                  {form.exercise && form.setsData.some(s => Number(s.weight) >= 40) && (
                    <WarmupSuggestions
                      workingWeight={Math.max(...form.setsData.map(s => Number(s.weight) || 0))}
                      barWeight={userSettings.bar_weight || 20}
                    />
                  )}

                  {/* Progressive Overload Banner */}
                  {form.exercise && <OverloadBanner exercise={form.exercise} token={token} />}

                  {/* Live 1RM preview */}
                  <OneRepMax setsData={form.setsData} />

                  <div className="sets-builder">
                    <div className="sets-builder-header">
                      <span>Set</span>
                      <span>Reps</span>
                      <span>Kg</span>
                      <span></span>
                    </div>
                    {form.setsData.map((set, i) => (
                      <div className="set-input-row" key={i}>
                        <span className="set-badge">{i + 1}</span>
                        <input type="number" placeholder="10" min="0" value={set.reps}
                          onChange={e => updateFormSet(i, 'reps', e.target.value)} />
                        <div className="set-weight-wrap">
                          <input type="number" placeholder="0" min="0" step="0.5" value={set.weight}
                            onChange={e => updateFormSet(i, 'weight', e.target.value)} />
                          <button
                            type="button"
                            className="set-calc-btn"
                            onClick={() => setPlateCalc({ scope: 'form', setIndex: i })}
                            title="Plate calculator"
                            aria-label="Plate calculator"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="2" width="16" height="20" rx="2"/>
                              <line x1="8" y1="6" x2="16" y2="6"/>
                              <line x1="8" y1="10" x2="10" y2="10"/>
                              <line x1="12" y1="10" x2="14" y2="10"/>
                              <line x1="16" y1="10" x2="16" y2="10"/>
                              <line x1="8" y1="14" x2="10" y2="14"/>
                              <line x1="12" y1="14" x2="14" y2="14"/>
                              <line x1="16" y1="14" x2="16" y2="14"/>
                              <line x1="8" y1="18" x2="10" y2="18"/>
                              <line x1="12" y1="18" x2="16" y2="18"/>
                            </svg>
                          </button>
                        </div>
                        <button className="set-remove-btn" onClick={() => removeFormSet(i)}
                          disabled={form.setsData.length === 1}>×</button>
                      </div>
                    ))}
                    <button className="btn-add-set" onClick={addFormSet}>+ Add Set</button>
                  </div>

                  {/* Progressive Overload Toggle */}
                  {form.exercise && <OverloadToggle exercise={form.exercise} token={token} />}

                  {saveError && (
                    <div role="alert" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 12px', borderRadius: 8, marginTop: 12, fontSize: '0.85rem' }}>
                      {saveError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>{t('addToSession')}</button>
                    <button className="btn-secondary" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Muscle Map */}
          <MuscleMap workouts={muscleMapData} />

          {/* Session Log — per-set Lyfta style */}
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>{t('sessionLog')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {sessionStart && (
                  <span className="session-timer-badge">{formatTimer(sessionElapsed)}</span>
                )}
                {linkingMode && (
                  <div className="linking-banner">
                    <span>⚡ Select exercise to link with <strong>{linkingBase?.exercise}</strong></span>
                    <button className="btn-secondary btn-sm" onClick={cancelLinking}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
            {todayWorkouts.length === 0 ? (
              <div className="empty-state"><p>{t('noExercisesToday')}</p></div>
            ) : (
              <>
                <div className="session-list">
                  {todayWorkouts.map(w => {
                    const isEditing = editingId === w.id;
                    const sets = w.sets_data && w.sets_data.length > 0
                      ? w.sets_data
                      : Array.from({ length: w.sets || 1 }, () => ({ reps: w.reps, weight: w.weight }));
                    const isLinkable = linkingMode && linkingBase && w.id !== linkingBase.id;
                    const isLinkingBase = linkingBase?.id === w.id;
                    const supersetClass = w.superset_group ? ` superset-linked superset-color-${w.superset_group % 5}` : '';
                    const linkableClass = isLinkable ? ' linkable' : '';
                    const linkingBaseClass = isLinkingBase ? ' linking-base' : '';

                    return (
                      <div
                        key={w.id}
                        className={`session-exercise-block${isEditing ? ' editing' : ''}${supersetClass}${linkableClass}${linkingBaseClass}`}
                        onClick={isLinkable ? () => finishLinking(w) : undefined}
                        style={isLinkable ? { cursor: 'pointer' } : undefined}
                      >
                        {w.superset_group && (
                          <div className="superset-label">⚡ SUPERSET</div>
                        )}
                        <div className="session-ex-header">
                          <div className="session-ex-name">{w.exercise}</div>
                          {!isEditing && !linkingMode && (
                            <div className="session-ex-actions">
                              <OneRepMax setsData={sets} />
                              {w.superset_group ? (
                                <button className="btn-edit" title="Unlink from superset" onClick={() => unlinkSuperset(w.id)}>⚡✕</button>
                              ) : (
                                <button className="btn-edit" title="Link as superset" onClick={() => startLinking(w)}>⚡</button>
                              )}
                              <button className="btn-edit" onClick={() => startEdit(w)}>Edit</button>
                              <button className="btn-delete" onClick={() => remove(w.id)}>×</button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="set-editor">
                            <div className="sets-builder-header">
                              <span>Set</span><span>Reps</span><span>Kg</span><span></span>
                            </div>
                            {editSetsData.map((s, i) => (
                              <div className="set-input-row" key={i}>
                                <span className="set-badge">{i + 1}</span>
                                <input type="number" placeholder="10" min="0" value={s.reps}
                                  onChange={e => updateEditSet(i, 'reps', e.target.value)} />
                                <input type="number" placeholder="0" min="0" step="0.5" value={s.weight}
                                  onChange={e => updateEditSet(i, 'weight', e.target.value)} />
                                <button className="set-remove-btn" onClick={() => removeEditSet(i)}
                                  disabled={editSetsData.length === 1}>×</button>
                              </div>
                            ))}
                            <button className="btn-add-set" onClick={addEditSet}>+ Add Set</button>
                            <div className="set-editor-footer">
                              <button className="btn-primary btn-sm" onClick={() => saveEdit(w.id)}>Save</button>
                              <button className="btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : w.muscle_group === 'Cardio' && sets[0]?.duration_min ? (
                          <div className="cardio-session-view">
                            <div className="cardio-stat-row">
                              <span className="cardio-stat"><strong>{sets[0].duration_min}</strong> min</span>
                              {sets[0].distance_km && <span className="cardio-stat"><strong>{sets[0].distance_km}</strong> km</span>}
                              {sets[0].avg_speed && <span className="cardio-stat"><strong>{sets[0].avg_speed}</strong> km/h</span>}
                              {sets[0].incline && <span className="cardio-stat"><strong>{sets[0].incline}</strong>% incline</span>}
                              {sets[0].avg_heart_rate && <span className="cardio-stat"><strong>{sets[0].avg_heart_rate}</strong> avg bpm</span>}
                              {sets[0].max_heart_rate && <span className="cardio-stat"><strong>{sets[0].max_heart_rate}</strong> max bpm</span>}
                              {sets[0].resistance && <span className="cardio-stat"><strong>{sets[0].resistance}</strong> resistance</span>}
                              {sets[0].steps && <span className="cardio-stat"><strong>{sets[0].steps}</strong> steps</span>}
                              {sets[0].calories && <span className="cardio-stat cardio-stat-cal"><strong>{sets[0].calories}</strong> cal</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="set-rows-view">
                            {sets.map((s, i) => (
                              <div className="set-row-view" key={i}>
                                <span className="set-num-badge">{i + 1}</span>
                                <span className="set-reps">{s.reps || '—'} reps</span>
                                <span className="set-x">×</span>
                                <span className="set-weight">{s.weight || '—'} kg</span>
                                <span className="set-vol-badge">{((s.reps || 0) * (s.weight || 0)).toLocaleString()} kg</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="session-total">
                  Total volume: <strong>{totalVolume.toLocaleString()} kg</strong>
                </div>
                <button className="btn-finish-workout" onClick={finishWorkout}>
                  Finish Workout
                </button>
              </>
            )}
          </div>

          {/* Ask coach about today's session */}
          {todayWorkouts.length > 0 && (
            <div className="form-card coach-session-card">
              <div className="coach-session-header">
                <h3 style={{ margin: 0 }}>🤖 Session Coach</h3>
                {!coachInsight && !coachLoading && (
                  <button className="btn-primary btn-sm" onClick={askCoachAboutSession}>
                    Ask about this session
                  </button>
                )}
              </div>
              {coachLoading && <div className="coach-thinking">Analyzing your session…</div>}
              {coachInsight && (
                <div className="coach-insight-box">
                  <p>{coachInsight}</p>
                  <button className="btn-secondary btn-sm" onClick={() => setCoachInsight('')}>Ask again</button>
                </div>
              )}
            </div>
          )}

          {/* Session Rating & Notes (only shows when there are exercises logged) */}
          {todayWorkouts.length > 0 && (
            <SessionRating
              date={today}
              token={token}
              key={`rating-${ratingRefresh}`}
              onSave={() => setRatingRefresh(r => r + 1)}
            />
          )}
        </div>
      </div>

      {/* Volume by Muscle Group chart */}
      {Object.keys(muscleVolume).length > 0 && (
        <div className="form-card" style={{ marginTop: '1.5rem' }}>
          <h3>Volume by Muscle Group <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>last 7 days</span></h3>
          <div className="muscle-volume-bars">
            {Object.entries(muscleVolume)
              .sort((a, b) => b[1] - a[1])
              .map(([group, vol]) => {
                const max = Math.max(...Object.values(muscleVolume));
                const pct = max > 0 ? (vol / max) * 100 : 0;
                return (
                  <div key={group} className="muscle-volume-row">
                    <span className="muscle-volume-label">{group}</span>
                    <div className="muscle-volume-bar">
                      <div className="muscle-volume-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="muscle-volume-value">{Math.round(vol).toLocaleString()} kg</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Exercise History Modal */}
      {historyExercise && (
        <ExerciseHistoryModal
          exercise={historyExercise}
          token={token}
          onClose={() => setHistoryExercise(null)}
        />
      )}

      {/* Calculator */}
      {plateCalc && (
        <Calculator
          initialValue={
            plateCalc.scope === 'form'
              ? form.setsData[plateCalc.setIndex]?.weight
              : null
          }
          onApply={(total) => {
            if (plateCalc.scope === 'form') {
              updateFormSet(plateCalc.setIndex, 'weight', String(total));
            }
          }}
          onClose={() => setPlateCalc(null)}
        />
      )}

      {/* Exercise Swap Suggestions Modal */}
      {swapExercise && (
        <div className="history-modal-overlay" onClick={() => setSwapExercise(null)}>
          <div className="history-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>Swap suggestions for {swapExercise}</h2>
              <button className="history-modal-close" onClick={() => setSwapExercise(null)}>×</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Alternatives that hit similar muscles:</p>
            <div className="swap-suggestions">
              {getSwapSuggestions(swapExercise, EXERCISES, 6).map(alt => (
                <div key={alt.name} className="swap-card" onClick={() => {
                  selectExercise(alt);
                  setSwapExercise(null);
                }}>
                  <div className="swap-card-info">
                    <div className="swap-card-name">{alt.name}</div>
                    <div className="swap-card-meta">{alt.equipment} · {alt.group}</div>
                    <div className="swap-card-muscles">{alt.muscles}</div>
                  </div>
                  <button className="btn-primary btn-sm">Use</button>
                </div>
              ))}
              {getSwapSuggestions(swapExercise, EXERCISES, 6).length === 0 && (
                <div className="empty-state">
                  <p>No similar exercises found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Custom Routines */}
      <div style={{ marginTop: '2rem' }}>
        <RoutineBuilder token={token} exercises={EXERCISES} onLoadDay={loadPlanDay} />
      </div>

      {/* Volume Progression Chart */}
      {loggedExercises.length > 0 && (
        <div className="form-card" style={{ marginTop: '1.5rem' }}>
          <h3>{t('volumeProgression')}</h3>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <select value={chartExercise} onChange={e => loadChart(e.target.value)}>
              <option value="">{t('selectExercise')}</option>
              {loggedExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          {chartExercise && chartData.length < 2 && (
            <div className="empty-state"><p>{t('logMoreDays')}</p></div>
          )}
          {chartData.length >= 2 && (
            <div className="volume-chart">
              <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {Array.from({ length: gridLines + 1 }, (_, i) => {
                  const val = (maxVol / gridLines) * i;
                  const y = padT + plotH - (val / maxVol) * plotH;
                  return (
                    <g key={i}>
                      <line x1={padL} y1={y} x2={vW - padR} y2={y} stroke="#334155" strokeWidth="0.5"
                        strokeDasharray={i === 0 ? 'none' : '4 3'} />
                      <text x={padL - 8} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(val)}</text>
                    </g>
                  );
                })}
                <polygon
                  points={chartData.map((d, i) => {
                    const x = padL + (i / (chartData.length - 1)) * plotW;
                    const y = padT + plotH - (d.volume / maxVol) * plotH;
                    return `${x},${y}`;
                  }).join(' ') + ` ${padL + plotW},${padT + plotH} ${padL},${padT + plotH}`}
                  fill="url(#volGrad)" />
                <polyline
                  points={chartData.map((d, i) => {
                    const x = padL + (i / (chartData.length - 1)) * plotW;
                    const y = padT + plotH - (d.volume / maxVol) * plotH;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {chartData.map((d, i) => {
                  const x = padL + (i / (chartData.length - 1)) * plotW;
                  const y = padT + plotH - (d.volume / maxVol) * plotH;
                  const isLast = i === chartData.length - 1;
                  return (
                    <g key={d.date}>
                      {isLast && <circle cx={x} cy={y} r="8" fill="#22c55e" fillOpacity="0.15" />}
                      <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill="#22c55e"
                        stroke={isLast ? '#f8fafc' : '#1e293b'} strokeWidth={isLast ? 2 : 1} />
                      {isLast && <text x={x} y={y - 12} fontSize="11" fill="#22c55e" fontWeight="700"
                        textAnchor="middle">{d.volume.toLocaleString()} kg</text>}
                      <text x={x} y={vH - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">{d.date.slice(5)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      )}

      {/* ── Pre-built Workout Plans ── */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '1rem' }}>Workout Plans</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          New to training? Pick a plan and load any day directly into today's session.
        </p>
        <div className="plans-grid">
          {WORKOUT_PLANS.map(plan => (
            <div key={plan.id} className="plan-card">
              <div className="plan-card-header" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}>
                <div className="plan-icon">{plan.icon}</div>
                <div className="plan-info">
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-freq">{plan.freq}</div>
                </div>
                <span className="plan-chevron">{expandedPlan === plan.id ? '▲' : '▼'}</span>
              </div>
              {expandedPlan === plan.id && (
                <div className="plan-body">
                  <p className="plan-desc">{plan.desc}</p>
                  <div className="plan-days">
                    {plan.days.map(day => (
                      <div key={day.name} className="plan-day">
                        <div className="plan-day-header">
                          <span className="plan-day-name">{day.name}</span>
                          <button className="btn-primary btn-sm" onClick={() => loadPlanDay(day.exercises)}>
                            Load Today
                          </button>
                        </div>
                        <div className="plan-exercises">
                          {day.exercises.map(ex => (
                            <span
                              key={ex}
                              className="plan-exercise-chip"
                              title="Click for swap suggestions"
                              onClick={() => setSwapExercise(ex)}
                              style={{ cursor: 'pointer' }}
                            >
                              {ex} <span style={{ opacity: 0.5, fontSize: '0.7em' }}>↔</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
