/* ─────────────────────────────────────────────────────────────
   Fuzzy search helpers
   - normalize(): strip diacritics + lowercase
   - levenshtein(): edit distance with early bail-out
   - fuzzyScore(): 0..1 similarity based on edit distance
   - fuzzyMatch(): substring OR fuzzy threshold
   - fuzzySearch(list, query, keyFn): ranked matches
   ───────────────────────────────────────────────────────────── */

// Strip diacritics (ö → o, ä → a, é → e) and lowercase
export function normalize(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining marks
    .toLowerCase()
    .trim();
}

// Levenshtein distance with simple two-row DP
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // Bail out early if length diff is already bigger than a reasonable threshold
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 10) return lenDiff;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Similarity score 0..1 (1 = identical)
export function fuzzyScore(query, target) {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (t.includes(q)) {
    // Substring match — weight by how much of target it covers & start position
    const startBonus = t.startsWith(q) ? 0.1 : 0;
    return Math.min(1, 0.85 + (q.length / t.length) * 0.1 + startBonus);
  }
  // Token-level fuzzy: best score across whitespace-split tokens
  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = t.split(/\s+/).filter(Boolean);
  let bestToken = 0;
  for (const qt of qTokens) {
    for (const tt of tTokens) {
      if (tt.includes(qt)) { bestToken = Math.max(bestToken, 0.8); continue; }
      const dist = levenshtein(qt, tt);
      const longer = Math.max(qt.length, tt.length);
      const sim = longer === 0 ? 0 : 1 - dist / longer;
      if (sim > bestToken) bestToken = sim;
    }
  }
  // Whole-string fuzzy as fallback
  const dist = levenshtein(q, t);
  const longer = Math.max(q.length, t.length);
  const whole = longer === 0 ? 0 : 1 - dist / longer;
  return Math.max(bestToken, whole);
}

// True if a query "matches" a target within a given threshold (default 0.55)
export function fuzzyMatch(query, target, threshold = 0.55) {
  if (!query || !target) return false;
  return fuzzyScore(query, target) >= threshold;
}

// Search a list and return items sorted by relevance.
// keyFn: item → string[] (all strings that should be searched)
export function fuzzySearch(list, query, keyFn, threshold = 0.55) {
  if (!query || !list || list.length === 0) return [];
  const q = normalize(query);
  if (!q) return [];

  const scored = [];
  for (const item of list) {
    const keys = keyFn(item) || [];
    let best = 0;
    for (const k of keys) {
      const score = fuzzyScore(query, k);
      if (score > best) best = score;
      if (best >= 1) break;
    }
    if (best >= threshold) scored.push({ item, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.item);
}
