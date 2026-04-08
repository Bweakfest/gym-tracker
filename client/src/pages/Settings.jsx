import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';

export default function Settings() {
  const { user, token, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [name, setName] = useState(user?.name || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [units, setUnits] = useState(localStorage.getItem('units') || 'kg');
  const [msg, setMsg] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [photo, setPhoto] = useState(user?.photo || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef(null);

  // Notification preferences
  const [mealReminder, setMealReminder] = useState(() => JSON.parse(localStorage.getItem('mealReminder') || 'false'));
  const [workoutReminder, setWorkoutReminder] = useState(() => JSON.parse(localStorage.getItem('workoutReminder') || 'false'));
  const [mealTime, setMealTime] = useState(() => localStorage.getItem('mealReminderTime') || '12:00');
  const [workoutTime, setWorkoutTime] = useState(() => localStorage.getItem('workoutReminderTime') || '17:00');

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  // Schedule notification reminders
  useEffect(() => {
    localStorage.setItem('mealReminder', JSON.stringify(mealReminder));
    localStorage.setItem('workoutReminder', JSON.stringify(workoutReminder));
    localStorage.setItem('mealReminderTime', mealTime);
    localStorage.setItem('workoutReminderTime', workoutTime);

    if (!mealReminder && !workoutReminder) return;
    if (!('Notification' in window)) return;

    const checkReminders = () => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (mealReminder && hm === mealTime) {
        new Notification('FitTrack', { body: t('mealReminder'), icon: '/favicon.ico' });
      }
      if (workoutReminder && hm === workoutTime) {
        new Notification('FitTrack', { body: t('workoutReminder'), icon: '/favicon.ico' });
      }
    };
    const id = setInterval(checkReminders, 60000);
    return () => clearInterval(id);
  }, [mealReminder, workoutReminder, mealTime, workoutTime, t]);

  const requestNotifPermission = async (setter, value) => {
    if (value && 'Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { flash('Notification permission denied', false); return; }
    }
    setter(value);
    flash(value ? 'Reminder enabled' : 'Reminder disabled');
  };

  const saveName = async () => {
    if (!name.trim()) return flash('Name cannot be empty', false);
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) { setUser({ ...user, name: name.trim() }); flash('Name updated!'); }
    else { const d = await res.json(); flash(d.error || 'Failed to update', false); }
  };

  const changePassword = async () => {
    if (!oldPass || !newPass) return flash('Fill in both password fields', false);
    if (newPass.length < 6) return flash('New password must be at least 6 characters', false);
    if (newPass !== confirmPass) return flash('Passwords do not match', false);
    const res = await fetch('/api/user/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
    });
    if (res.ok) { flash('Password changed successfully!'); setOldPass(''); setNewPass(''); setConfirmPass(''); }
    else { const d = await res.json(); flash(d.error || 'Failed to change password', false); }
  };

  const changeLang = (v) => { setLang(v); flash('Language updated'); };
  const changeUnits = (v) => { setUnits(v); localStorage.setItem('units', v); flash('Unit preference saved'); };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return flash('Photo must be under 2MB', false);
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = async () => {
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const res = await fetch('/api/user/photo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photo: dataUrl }),
        });
        if (res.ok) {
          setPhoto(dataUrl);
          setUser({ ...user, photo: dataUrl });
          flash('Photo updated!');
        } else { flash('Failed to upload photo', false); }
        setPhotoUploading(false);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async () => {
    const res = await fetch('/api/user/photo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ photo: null }),
    });
    if (res.ok) { setPhoto(null); setUser({ ...user, photo: null }); flash('Photo removed'); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return flash('Type DELETE to confirm', false);
    const res = await fetch('/api/user', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { logout(); }
    else { const d = await res.json(); flash(d.error || 'Failed to delete account', false); }
  };

  const exportData = async () => {
    flash('Exporting data...');
    const headers = { Authorization: `Bearer ${token}` };
    const [workouts, meals, weights, goals] = await Promise.all([
      fetch('/api/workouts', { headers }).then(r => r.json()),
      fetch('/api/meals', { headers }).then(r => r.json()),
      fetch('/api/weights', { headers }).then(r => r.json()),
      fetch('/api/goals', { headers }).then(r => r.json()),
    ]);
    const data = { user: { name: user.name, email: user.email }, workouts, meals, weights, goals, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fittrack-export-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    flash('Data exported!');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('settings')}</h1>
          <p>{t('settingsSub')}</p>
        </div>
      </div>

      {msg && <div className={`settings-flash ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}

      {/* Profile + Photo */}
      <div className="settings-section">
        <h3>{t('profile')}</h3>
        <div className="settings-row">
          <label>{t('profilePhoto')}</label>
          <div className="settings-photo-area">
            <div className="settings-avatar" onClick={() => fileRef.current?.click()}>
              {photo ? (
                <img src={photo} alt="avatar" />
              ) : (
                <span className="settings-avatar-placeholder">{(user?.name || 'U')[0].toUpperCase()}</span>
              )}
              <div className="settings-avatar-overlay">{photoUploading ? '...' : '\u{1F4F7}'}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
            <div className="settings-photo-btns">
              <button className="btn-sm" onClick={() => fileRef.current?.click()} disabled={photoUploading}>
                {t('uploadPhoto')}
              </button>
              {photo && <button className="btn-sm" onClick={removePhoto}>{t('removePhoto')}</button>}
            </div>
          </div>
        </div>
        <div className="settings-row">
          <label>{t('displayName')}</label>
          <div className="settings-input-row">
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
            <button className="btn-sm" onClick={saveName}>{t('save')}</button>
          </div>
        </div>
        <div className="settings-row">
          <label>{t('email')}</label>
          <span className="settings-value">{user?.email}</span>
        </div>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h3>{t('changePassword')}</h3>
        <div className="settings-row">
          <label>{t('currentPassword')}</label>
          <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder={t('currentPassword')} />
        </div>
        <div className="settings-row">
          <label>{t('newPassword')}</label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={t('newPassword')} />
        </div>
        <div className="settings-row">
          <label>{t('confirmPassword')}</label>
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder={t('confirmPassword')} />
        </div>
        <button className="btn-primary" onClick={changePassword} style={{ marginTop: '0.5rem' }}>{t('changePassword')}</button>
      </div>

      {/* Preferences — Theme, Language, Units */}
      <div className="settings-section">
        <h3>{t('preferences')}</h3>
        <div className="settings-row">
          <label>{t('theme')}</label>
          <div className="settings-theme-toggle">
            <button
              className={`theme-btn${theme === 'dark' ? ' active' : ''}`}
              onClick={() => theme !== 'dark' && toggleTheme()}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              {t('dark')}
            </button>
            <button
              className={`theme-btn${theme === 'light' ? ' active' : ''}`}
              onClick={() => theme !== 'light' && toggleTheme()}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              {t('light')}
            </button>
          </div>
        </div>
        <div className="settings-row">
          <label>{t('language')}</label>
          <select value={lang} onChange={e => changeLang(e.target.value)}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Fran&#231;ais</option>
          </select>
        </div>
        <div className="settings-row">
          <label>{t('units')}</label>
          <select value={units} onChange={e => changeUnits(e.target.value)}>
            <option value="kg">Metric (kg, g)</option>
            <option value="lbs">Imperial (lbs, oz)</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <h3>{t('notifications')}</h3>
        <div className="settings-row">
          <label>{t('mealReminder')}</label>
          <div className="settings-notif-row">
            <label className="toggle-switch">
              <input type="checkbox" checked={mealReminder} onChange={e => requestNotifPermission(setMealReminder, e.target.checked)} />
              <span className="toggle-slider" />
            </label>
            {mealReminder && (
              <input type="time" value={mealTime} onChange={e => setMealTime(e.target.value)} className="notif-time-input" />
            )}
          </div>
        </div>
        <div className="settings-row">
          <label>{t('workoutReminder')}</label>
          <div className="settings-notif-row">
            <label className="toggle-switch">
              <input type="checkbox" checked={workoutReminder} onChange={e => requestNotifPermission(setWorkoutReminder, e.target.checked)} />
              <span className="toggle-slider" />
            </label>
            {workoutReminder && (
              <input type="time" value={workoutTime} onChange={e => setWorkoutTime(e.target.value)} className="notif-time-input" />
            )}
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <h3>{t('yourData')}</h3>
        <div className="settings-row">
          <label>{t('exportAllData')}</label>
          <button className="btn-sm" onClick={exportData}>{t('exportData')}</button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="settings-section">
        <h3>{t('account')}</h3>
        <div className="settings-row">
          <label>{t('signOut')}</label>
          <button className="btn-sm" onClick={logout}>{t('logOut')}</button>
        </div>
        <div className="settings-row danger">
          <label>{t('deleteAccount')}</label>
          {!showDelete ? (
            <button className="btn-sm btn-danger" onClick={() => setShowDelete(true)}>{t('delete')} {t('account')}</button>
          ) : (
            <div className="settings-delete-confirm">
              <p>{t('typeDelete')}</p>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
              <div className="settings-delete-btns">
                <button className="btn-sm btn-danger" onClick={deleteAccount}>{t('delete')}</button>
                <button className="btn-sm" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}>{t('cancel')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
