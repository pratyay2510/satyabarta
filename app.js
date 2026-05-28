// ─── SATYA BARTA — MAIN APPLICATION ──────────────────────────────────────────
// Zero API calls on load. All content from pre-generated data/content.json.

const CONTENT_URL = 'data/content.json';
let revealObserver = null;
let currentLang = 'en';
let contentData = null;

// ─── I18N ────────────────────────────────────────────────────────────────────
const I18N = {
  en: { home_title: "Today's Front Page", mirror_title: 'Mirror Test', hottake_title: 'Hot Take', ask_title: 'Ask Anything', growth_title: 'Growth Checker', dailies_title: "Today's Dailies" },
  bn: { home_title: 'আজকের প্রথম পাতা', mirror_title: 'আয়নার পরীক্ষা', hottake_title: 'গরম খবর', ask_title: 'যা খুশি জিজ্ঞেস করুন', growth_title: 'উন্নয়নের হিসাব', dailies_title: 'আজকের কাগজ' }
};

function toggleLang() {
  currentLang = currentLang === 'en' ? 'bn' : 'en';
  document.getElementById('langToggle').textContent = currentLang === 'en' ? 'বাং' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[currentLang][key]) el.textContent = I18N[currentLang][key];
  });
  showToast(currentLang === 'bn' ? 'ভাষা: বাংলা' : 'Language: English', 'info', 2000);
}

// ─── DARK MODE ───────────────────────────────────────────────────────────────
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('sb_theme', isDark ? 'dark' : 'light');
  document.getElementById('themeToggle').textContent = isDark ? '☀' : '◐';
  showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info', 2000);
}

function applyStoredTheme() {
  if (localStorage.getItem('sb_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').textContent = '☀';
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, type = 'error', duration = 6000) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(t);
  setTimeout(() => { if (t.parentElement) { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); } }, duration);
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatDate(d) { return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function formatTime(d) { return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
function toggleMobile() { document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMobile() { document.getElementById('mobileMenu').classList.remove('open'); }

// ─── DATE SETUP ──────────────────────────────────────────────────────────────
function setupDates() {
  const now = new Date();
  document.getElementById('todayDate').textContent = formatDate(now);
  document.getElementById('mastheadDate').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase() + ' · EDITION ' + Math.floor((now - new Date('2025-01-01')) / 86400000);
  const edStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase() + ' EDITION';
  ['ie-date', 'statesman-date', 'toi-date'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = edStr; });
}

// ─── NAV ACTIVE ──────────────────────────────────────────────────────────────
function setupNav() {
  const links = document.querySelectorAll('.nav-links a');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { links.forEach(l => l.classList.remove('active')); const a = document.querySelector(`.nav-links a[href="#${e.target.id}"]`); if (a) a.classList.add('active'); } });
  }, { threshold: 0.25 });
  ['home', 'dailies', 'contrast', 'growth', 'hottake', 'ask'].forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function setupProgressBar() {
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => { const t = document.body.scrollHeight - window.innerHeight; if (t > 0) bar.style.width = Math.min((window.scrollY / t) * 100, 100) + '%'; }, { passive: true });
}

// ─── SCROLL REVEAL ───────────────────────────────────────────────────────────
function setupReveal() {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (!e.isIntersecting) return; const siblings = [...(e.target.parentElement?.querySelectorAll('[data-reveal]') || [])]; e.target.style.transitionDelay = `${siblings.indexOf(e.target) * 0.09}s`; e.target.classList.add('vis'); revealObserver.unobserve(e.target); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));
}

// ─── EDITION BANNER & COUNTDOWN ──────────────────────────────────────────────
function setupEditionBanner(data) {
  if (!data) return;
  const edEl = document.getElementById('editionText');
  const updEl = document.getElementById('editionUpdated');
  if (edEl) edEl.textContent = `EDITION ${data.edition || '—'}`;
  if (updEl) {
    const gen = new Date(data.generated_at);
    const ago = Math.floor((Date.now() - gen.getTime()) / 60000);
    updEl.textContent = ago < 1 ? 'Updated just now' : ago < 60 ? `Updated ${ago}m ago` : `Updated ${Math.floor(ago / 60)}h ago`;
  }
  if (data.next_update) {
    const next = new Date(data.next_update);
    function tick() {
      const diff = Math.max(0, next.getTime() - Date.now());
      const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById('countdownTimer');
      if (el) el.textContent = diff <= 0 ? 'Soon' : `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
      if (diff > 0) requestAnimationFrame(tick);
    }
    tick();
  }
}

// ─── SHARE BUTTONS ───────────────────────────────────────────────────────────
function shareStory(headline) {
  const url = window.location.href;
  const text = `${headline} — via Satya Barta`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return `<div class="share-row"><button class="share-btn wa" onclick="window.open('${waUrl}','_blank')" title="Share on WhatsApp">WhatsApp</button><button class="share-btn tw" onclick="window.open('${twUrl}','_blank')" title="Share on Twitter/X">Twitter</button><button class="share-btn cp" onclick="navigator.clipboard.writeText('${text} ${url}');showToast('Link copied!','success',2000)" title="Copy link">Copy</button></div>`;
}

// ─── HOME ────────────────────────────────────────────────────────────────────
function badgeHTML(s) { const c = { CONFIRMED: 'badge-confirmed', DEVELOPING: 'badge-developing', UNVERIFIED: 'badge-unverified' }[s] || 'badge-developing'; return `<span class="badge ${c}">${s}</span>`; }

function renderHome(data) {
  document.getElementById('homeLoading').style.display = 'none';
  const feed = document.getElementById('homeFeed');
  feed.style.display = 'block';
  const h = data.hero, stories = data.stories || [], ticker = data.ticker || [];
  const left = stories.slice(0, 3).map(s => `<div class="side-story"><div>${badgeHTML(s.status)} <span class="badge badge-category">${s.category}</span></div><h3>${s.headline}</h3><p>${s.summary}</p><div class="source">Source: ${s.source}</div>${shareStory(s.headline)}</div>`).join('');
  const feat = stories[3] || stories[0] || {};
  const tItems = [...ticker, ...ticker].map(t => `<span class="ticker-item">${t}</span>`).join('');
  feed.innerHTML = `<div class="ai-disclosure">⚙ AI-assisted content — sources listed below — updated 3× daily</div>
<div class="home-grid"><div class="hero-story"><div>${badgeHTML(h.status)}</div><h1>${h.headline}</h1><div class="sub">${h.subheadline}</div><p class="body">${h.summary}</p><div class="story-meta"><div class="label">Impact</div><div>${h.impact}</div><div class="label" style="margin-top:8px">What We Don't Know Yet</div><div style="font-style:italic;color:#bbb">${h.unknowns}</div><div class="label" style="margin-top:8px">Sources</div>${(h.sources || []).map(s => `<span style="display:inline-block;margin-right:8px;font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:#ccc">${s}</span>`).join('')}</div>${shareStory(h.headline)}</div><div class="side-stories">${left}</div><div class="featured-story">${feat.headline ? `<div>${badgeHTML(feat.status)} <span class="badge badge-category">${feat.category}</span></div><h2>${feat.headline}</h2><p class="body">${feat.summary}</p><div class="source" style="margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--muted);text-transform:uppercase">Source: ${feat.source}</div>${shareStory(feat.headline)}` : ''}</div></div>
<div class="ticker-wrap"><div class="ticker-label"><span class="ticker-live-dot"></span> LIVE</div><div class="ticker-track">${tItems}${tItems}</div></div>`;
}

// ─── MIRROR TEST ─────────────────────────────────────────────────────────────
function verdictClass(v) { return { False: 'verdict-false', Misleading: 'verdict-misleading', 'Partially Accurate': 'verdict-partial', Accurate: 'verdict-accurate' }[v] || 'verdict-partial'; }
function discrepClass(d) { return { Contradictory: 'contradictory', Significant: 'significant', Minor: 'minor', None: 'accurate' }[d] || 'minor'; }

function renderContrast(data) {
  document.getElementById('contrastLoading').style.display = 'none';
  const feed = document.getElementById('contrastFeed');
  feed.style.display = 'block';
  feed.innerHTML = data.stories.map(s => `<div class="mirror-pair" data-reveal><div class="mirror-topic">📋 ${s.topic}</div><div class="mirror-columns"><div class="mirror-col state"><div class="mirror-col-header">📺 State / Mainstream Narrative</div><h3>${s.state_narrative.headline}</h3><p>${s.state_narrative.summary}</p>${s.state_narrative.claims_made?.length ? `<div class="mirror-omissions" style="margin-top:12px"><div class="label">Claims Made</div>${s.state_narrative.claims_made.map(c => `<div style="font-size:0.8rem;margin-top:4px">• ${c}</div>`).join('')}</div>` : ''}<div style="margin-top:12px">${(s.state_narrative.sources || []).map(src => `<span class="source-pill" style="background:#fde">${src}</span>`).join(' ')}</div></div><div class="mirror-col verified"><div class="mirror-col-header">📰 Verified / Independent Record</div><h3>${s.verified_record.headline}</h3><p>${s.verified_record.summary}</p>${s.verified_record.what_was_omitted?.length ? `<div class="mirror-omissions"><div class="label">What Was Omitted</div>${s.verified_record.what_was_omitted.map(o => `<div style="font-size:0.8rem;margin-top:4px">• ${o}</div>`).join('')}</div>` : ''}${s.verified_record.data_check ? `<div class="mirror-omissions" style="border-color:var(--accent-teal);margin-top:8px"><div class="label" style="color:var(--accent-teal)">Data Check</div><div style="font-size:0.8rem;margin-top:4px">${s.verified_record.data_check}</div></div>` : ''}<div style="margin-top:12px">${(s.verified_record.sources || []).map(src => `<span class="source-pill" style="background:#dfe">${src}</span>`).join(' ')}</div></div></div><div class="mirror-gap"><div class="gap-item"><div class="label">Discrepancy Level</div><div class="value ${discrepClass(s.gap_analysis.discrepancy_level)}">${s.gap_analysis.discrepancy_level}</div></div><div class="gap-item"><div class="label">Key Gap</div><div style="font-size:0.78rem;color:#ccc;line-height:1.5">${s.gap_analysis.key_gap}</div></div><div class="gap-item"><div class="label">Verdict</div><div class="verdict-stamp ${verdictClass(s.gap_analysis.verdict)}">${s.gap_analysis.verdict}</div></div></div></div>`).join('');
  document.querySelectorAll('.mirror-pair[data-reveal]:not(.vis)').forEach(el => revealObserver?.observe(el));
}

// ─── HOT TAKE ────────────────────────────────────────────────────────────────
const HT_ICONS = { Politics: '🔴', Economy: '🟠', Environment: '🟢', Health: '🔵', Education: '🟣', Labor: '⚫', Infrastructure: '⚪', Culture: '🟡' };
const HT_CLASSES = { Politics: 'politics', Economy: 'economy', Environment: 'environment', Health: 'health', Education: 'education', Labor: 'labor', Infrastructure: 'infrastructure', Culture: 'economy' };

function renderHotTake(data) {
  const grid = document.getElementById('htGrid');
  grid.innerHTML = data.cards.slice(0, 6).map((c, i) => `<div class="ht-card ${HT_CLASSES[c.category] || 'infrastructure'}" style="animation-delay:${i * 0.09}s"><div class="ht-cat">${HT_ICONS[c.category] || '◆'} ${c.category}</div><div class="ht-headline">${c.headline}</div><hr class="ht-divider"><ul class="ht-bullets">${(c.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul><div class="ht-footer"><div class="ht-source">${c.source}</div><span class="badge ${c.status === 'CONFIRMED' ? 'badge-confirmed' : c.status === 'DEVELOPING' ? 'badge-developing' : 'badge-unverified'}" style="font-size:0.55rem">${c.status}</span></div>${shareStory(c.headline)}</div>`).join('');
}

// ─── GROWTH CHARTS ───────────────────────────────────────────────────────────
const GROWTH_DATA = {
  hdi: { label: 'Human Development Index (HDI)', years: ['2001', '2011', '2018', '2021'], wb: [0.499, 0.574, 0.641, 0.655], india: [0.497, 0.547, 0.637, 0.645], source: 'UNDP India / NITI Aayog', interp: "West Bengal's HDI has grown consistently, now slightly above the national average. This reflects gains in education enrollment and life expectancy, though income inequality remains a challenge." },
  gsdp: { label: 'GSDP Growth Rate (%)', years: ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23'], values: [8.3, 8.1, 6.2, -3.1, 9.8, 7.2], source: 'MOSPI / Ministry of Statistics', interp: 'Growth was disrupted by the pandemic in 2020-21. The subsequent recovery reflects national reopening. Sustained 7%+ growth is required to reduce unemployment.' },
  imr: { label: 'Infant Mortality Rate (per 1000)', years: ['2010', '2013', '2016', '2018', '2020', '2022'], wb: [32, 28, 25, 22, 20, 18], india: [47, 40, 34, 32, 28, 25], source: 'Sample Registration System (SRS)', interp: "West Bengal's IMR has declined faster than the national average — a positive indicator of maternal and child health investment." },
  literacy: { label: 'Literacy Rate (%)', years: ['1981', '1991', '2001', '2011'], wb: [48.6, 57.7, 68.6, 76.3], india: [43.6, 52.2, 64.8, 74.0], source: 'Census of India', interp: 'West Bengal consistently outperforms the national literacy average. The gender gap has narrowed significantly since 1991.' }
};

function getCardColor(k) { return { hdi: '#1A6B6B', gsdp: '#8B4513', imr: '#8B0000', literacy: '#1B4332' }[k] || '#333'; }

function buildGrowthCharts() {
  const grid = document.getElementById('growthGrid');
  grid.innerHTML = '';
  Object.entries(GROWTH_DATA).forEach(([key, d]) => {
    const id = 'chart_' + key, hasCmp = d.wb && d.india;
    const p = document.createElement('div'); p.className = 'growth-panel'; p.setAttribute('data-reveal', 'scale');
    p.innerHTML = `<h3 style="border-left-color:${getCardColor(key)}">${d.label}</h3><div class="gp-source">Source: ${d.source}</div><canvas id="${id}"></canvas><div class="growth-interp"><span class="ai-label">Plain-language interpretation</span>${d.interp}</div>`;
    grid.appendChild(p);
    setTimeout(() => {
      const ctx = document.getElementById(id); if (!ctx) return;
      const ds = hasCmp ? [{ label: 'West Bengal', data: d.wb, borderColor: getCardColor(key), backgroundColor: getCardColor(key) + '20', tension: 0.3, fill: true }, { label: 'National Average', data: d.india, borderColor: '#888', borderDash: [6, 3], backgroundColor: 'transparent', tension: 0.3 }] : [{ label: d.label, data: d.values, borderColor: getCardColor(key), backgroundColor: getCardColor(key) + '22', tension: 0.3, fill: true }];
      new Chart(ctx, { type: 'line', data: { labels: d.years, datasets: ds }, options: { responsive: true, plugins: { legend: { display: hasCmp, labels: { font: { family: 'JetBrains Mono', size: 10 } } } }, scales: { y: { grid: { color: '#eee' }, ticks: { font: { family: 'JetBrains Mono', size: 10 } } }, x: { grid: { display: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 } } } } } });
    }, 100);
  });
  // Debt chart
  const dp = document.createElement('div'); dp.className = 'growth-panel'; dp.setAttribute('data-reveal', 'scale');
  dp.innerHTML = `<h3 style="border-left-color:#D4A017">State Debt-to-GSDP Ratio (%)</h3><div class="gp-source">Source: RBI State Finances 2023-24</div><canvas id="chart_debt"></canvas><div class="growth-interp"><span class="ai-label">Plain-language interpretation</span>West Bengal carries one of the higher debt-to-GSDP ratios among major Indian states, limiting fiscal space for new social spending.</div>`;
  grid.appendChild(dp);
  setTimeout(() => { const ctx = document.getElementById('chart_debt'); if (!ctx) return; new Chart(ctx, { type: 'bar', data: { labels: ['WB', 'MH', 'KA', 'UP', 'TN', 'AP', 'RJ'], datasets: [{ label: 'Debt/GSDP %', data: [37.2, 18.1, 22.4, 31.6, 23.5, 32.8, 39.4], backgroundColor: ['#C0392B', '#888', '#888', '#888', '#888', '#888', '#888'] }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { font: { family: 'JetBrains Mono', size: 10 } } }, x: { ticks: { font: { family: 'JetBrains Mono', size: 10 } } } } } }); }, 200);
  // MGNREGA chart
  const mp = document.createElement('div'); mp.className = 'growth-panel'; mp.setAttribute('data-reveal', 'scale');
  mp.innerHTML = `<h3 style="border-left-color:#6B3D8B">MGNREGA Person-Days (Crore)</h3><div class="gp-source">Source: mgnregs.nic.in</div><canvas id="chart_mgnrega"></canvas><div class="growth-interp"><span class="ai-label">Plain-language interpretation</span>MGNREGA utilization in WB has risen, indicating increased rural distress. Documented delays in wage payments persist in several districts.</div>`;
  grid.appendChild(mp);
  setTimeout(() => { const ctx = document.getElementById('chart_mgnrega'); if (!ctx) return; new Chart(ctx, { type: 'bar', data: { labels: ['2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24'], datasets: [{ label: 'Person-Days', data: [32.1, 35.6, 51.8, 44.2, 38.7, 41.3], backgroundColor: '#6B3D8B44', borderColor: '#6B3D8B', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { font: { family: 'JetBrains Mono', size: 10 } } }, x: { ticks: { font: { family: 'JetBrains Mono', size: 10 } } } } } }); }, 300);
  setTimeout(() => { document.querySelectorAll('.growth-panel[data-reveal]:not(.vis)').forEach(el => revealObserver?.observe(el)); }, 50);
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function renderFAQ(faqs) {
  const list = document.getElementById('faqList');
  if (!list || !faqs || !faqs.length) return;
  list.innerHTML = faqs.map((f, i) => `<div class="faq-item" data-reveal><button class="faq-q" onclick="toggleFaq(this)" aria-expanded="false"><span class="faq-q-text">${f.question}</span><span class="faq-arrow">▸</span></button><div class="faq-a" id="faq-a-${i}"><div class="faq-a-inner">${f.answer.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div></div></div>`).join('');
  document.querySelectorAll('.faq-item[data-reveal]:not(.vis)').forEach(el => revealObserver?.observe(el));
}

function toggleFaq(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', !expanded);
  const answer = btn.nextElementSibling;
  if (!expanded) { answer.style.maxHeight = answer.scrollHeight + 'px'; btn.querySelector('.faq-arrow').textContent = '▾'; }
  else { answer.style.maxHeight = '0'; btn.querySelector('.faq-arrow').textContent = '▸'; }
}

// ─── CONTENT LOADER ──────────────────────────────────────────────────────────
async function loadContent() {
  try {
    const res = await fetch(CONTENT_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    contentData = await res.json();
    setupEditionBanner(contentData);
    if (contentData.home) renderHome(contentData.home);
    else document.getElementById('homeLoading').innerHTML = '<div class="error-msg">Home content unavailable.</div>';
    if (contentData.contrast) renderContrast(contentData.contrast);
    else { document.getElementById('contrastLoading').style.display = 'none'; document.getElementById('contrastFeed').style.display = 'block'; document.getElementById('contrastFeed').innerHTML = '<div class="error-msg">Mirror Test content unavailable.</div>'; }
    if (contentData.hottake) renderHotTake(contentData.hottake);
    if (contentData.faq) renderFAQ(contentData.faq);
  } catch (e) {
    console.error('Content load error:', e);
    document.getElementById('homeLoading').innerHTML = `<div class="error-msg">Unable to load content: ${e.message}. Try refreshing.</div>`;
    document.getElementById('contrastLoading').innerHTML = '<div class="error-msg">Content unavailable.</div>';
    document.getElementById('htGrid').innerHTML = '<div style="grid-column:1/-1"><div class="error-msg">Content unavailable.</div></div>';
  }
}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupDates();
  setupNav();
  setupProgressBar();
  setupReveal();
  applyStoredTheme();
  buildGrowthCharts();
  loadContent();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('ServiceWorker registered'))
        .catch(err => console.log('ServiceWorker registration failed: ', err));
    });
  }
});
