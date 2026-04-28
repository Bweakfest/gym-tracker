import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// override: true ensures the .env file takes precedence over any stale
// env vars inherited from the parent shell (common on Windows).
dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'),
  override: true,
});
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

// --- Config from env vars (with dev fallbacks) ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyiazejzvrppbwiosmtg.supabase.co';
// Prefer service_role on the backend so RLS can be locked down for the anon role.
// Falls back to anon for local dev if SERVICE_ROLE isn't set.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aWF6ZWp6dnJwcGJ3aW9zbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODQ5MzYsImV4cCI6MjA5MTE2MDkzNn0.SyCok-oRhHv_4degUs6YFN5IN3pPRZZ3P_i8or0l9n0';
const JWT_SECRET = process.env.JWT_SECRET || 'gym-project-secret-change-in-production';
const PORT = process.env.PORT || 3001;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Email provider (Brevo via SMTP). If SMTP isn't configured, reset links are
// logged to the server console instead so dev still works without credentials.
const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
const BREVO_SMTP_PORT = Number(process.env.BREVO_SMTP_PORT) || 587;
const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER;
const BREVO_SMTP_KEY = process.env.BREVO_SMTP_KEY;
const MAIL_FROM = process.env.MAIL_FROM || 'PumpTracker <noreply@pumptracker.org>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Web Push (VAPID) for rest-timer background notifications.
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BCdFt7TbHadyZ9wQJKcsnjl1uNOjw00V422SQ5CV7D_vOopgiBeXdfbeQL7lsRq-3CtJo0srS2oRvBd4QDYk_o8';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '6v6pMe2gG6ylhVuPqawFbsoEOoAbD4_NgD2OyWqtvWI';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@pumptracker.org';
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

// In-memory store for pending rest timers. Each entry: { userId, subscription, fireAt, timer }
const pendingRestTimers = new Map();

const mailer = (BREVO_SMTP_USER && BREVO_SMTP_KEY)
  ? nodemailer.createTransport({
      host: BREVO_SMTP_HOST,
      port: BREVO_SMTP_PORT,
      secure: BREVO_SMTP_PORT === 465, // true for 465, false (STARTTLS) for 587
      auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_KEY },
    })
  : null;

const app = express();

// Behind Fly.io's edge proxy (and optionally Cloudflare). Trust exactly one
// hop so express-rate-limit can read the real client IP from X-Forwarded-For
// without opening the door to header spoofing.
app.set('trust proxy', 1);

// --- Security middleware ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again in 15 minutes' } });
const coachLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Coach rate limit reached, try again in a minute' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api/', apiLimiter);

// --- Validation helpers ---
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function safeStr(v, max = 500) { return typeof v === 'string' ? v.slice(0, max).trim() : ''; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

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
app.post('/api/register', authLimiter, async (req, res) => {
  const name = safeStr(req.body.name, 100);
  const email = safeStr(req.body.email, 200).toLowerCase();
  const password = req.body.password;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

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

app.post('/api/login', authLimiter, async (req, res) => {
  const email = safeStr(req.body.email, 200).toLowerCase();
  const password = req.body.password;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

  const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, photo: user.photo } });
});

// --- Password reset ---
// Request a reset link. Always returns a generic success response to avoid revealing
// which emails are registered (prevents user enumeration).
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const email = safeStr(req.body.email, 200).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const genericResponse = { success: true, message: 'If that email is registered, we sent a reset link.' };

  const { data: user } = await supabase.from('users').select('id, email, name').eq('email', email).single();
  if (!user) return res.json(genericResponse);

  // Invalidate any previously issued, still-active reset tokens for this user
  await supabase
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('used_at', null);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const { error: insertErr } = await supabase
    .from('password_resets')
    .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });
  if (insertErr) {
    console.error('password_resets insert error:', insertErr.message);
    return res.status(500).json({ error: 'Could not create reset link. Try again later.' });
  }

  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: MAIL_FROM,
        to: user.email,
        subject: 'Reset your PumpTracker password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #18181b;">
            <h1 style="color: #7c3aed; margin-bottom: 8px;">Reset your password</h1>
            <p>Hi ${user.name || 'there'},</p>
            <p>We received a request to reset the password for your PumpTracker account. Click the button below to choose a new password. This link expires in 1 hour.</p>
            <p style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
            </p>
            <p style="font-size: 0.85rem; color: #71717a;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #7c3aed; word-break: break-all;">${resetUrl}</a></p>
            <p style="font-size: 0.85rem; color: #71717a; margin-top: 24px;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Brevo SMTP send error:', mailErr);
      // Fall through: still return generic success so enumeration is prevented.
    }
  } else {
    console.log(`[password-reset] Dev mode (no BREVO_SMTP_KEY). Reset link for ${user.email}: ${resetUrl}`);
  }

  res.json(genericResponse);
});

// Consume a reset token and set a new password.
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const token = safeStr(req.body.token, 200);
  const newPassword = req.body.newPassword;
  if (!token) return res.status(400).json({ error: 'Reset token is required' });
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: resetRow } = await supabase
    .from('password_resets')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single();

  if (!resetRow || resetRow.used_at || new Date(resetRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const { error: updateErr } = await supabase
    .from('users')
    .update({ password: hashed })
    .eq('id', resetRow.user_id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  await supabase
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', resetRow.id);

  res.json({ success: true, message: 'Password updated. You can now sign in.' });
});

app.get('/api/me', authenticate, async (req, res) => {
  const { data: user } = await supabase.from('users').select('id, name, email, photo').eq('id', req.userId).single();
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

app.put('/api/user/photo', authenticate, async (req, res) => {
  const { photo } = req.body;
  if (photo && (typeof photo !== 'string' || !photo.startsWith('data:image/') || photo.length > 500000)) {
    return res.status(400).json({ error: 'Invalid photo. Must be a data:image/ URL under 500KB.' });
  }
  const { error } = await supabase.from('users').update({ photo: photo || null }).eq('id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, photo: photo || null });
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
    supabase.from('session_notes').delete().eq('user_id', req.userId),
    supabase.from('progression_rules').delete().eq('user_id', req.userId),
    supabase.from('routines').delete().eq('user_id', req.userId),
    supabase.from('recipes').delete().eq('user_id', req.userId),
  ]);
  const { error } = await supabase.from('users').delete().eq('id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Workout Routes ---
app.get('/api/workouts', authenticate, async (req, res) => {
  const limit = Math.min(safeNum(req.query.limit) || 500, 1000);
  const offset = safeNum(req.query.offset) || 0;
  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);
  res.json(data || []);
});

app.post('/api/workouts', authenticate, async (req, res) => {
  const exercise = safeStr(req.body.exercise, 200);
  if (!exercise) return res.status(400).json({ error: 'Exercise name is required' });

  // Support per-set data (Lyfta-style)
  const setsData = Array.isArray(req.body.sets_data) ? req.body.sets_data : null;
  const derivedSets = setsData ? setsData.length : safeNum(req.body.sets);
  const derivedReps = setsData && setsData.length > 0
    ? Math.round(setsData.reduce((s, r) => s + (Number(r.reps) || 0), 0) / setsData.length)
    : safeNum(req.body.reps);
  const derivedWeight = setsData && setsData.length > 0
    ? Math.max(...setsData.map(r => Number(r.weight) || 0))
    : safeNum(req.body.weight);

  // Cardio entries use sets_data for duration/distance/calories instead of reps/weight
  const isCardio = req.body.is_cardio === true;

  // Validation: reject zero/negative values that pollute stats
  if (!isCardio) {
    if (derivedReps != null && derivedReps < 0) return res.status(400).json({ error: 'Reps must be positive' });
    if (derivedWeight != null && derivedWeight < 0) return res.status(400).json({ error: 'Weight must be non-negative' });
    if (setsData && setsData.every(s => (Number(s.reps) || 0) === 0 && (Number(s.weight) || 0) === 0)) {
      return res.status(400).json({ error: 'At least one set must have reps or weight logged' });
    }
  } else {
    // Cardio must have duration
    if (!setsData || !setsData[0] || !setsData[0].duration_min) {
      return res.status(400).json({ error: 'Cardio entries require a duration' });
    }
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: req.userId,
      exercise,
      sets: derivedSets,
      reps: derivedReps,
      weight: derivedWeight,
      sets_data: setsData,
      muscle_group: safeStr(req.body.muscle_group, 50) || null,
      duration: safeNum(req.body.duration),
      notes: safeStr(req.body.notes, 1000) || null,
      date: req.body.date || todayStr(),
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

// --- Superset (must be above /workouts/:id to avoid Express matching "superset" as :id) ---
app.put('/api/workouts/superset', authenticate, async (req, res) => {
  const workoutIds = Array.isArray(req.body.workout_ids) ? req.body.workout_ids : [];
  const supersetGroup = safeNum(req.body.superset_group);
  if (workoutIds.length === 0 || supersetGroup === null) {
    return res.status(400).json({ error: 'workout_ids array and superset_group number are required' });
  }
  const { data, error } = await supabase
    .from('workouts')
    .update({ superset_group: supersetGroup })
    .in('id', workoutIds.map(Number))
    .eq('user_id', req.userId)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/workouts/superset/unlink/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('workouts')
    .update({ superset_group: null })
    .eq('id', Number(req.params.id))
    .eq('user_id', req.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/workouts/:id', authenticate, async (req, res) => {
  const { exercise, sets, reps, weight, sets_data } = req.body;
  const updates = {};
  if (exercise !== undefined) updates.exercise = exercise;

  if (Array.isArray(sets_data)) {
    updates.sets_data = sets_data;
    updates.sets = sets_data.length;
    updates.reps = sets_data.length > 0
      ? Math.round(sets_data.reduce((s, r) => s + (Number(r.reps) || 0), 0) / sets_data.length)
      : null;
    updates.weight = sets_data.length > 0
      ? Math.max(...sets_data.map(r => Number(r.weight) || 0))
      : null;
  } else {
    if (sets !== undefined) updates.sets = sets ? Number(sets) : null;
    if (reps !== undefined) updates.reps = reps ? Number(reps) : null;
    if (weight !== undefined) updates.weight = weight ? Number(weight) : null;
  }

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
  const limit = Math.min(safeNum(req.query.limit) || 500, 1000);
  const offset = safeNum(req.query.offset) || 0;
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);
  res.json(data || []);
});

app.post('/api/meals', authenticate, async (req, res) => {
  const name = safeStr(req.body.name, 300);
  if (!name) return res.status(400).json({ error: 'Meal name is required' });

  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: req.userId,
      name,
      calories: safeNum(req.body.calories),
      protein: safeNum(req.body.protein),
      carbs: safeNum(req.body.carbs),
      fat: safeNum(req.body.fat),
      meal_type: safeStr(req.body.meal_type, 50) || null,
      date: req.body.date || todayStr(),
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

// --- Recipes ---
// Validate a photo data URL using the same rule as users.photo.
function validatePhoto(photo) {
  if (photo == null || photo === '') return { ok: true, value: null };
  if (typeof photo !== 'string' || !photo.startsWith('data:image/') || photo.length > 500000) {
    return { ok: false };
  }
  return { ok: true, value: photo };
}

app.get('/api/recipes', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/recipes', authenticate, async (req, res) => {
  const title = safeStr(req.body.title, 300);
  if (!title) return res.status(400).json({ error: 'Recipe title is required' });

  const photoCheck = validatePhoto(req.body.photo);
  if (!photoCheck.ok) {
    return res.status(400).json({ error: 'Invalid photo. Must be a data:image/ URL under 500KB.' });
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: req.userId,
      title,
      ingredients: safeStr(req.body.ingredients, 5000) || null,
      instructions: safeStr(req.body.instructions, 10000) || null,
      photo: photoCheck.value,
      calories: safeNum(req.body.calories),
      protein: safeNum(req.body.protein),
      carbs: safeNum(req.body.carbs),
      fat: safeNum(req.body.fat),
      servings: safeNum(req.body.servings) || 1,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/recipes/:id', authenticate, async (req, res) => {
  const update = {};
  if (req.body.title !== undefined) {
    const title = safeStr(req.body.title, 300);
    if (!title) return res.status(400).json({ error: 'Recipe title cannot be empty' });
    update.title = title;
  }
  if (req.body.ingredients !== undefined) update.ingredients = safeStr(req.body.ingredients, 5000) || null;
  if (req.body.instructions !== undefined) update.instructions = safeStr(req.body.instructions, 10000) || null;
  if (req.body.photo !== undefined) {
    const photoCheck = validatePhoto(req.body.photo);
    if (!photoCheck.ok) {
      return res.status(400).json({ error: 'Invalid photo. Must be a data:image/ URL under 500KB.' });
    }
    update.photo = photoCheck.value;
  }
  if (req.body.calories !== undefined) update.calories = safeNum(req.body.calories);
  if (req.body.protein !== undefined) update.protein = safeNum(req.body.protein);
  if (req.body.carbs !== undefined) update.carbs = safeNum(req.body.carbs);
  if (req.body.fat !== undefined) update.fat = safeNum(req.body.fat);
  if (req.body.servings !== undefined) update.servings = safeNum(req.body.servings) || 1;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('recipes')
    .update(update)
    .eq('id', Number(req.params.id))
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Recipe not found' });
  res.json(data);
});

app.delete('/api/recipes/:id', authenticate, async (req, res) => {
  await supabase.from('recipes').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
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
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) {
    return res.status(400).json({ error: 'Weight must be a positive number' });
  }
  if (w > 500) {
    return res.status(400).json({ error: 'Weight seems unrealistic (>500 kg)' });
  }

  const { data, error } = await supabase
    .from('weights')
    .insert({
      user_id: req.userId,
      weight: w,
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

  // Parse — accept 0 as a real value (ternary above rejected it) and empty → null
  const parseNum = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const row = {
    user_id: req.userId,
    date: date || today,
    waist: parseNum(waist),
    chest: parseNum(chest),
    arms: parseNum(arms),
    hips: parseNum(hips),
    thighs: parseNum(thighs),
  };

  // Require at least one measurement
  const hasAny = ['waist', 'chest', 'arms', 'hips', 'thighs'].some(k => row[k] !== null);
  if (!hasAny) return res.status(400).json({ error: 'Enter at least one measurement' });

  // Check for an existing measurement on the same date — update if found, insert otherwise.
  // This avoids unique-constraint violations and lets the user refine a day's numbers.
  const { data: existing } = await supabase
    .from('body_measurements')
    .select('id')
    .eq('user_id', req.userId)
    .eq('date', row.date)
    .maybeSingle();

  if (existing && existing.id) {
    // Only update fields the user actually provided. Preserves previously logged
    // values on the same date so a later submit that only fills one field doesn't
    // wipe the rest.
    const patch = {};
    for (const key of ['waist', 'chest', 'arms', 'hips', 'thighs']) {
      if (row[key] !== null) patch[key] = row[key];
    }
    const { data, error } = await supabase
      .from('body_measurements')
      .update(patch)
      .eq('id', existing.id)
      .eq('user_id', req.userId)
      .select()
      .single();
    if (error) {
      console.error('Measurement update error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  }

  const { data, error } = await supabase
    .from('body_measurements')
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('Measurement insert error:', error);
    return res.status(500).json({ error: error.message });
  }
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

  // Coerce to number; return null for empty/invalid values so Postgres gets
  // a real null instead of NaN (which violates constraints and is confusing)
  const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Require the minimum set of fields the UI always submits
  const cal = numOrNull(dailyCalories);
  const prot = numOrNull(dailyProtein);
  if (cal == null || prot == null) {
    return res.status(400).json({ error: 'dailyCalories and dailyProtein are required' });
  }

  // Defense-in-depth: reject anything outside a physiologically reasonable
  // range. Slightly wider than the client clamp [1200, 5000] so legitimate
  // client-clamped values are never rejected by rounding.
  if (cal < 1000 || cal > 6000) {
    return res.status(400).json({ error: 'dailyCalories out of safe range (1000–6000)' });
  }
  if (prot < 0 || prot > 500) {
    return res.status(400).json({ error: 'dailyProtein out of safe range (0–500g)' });
  }

  // Upsert: safer than delete+insert (no data-loss race condition on failure)
  const { data, error } = await supabase
    .from('goals')
    .upsert({
      user_id: req.userId,
      current_weight: numOrNull(currentWeight),
      target_weight: numOrNull(targetWeight),
      weeks: numOrNull(weeks),
      daily_calories: cal,
      daily_protein: prot,
      daily_carbs: numOrNull(dailyCarbs),
      daily_fat: numOrNull(dailyFat),
      gender: gender || 'male',
      age: numOrNull(age),
      height: numOrNull(height),
      sport: numOrNull(sport) ?? 0,
      activity: numOrNull(activity) ?? 1.5,
      goal_type: goalType || 'gain',
    }, { onConflict: 'user_id' })
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
    supabase.from('goals').select('*').eq('user_id', req.userId).maybeSingle(),
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

  // Weekly grid (Monday-first, ISO 8601)
  const weekDays = [];
  const startOfWeek = new Date(today);
  // getDay(): 0=Sun, 1=Mon... Convert to Mon-first: offset = (day + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    weekDays.push({ date: ds, day: ['MON','TUE','WED','THU','FRI','SAT','SUN'][i], trained: workoutDates.includes(ds), isToday: ds === today });
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

  // Heatmap data (last 12 weeks of workout activity)
  const heatmapData = [];
  const heatmapStart = new Date(now);
  heatmapStart.setDate(heatmapStart.getDate() - 84); // 12 weeks
  const workoutsByDate = {};
  userWorkouts.forEach(w => {
    if (!workoutsByDate[w.date]) workoutsByDate[w.date] = { count: 0, volume: 0 };
    workoutsByDate[w.date].count++;
    if (w.sets_data && w.sets_data.length > 0) {
      workoutsByDate[w.date].volume += w.sets_data.reduce((s, sd) => s + (Number(sd.reps) || 0) * (Number(sd.weight) || 0), 0);
    } else {
      workoutsByDate[w.date].volume += (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
    }
  });
  for (const [date, info] of Object.entries(workoutsByDate)) {
    if (date >= `${heatmapStart.getFullYear()}-${String(heatmapStart.getMonth()+1).padStart(2,'0')}-${String(heatmapStart.getDate()).padStart(2,'0')}`) {
      heatmapData.push({ date, count: info.count, volume: info.volume });
    }
  }

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
    heatmapData,
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
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

// Startup visibility: the single biggest cause of "AI not working" is the
// server being launched before .env was populated, so a restart-required
// state stays silent. Log loudly at startup so it's obvious.
if (ANTHROPIC_API_KEY) {
  const tail = ANTHROPIC_API_KEY.slice(-6);
  console.log(`[AI] Claude API key loaded (model=${CLAUDE_MODEL}, key=...${tail})`);
} else {
  console.warn('[AI] ANTHROPIC_API_KEY missing — AI coach endpoints will return fallbacks. Add it to server/.env (local) or `fly secrets set ANTHROPIC_API_KEY=...` (prod), then restart the server.');
}

// Single call helper: retries 429 and 5xx with exponential backoff, fails fast
// on auth errors (no point retrying an invalid key), returns a structured
// result so each endpoint can craft its own fallback without duplicating fetch
// glue or swallowing the real failure reason.
async function callClaude({ system, messages, maxTokens = 1024, label = 'claude' }) {
  if (!ANTHROPIC_API_KEY) return { ok: false, reason: 'no_key' };
  const payload = JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages });
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: payload,
      });
      if (r.ok) {
        const data = await r.json();
        const text = data.content?.[0]?.text;
        if (text) return { ok: true, text };
        return { ok: false, reason: 'empty', status: r.status };
      }
      const errText = await r.text().catch(() => '');
      if (r.status === 401 || r.status === 403) {
        console.error(`[${label}] Claude auth failed (${r.status}) — key is invalid or revoked:`, errText.slice(0, 300));
        return { ok: false, reason: 'auth', status: r.status };
      }
      if (r.status === 429 || r.status >= 500) {
        last = { status: r.status, text: errText.slice(0, 200) };
        await new Promise(s => setTimeout(s, 400 * Math.pow(2, attempt)));
        continue;
      }
      console.error(`[${label}] Claude API error ${r.status}:`, errText.slice(0, 300));
      return { ok: false, reason: 'api_error', status: r.status };
    } catch (err) {
      last = { network: err.message };
      await new Promise(s => setTimeout(s, 400 * Math.pow(2, attempt)));
    }
  }
  console.error(`[${label}] Claude API exhausted retries:`, last);
  return { ok: false, reason: 'unavailable', detail: last };
}

// Human-readable fallback suffix that distinguishes "set the key" from
// "key is set but the call failed" — the old code showed the former in
// both cases and misled users into thinking the key was missing.
//
// `running_in_prod` lets us show the right fix-instructions to the user:
// on Fly.io the .env file is not deployed; secrets must be set via
// `fly secrets set`. We detect "prod" by checking FLY_APP_NAME which Fly
// injects into every machine automatically.
const RUNNING_IN_PROD = !!process.env.FLY_APP_NAME;
const SET_KEY_HINT = RUNNING_IN_PROD
  ? 'Run `fly secrets set ANTHROPIC_API_KEY=sk-ant-...` then wait ~30s for the app to redeploy.'
  : 'Add it to `server/.env` and restart the server.';

// Public status endpoint — reports whether the Claude key is configured,
// WITHOUT leaking the key itself. Safe to call unauthenticated so we can
// verify from a browser: https://pumptracker.org/api/coach/status
app.get('/api/coach/status', (req, res) => {
  res.json({
    configured: !!ANTHROPIC_API_KEY,
    model: ANTHROPIC_API_KEY ? CLAUDE_MODEL : null,
    env: RUNNING_IN_PROD ? 'prod' : 'local',
    // Last 4 chars only, so you can tell at a glance which key is loaded
    // without revealing the secret (matches the startup-log shape).
    keyTail: ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.slice(-4) : null,
  });
});

function aiFallbackSuffix(reason) {
  switch (reason) {
    case 'no_key':   return `_AI coach is disabled: ANTHROPIC_API_KEY is not set. ${SET_KEY_HINT}_`;
    case 'auth':     return `_AI coach auth failed — the API key is invalid or has been revoked. Rotate it at console.anthropic.com and update the ${RUNNING_IN_PROD ? 'Fly secret (`fly secrets set ANTHROPIC_API_KEY=...`)' : '`server/.env` file'}._`;
    case 'api_error':return '_AI coach request was rejected. Check server logs for details._';
    case 'empty':    return '_AI returned an empty response — try again._';
    case 'unavailable': return '_AI is temporarily unreachable (network or rate limit). Try again in a moment._';
    default:         return '_AI coach unavailable — try again in a moment._';
  }
}

app.post('/api/coach', authenticate, coachLimiter, async (req, res) => {
  const message = safeStr(req.body.message, 2000);
  if (!message) return res.status(400).json({ error: 'Message required' });

  // Gather user context
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const [userRes, goalRes, mealsRes, workoutsRes, weightsRes, chatRes] = await Promise.all([
    supabase.from('users').select('name').eq('id', req.userId).single(),
    supabase.from('goals').select('*').eq('user_id', req.userId).maybeSingle(),
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

  const systemPrompt = `You are an AI fitness coach in the PumpTracker app. You give practical, evidence-based advice about training, nutrition, recipes, programs, and recovery. Be conversational, supportive, and specific.

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

  const result = await callClaude({
    system: systemPrompt,
    messages: conversationMessages.slice(-20),
    maxTokens: 1024,
    label: 'coach',
  });

  let reply;
  if (result.ok) {
    reply = result.text;
  } else {
    const statusLine = `- **Calories today:** ${todayCal}${goal ? `/${goal.dailyCalories}` : ''} kcal\n- **Protein:** ${todayProt}${goal ? `/${goal.dailyProtein}` : ''}g\n- **Workouts:** ${todayWorkouts.length} session${todayWorkouts.length !== 1 ? 's' : ''}`;
    reply = `${statusLine}\n\n${aiFallbackSuffix(result.reason)}`;
  }
  await supabase.from('chat_history').insert({ user_id: req.userId, role: 'coach', text: reply });
  res.json({ reply });
});

// --- Session Notes ---
app.get('/api/session-notes', authenticate, async (req, res) => {
  const date = safeStr(req.query.date, 10);
  if (date) {
    const { data } = await supabase
      .from('session_notes')
      .select('*')
      .eq('user_id', req.userId)
      .eq('date', date)
      .single();
    return res.json(data || null);
  }
  const { data } = await supabase
    .from('session_notes')
    .select('*')
    .eq('user_id', req.userId)
    .order('date', { ascending: false });
  res.json(data || []);
});

app.post('/api/session-notes', authenticate, async (req, res) => {
  const date = safeStr(req.body.date, 10);
  const rating = safeStr(req.body.rating, 10);
  const notes = safeStr(req.body.notes, 2000);
  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (rating && !['bad', 'neutral', 'good'].includes(rating)) {
    return res.status(400).json({ error: 'Rating must be bad, neutral, or good' });
  }
  const { data, error } = await supabase
    .from('session_notes')
    .upsert({
      user_id: req.userId,
      date,
      rating: rating || null,
      notes: notes || null,
    }, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/session-notes/:id', authenticate, async (req, res) => {
  await supabase.from('session_notes').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

// --- Progressive Overload ---
app.get('/api/progression', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('progression_rules')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/api/progression', authenticate, async (req, res) => {
  const exercise = safeStr(req.body.exercise, 200);
  if (!exercise) return res.status(400).json({ error: 'Exercise name is required' });
  const weightIncrement = safeNum(req.body.weight_increment) ?? 2.5;
  const enabled = req.body.enabled !== undefined ? Boolean(req.body.enabled) : true;
  const { data, error } = await supabase
    .from('progression_rules')
    .upsert({
      user_id: req.userId,
      exercise,
      weight_increment: weightIncrement,
      enabled,
    }, { onConflict: 'user_id,exercise' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/progression/:id', authenticate, async (req, res) => {
  await supabase.from('progression_rules').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

app.get('/api/progression/suggest', authenticate, async (req, res) => {
  const exercise = safeStr(req.query.exercise, 200);
  if (!exercise) return res.status(400).json({ error: 'exercise query param required' });

  // Get the user's progression rule for this exercise
  const { data: rule } = await supabase
    .from('progression_rules')
    .select('*')
    .eq('user_id', req.userId)
    .eq('exercise', exercise)
    .single();

  if (!rule || !rule.enabled) return res.json({ enabled: false });

  // Get the most recent workout for this exercise
  const { data: lastWorkout } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .eq('exercise', exercise)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (!lastWorkout) {
    return res.json({ enabled: true, suggestedWeight: null, message: 'No previous data' });
  }

  // Find max weight from sets_data or fallback to weight column
  let lastWeight = 0;
  if (Array.isArray(lastWorkout.sets_data) && lastWorkout.sets_data.length > 0) {
    lastWeight = Math.max(...lastWorkout.sets_data.map(s => Number(s.weight) || 0));
  } else {
    lastWeight = Number(lastWorkout.weight) || 0;
  }

  res.json({
    lastWeight,
    suggestedWeight: lastWeight + rule.weight_increment,
    increment: rule.weight_increment,
    lastDate: lastWorkout.date,
    enabled: true,
  });
});

// --- Custom Routines ---
app.get('/api/routines', authenticate, async (req, res) => {
  const { data: routines } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (!routines || routines.length === 0) return res.json([]);

  const routineIds = routines.map(r => r.id);
  // Batch: fetch all days across all routines at once
  const { data: allDays } = await supabase
    .from('routine_days')
    .select('*')
    .in('routine_id', routineIds)
    .order('day_order', { ascending: true });
  const days = allDays || [];

  // Batch: fetch all exercises across all days at once
  const dayIds = days.map(d => d.id);
  const { data: allExercises } = dayIds.length > 0
    ? await supabase
        .from('routine_exercises')
        .select('*')
        .in('day_id', dayIds)
        .order('exercise_order', { ascending: true })
    : { data: [] };
  const exercises = allExercises || [];

  // Group in memory
  const exercisesByDay = {};
  for (const ex of exercises) {
    if (!exercisesByDay[ex.day_id]) exercisesByDay[ex.day_id] = [];
    exercisesByDay[ex.day_id].push({
      id: ex.id,
      exercise: ex.exercise,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
    });
  }
  const daysByRoutine = {};
  for (const day of days) {
    if (!daysByRoutine[day.routine_id]) daysByRoutine[day.routine_id] = [];
    daysByRoutine[day.routine_id].push({
      id: day.id,
      name: day.name,
      exercises: exercisesByDay[day.id] || [],
    });
  }
  const result = routines.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    days: daysByRoutine[r.id] || [],
  }));
  res.json(result);
});

app.post('/api/routines', authenticate, async (req, res) => {
  const name = safeStr(req.body.name, 200);
  if (!name) return res.status(400).json({ error: 'Routine name is required' });
  const description = safeStr(req.body.description, 1000) || null;
  const days = Array.isArray(req.body.days) ? req.body.days : [];

  const { data: routine, error: routineErr } = await supabase
    .from('routines')
    .insert({ user_id: req.userId, name, description })
    .select()
    .single();
  if (routineErr) return res.status(500).json({ error: routineErr.message });

  // Batch insert all days at once
  const dayRows = days.map((d, i) => ({
    routine_id: routine.id,
    name: safeStr(d.name, 200) || `Day ${i + 1}`,
    day_order: i,
  }));
  let createdDaysRows = [];
  if (dayRows.length > 0) {
    const { data: insertedDays, error: daysErr } = await supabase
      .from('routine_days')
      .insert(dayRows)
      .select();
    if (daysErr) return res.status(500).json({ error: daysErr.message });
    createdDaysRows = (insertedDays || []).sort((a, b) => a.day_order - b.day_order);
  }

  // Batch insert all exercises across all days at once
  const exerciseRows = [];
  createdDaysRows.forEach((day, dayIdx) => {
    const srcExercises = Array.isArray(days[dayIdx]?.exercises) ? days[dayIdx].exercises : [];
    srcExercises.forEach((ex, exIdx) => {
      exerciseRows.push({
        day_id: day.id,
        exercise: safeStr(ex.exercise, 200),
        exercise_order: exIdx,
        sets: safeNum(ex.sets) || 3,
        reps: safeNum(ex.reps) || 10,
        weight: safeNum(ex.weight) || 0,
      });
    });
  });
  let createdExercisesRows = [];
  if (exerciseRows.length > 0) {
    const { data: insertedEx, error: exErr } = await supabase
      .from('routine_exercises')
      .insert(exerciseRows)
      .select();
    if (exErr) return res.status(500).json({ error: exErr.message });
    createdExercisesRows = insertedEx || [];
  }

  // Re-shape for response
  const exercisesByDay = {};
  for (const ex of createdExercisesRows) {
    if (!exercisesByDay[ex.day_id]) exercisesByDay[ex.day_id] = [];
    exercisesByDay[ex.day_id].push({
      id: ex.id, exercise: ex.exercise, sets: ex.sets, reps: ex.reps, weight: ex.weight,
    });
  }
  const createdDays = createdDaysRows.map(d => ({
    id: d.id, name: d.name, exercises: (exercisesByDay[d.id] || []).sort((a, b) => a.exercise_order - b.exercise_order),
  }));

  res.json({ id: routine.id, name: routine.name, description: routine.description, days: createdDays });
});

app.put('/api/routines/:id', authenticate, async (req, res) => {
  const routineId = Number(req.params.id);
  const name = safeStr(req.body.name, 200);
  if (!name) return res.status(400).json({ error: 'Routine name is required' });
  const description = safeStr(req.body.description, 1000) || null;
  const days = Array.isArray(req.body.days) ? req.body.days : [];

  // Verify ownership
  const { data: existing } = await supabase
    .from('routines')
    .select('id')
    .eq('id', routineId)
    .eq('user_id', req.userId)
    .single();
  if (!existing) return res.status(404).json({ error: 'Routine not found' });

  // Update routine name/description
  const { error: updateErr } = await supabase
    .from('routines')
    .update({ name, description })
    .eq('id', routineId)
    .eq('user_id', req.userId);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Delete existing days (cascade should drop exercises)
  const { error: delErr } = await supabase
    .from('routine_days')
    .delete()
    .eq('routine_id', routineId);
  if (delErr) return res.status(500).json({ error: delErr.message });

  // Batch insert new days
  const dayRows = days.map((d, i) => ({
    routine_id: routineId,
    name: safeStr(d.name, 200) || `Day ${i + 1}`,
    day_order: i,
  }));
  let createdDaysRows = [];
  if (dayRows.length > 0) {
    const { data: insertedDays, error: daysErr } = await supabase
      .from('routine_days')
      .insert(dayRows)
      .select();
    if (daysErr) return res.status(500).json({ error: daysErr.message });
    createdDaysRows = (insertedDays || []).sort((a, b) => a.day_order - b.day_order);
  }

  // Batch insert new exercises
  const exerciseRows = [];
  createdDaysRows.forEach((day, dayIdx) => {
    const srcExercises = Array.isArray(days[dayIdx]?.exercises) ? days[dayIdx].exercises : [];
    srcExercises.forEach((ex, exIdx) => {
      exerciseRows.push({
        day_id: day.id,
        exercise: safeStr(ex.exercise, 200),
        exercise_order: exIdx,
        sets: safeNum(ex.sets) || 3,
        reps: safeNum(ex.reps) || 10,
        weight: safeNum(ex.weight) || 0,
      });
    });
  });
  let createdExercisesRows = [];
  if (exerciseRows.length > 0) {
    const { data: insertedEx, error: exErr } = await supabase
      .from('routine_exercises')
      .insert(exerciseRows)
      .select();
    if (exErr) return res.status(500).json({ error: exErr.message });
    createdExercisesRows = insertedEx || [];
  }

  // Re-shape for response
  const exercisesByDay = {};
  for (const ex of createdExercisesRows) {
    if (!exercisesByDay[ex.day_id]) exercisesByDay[ex.day_id] = [];
    exercisesByDay[ex.day_id].push({
      id: ex.id, exercise: ex.exercise, sets: ex.sets, reps: ex.reps, weight: ex.weight,
    });
  }
  const updatedDays = createdDaysRows.map(d => ({
    id: d.id, name: d.name, exercises: exercisesByDay[d.id] || [],
  }));

  res.json({ id: routineId, name, description, days: updatedDays });
});

app.delete('/api/routines/:id', authenticate, async (req, res) => {
  await supabase.from('routines').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

app.post('/api/routines/:dayId/load', authenticate, async (req, res) => {
  const dayId = Number(req.params.dayId);

  // SECURITY: verify that the requested routine day belongs to a routine owned by this user.
  // Without this check, any authenticated user could load another user's routine by guessing a day id.
  const { data: day } = await supabase
    .from('routine_days')
    .select('id, routine_id')
    .eq('id', dayId)
    .single();
  if (!day) return res.status(404).json({ error: 'Routine day not found' });

  const { data: routine } = await supabase
    .from('routines')
    .select('id, user_id')
    .eq('id', day.routine_id)
    .single();
  if (!routine || routine.user_id !== req.userId) {
    return res.status(404).json({ error: 'Routine day not found' });
  }

  const { data: exercises } = await supabase
    .from('routine_exercises')
    .select('*')
    .eq('day_id', dayId)
    .order('exercise_order', { ascending: true });

  if (!exercises || exercises.length === 0) return res.status(404).json({ error: 'No exercises found for this day' });

  const today = todayStr();

  // Get today's existing workouts to avoid duplicates
  const { data: existing } = await supabase
    .from('workouts')
    .select('exercise')
    .eq('user_id', req.userId)
    .eq('date', today);
  const existingNames = new Set((existing || []).map(w => w.exercise));

  const rows = [];
  for (const ex of exercises) {
    if (existingNames.has(ex.exercise)) continue;
    const setsData = [];
    for (let i = 0; i < (ex.sets || 3); i++) {
      setsData.push({ reps: ex.reps || 10, weight: ex.weight || 0 });
    }
    rows.push({
      user_id: req.userId,
      exercise: ex.exercise,
      sets: ex.sets || 3,
      reps: ex.reps || 10,
      weight: ex.weight || 0,
      sets_data: setsData,
      date: today,
    });
  }

  if (rows.length === 0) return res.json({ message: 'All exercises already logged today', data: [] });

  const { data, error } = await supabase.from('workouts').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── User Settings ──────────────────────────────────────
app.get('/api/settings', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', req.userId)
    .single();
  res.json(data || { auto_rest_timer: true, default_rest_duration: 90, bar_weight: 20 });
});

app.put('/api/settings', authenticate, async (req, res) => {
  const auto_rest_timer = req.body.auto_rest_timer !== undefined ? !!req.body.auto_rest_timer : true;
  const default_rest_duration = Math.max(10, Math.min(600, Number(req.body.default_rest_duration) || 90));
  const bar_weight = Math.max(0, Math.min(50, Number(req.body.bar_weight) || 20));
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: req.userId, auto_rest_timer, default_rest_duration, bar_weight, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Exercise Goals ─────────────────────────────────────
app.get('/api/goals/exercise', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('exercise_goals')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/goals/exercise', authenticate, async (req, res) => {
  const exercise = safeStr(req.body.exercise, 200);
  const target_weight = Number(req.body.target_weight);
  const target_reps = Number(req.body.target_reps) || 1;
  if (!exercise || !target_weight || target_weight <= 0) {
    return res.status(400).json({ error: 'exercise and target_weight required' });
  }
  const { data, error } = await supabase
    .from('exercise_goals')
    .upsert(
      { user_id: req.userId, exercise, target_weight, target_reps, achieved_at: null, celebrated: false },
      { onConflict: 'user_id,exercise' }
    )
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/goals/exercise/:id', authenticate, async (req, res) => {
  await supabase.from('exercise_goals').delete().eq('id', Number(req.params.id)).eq('user_id', req.userId);
  res.json({ success: true });
});

// Mark goal as celebrated (called client-side after confetti shown)
app.put('/api/goals/exercise/:id/celebrate', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('exercise_goals')
    .update({ celebrated: true })
    .eq('id', Number(req.params.id))
    .eq('user_id', req.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Last session for an exercise (for "Previous" button) ─
app.get('/api/workouts/last', authenticate, async (req, res) => {
  const exercise = safeStr(req.query.exercise, 200);
  if (!exercise) return res.status(400).json({ error: 'exercise query param required' });
  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .eq('exercise', exercise)
    .order('date', { ascending: false })
    .limit(1);
  res.json((data && data[0]) || null);
});

// ─── Exercise history (all sessions for one exercise) ────
app.get('/api/workouts/history', authenticate, async (req, res) => {
  const exercise = safeStr(req.query.exercise, 200);
  if (!exercise) return res.status(400).json({ error: 'exercise query param required' });
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .eq('exercise', exercise)
    .order('date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ─── Personal Records (top set per exercise) ─────────────
app.get('/api/prs', authenticate, async (req, res) => {
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('exercise, date, sets_data, reps, weight')
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });

  const prs = {};
  (workouts || []).forEach(w => {
    const sets = Array.isArray(w.sets_data) && w.sets_data.length > 0
      ? w.sets_data
      : [{ reps: w.reps || 0, weight: w.weight || 0 }];

    sets.forEach(s => {
      const reps = Number(s.reps) || 0;
      const weight = Number(s.weight) || 0;
      if (reps <= 0 || weight <= 0) return;
      // Epley formula for 1RM estimate
      const est1RM = reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;
      const cur = prs[w.exercise];
      const volume = reps * weight;
      if (!cur || est1RM > cur.est1RM) {
        prs[w.exercise] = {
          exercise: w.exercise,
          topWeight: weight,
          topReps: reps,
          est1RM,
          volume,
          date: w.date,
        };
      }
    });
  });

  const list = Object.values(prs).sort((a, b) => b.est1RM - a.est1RM);
  res.json(list);
});

// ─── Volume by muscle group (last 7 days) ────────────────
app.get('/api/volume-by-muscle', authenticate, async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('exercise, muscle_group, sets_data, sets, reps, weight, date')
    .eq('user_id', req.userId)
    .gte('date', sinceStr);
  if (error) return res.status(500).json({ error: error.message });

  const byGroup = {};
  (workouts || []).forEach(w => {
    const group = w.muscle_group || 'Other';
    let volume = 0;
    if (Array.isArray(w.sets_data) && w.sets_data.length > 0) {
      volume = w.sets_data.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
    } else {
      volume = (Number(w.sets) || 0) * (Number(w.reps) || 0) * (Number(w.weight) || 0);
    }
    byGroup[group] = (byGroup[group] || 0) + volume;
  });
  res.json(byGroup);
});

// ─── AI Coach: Analyze session ───────────────────────────
app.post('/api/coach/analyze-session', authenticate, coachLimiter, async (req, res) => {
  const date = safeStr(req.body.date, 10) || new Date().toISOString().slice(0, 10);

  const { data: sessionWorkouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (!sessionWorkouts || sessionWorkouts.length === 0) {
    return res.json({ reply: 'No workouts logged for this date — nothing to analyze yet!' });
  }

  // Describe session
  const exerciseLines = sessionWorkouts.map(w => {
    const sets = Array.isArray(w.sets_data) && w.sets_data.length > 0
      ? w.sets_data.map(s => `${s.reps}x${s.weight}kg`).join(', ')
      : `${w.sets || 1}x${w.reps || 0}@${w.weight || 0}kg`;
    return `- ${w.exercise}: ${sets}`;
  }).join('\n');

  const totalVolume = sessionWorkouts.reduce((sum, w) => {
    if (Array.isArray(w.sets_data)) {
      return sum + w.sets_data.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
    }
    return sum + (Number(w.sets) || 0) * (Number(w.reps) || 0) * (Number(w.weight) || 0);
  }, 0);

  const systemPrompt = `You are an AI fitness coach analyzing a workout session. Be supportive, specific, and actionable.`;
  const userMessage = `Please analyze this training session and give me feedback:

Date: ${date}
Total volume: ${Math.round(totalVolume)} kg
Exercises (${sessionWorkouts.length}):
${exerciseLines}

Give me:
1. What went well
2. What could be improved (volume balance, intensity, recovery)
3. One specific suggestion for next session

Keep it to 3 short paragraphs.`;

  const result = await callClaude({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 700,
    label: 'analyze-session',
  });
  if (result.ok) return res.json({ reply: result.text });
  const summary = `**Session Summary — ${date}**\n\n- Exercises: ${sessionWorkouts.length}\n- Total volume: ${Math.round(totalVolume)} kg`;
  res.json({ reply: `${summary}\n\n${aiFallbackSuffix(result.reason)}` });
});

// ─── AI Coach: Weekly recap ──────────────────────────────
app.get('/api/coach/weekly-recap', authenticate, coachLimiter, async (req, res) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const [workoutsRes, weightsRes, measureRes, mealsRes] = await Promise.all([
    supabase.from('workouts').select('*').eq('user_id', req.userId).gte('date', startStr).lte('date', endStr),
    supabase.from('weights').select('*').eq('user_id', req.userId).gte('date', startStr).lte('date', endStr).order('date', { ascending: true }),
    supabase.from('body_measurements').select('*').eq('user_id', req.userId).gte('date', startStr).lte('date', endStr).order('date', { ascending: true }),
    supabase.from('meals').select('*').eq('user_id', req.userId).gte('date', startStr).lte('date', endStr),
  ]);

  const workouts = workoutsRes.data || [];
  const weights = weightsRes.data || [];
  const measures = measureRes.data || [];
  const meals = mealsRes.data || [];

  const totalVolume = workouts.reduce((sum, w) => {
    if (Array.isArray(w.sets_data)) {
      return sum + w.sets_data.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
    }
    return sum + (Number(w.sets) || 0) * (Number(w.reps) || 0) * (Number(w.weight) || 0);
  }, 0);
  const uniqueExercises = new Set(workouts.map(w => w.exercise));
  const daysTrained = new Set(workouts.map(w => w.date)).size;
  const weightDelta = weights.length >= 2 ? Math.round((weights[weights.length - 1].weight - weights[0].weight) * 10) / 10 : null;

  // Average calories
  const calByDate = {};
  meals.forEach(m => {
    calByDate[m.date] = (calByDate[m.date] || 0) + (Number(m.calories) || 0);
  });
  const mealDates = Object.keys(calByDate);
  const avgCalories = mealDates.length > 0
    ? Math.round(mealDates.reduce((s, d) => s + calByDate[d], 0) / mealDates.length)
    : null;

  const stats = {
    daysTrained,
    totalVolume: Math.round(totalVolume),
    weightDelta,
    avgCalories,
    uniqueExercises: uniqueExercises.size,
    workoutsCount: workouts.length,
  };

  const systemPrompt = `You are an AI fitness coach giving a weekly recap. Be encouraging, data-driven, and concise.`;
  const userMessage = `Generate a weekly recap for the user:

Period: ${startStr} to ${endStr}
Training days: ${daysTrained}/7
Workouts logged: ${workouts.length}
Unique exercises: ${uniqueExercises.size}
Total volume: ${Math.round(totalVolume)} kg
${weightDelta !== null ? `Weight change: ${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : ''}
${avgCalories !== null ? `Avg daily calories: ${avgCalories}` : ''}
${measures.length >= 2 ? `Measurements logged: ${measures.length} entries` : ''}

Give me:
1. A 1-sentence highlight (what they should feel good about)
2. A 1-sentence area to watch next week
3. One concrete focus for next week

Keep it to 3-4 sentences total, upbeat but honest.`;

  const result = await callClaude({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 600,
    label: 'weekly-recap',
  });
  if (result.ok) return res.json({ ...stats, reply: result.text });
  const summary = `Weekly Recap (${startStr} → ${endStr}):\n\n- Training days: ${daysTrained}/7\n- Workouts: ${workouts.length}\n- Total volume: ${Math.round(totalVolume)} kg${weightDelta !== null ? `\n- Weight change: ${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : ''}`;
  res.json({ ...stats, reply: `${summary}\n\n${aiFallbackSuffix(result.reason)}` });
});

// ─── AI Coach: Analyze progress (stagnation check) ───────
app.post('/api/coach/analyze-progress', authenticate, coachLimiter, async (req, res) => {
  const focus = safeStr(req.body.focus, 50) || 'general'; // 'weight', 'measurements', 'strength', 'general'

  const [weightsRes, measureRes, workoutsRes, goalRes, mealsRes] = await Promise.all([
    supabase.from('weights').select('*').eq('user_id', req.userId).order('date', { ascending: true }).limit(60),
    supabase.from('body_measurements').select('*').eq('user_id', req.userId).order('date', { ascending: true }).limit(30),
    supabase.from('workouts').select('*').eq('user_id', req.userId).order('date', { ascending: false }).limit(50),
    supabase.from('goals').select('*').eq('user_id', req.userId).maybeSingle(),
    supabase.from('meals').select('*').eq('user_id', req.userId).order('date', { ascending: false }).limit(30),
  ]);

  const weights = weightsRes.data || [];
  const measures = measureRes.data || [];
  const workouts = workoutsRes.data || [];
  const goal = goalRes.data;
  const meals = mealsRes.data || [];

  const weightRange = weights.length >= 2 ? {
    first: weights[0].weight,
    last: weights[weights.length - 1].weight,
    delta: (weights[weights.length - 1].weight - weights[0].weight).toFixed(1),
    days: weights.length,
  } : null;

  const last30DaysMeals = meals.filter(m => {
    const date = new Date(m.date);
    return date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  });
  const avgCals = last30DaysMeals.length > 0
    ? Math.round(last30DaysMeals.reduce((s, m) => s + (m.calories || 0), 0) / new Set(last30DaysMeals.map(m => m.date)).size)
    : null;
  const avgProtein = last30DaysMeals.length > 0
    ? Math.round(last30DaysMeals.reduce((s, m) => s + (m.protein || 0), 0) / new Set(last30DaysMeals.map(m => m.date)).size)
    : null;

  const workoutCount = workouts.length;
  const uniqueDays = new Set(workouts.map(w => w.date)).size;

  const systemPrompt = `You are an AI fitness coach performing honest, data-driven progress analysis. The user is asking why they may be stuck. Analyze the data for patterns (calorie intake vs goal, training frequency, volume trends, consistency) and give specific, actionable insights. Do not sugar-coat — but be encouraging.`;

  const userMessage = `Analyze my progress. The user feels they're not making progress (focus area: ${focus}).

Data:
- Goal: ${goal ? `${goal.goal_type} (target ${goal.target_weight} kg)` : 'no goal set'}
- Daily calorie target: ${goal?.daily_calories || 'not set'}
- Actual avg calories (last 30 days): ${avgCals || 'no data'}
- Actual avg protein (last 30 days): ${avgProtein || 'no data'}g (target: ${goal?.daily_protein || 'not set'}g)
- Weight: ${weightRange ? `${weightRange.first}kg → ${weightRange.last}kg over ${weightRange.days} entries (${weightRange.delta > 0 ? '+' : ''}${weightRange.delta}kg)` : 'not enough data'}
- Measurements: ${measures.length} entries
- Workouts: ${workoutCount} in last 50 sessions, ${uniqueDays} unique days

What I want to know:
1. Am I actually making progress, or am I stuck?
2. What is the most likely reason I'm not progressing?
3. What should I change THIS WEEK?

Be direct and specific. Use the actual numbers from my data.`;

  const result = await callClaude({
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 900,
    label: 'analyze-progress',
  });
  if (result.ok) return res.json({ reply: result.text });
  const numbers = '**Progress Analysis — raw numbers**\n\n' +
    (weightRange ? `- Weight change: ${weightRange.delta} kg over ${weightRange.days} entries\n` : '') +
    `- Workouts: ${workoutCount}, unique training days: ${uniqueDays}\n` +
    (avgCals ? `- Avg daily calories: ${avgCals}${goal?.daily_calories ? ` (target: ${goal.daily_calories})` : ''}\n` : '') +
    (avgProtein ? `- Avg daily protein: ${avgProtein}g${goal?.daily_protein ? ` (target: ${goal.daily_protein}g)` : ''}` : '');
  res.json({ reply: `${numbers}\n\n${aiFallbackSuffix(result.reason)}` });
});

// ─── AI Coach: Form check (technique tips for an exercise) ───────────
app.post('/api/coach/form-check', authenticate, coachLimiter, async (req, res) => {
  const exercise = safeStr(req.body.exercise, 200);
  if (!exercise) return res.status(400).json({ error: 'Exercise required' });
  const systemPrompt = `You are a knowledgeable personal trainer giving concise form and technique advice. For the exercise "${exercise}", provide:
1. 3-5 key form cues (bullet points)
2. 1-2 common mistakes to avoid
3. A brief setup/execution tip

Keep it under 200 words. Be direct and practical. No fluff.`;

  const result = await callClaude({
    system: systemPrompt,
    messages: [{ role: 'user', content: `Give me form and technique tips for: ${exercise}` }],
    maxTokens: 500,
    label: 'form-check',
  });
  if (result.ok) return res.json({ reply: result.text });
  const generic = `Form tips for ${exercise}:\n\n• Controlled tempo (2-3 seconds on the eccentric)\n• Keep tension on the target muscle\n• Full range of motion\n• Brace core throughout`;
  res.json({ reply: `${generic}\n\n${aiFallbackSuffix(result.reason)}` });
});

// --- Serve React SPA (production) ---
// In production the Express server also serves the built React app from
// client/dist. In dev, Vite serves the client on a separate port and
// proxies /api/* to this server, so this block is a no-op.
import fs from 'fs';
const __dirname_es = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.join(__dirname_es, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback: any non-/api GET serves index.html so React Router handles it
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// --- Global error handler ---
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Push Notifications (rest timer) ────────────────────
// Return the public VAPID key so the client can subscribe.
app.get('/api/push/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

// Store/update a push subscription for the authenticated user.
app.post('/api/push/subscribe', authenticate, async (req, res) => {
  const sub = req.body.subscription;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: req.userId, subscription: sub, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' })
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Schedule a server-side rest-timer push. The server holds the timer, then
// sends a Web Push notification when it fires — works even if the tab is
// closed or the phone is locked.
app.post('/api/push/schedule-rest', authenticate, async (req, res) => {
  const seconds = Math.max(1, Math.min(600, Number(req.body.seconds) || 90));

  // Cancel any existing timer for this user
  const existing = pendingRestTimers.get(req.userId);
  if (existing) clearTimeout(existing.timer);

  // Load the user's push subscription
  const { data: row } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', req.userId)
    .maybeSingle();

  if (!row || !row.subscription) {
    return res.status(400).json({ error: 'No push subscription found. Allow notifications first.' });
  }

  const timer = setTimeout(async () => {
    pendingRestTimers.delete(req.userId);
    try {
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify({
          title: 'Rest is up — back to work!',
          body: 'Your rest timer has finished. Time for your next set.',
          icon: '/favicon.ico',
          vibrate: [400, 200, 400, 200, 400],
          url: '/workouts',
        })
      );
    } catch (err) {
      // Subscription expired or user revoked permission
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', req.userId);
      }
    }
  }, seconds * 1000);

  pendingRestTimers.set(req.userId, { timer, fireAt: Date.now() + seconds * 1000 });
  res.json({ success: true, fireAt: Date.now() + seconds * 1000 });
});

// Cancel a pending rest timer.
app.delete('/api/push/cancel-rest', authenticate, async (req, res) => {
  const existing = pendingRestTimers.get(req.userId);
  if (existing) {
    clearTimeout(existing.timer);
    pendingRestTimers.delete(req.userId);
  }
  res.json({ success: true });
});

// --- Graceful shutdown ---
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
