// REGIONS / DATA は js/data.js で定義


const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const SYMBOLS = { 3: '◎', 2: '△', 1: '×' };
const RATING_LABELS = { 3: 'ベストシーズン', 2: 'まずまず', 1: '避けるべき時期' };

// ===================== STATE =====================
const state = {
  region: 'all',
  month: null,     // 0-11 or null
  bestOnly: false,
  query: '',
};

// ===================== FAVORITES: STATE =====================
const FAVS = new Set(JSON.parse(localStorage.getItem('wtsc-favs') || '[]'));

function saveFavs() {
  localStorage.setItem('wtsc-favs', JSON.stringify([...FAVS]));
}

// ===================== RENDER: SHARED PARTS =====================
function jpName(regionTitle) { return regionTitle.replace(/^\S+\s/, ''); }

function cellsHtml(d) {
  return d.m.map(([rating, tip], mi) =>
    `<td data-m="${mi}"><div class="cell r${rating}" tabindex="0" data-tip="${tip}" data-mi="${mi}" role="img" aria-label="${d.n} ${MONTH_NAMES[mi]}: ${RATING_LABELS[rating]}（${tip}）">${SYMBOLS[rating]}</div></td>`
  ).join('');
}

function nameCellHtml(idx) {
  const d = DATA[idx];
  const on = FAVS.has(d.n);
  return `<td><button class="fav-btn${on ? ' on' : ''}" data-fi="${idx}" aria-pressed="${on}" title="お気に入りに追加/解除">★</button><span class="dest-name" data-di="${idx}" title="クリックで詳細表示">${d.n}</span></td>`;
}

function theadHtml() {
  return `<thead><tr><th>地域 / 国</th>${MONTH_NAMES.map((m, i) => `<th data-m="${i}">${m}</th>`).join('')}</tr></thead>`;
}

// ===================== RENDER: SECTIONS =====================
function renderSections() {
  const container = document.getElementById('sections');
  container.innerHTML = REGIONS.map(region => {
    const rows = DATA.map((d, idx) => ({ d, idx }))
      .filter(({ d }) => d.r === region.k)
      .map(({ d, idx }) => `<tr data-idx="${idx}" data-region="${d.r}" id="dest-${idx}">${nameCellHtml(idx)}${cellsHtml(d)}</tr>`)
      .join('');
    return `<section class="region-section reveal" data-region="${region.k}">
      <div class="region-head">
        <div class="section-label">${region.e}</div>
        <h2>${jpName(region.t)}</h2>
        <div class="accent-line"></div>
      </div>
      <div class="calendar-wrapper">
        <table>${theadHtml()}<tbody>${rows}</tbody></table>
      </div>
    </section>`;
  }).join('');
}

// ===================== RENDER: FAVORITES SECTION =====================
function renderFavSection() {
  const sec = document.getElementById('fav-section');
  const favs = DATA.map((d, i) => ({ d, i })).filter(({ d }) => FAVS.has(d.n));
  sec.classList.toggle('show', favs.length > 0);
  if (!favs.length) { sec.innerHTML = ''; return; }
  const rows = favs.map(({ d, i }) => `<tr data-fav-row>${nameCellHtml(i)}${cellsHtml(d)}</tr>`).join('');
  sec.innerHTML = `<section class="region-section">
    <div class="region-head">
      <div class="section-label">My Favorites</div>
      <h2>⭐ お気に入り比較<span style="font-size:0.6em;color:var(--muted)">（${favs.length}件）</span></h2>
      <div class="accent-line"></div>
    </div>
    <div class="calendar-wrapper">
      <table>${theadHtml()}<tbody>${rows}</tbody></table>
    </div>
  </section>`;
}

function toggleFav(idx) {
  const name = DATA[idx].n;
  const on = !FAVS.has(name);
  if (on) FAVS.add(name); else FAVS.delete(name);
  saveFavs();
  document.querySelectorAll(`.fav-btn[data-fi="${idx}"]`).forEach(b => {
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  applyFilters(); // お気に入りテーブルの再構築と列ハイライトの再適用
}

// ===================== RENDER: FILTER BUTTONS =====================
function renderFilters() {
  const regionBtns = document.getElementById('region-btns');
  regionBtns.innerHTML =
    `<button class="filter-btn active" data-region="all">すべて</button>` +
    REGIONS.map(r => `<button class="filter-btn" data-region="${r.k}">${jpName(r.t)}</button>`).join('');
  regionBtns.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { state.region = btn.dataset.region; applyFilters(); });
  });

  const monthBtns = document.getElementById('month-btns');
  monthBtns.innerHTML = MONTH_NAMES.map((_, i) =>
    `<button class="month-btn" data-m="${i}" aria-pressed="false">${i + 1}</button>`
  ).join('');
  monthBtns.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = Number(btn.dataset.m);
      state.month = state.month === m ? null : m;
      if (state.month === null) state.bestOnly = false;
      applyFilters();
    });
  });

  document.getElementById('best-only').addEventListener('click', () => {
    state.bestOnly = !state.bestOnly;
    applyFilters();
  });

  document.getElementById('search').addEventListener('input', e => {
    state.query = e.target.value.trim();
    applyFilters();
  });
}

// ===================== APPLY FILTERS =====================
function destVisible(d) {
  const q = state.query.toLowerCase();
  let show = state.region === 'all' || d.r === state.region;
  if (show && q) show = d.n.toLowerCase().includes(q);
  if (show && state.bestOnly && state.month !== null) show = d.m[state.month][0] === 3;
  return show;
}

function applyFilters() {
  renderFavSection(); // 先に再構築（後段の列ハイライトを効かせるため）

  // region buttons
  document.querySelectorAll('#region-btns .filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.region === state.region));

  // month buttons
  document.querySelectorAll('.month-btn').forEach(b => {
    const on = Number(b.dataset.m) === state.month;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });

  // best-only toggle
  const bestBtn = document.getElementById('best-only');
  bestBtn.disabled = state.month === null;
  bestBtn.classList.toggle('active', state.bestOnly);
  bestBtn.setAttribute('aria-pressed', state.bestOnly);
  bestBtn.textContent = state.month === null ? '◎のみ表示' : `${state.month + 1}月が◎のみ`;

  // column highlight
  document.querySelectorAll('th[data-m], td[data-m]').forEach(el => {
    const m = Number(el.dataset.m);
    el.classList.toggle('highlight-col', state.month === m);
    el.classList.toggle('dim-col', state.month !== null && state.month !== m && el.tagName === 'TD');
  });

  // rows
  let visibleCount = 0;
  document.querySelectorAll('tr[data-idx]').forEach(tr => {
    const show = destVisible(DATA[Number(tr.dataset.idx)]);
    tr.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  // hide empty sections
  document.querySelectorAll('#sections .region-section').forEach(sec => {
    const anyVisible = [...sec.querySelectorAll('tr[data-idx]')].some(tr => tr.style.display !== 'none');
    sec.style.display = anyVisible ? '' : 'none';
  });

  document.getElementById('empty').classList.toggle('show', visibleCount === 0);

  renderStats();
  renderRecommend();
  updateMap();
  syncHash();
}

// ===================== STATS =====================
function renderStats() {
  const m = state.month !== null ? state.month : new Date().getMonth();
  const bestCount = DATA.filter(d => d.m[m][0] === 3).length;
  document.getElementById('stats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${DATA.length}</div><div class="stat-label">掲載地域数</div></div>
    <div class="stat-card"><div class="stat-num">${REGIONS.length}</div><div class="stat-label">大エリア</div></div>
    <div class="stat-card"><div class="stat-num">${bestCount}</div><div class="stat-label">${m + 1}月が◎の地域</div></div>`;
}

// ===================== RECOMMEND PANEL =====================
function renderRecommend() {
  const panel = document.getElementById('recommend');
  if (state.month === null) { panel.classList.remove('show'); return; }
  const m = state.month;
  const picks = DATA
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.m[m][0] === 3 && (state.region === 'all' || d.r === state.region));
  panel.classList.add('show');
  panel.innerHTML = `
    <div class="section-label">Best This Month</div>
    <h2>${m + 1}月がベストシーズンの地域 <span class="count">${picks.length}件</span></h2>
    <div class="accent-line"></div>
    <div class="recommend-chips">${picks.map(({ d, i }) =>
      `<button class="rec-chip" data-target="dest-${i}">${d.n}</button>`).join('') || '<span style="color:var(--muted);font-size:0.85rem">該当なし</span>'}
    </div>`;
  panel.querySelectorAll('.rec-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const row = document.getElementById(chip.dataset.target);
      if (!row) return;
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.remove('flash');
      requestAnimationFrame(() => row.classList.add('flash'));
    });
  });
}

// ===================== DETAIL MODAL =====================
const modalOverlay = document.getElementById('modal-overlay');
const modalEl = document.getElementById('modal');

function openModal(idx) {
  const d = DATA[idx];
  const region = REGIONS.find(r => r.k === d.r);
  const bestMonths = d.m.map(([r], i) => r === 3 ? (i + 1) + '月' : null).filter(Boolean);
  modalEl.innerHTML = `
    <button class="modal-close" aria-label="閉じる">✕</button>
    <div class="section-label">${region ? region.e : ''}</div>
    <h3>${d.n}</h3>
    <div class="modal-best">ベストシーズン: <b>${bestMonths.join('・') || 'なし'}</b></div>
    <div class="modal-strip">${d.m.map(([r], i) =>
      `<div class="ms r${r}">${i + 1}<small>${SYMBOLS[r]}</small></div>`).join('')}</div>
    <ul class="modal-months">${d.m.map(([r, tip], i) =>
      `<li><span class="mm">${MONTH_NAMES[i]}</span><span class="sym s${r}">${SYMBOLS[r]}</span><span>${tip}</span></li>`).join('')}</ul>`;
  modalOverlay.classList.add('show');
  modalEl.querySelector('.modal-close').focus();
}

function closeModal() { modalOverlay.classList.remove('show'); }

modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
modalEl.addEventListener('click', e => { if (e.target.closest('.modal-close')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===================== FAV / DETAIL CLICK DELEGATION =====================
document.addEventListener('click', e => {
  const favBtn = e.target.closest('.fav-btn');
  if (favBtn) { toggleFav(Number(favBtn.dataset.fi)); return; }
  const name = e.target.closest('.dest-name');
  if (name) openModal(Number(name.dataset.di));
});

// ===================== TOOLTIP (hover + tap) =====================
const tooltip = document.getElementById('tooltip');

function showTooltip(cell) {
  const mi = Number(cell.dataset.mi);
  tooltip.innerHTML = `<span class="tip-month">${MONTH_NAMES[mi]}</span>${cell.dataset.tip}`;
  tooltip.style.display = 'block';
  const rect = cell.getBoundingClientRect();
  const tw = tooltip.offsetWidth;
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  let top = rect.top - tooltip.offsetHeight - 8;
  if (top < 8) top = rect.bottom + 8;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideTooltip() { tooltip.style.display = 'none'; }

document.addEventListener('mouseover', e => {
  const cell = e.target.closest('.cell');
  if (cell) showTooltip(cell); else hideTooltip();
});
document.addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (cell) { showTooltip(cell); e.stopPropagation(); } else hideTooltip();
});
document.addEventListener('focusin', e => {
  const cell = e.target.closest('.cell');
  if (cell) showTooltip(cell); else hideTooltip();
});
window.addEventListener('scroll', hideTooltip, { passive: true });

// ===================== URL HASH SYNC =====================
let hashSyncEnabled = false;

function syncHash() {
  if (!hashSyncEnabled) return;
  const params = new URLSearchParams();
  if (state.region !== 'all') params.set('r', state.region);
  if (state.month !== null) params.set('m', state.month + 1);
  if (state.bestOnly) params.set('best', '1');
  if (state.query) params.set('q', state.query);
  const str = params.toString();
  history.replaceState(null, '', str ? '#' + str : location.pathname + location.search);
}

function loadHash() {
  if (!location.hash) return false;
  const params = new URLSearchParams(location.hash.slice(1));
  let loaded = false;
  const r = params.get('r');
  if (r && REGIONS.some(x => x.k === r)) { state.region = r; loaded = true; }
  const m = Number(params.get('m'));
  if (m >= 1 && m <= 12) { state.month = m - 1; loaded = true; }
  if (params.get('best') === '1' && state.month !== null) { state.bestOnly = true; loaded = true; }
  const q = params.get('q');
  if (q) { state.query = q; document.getElementById('search').value = q; loaded = true; }
  return loaded;
}

// ===================== NAVBAR / HERO PARALLAX / MOBILE COMPACT BAR =====================
const navbar = document.getElementById('navbar');
const heroBg = document.getElementById('hero-bg');
const filterBar = document.getElementById('filter-bar');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  navbar.classList.toggle('scrolled', y > 60);
  heroBg.style.transform = `translateY(${Math.min(y, window.innerHeight) * 0.35}px)`;
  filterBar.classList.toggle('compact', window.innerWidth <= 600 && y > window.innerHeight * 0.95);
}, { passive: true });

// ===================== REVEAL ON SCROLL =====================
function setupReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '-60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ===================== ROULETTE =====================
const rouletteMonthSel = document.getElementById('roulette-month');
const rouletteAreaSel = document.getElementById('roulette-area');
const rouletteSpinBtn = document.getElementById('roulette-spin');
const reelStrip = document.getElementById('reel-strip');
const rouletteResult = document.getElementById('roulette-result');
const rouletteEmpty = document.getElementById('roulette-empty');
const REEL_CELL_H = 110;
let rouletteWinnerIdx = null;
let spinning = false;

function initRoulette() {
  rouletteMonthSel.innerHTML = MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  rouletteMonthSel.value = new Date().getMonth();
  rouletteAreaSel.innerHTML = `<option value="all">すべてのエリア</option>` +
    REGIONS.map(r => `<option value="${r.k}">${jpName(r.t)}</option>`).join('');
  reelStrip.innerHTML = `<div class="reel-placeholder">Press Spin</div>`;

  rouletteSpinBtn.addEventListener('click', spinRoulette);
  document.getElementById('result-again').addEventListener('click', spinRoulette);
  document.getElementById('result-detail').addEventListener('click', () => {
    if (rouletteWinnerIdx !== null) openModal(rouletteWinnerIdx);
  });
  document.getElementById('result-fav').addEventListener('click', () => {
    if (rouletteWinnerIdx === null) return;
    toggleFav(rouletteWinnerIdx);
    updateResultFavBtn();
  });
}

function updateResultFavBtn() {
  const btn = document.getElementById('result-fav');
  const on = rouletteWinnerIdx !== null && FAVS.has(DATA[rouletteWinnerIdx].n);
  btn.classList.toggle('faved', on);
  btn.textContent = on ? '★ お気に入り登録済み' : '★ お気に入りに追加';
}

function spinRoulette() {
  if (spinning) return;
  const m = Number(rouletteMonthSel.value);
  const area = rouletteAreaSel.value;
  const pool = DATA.map((d, i) => ({ d, i }))
    .filter(({ d }) => d.m[m][0] === 3 && (area === 'all' || d.r === area));

  rouletteResult.hidden = true;
  if (!pool.length) {
    rouletteEmpty.hidden = false;
    reelStrip.innerHTML = `<div class="reel-placeholder">No Match</div>`;
    return;
  }
  rouletteEmpty.hidden = true;

  const winner = pool[Math.floor(Math.random() * pool.length)];
  rouletteWinnerIdx = winner.i;

  // リール構築: ランダムセルの後に当選セル
  const TOTAL = 22;
  const cells = [];
  for (let k = 0; k < TOTAL - 1; k++) cells.push(pool[Math.floor(Math.random() * pool.length)]);
  cells.push(winner);
  reelStrip.style.transition = 'none';
  reelStrip.style.transform = 'translateY(0)';
  reelStrip.innerHTML = cells.map(({ d }) => {
    const sp = d.n.indexOf(' ');
    return `<div class="reel-cell"><span class="flag">${d.n.slice(0, sp)}</span><span>${d.n.slice(sp + 1)}</span></div>`;
  }).join('');

  spinning = true;
  rouletteSpinBtn.disabled = true;

  void reelStrip.offsetHeight; // 強制リフロー（transition:none を確定させる）
  reelStrip.style.transition = 'transform 3s cubic-bezier(0.12, 0.6, 0.15, 1)';
  reelStrip.style.transform = `translateY(-${(TOTAL - 1) * REEL_CELL_H}px)`;

  // transitionend はタブ非表示時などに落ちることがあるためタイムアウトでも完了させる
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    spinning = false;
    rouletteSpinBtn.disabled = false;
    showRouletteResult(winner, m);
  };
  reelStrip.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, 3400);
}

function showRouletteResult({ d, i }, m) {
  document.getElementById('result-name').textContent = d.n;
  const region = REGIONS.find(r => r.k === d.r);
  document.getElementById('result-region').textContent = region ? `${region.e} — ${jpName(region.t)}` : '';
  document.getElementById('result-tip').innerHTML = `<b>${m + 1}月:</b> ${d.m[m][1]}`;
  document.getElementById('result-strip').innerHTML = d.m.map(([r], k) =>
    `<div class="ms r${r}">${k + 1}<br>${SYMBOLS[r]}</div>`).join('');
  updateResultFavBtn();
  rouletteResult.hidden = false;
}

// ===================== ROUTE MAP =====================
let map = null;
let mapMarkers = [];
let favLine = null;

const getCss = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function markerColor(rating) {
  return rating === 3 ? getCss('--best-fg') : rating === 2 ? getCss('--good-fg') : getCss('--avoid-fg');
}

function mapPopupHtml(d, i, m) {
  const [r, tip] = d.m[m];
  const fav = FAVS.has(d.n);
  return `<div class="map-popup-name">${d.n}</div>
    <div class="map-popup-status">${m + 1}月: ${SYMBOLS[r]} ${tip}</div>
    <div class="map-popup-actions">
      <button data-act="detail" data-i="${i}">詳細を見る</button>
      <button data-act="fav" data-i="${i}">${fav ? '★ 解除' : '★ お気に入り'}</button>
    </div>`;
}

function initMap() {
  if (typeof L === 'undefined') return; // CDN未達時は地図なしで続行
  map = L.map('map', { scrollWheelZoom: false, worldCopyJump: true }).setView([22, 15], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 10,
  }).addTo(map);

  DATA.forEach((d, i) => {
    if (!d.g) return;
    const mk = L.circleMarker(d.g, { radius: 7, weight: 1.5, color: '#fff', fillOpacity: 0.9 }).addTo(map);
    mk.bindPopup('');
    mapMarkers.push({ mk, i });
  });

  // ポップアップ内ボタン（Leafletのpopupはmapコンテナ内なので委譲で拾う）
  document.getElementById('map').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    if (btn.dataset.act === 'detail') openModal(i);
    if (btn.dataset.act === 'fav') { toggleFav(i); map.closePopup(); }
  });

  window.addEventListener('load', () => map.invalidateSize());
  updateMap();
}

function updateMap() {
  if (!map) return;
  const m = state.month !== null ? state.month : new Date().getMonth();

  mapMarkers.forEach(({ mk, i }) => {
    const d = DATA[i];
    const visible = destVisible(d);
    mk.setStyle({
      fillColor: markerColor(d.m[m][0]),
      fillOpacity: visible ? 0.9 : 0.2,
      opacity: visible ? 1 : 0.25,
    });
    mk.setPopupContent(mapPopupHtml(d, i, m));
  });

  // お気に入り周遊ルート（追加順に結ぶ）
  if (favLine) { favLine.remove(); favLine = null; }
  const pts = [...FAVS]
    .map(n => DATA.find(d => d.n === n))
    .filter(d => d && d.g)
    .map(d => d.g);
  if (pts.length >= 2) {
    favLine = L.polyline(pts, { color: getCss('--terra'), weight: 2.5, dashArray: '6 8' }).addTo(map);
  }
}

// ===================== BUDGET SIMULATOR =====================
const BUDGET_CATS = [
  { key: 'flight', name: '✈️ 航空券（往復）', color: '#7c3d2a' },
  { key: 'stay', name: '🏨 宿泊費', color: '#c2410c' },
  { key: 'food', name: '🍽️ 食費', color: '#d97706' },
  { key: 'trans', name: '🚇 現地交通', color: '#92400e' },
  { key: 'sight', name: '🎟️ 観光・アクティビティ', color: '#78350f' },
  { key: 'comm', name: '📱 通信（eSIM）', color: '#a16207' },
  { key: 'misc', name: '🛍️ 雑費・お土産', color: '#b45309' },
];

// 現地物価Tier(1-5)ごとの1日あたり基準額（節約スタイル時・円）
const STAY_BASE = [2000, 3500, 6000, 9500, 14000];
const FOOD_BASE = [1500, 2500, 3500, 5000, 7000];
const TRANS_BASE = [500, 800, 1200, 1800, 2500];
const SIGHT_BASE = [1000, 1500, 2200, 3000, 4000];

function calcBudget(d, days, style) { // style: 0(節約)〜1(快適)
  const t = d.c - 1;
  const nights = Math.max(days - 1, 1);
  const flight = d.f * 10000 * (0.85 + 0.5 * style); // LCC/セール 〜 正規便
  const stay = STAY_BASE[t] * (1 + 1.6 * style) * nights; // ドミトリー 〜 ホテル
  const food = FOOD_BASE[t] * (1 + 1.2 * style) * days;
  const trans = TRANS_BASE[t] * (1 + 1.0 * style) * days;
  const sight = SIGHT_BASE[t] * (1 + 1.0 * style) * days;
  const comm = 1000 + 150 * days;
  const sub = flight + stay + food + trans + sight + comm;
  const misc = sub * 0.1;
  return { flight, stay, food, trans, sight, comm, misc, total: sub + misc };
}

function initBudget() {
  const destSel = document.getElementById('budget-dest');
  destSel.innerHTML = REGIONS.map(region =>
    `<optgroup label="${jpName(region.t)}">` +
    DATA.map((d, i) => ({ d, i })).filter(({ d }) => d.r === region.k)
      .map(({ d, i }) => `<option value="${i}">${d.n}</option>`).join('') +
    `</optgroup>`
  ).join('');
  destSel.value = DATA.findIndex(d => d.n.includes('タイ（バンコク）'));

  ['budget-dest', 'budget-days', 'budget-style'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateBudget));
  updateBudget();
}

function updateBudget() {
  const d = DATA[Number(document.getElementById('budget-dest').value)];
  const days = Number(document.getElementById('budget-days').value);
  const style = Number(document.getElementById('budget-style').value) / 100;

  document.getElementById('budget-days-label').textContent = `${days}日間`;
  document.getElementById('budget-style-label').textContent =
    style < 0.3 ? '節約バックパッカー' : style < 0.7 ? 'バランス旅行者' : '快適旅行者';

  const b = calcBudget(d, days, style);
  const man = b.total / 10000;
  document.getElementById('budget-total').textContent =
    man >= 100 ? `${Math.round(man)}万円` : `${(Math.round(man * 10) / 10).toFixed(1)}万円`;

  const max = Math.max(...BUDGET_CATS.map(c => b[c.key]));
  document.getElementById('budget-bars').innerHTML = BUDGET_CATS.map(c => `
    <div class="budget-bar-row">
      <div class="bb-head">
        <span class="bb-name">${c.name}</span>
        <span class="bb-amount">¥${Math.round(b[c.key]).toLocaleString()}</span>
      </div>
      <div class="bb-track"><div class="bb-fill" style="width:${Math.max(2, b[c.key] / max * 100)}%;background:${c.color}"></div></div>
    </div>`).join('');
}

// ===================== PACKING LIST =====================
const CHECKED = new Set(JSON.parse(localStorage.getItem('wtsc-packing') || '[]'));
const CLIMATES_ON = new Set(JSON.parse(localStorage.getItem('wtsc-climates') || '[]'));
let activePackTab = PACKING[0].id;

function saveChecked() { localStorage.setItem('wtsc-packing', JSON.stringify([...CHECKED])); }
function saveClimates() { localStorage.setItem('wtsc-climates', JSON.stringify([...CLIMATES_ON])); }

function activePackCategories() {
  return [...PACKING, ...PACKING_CLIMATE.filter(c => CLIMATES_ON.has(c.id))];
}

function initPacking() {
  const togglesBox = document.getElementById('climate-toggles');
  togglesBox.insertAdjacentHTML('beforeend', PACKING_CLIMATE.map(c =>
    `<button class="climate-btn${CLIMATES_ON.has(c.id) ? ' active' : ''}" data-climate="${c.id}">${c.icon} ${c.name}</button>`
  ).join(''));
  togglesBox.querySelectorAll('.climate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.climate;
      if (CLIMATES_ON.has(id)) CLIMATES_ON.delete(id); else CLIMATES_ON.add(id);
      btn.classList.toggle('active', CLIMATES_ON.has(id));
      saveClimates();
      if (!activePackCategories().some(c => c.id === activePackTab)) activePackTab = PACKING[0].id;
      renderPacking();
    });
  });

  document.getElementById('packing-reset').addEventListener('click', () => {
    CHECKED.clear();
    saveChecked();
    renderPacking();
  });

  renderPacking();
}

function renderPacking() {
  const cats = activePackCategories();

  // タブ
  document.getElementById('packing-tabs').innerHTML = cats.map(c => {
    const done = c.items.filter(i => CHECKED.has(`${c.id}:${i.id}`)).length;
    return `<button class="packing-tab${c.id === activePackTab ? ' active' : ''}" data-tab="${c.id}">${c.icon} ${c.name}<span class="count">${done}/${c.items.length}</span></button>`;
  }).join('');
  document.querySelectorAll('.packing-tab').forEach(btn => {
    btn.addEventListener('click', () => { activePackTab = btn.dataset.tab; renderPacking(); });
  });

  // リスト
  const cat = cats.find(c => c.id === activePackTab) || cats[0];
  document.getElementById('packing-panel').innerHTML = cat.items.map(item => {
    const key = `${cat.id}:${item.id}`;
    const on = CHECKED.has(key);
    return `<label class="packing-item${on ? ' checked' : ''}">
      <input type="checkbox" data-key="${key}" ${on ? 'checked' : ''}>
      <span class="pi-body">
        <span class="pi-name">${item.name}</span>
        ${item.note ? `<span class="pi-note">💡 ${item.note}</span>` : ''}
      </span>
      ${item.essential ? '<span class="pi-badge">必須</span>' : ''}
    </label>`;
  }).join('');
  document.querySelectorAll('.packing-item input').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) CHECKED.add(cb.dataset.key); else CHECKED.delete(cb.dataset.key);
      saveChecked();
      renderPacking();
    });
  });

  // 進捗
  const total = cats.reduce((s, c) => s + c.items.length, 0);
  const done = cats.reduce((s, c) => s + c.items.filter(i => CHECKED.has(`${c.id}:${i.id}`)).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('packing-progress-fill').style.width = pct + '%';
  document.getElementById('packing-progress-label').textContent = `${done} / ${total}（${pct}%）`;
}

// ===================== INIT =====================
document.getElementById('hero-count').textContent = DATA.length;
document.getElementById('hero-stat-dest').textContent = DATA.length;
initRoulette();
renderSections();
renderFilters();
initMap();
initBudget();
initPacking();
if (!loadHash()) {
  state.month = new Date().getMonth(); // 今月を初期ハイライト
}
applyFilters();
hashSyncEnabled = true;
syncHash();
setupReveal();
