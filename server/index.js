import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Supabase connection
const supabase = createClient(
  'https://xyiazejzvrppbwiosmtg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aWF6ZWp6dnJwcGJ3aW9zbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODQ5MzYsImV4cCI6MjA5MTE2MDkzNn0.SyCok-oRhHv_4degUs6YFN5IN3pPRZZ3P_i8or0l9n0'
);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'gym-project-secret-change-in-production';

app.use(cors());
app.use(express.json());

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, password: hashed })
    .select('id, name, email')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/me', authenticate, async (req, res) => {
  const { data: user } = await supabase.from('users').select('id, name, email').eq('id', req.userId).single();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// --- Workout Routes ---
app.get('/api/workouts', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false });
  res.json(data || []);
});

app.post('/api/workouts', authenticate, async (req, res) => {
  const { exercise, sets, reps, weight, duration, notes, date } = req.body;
  if (!exercise) return res.status(400).json({ error: 'Exercise name is required' });

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: req.userId,
      exercise,
      sets: sets ? Number(sets) : null,
      reps: reps ? Number(reps) : null,
      weight: weight ? Number(weight) : null,
      duration: duration ? Number(duration) : null,
      notes: notes || null,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/workouts/:id', authenticate, async (req, res) => {
  await supabase.from('workouts').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

// --- Meal Routes ---
app.get('/api/meals', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false });
  res.json(data || []);
});

app.post('/api/meals', authenticate, async (req, res) => {
  const { name, calories, protein, carbs, fat, meal_type, date } = req.body;
  if (!name) return res.status(400).json({ error: 'Meal name is required' });

  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: req.userId,
      name,
      calories: calories ? Number(calories) : null,
      protein: protein ? Number(protein) : null,
      carbs: carbs ? Number(carbs) : null,
      fat: fat ? Number(fat) : null,
      meal_type: meal_type || null,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/meals/:id', authenticate, async (req, res) => {
  await supabase.from('meals').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

// --- Weight Routes ---
app.get('/api/weights', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('weights')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false });
  res.json(data || []);
});

app.post('/api/weights', authenticate, async (req, res) => {
  const { weight, date } = req.body;
  if (!weight) return res.status(400).json({ error: 'Weight is required' });

  const { data, error } = await supabase
    .from('weights')
    .insert({
      user_id: req.userId,
      weight: Number(weight),
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/weights/:id', authenticate, async (req, res) => {
  await supabase.from('weights').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

// --- Goals ---
app.get('/api/goals', authenticate, async (req, res) => {
  const { data } = await supabase.from('goals').select('*').eq('user_id', req.userId).single();
  if (data) {
    res.json({
      id: data.id,
      user_id: data.user_id,
      currentWeight: data.current_weight,
      targetWeight: data.target_weight,
      weeks: data.weeks,
      dailyCalories: data.daily_calories,
      dailyProtein: data.daily_protein,
      dailyCarbs: data.daily_carbs,
      dailyFat: data.daily_fat,
      gender: data.gender,
      age: data.age,
      height: data.height,
      sport: data.sport,
      activity: data.activity,
      goalType: data.goal_type,
    });
  } else {
    res.json(null);
  }
});

app.post('/api/goals', authenticate, async (req, res) => {
  const { currentWeight, targetWeight, weeks, dailyCalories, dailyProtein, dailyCarbs, dailyFat, gender, age, height, sport, activity, goalType } = req.body;

  await supabase.from('goals').delete().eq('user_id', req.userId);

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: req.userId,
      current_weight: Number(currentWeight),
      target_weight: Number(targetWeight),
      weeks: Number(weeks),
      daily_calories: Number(dailyCalories),
      daily_protein: Number(dailyProtein),
      daily_carbs: dailyCarbs ? Number(dailyCarbs) : null,
      daily_fat: dailyFat ? Number(dailyFat) : null,
      gender: gender || 'male',
      age: age ? Number(age) : null,
      height: height ? Number(height) : null,
      sport: sport != null ? Number(sport) : 0,
      activity: activity ? Number(activity) : 1.5,
      goal_type: goalType || 'gain',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    id: data.id,
    user_id: data.user_id,
    currentWeight: data.current_weight,
    targetWeight: data.target_weight,
    weeks: data.weeks,
    dailyCalories: data.daily_calories,
    dailyProtein: data.daily_protein,
    dailyCarbs: data.daily_carbs,
    dailyFat: data.daily_fat,
    gender: data.gender,
    age: data.age,
    height: data.height,
    sport: data.sport,
    activity: data.activity,
    goalType: data.goal_type,
  });
});

// --- Dashboard Stats ---
app.get('/api/stats', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Fetch all user data in parallel
  const [workoutsRes, mealsRes, weightsRes, goalRes] = await Promise.all([
    supabase.from('workouts').select('*').eq('user_id', req.userId),
    supabase.from('meals').select('*').eq('user_id', req.userId),
    supabase.from('weights').select('*').eq('user_id', req.userId),
    supabase.from('goals').select('*').eq('user_id', req.userId).single(),
  ]);

  const userWorkouts = workoutsRes.data || [];
  const userMeals = mealsRes.data || [];
  const userWeights = weightsRes.data || [];
  const goalData = goalRes.data;

  // Streak calculation
  let streak = 0;
  const workoutDates = [...new Set(userWorkouts.map(w => w.date))].sort((a, b) => b.localeCompare(a));
  if (workoutDates.length > 0) {
    const d = new Date(today);
    const todayStr = d.toISOString().split('T')[0];
    const yesterday = new Date(d); yesterday.setDate(d.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (workoutDates.includes(todayStr) || workoutDates.includes(yStr)) {
      const start = workoutDates.includes(todayStr) ? d : yesterday;
      for (let i = 0; i < 365; i++) {
        const check = new Date(start); check.setDate(start.getDate() - i);
        if (workoutDates.includes(check.toISOString().split('T')[0])) streak++;
        else break;
      }
    }
  }

  // Weekly grid
  const weekDays = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    weekDays.push({ date: ds, day: ['SUN','MON','TUE','WED','THU','FRI','SAT'][i], trained: workoutDates.includes(ds), isToday: ds === today });
  }

  // PRs (heaviest weight per exercise)
  const prs = {};
  userWorkouts.forEach(w => {
    if (w.weight && (!prs[w.exercise] || w.weight > prs[w.exercise])) prs[w.exercise] = w.weight;
  });
  const prList = Object.entries(prs).map(([exercise, weight]) => ({ exercise, weight })).sort((a, b) => b.weight - a.weight).slice(0, 4);

  // Today's macros
  const todayMeals = userMeals.filter(m => m.date === today);
  const todayCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const todayCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const todayFat = todayMeals.reduce((s, m) => s + (m.fat || 0), 0);

  // Volume today
  const todayVolume = userWorkouts.filter(w => w.date === today).reduce((s, w) => s + ((w.sets || 0) * (w.reps || 0) * (w.weight || 0)), 0);

  // Map goal to camelCase
  const goal = goalData ? {
    id: goalData.id,
    user_id: goalData.user_id,
    currentWeight: goalData.current_weight,
    targetWeight: goalData.target_weight,
    weeks: goalData.weeks,
    dailyCalories: goalData.daily_calories,
    dailyProtein: goalData.daily_protein,
    dailyCarbs: goalData.daily_carbs,
    dailyFat: goalData.daily_fat,
    goalType: goalData.goal_type,
  } : null;

  res.json({
    totalWorkouts: userWorkouts.length,
    todayWorkouts: userWorkouts.filter(w => w.date === today).length,
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    totalMeals: userMeals.length,
    recentWorkouts: [...userWorkouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    recentMeals: [...userMeals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    streak,
    weekDays,
    prs: prList,
    todayVolume,
    goal,
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
