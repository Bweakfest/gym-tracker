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

// --- User Management ---
app.put('/api/user', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const { error } = await supabase.from('users').update({ name: name.trim() }).eq('id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.put('/api/user/password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const { data: user } = await supabase.from('users').select('*').eq('id', req.userId).single();
  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from('users').update({ password: hashed }).eq('id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/api/user', authenticate, async (req, res) => {
  // Delete all user data, then the user
  await Promise.all([
    supabase.from('workouts').delete().eq('user_id', req.userId),
    supabase.from('meals').delete().eq('user_id', req.userId),
    supabase.from('weights').delete().eq('user_id', req.userId),
    supabase.from('goals').delete().eq('user_id', req.userId),
    supabase.from('workout_templates').delete().eq('user_id', req.userId),
    supabase.from('body_measurements').delete().eq('user_id', req.userId),
    supabase.from('chat_history').delete().eq('user_id', req.userId),
  ]);
  const { error } = await supabase.from('users').delete().eq('id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
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

app.get('/api/workouts/volume', authenticate, async (req, res) => {
  const exercise = req.query.exercise;
  if (!exercise) return res.status(400).json({ error: 'exercise query param required' });
  const { data } = await supabase
    .from('workouts')
    .select('date, sets, reps, weight')
    .eq('user_id', req.userId)
    .eq('exercise', exercise)
    .order('date', { ascending: true });
  const byDate = {};
  (data || []).forEach(w => {
    const vol = (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
    byDate[w.date] = (byDate[w.date] || 0) + vol;
  });
  res.json(Object.entries(byDate).map(([date, volume]) => ({ date, volume })));
});

app.put('/api/workouts/:id', authenticate, async (req, res) => {
  const { exercise, sets, reps, weight } = req.body;
  const updates = {};
  if (exercise !== undefined) updates.exercise = exercise;
  if (sets !== undefined) updates.sets = sets ? Number(sets) : null;
  if (reps !== undefined) updates.reps = reps ? Number(reps) : null;
  if (weight !== undefined) updates.weight = weight ? Number(weight) : null;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', Number(req.params.id))
    .eq('user_id', req.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/workouts/:id', authenticate, async (req, res) => {
  await supabase.from('workouts').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

// --- Workout Templates ---
app.get('/api/templates', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/api/templates', authenticate, async (req, res) => {
  const { name, exercises } = req.body;
  if (!name || !exercises || !exercises.length) return res.status(400).json({ error: 'Name and exercises required' });
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id: req.userId, name, exercises })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/templates/:id/load', authenticate, async (req, res) => {
  const { data: tpl } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', Number(req.params.id))
    .eq('user_id', req.userId)
    .single();
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const rows = tpl.exercises.map(ex => ({
    user_id: req.userId,
    exercise: ex.exercise,
    sets: ex.sets ? Number(ex.sets) : null,
    reps: ex.reps ? Number(ex.reps) : null,
    weight: ex.weight ? Number(ex.weight) : null,
    date: today,
  }));
  const { data, error } = await supabase.from('workouts').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/templates/:id', authenticate, async (req, res) => {
  await supabase.from('workout_templates').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
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

app.post('/api/meals/repeat-yesterday', authenticate, async (req, res) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const yd = new Date(now); yd.setDate(now.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
  const { data: yMeals } = await supabase.from('meals').select('*').eq('user_id', req.userId).eq('date', yesterday);
  if (!yMeals || yMeals.length === 0) return res.status(404).json({ error: 'No meals found from yesterday' });
  const rows = yMeals.map(m => ({
    user_id: req.userId, name: m.name, calories: m.calories, protein: m.protein,
    carbs: m.carbs, fat: m.fat, meal_type: m.meal_type, date: today,
  }));
  const { data, error } = await supabase.from('meals').insert(rows).select();
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

// --- Body Measurements ---
app.get('/api/measurements', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false });
  res.json(data || []);
});

app.post('/api/measurements', authenticate, async (req, res) => {
  const { date, waist, chest, arms, hips, thighs } = req.body;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: req.userId,
      date: date || today,
      waist: waist ? Number(waist) : null,
      chest: chest ? Number(chest) : null,
      arms: arms ? Number(arms) : null,
      hips: hips ? Number(hips) : null,
      thighs: thighs ? Number(thighs) : null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/measurements/:id', authenticate, async (req, res) => {
  await supabase.from('body_measurements').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
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
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

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

  // Weekly trend (last 7 days: calories + weight per day)
  const weeklyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayCal = userMeals.filter(m => m.date === ds).reduce((s, m) => s + (m.calories || 0), 0);
    const dayWeight = userWeights.filter(w => w.date === ds).map(w => w.weight)[0] || null;
    weeklyTrend.push({ date: ds, label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], calories: dayCal, weight: dayWeight });
  }

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
    weeklyTrend,
  });
});

// --- Chat History ---
app.get('/api/chat', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: true })
    .limit(100);
  res.json(data || []);
});

app.delete('/api/chat', authenticate, async (req, res) => {
  await supabase.from('chat_history').delete().eq('user_id', req.userId);
  res.json({ success: true });
});

// --- AI Coach (Claude API) ---
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.post('/api/coach', authenticate, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  // Gather user context
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const [userRes, goalRes, mealsRes, workoutsRes, weightsRes, chatRes] = await Promise.all([
    supabase.from('users').select('name').eq('id', req.userId).single(),
    supabase.from('goals').select('*').eq('id', req.userId).single(),
    supabase.from('meals').select('*').eq('user_id', req.userId).order('date', { ascending: false }).limit(20),
    supabase.from('workouts').select('*').eq('user_id', req.userId).order('date', { ascending: false }).limit(20),
    supabase.from('weights').select('*').eq('user_id', req.userId).order('date', { ascending: false }).limit(10),
    supabase.from('chat_history').select('role, text').eq('user_id', req.userId).order('created_at', { ascending: true }).limit(20),
  ]);

  const user = userRes.data;
  const goalData = goalRes.data;
  const meals = mealsRes.data || [];
  const workouts = workoutsRes.data || [];
  const weights = weightsRes.data || [];
  const history = chatRes.data || [];

  const todayMeals = meals.filter(m => m.date === today);
  const todayCal = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const todayProt = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const todayCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const todayFat = todayMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const todayWorkouts = workouts.filter(w => w.date === today);
  const latestWeight = weights[0]?.weight || null;

  const goal = goalData ? {
    dailyCalories: goalData.daily_calories,
    dailyProtein: goalData.daily_protein,
    dailyCarbs: goalData.daily_carbs,
    dailyFat: goalData.daily_fat,
    goalType: goalData.goal_type,
    targetWeight: goalData.target_weight,
  } : null;

  const systemPrompt = `You are an AI fitness coach in the FitTrack app. You give practical, evidence-based advice about training, nutrition, recipes, programs, and recovery. Be conversational, supportive, and specific.

USER CONTEXT (use this to personalize your answers):
- Name: ${user?.name || 'User'}
- Today: ${today}
${goal ? `- Goal: ${goal.goalType} (target ${goal.targetWeight} kg)
- Daily targets: ${goal.dailyCalories} kcal, ${goal.dailyProtein}g protein, ${goal.dailyCarbs || '?'}g carbs, ${goal.dailyFat || '?'}g fat` : '- No calorie/macro goals set yet'}
${latestWeight ? `- Latest weight: ${latestWeight} kg` : ''}
- Today's intake so far: ${todayCal} kcal, ${todayProt}g protein, ${todayCarbs}g carbs, ${todayFat}g fat (${todayMeals.length} meals logged)
${goal ? `- Remaining today: ${Math.max(0, goal.dailyCalories - todayCal)} kcal, ${Math.max(0, goal.dailyProtein - todayProt)}g protein` : ''}
- Today's workouts: ${todayWorkouts.length > 0 ? todayWorkouts.map(w => `${w.exercise} ${w.sets}x${w.reps}@${w.weight}kg`).join(', ') : 'None yet'}
- Recent workouts: ${workouts.slice(0, 5).map(w => `${w.date}: ${w.exercise}`).join(', ') || 'None'}

GUIDELINES:
- Reference the user's actual data when relevant (e.g., "you've eaten 1200 kcal so far, you still need about 600 more")
- Keep responses concise but helpful (2-4 paragraphs max for most questions)
- Use **bold** for emphasis
- If they ask about their data and nothing is logged, suggest they log it
- Be encouraging but honest`;

  // Save user message to history
  await supabase.from('chat_history').insert({ user_id: req.userId, role: 'user', text: message });

  // Build conversation messages from history
  const conversationMessages = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.text,
  }));
  conversationMessages.push({ role: 'user', content: message });

  // Call Claude API
  if (!ANTHROPIC_API_KEY) {
    // Fallback: no API key configured
    const reply = `I'd love to give you a personalized AI answer, but the Claude API key hasn't been configured yet.\n\n**To enable AI responses:**\nSet the \`ANTHROPIC_API_KEY\` environment variable before starting the server:\n\`\`\`\nANTHROPIC_API_KEY=sk-ant-... node server/index.js\n\`\`\`\n\nIn the meantime, I can still help! Here's what I know about your day:\n- **Calories:** ${todayCal}/${goal?.dailyCalories || '?'} kcal\n- **Protein:** ${todayProt}/${goal?.dailyProtein || '?'}g\n- **Workouts today:** ${todayWorkouts.length > 0 ? todayWorkouts.map(w => w.exercise).join(', ') : 'None yet'}`;
    await supabase.from('chat_history').insert({ user_id: req.userId, role: 'coach', text: reply });
    return res.json({ reply });
  }

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationMessages.slice(-20),
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Claude API error:', apiRes.status, errText);
      const fallback = `Sorry, I had trouble connecting to my AI brain (${apiRes.status}). But based on your data:\n\n- You've eaten **${todayCal} kcal** today${goal ? ` out of ${goal.dailyCalories}` : ''}.\n- Protein: **${todayProt}g**${goal ? ` / ${goal.dailyProtein}g target` : ''}\n\nTry asking again in a moment!`;
      await supabase.from('chat_history').insert({ user_id: req.userId, role: 'coach', text: fallback });
      return res.json({ reply: fallback });
    }

    const data = await apiRes.json();
    const reply = data.content?.[0]?.text || 'Sorry, I couldn\'t generate a response.';

    // Save coach reply to history
    await supabase.from('chat_history').insert({ user_id: req.userId, role: 'coach', text: reply });
    res.json({ reply });
  } catch (err) {
    console.error('Coach API error:', err);
    const fallback = `I encountered an error, but here's your quick status:\n\n- **Calories today:** ${todayCal}${goal ? `/${goal.dailyCalories}` : ''} kcal\n- **Protein:** ${todayProt}${goal ? `/${goal.dailyProtein}` : ''}g\n- **Workouts:** ${todayWorkouts.length} session${todayWorkouts.length !== 1 ? 's' : ''}`;
    await supabase.from('chat_history').insert({ user_id: req.userId, role: 'coach', text: fallback });
    res.json({ reply: fallback });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
