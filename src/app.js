import { FAMILIES, SEVERITY } from './allergens.js';
import * as embedder from './embed.js';
import { parseIngredientList, scanList } from './scan.js';
import { scoreBank, buildWeek, shoppingList, planToMarkdown } from './planner.js';

const $ = (id) => document.getElementById(id);
const PROFILE_KEY = 'safeplate:profile:v1';

// Every line here is either a real allergen under an unusual name, or a safe ingredient
// that reads like an allergen. None of these words appear in src/allergens.js.
const DEMO = `200 g labneh
a handful of kataifi pastry
150 g surimi sticks
2 tbsp gomasio
100 g panko breadcrumbs
a scattering of pignoli
1 tbsp nutritional yeast
400 ml coconut milk
2 tsp nutmeg
100 g buckwheat flour
1 aubergine, diced
a knob of cocoa butter`;

let profile = loadProfile();
let bank = [];
let lastScored = null;

/* ---------------- profile ---------------- */

function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (raw) return { families: [], severity: {}, custom: [], dislikes: [], name: '', ...raw };
  } catch { /* fall through to a blank profile */ }
  return { name: '', families: [], severity: {}, custom: [], dislikes: [] };
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function renderFamilies() {
  $('familyGrid').innerHTML = Object.entries(FAMILIES).map(([key, f]) => {
    const on = profile.families.includes(key);
    const sev = profile.severity[key] || f.severityDefault;
    return `
      <div class="famcard ${on ? 'on' : ''}" data-key="${key}">
        <label class="famhead">
          <input type="checkbox" data-fam="${key}" ${on ? 'checked' : ''} />
          <span class="famicon">${f.icon}</span>
          <span class="famlabel">${f.label}</span>
        </label>
        <select class="famsev" data-sev="${key}" ${on ? '' : 'disabled'}>
          ${Object.entries(SEVERITY).map(([k, s]) => `<option value="${k}" ${k === sev ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>`;
  }).join('');

  $('familyGrid').querySelectorAll('[data-fam]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.fam;
      if (cb.checked) {
        if (!profile.families.includes(key)) profile.families.push(key);
        profile.severity[key] = profile.severity[key] || FAMILIES[key].severityDefault;
      } else {
        profile.families = profile.families.filter((f) => f !== key);
      }
      renderFamilies();
      markDirty();
    });
  });
  $('familyGrid').querySelectorAll('[data-sev]').forEach((sel) => {
    sel.addEventListener('change', () => {
      profile.severity[sel.dataset.sev] = sel.value;
      markDirty();
    });
  });
}

function renderChips() {
  $('customList').innerHTML = profile.custom.map((c, i) =>
    `<span class="chip warn">${esc(c.term)} <small>${SEVERITY[c.severity]?.label || ''}</small><button data-rm-custom="${i}">×</button></span>`).join('')
    || '<span class="empty">Nothing added.</span>';
  $('dislikeList').innerHTML = profile.dislikes.map((d, i) =>
    `<span class="chip">${esc(d)}<button data-rm-dislike="${i}">×</button></span>`).join('')
    || '<span class="empty">Nothing added.</span>';

  $('customList').querySelectorAll('[data-rm-custom]').forEach((b) => b.addEventListener('click', () => {
    profile.custom.splice(Number(b.dataset.rmCustom), 1); renderChips(); markDirty();
  }));
  $('dislikeList').querySelectorAll('[data-rm-dislike]').forEach((b) => b.addEventListener('click', () => {
    profile.dislikes.splice(Number(b.dataset.rmDislike), 1); renderChips(); markDirty();
  }));
}

function markDirty() {
  lastScored = null;
  $('profileStat').textContent = 'Unsaved changes.';
}

$('addCustom').addEventListener('click', () => {
  const term = $('customInput').value.trim().toLowerCase();
  if (!term) return;
  profile.custom.push({ term, severity: $('customSeverity').value });
  $('customInput').value = '';
  renderChips(); markDirty();
});
$('customInput').addEventListener('keydown', (e) => e.key === 'Enter' && $('addCustom').click());

$('addDislike').addEventListener('click', () => {
  const term = $('dislikeInput').value.trim().toLowerCase();
  if (!term) return;
  profile.dislikes.push(term);
  $('dislikeInput').value = '';
  renderChips(); markDirty();
});
$('dislikeInput').addEventListener('keydown', (e) => e.key === 'Enter' && $('addDislike').click());

$('profileName').addEventListener('input', (e) => { profile.name = e.target.value; markDirty(); });

$('saveProfile').addEventListener('click', () => {
  saveProfile();
  const n = profile.families.length + profile.custom.length;
  $('profileStat').textContent = `Saved. ${n} thing${n === 1 ? '' : 's'} to watch for, stored on this device only.`;
});

/* ---------------- tabs ---------------- */

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
}));

/* ---------------- model ---------------- */

function setEngine(s, text) {
  $('engineBadge').dataset.state = s;
  $('engineText').textContent = text;
}

async function ensureModel() {
  if (embedder.ready()) return true;
  $('loadbar').hidden = false;
  setEngine('loading', 'Downloading weights…');
  try {
    const { device } = await embedder.load(embedder.DEFAULT_MODEL, 'auto', (p) => {
      if (p.status === 'progress' && p.total) {
        const pct = Math.round((p.loaded / p.total) * 100);
        $('loadbarFill').style.width = `${pct}%`;
        $('loadbarText').textContent = `${p.file} — ${pct}%`;
      }
    });
    setEngine('ready', `bge-small on ${device.toUpperCase()}`);
    $('loadbarText').textContent = 'Cached. Offline from here.';
    setTimeout(() => { $('loadbar').hidden = true; }, 1200);
    return true;
  } catch (err) {
    setEngine('error', 'Load failed');
    $('loadbarText').textContent = err.message;
    return false;
  }
}

/* ---------------- scan ---------------- */

$('scanDemoBtn').addEventListener('click', () => { $('scanInput').value = DEMO; });

$('scanBtn').addEventListener('click', async () => {
  if (!profile.families.length && !profile.custom.length) {
    $('scanStat').textContent = 'Set up a profile first, otherwise there is nothing to check against.';
    return;
  }
  const text = $('scanInput').value.trim();
  if (!text) { $('scanStat').textContent = 'Paste an ingredient list first.'; return; }

  $('scanBtn').disabled = true;
  $('scanStat').textContent = 'Loading the model…';
  if (!(await ensureModel())) { $('scanBtn').disabled = false; return; }

  $('scanStat').textContent = 'Comparing meanings…';
  const t0 = performance.now();
  try {
    const ingredients = parseIngredientList(text);
    const { results, verdict } = await scanList(ingredients, profile);
    renderScan(results, verdict);
    $('scanStat').textContent = `${ingredients.length} ingredients in ${Math.round(performance.now() - t0)} ms, locally.`;
  } catch (err) {
    $('scanStat').textContent = `Scan failed: ${err.message}`;
  } finally {
    $('scanBtn').disabled = false;
  }
});

const VERDICTS = {
  unsafe: { cls: 'bad', title: 'Do not serve this', sub: 'At least one ingredient matches something they react to.' },
  check:  { cls: 'warn', title: 'Check before you cook', sub: 'Nothing is obviously unsafe, but some ingredients are close enough to be worth a label check.' },
  avoid:  { cls: 'warn', title: 'Safe, but they will not want it', sub: 'Nothing dangerous. Something here is on the avoid-or-dislike list.' },
  safe:   { cls: 'good', title: 'Nothing flagged', sub: 'No ingredient here resembles anything in the profile.' },
};

function renderScan(results, verdict) {
  const v = VERDICTS[verdict];
  $('scanVerdict').innerHTML = `<div class="verdict ${v.cls}"><strong>${v.title}</strong><span>${v.sub}</span></div>`;

  $('scanResults').innerHTML = results.map((r) => {
    const real = r.hits.filter((h) => h.verdict !== 'excused');
    const excused = r.hits.filter((h) => h.verdict === 'excused');
    const cls = real.some((h) => h.verdict === 'danger') ? 'bad'
      : real.some((h) => h.verdict === 'caution') ? 'warn'
      : real.length ? 'note' : 'good';
    return `
      <div class="ingrow ${cls}">
        <div class="ingname">${esc(r.raw)}${r.norm !== r.raw.toLowerCase() ? `<span class="norm">read as “${esc(r.norm)}”</span>` : ''}</div>
        <div class="inghits">
          ${real.map((h) => `
            <div class="hit ${h.verdict}">
              <span class="hicon">${h.icon}</span>
              <span class="hlabel">${esc(h.label)}</span>
              <span class="hreason">${esc(h.reason)}</span>
              <span class="hscore" title="cosine similarity">${h.score.toFixed(2)}</span>
            </div>`).join('')}
          ${excused.map((h) => `<div class="hit excused"><span class="hicon">✓</span><span class="hreason">${esc(h.reason)}</span></div>`).join('')}
          ${!real.length && !excused.length ? '<div class="hit clear">Clear</div>' : ''}
        </div>
      </div>`;
  }).join('');
}

/* ---------------- plan ---------------- */

async function loadBank() {
  if (bank.length) return bank;
  const res = await fetch('data/recipes.json');
  bank = await res.json();
  return bank;
}

$('planBtn').addEventListener('click', async () => {
  if (!profile.families.length && !profile.custom.length) {
    $('planStat').textContent = 'Set up a profile first.';
    return;
  }
  $('planBtn').disabled = true;
  $('planStat').textContent = 'Loading the model…';
  if (!(await ensureModel())) { $('planBtn').disabled = false; return; }

  try {
    await loadBank();
    $('planProgress').hidden = false;
    $('planStat').textContent = 'Scanning every recipe…';
    lastScored = await scoreBank(bank, profile, (done, total) => {
      $('planBar').style.width = `${Math.round((done / total) * 100)}%`;
    });
    $('planProgress').hidden = true;
    renderPlan();
  } catch (err) {
    $('planStat').textContent = `Planning failed: ${err.message}`;
  } finally {
    $('planBtn').disabled = false;
  }
});

$('rerollBtn').addEventListener('click', () => lastScored && renderPlan());

function renderPlan() {
  const opts = { maxMinutes: Number($('maxMinutes').value), allowCheck: $('allowCheck').checked };
  const { days, pool } = buildWeek(lastScored, opts);
  const safe = lastScored.filter((s) => s.verdict === 'safe').length;
  const check = lastScored.filter((s) => s.verdict === 'check').length;
  const unsafe = lastScored.filter((s) => s.verdict === 'unsafe').length;

  $('planSummary').innerHTML = `
    <div class="tally">
      <span class="pill good">${safe} safe</span>
      <span class="pill warn">${check} worth checking</span>
      <span class="pill bad">${unsafe} ruled out</span>
      <span class="pill">${pool} in the pool</span>
    </div>`;
  $('planStat').textContent = `Scored ${lastScored.length} recipes on this device.`;

  if (!days.length) {
    $('planMount').innerHTML = '<p class="empty">Nothing in the bank clears this profile at that time limit. Try allowing "worth checking" recipes, or raising the limit.</p>';
    $('shopMount').innerHTML = '';
    $('planActions').hidden = true;
    return;
  }

  $('planMount').innerHTML = days.map((d) => `
    <div class="daycard ${d.verdict === 'safe' ? '' : 'warn'}">
      <div class="dayname">${d.day}</div>
      <div class="dish">${esc(d.recipe.name)}</div>
      <div class="dmeta">${esc(d.recipe.cuisine)} · ${d.recipe.minutes} min · serves ${d.recipe.serves}</div>
      ${d.problems.length ? `<div class="dwarn">${d.problems.map((p) => p.hits.filter((h) => h.verdict !== 'excused').map((h) => `${h.icon} ${esc(p.raw)} — ${esc(h.reason)}`).join('<br/>')).join('<br/>')}</div>` : ''}
    </div>`).join('');

  $('shopMount').innerHTML = `<h3>Shopping list</h3><div class="shop">${shoppingList(days).map((g) => `
    <div class="aisle"><h4>${esc(g.aisle)}</h4><ul>${g.items.map((i) => `<li>${esc(i.line)}${i.count > 1 ? ` <em>×${i.count}</em>` : ''}</li>`).join('')}</ul></div>`).join('')}</div>`;

  $('planActions').hidden = false;
  $('exportPlanBtn').onclick = () => download('meal-plan.md', planToMarkdown(days, profile.name), 'text/markdown');
}

/* ---------------- utils ---------------- */

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- boot ---------------- */

$('profileName').value = profile.name || '';
renderFamilies();
renderChips();
setEngine('idle', 'Model loads on first scan');
