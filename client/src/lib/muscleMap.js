export const exerciseMap = {
  bench_press: {
    primary: ['chest'],
    secondary: ['triceps_left', 'triceps_right', 'shoulder_left', 'shoulder_right'],
  },
  squat: {
    primary: ['quads_left', 'quads_right'],
    secondary: ['glutes'],
  },
  pull_up: {
    primary: ['lats'],
    secondary: ['biceps_left', 'biceps_right'],
  },
  overhead_press: {
    primary: ['shoulder_left', 'shoulder_right'],
    secondary: ['triceps_left', 'triceps_right', 'chest'],
  },
  deadlift: {
    primary: ['lats', 'glutes'],
    secondary: ['quads_left', 'quads_right'],
  },
  bicep_curl: {
    primary: ['biceps_left', 'biceps_right'],
    secondary: [],
  },
};
