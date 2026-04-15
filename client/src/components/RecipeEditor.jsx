import { useState, useEffect, useRef } from 'react';

// Resize an image file down to a JPEG data URL under ~500KB.
function compressImage(file, maxDim = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let q = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        // Step down quality if still too large
        while (dataUrl.length > 480000 && q > 0.3) {
          q -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function RecipeEditor({ recipe, onSave, onCancel, onDelete }) {
  const isEdit = !!recipe?.id;
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: recipe?.title || '',
    ingredients: recipe?.ingredients || '',
    instructions: recipe?.instructions || '',
    photo: recipe?.photo || '',
    calories: recipe?.calories ?? '',
    protein: recipe?.protein ?? '',
    carbs: recipe?.carbs ?? '',
    fat: recipe?.fat ?? '',
    servings: recipe?.servings ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Prevent body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, photo: dataUrl }));
    } catch (err) {
      setError(err.message || 'Could not process image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Please enter a recipe title');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        calories: form.calories === '' ? null : Number(form.calories),
        protein: form.protein === '' ? null : Number(form.protein),
        carbs: form.carbs === '' ? null : Number(form.carbs),
        fat: form.fat === '' ? null : Number(form.fat),
        servings: Number(form.servings) || 1,
      });
    } catch (err) {
      setError(err.message || 'Could not save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="recipe-modal-backdrop" onClick={onCancel}>
      <div className="recipe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="recipe-modal-header">
          <h3>{isEdit ? 'Edit Recipe' : 'New Recipe'}</h3>
          <button type="button" className="recipe-modal-close" onClick={onCancel} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="recipe-form">
          <div className="form-group">
            <label>Recipe Title</label>
            <input type="text" placeholder="e.g. Protein Pancakes" value={form.title} onChange={update('title')} required maxLength={300} />
          </div>

          <div className="form-group">
            <label>Photo</label>
            {form.photo ? (
              <div className="recipe-photo-preview">
                <img src={form.photo} alt="Recipe" />
                <div className="recipe-photo-actions">
                  <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Replace</button>
                  <button type="button" className="btn-delete" onClick={() => setForm((f) => ({ ...f, photo: '' }))}>Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" className="recipe-photo-upload" onClick={() => fileInputRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span>Tap to add a photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
          </div>

          <div className="form-group">
            <label>Ingredients</label>
            <textarea
              rows={5}
              placeholder="e.g.&#10;• 1 cup oats&#10;• 2 eggs&#10;• 1 scoop protein powder"
              value={form.ingredients}
              onChange={update('ingredients')}
              maxLength={5000}
            />
          </div>

          <div className="form-group">
            <label>Instructions</label>
            <textarea
              rows={6}
              placeholder="Step-by-step instructions…"
              value={form.instructions}
              onChange={update('instructions')}
              maxLength={10000}
            />
          </div>

          <div className="form-group">
            <label>Servings</label>
            <input type="number" min="1" step="1" value={form.servings} onChange={update('servings')} />
          </div>

          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
            Nutrition per serving (optional)
          </label>
          <div className="form-row">
            <div className="form-group"><label>Calories</label><input type="number" min="0" placeholder="0" value={form.calories} onChange={update('calories')} /></div>
            <div className="form-group"><label>Protein (g)</label><input type="number" min="0" step="0.1" placeholder="0" value={form.protein} onChange={update('protein')} /></div>
            <div className="form-group"><label>Carbs (g)</label><input type="number" min="0" step="0.1" placeholder="0" value={form.carbs} onChange={update('carbs')} /></div>
            <div className="form-group"><label>Fat (g)</label><input type="number" min="0" step="0.1" placeholder="0" value={form.fat} onChange={update('fat')} /></div>
          </div>

          <div className="recipe-modal-actions">
            {isEdit && onDelete && (
              <button type="button" className="btn-delete" onClick={onDelete} disabled={saving}>Delete</button>
            )}
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
