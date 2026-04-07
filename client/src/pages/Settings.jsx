import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, token, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const [units, setUnits] = useState(localStorage.getItem('units') || 'kg');
  const [msg, setMsg] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const saveName = async () => {
    if (!name.trim()) return flash('Name cannot be empty', false);
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) { flash('Name updated! Refresh to see changes.'); }
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

  const changeLang = (v) => { setLang(v); localStorage.setItem('lang', v); flash('Language preference saved'); };
  const changeUnits = (v) => { setUnits(v); localStorage.setItem('units', v); flash('Unit preference saved'); };

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
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
      </div>

      {msg && <div className={`settings-flash ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}

      {/* Profile */}
      <div className="settings-section">
        <h3>Profile</h3>
        <div className="settings-row">
          <label>Display Name</label>
          <div className="settings-input-row">
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
            <button className="btn-sm" onClick={saveName}>Save</button>
          </div>
        </div>
        <div className="settings-row">
          <label>Email</label>
          <span className="settings-value">{user?.email}</span>
        </div>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h3>Change Password</h3>
        <div className="settings-row">
          <label>Current Password</label>
          <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Enter current password" />
        </div>
        <div className="settings-row">
          <label>New Password</label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="At least 6 characters" />
        </div>
        <div className="settings-row">
          <label>Confirm New Password</label>
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
        </div>
        <button className="btn-primary" onClick={changePassword} style={{ marginTop: '0.5rem' }}>Change Password</button>
      </div>

      {/* Preferences */}
      <div className="settings-section">
        <h3>Preferences</h3>
        <div className="settings-row">
          <label>Language</label>
          <select value={lang} onChange={e => changeLang(e.target.value)}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Fran&#231;ais</option>
          </select>
        </div>
        <div className="settings-row">
          <label>Units</label>
          <select value={units} onChange={e => changeUnits(e.target.value)}>
            <option value="kg">Metric (kg, g)</option>
            <option value="lbs">Imperial (lbs, oz)</option>
          </select>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <h3>Your Data</h3>
        <div className="settings-row">
          <label>Export all your data as JSON</label>
          <button className="btn-sm" onClick={exportData}>Export Data</button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-row">
          <label>Sign out of your account</label>
          <button className="btn-sm" onClick={logout}>Log Out</button>
        </div>
        <div className="settings-row danger">
          <label>Permanently delete your account and all data</label>
          {!showDelete ? (
            <button className="btn-sm btn-danger" onClick={() => setShowDelete(true)}>Delete Account</button>
          ) : (
            <div className="settings-delete-confirm">
              <p>Type <strong>DELETE</strong> to confirm:</p>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
              <div className="settings-delete-btns">
                <button className="btn-sm btn-danger" onClick={deleteAccount}>Confirm Delete</button>
                <button className="btn-sm" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
