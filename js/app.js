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
function applyFilters() {
  const q = state.query.toLowerCase();

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
    const d = DATA[Number(tr.dataset.idx)];
    let show = state.region === 'all' || d.r === state.region;
    if (show && q) show = d.n.toLowerCase().includes(q);
    if (show && state.bestOnly && state.month !== null) show = d.m[state.month][0] === 3;
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

// ===================== INIT =====================
document.getElementById('hero-count').textContent = DATA.length;
document.getElementById('hero-stat-dest').textContent = DATA.length;
initRoulette();
renderSections();
renderFilters();
if (!loadHash()) {
  state.month = new Date().getMonth(); // 今月を初期ハイライト
}
applyFilters();
hashSyncEnabled = true;
syncHash();
setupReveal();
