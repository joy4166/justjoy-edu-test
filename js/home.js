import { getAidSimpleTitle } from './directions.js';
import { cleanUiText, escapeHtml } from './markdown.js';
import { initAppShell } from './shell.js';
import {
  buildStudioUrl,
  getFreeSamplePkg,
  getLatestVisiblePkg,
  getPackApproval,
  getVisiblePkgs,
  isSubscribed,
  loadCatalogIndex,
  refreshLocalState,
  resolveAssetUrl
} from './store.js';

let activeSampleDeptId = '01_kindergarten';
let catalogFilter = 'all';
let catalogQuery = '';
let shellApi = null;

function renderHeroSection() {
  const samplePkg = getFreeSamplePkg();
  const latestPkg = getLatestVisiblePkg();
  const startBtn = document.getElementById('heroStartFreeBtn');
  const metaNote = document.getElementById('heroLatestMeta');
  const tabsEl = document.getElementById('quickStudioTabs');
  const bodyEl = document.getElementById('quickStudioBody');

  if (startBtn) {
    startBtn.href = samplePkg
      ? buildStudioUrl(samplePkg.pack_id, '01_kindergarten', 'unit1')
      : './studio.html';
  }

  if (metaNote) {
    metaNote.innerHTML = latestPkg
      ? `최신 공개 본문 <strong>${escapeHtml(cleanUiText(latestPkg.week_date))} ${escapeHtml(cleanUiText(latestPkg.scripture))}</strong>`
      : '공개 승인된 주차를 준비 중입니다.';
  }

  if (!tabsEl || !bodyEl) return;
  if (!samplePkg || !samplePkg.departments || !samplePkg.departments.length) {
    tabsEl.innerHTML = '';
    bodyEl.innerHTML = '<div class="state-box">현재 공개된 무료 체험 호가 없습니다. 우측 하단 시연 도구에서 목회자 관리자를 확인하세요.</div>';
    return;
  }

  const depts = samplePkg.departments;
  const activeDept = depts.find((d) => d.id === activeSampleDeptId) || depts[0];
  activeSampleDeptId = activeDept.id;

  tabsEl.innerHTML = depts
    .map(
      (d) => `
      <button
        type="button"
        class="quick-tab-btn"
        role="tab"
        aria-selected="${d.id === activeDept.id}"
        data-quick-dept="${escapeHtml(d.id)}"
      >${escapeHtml(d.name)}</button>
    `
    )
    .join('');

  const thumbUrl = resolveAssetUrl(activeDept.thumb_image);
  const aidName = getAidSimpleTitle(activeDept);
  const unitRows = [
    { unit: 'unit1', title: '1교시 목표와 교사 브리핑', cta: '브리핑 열기' },
    { unit: 'unit2', title: `${activeDept.name} 설교 원고 전문`, cta: '설교 읽기' },
    { unit: 'unit3', title: `소인원 1~5명 맞춤 대본 (${activeDept.lesson_minutes}분)`, cta: '대본 보기' },
    { unit: 'unit4', title: `${aidName} 무가위 A4 2면 미리보기`, cta: '활동지 보기' }
  ];

  bodyEl.innerHTML = `
    <div class="quick-room-head">
      <img class="quick-room-thumb" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(activeDept.name)} 일러스트" width="96" height="60" />
      <div>
        <h2 class="quick-room-title">${escapeHtml(cleanUiText(activeDept.sermon_title))}</h2>
        <div class="quick-room-sub">
          <span class="status-tag status-free">무료 체험</span>
          <span>${escapeHtml(cleanUiText(samplePkg.scripture))} 설교 ${escapeHtml(cleanUiText(activeDept.sermon_target))} 활동 ${activeDept.lesson_minutes}분</span>
        </div>
      </div>
    </div>
    <div class="quick-unit-list">
      ${unitRows
        .map(
          (r) => `
          <a class="quick-unit-row" href="${escapeHtml(buildStudioUrl(samplePkg.pack_id, activeDept.id, r.unit))}">
            <span class="quick-unit-name">${escapeHtml(r.title)}</span>
            <span class="quick-unit-action">${escapeHtml(r.cta)}</span>
          </a>
        `
        )
        .join('')}
      <a class="quick-unit-row" href="${escapeHtml(resolveAssetUrl(activeDept.preview_urls?.webapp_html))}" target="_blank" rel="noopener noreferrer">
        <span class="quick-unit-name">HTML5 오프라인 온라인교보재 바로 실행</span>
        <span class="quick-unit-action">새 창 실행</span>
      </a>
    </div>
  `;

  tabsEl.querySelectorAll('[data-quick-dept]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSampleDeptId = btn.getAttribute('data-quick-dept');
      renderHeroSection();
    });
  });
}

function renderDeptTracks() {
  const container = document.getElementById('deptTracksGrid');
  if (!container) return;
  const latestPkg = getLatestVisiblePkg() || getFreeSamplePkg();

  if (!latestPkg || !latestPkg.departments || !latestPkg.departments.length) {
    container.innerHTML = '<div class="state-box">공개된 부서별 교실이 없습니다.</div>';
    return;
  }

  container.innerHTML = latestPkg.departments
    .map((d) => {
      const url = buildStudioUrl(latestPkg.pack_id, d.id, 'unit1');
      const formatLabel = cleanUiText(d.aid_format_badge || '무가위 A4 2면');
      return `
        <article class="track-card">
          <img class="track-card-img" src="${escapeHtml(resolveAssetUrl(d.thumb_image))}" alt="${escapeHtml(d.name)} 교실 썸네일" width="260" height="162" />
          <div class="track-card-body">
            <div class="track-card-head">
              <h3>${escapeHtml(d.name)}</h3>
              <span class="track-card-age">${escapeHtml(cleanUiText(d.age))}</span>
            </div>
            <div class="track-card-time">설교 ${escapeHtml(cleanUiText(d.sermon_target))} 공과 ${d.lesson_minutes}분</div>
            <p class="track-card-format">${escapeHtml(formatLabel)}</p>
            <a class="btn btn-secondary" href="${escapeHtml(url)}">교실 입장하기</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderCatalogRowsOnly() {
  const container = document.getElementById('catalogLedger');
  if (!container) return;

  const vis = getVisiblePkgs();
  const q = catalogQuery.trim().toLowerCase();
  const filtered = vis.filter((p) => {
    if (catalogFilter === 'free' && !p.is_free_sample) return false;
    if (!q) return true;
    const hay = `${p.week_date} ${p.scripture} ${p.title} ${p.core_gospel}`.toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="state-box">조건에 맞는 주차별 커리큘럼이 없습니다.</div>';
    return;
  }

  container.innerHTML = filtered
    .map((p) => {
      const approval = getPackApproval(p);
      let badgeHtml = '';
      if (approval === 'pending_review') {
        badgeHtml = '<span class="status-tag status-warn">점검 대기 (비공개)</span>';
      } else if (p.is_free_sample) {
        badgeHtml = '<span class="status-tag status-free">무료 공개 샘플</span>';
      } else if (isSubscribed()) {
        badgeHtml = '<span class="status-tag status-paid">정기구독 열람 가능</span>';
      } else {
        badgeHtml = '<span class="status-tag status-muted">정기구독 상단 체험</span>';
      }

      const studioUrl = buildStudioUrl(p.pack_id, '01_kindergarten', 'unit1');
      return `
        <article class="catalog-row">
          <div class="catalog-date tabular">${escapeHtml(cleanUiText(p.week_date))}</div>
          <div class="catalog-scripture">${escapeHtml(cleanUiText(p.scripture))}</div>
          <div class="catalog-title-wrap">
            <h3>${escapeHtml(cleanUiText(p.title))}</h3>
            <p class="catalog-sub">${escapeHtml(cleanUiText(p.format_summary || ''))}</p>
          </div>
          <div>${badgeHtml}</div>
          <div>
            <a class="btn btn-primary" href="${escapeHtml(studioUrl)}">수업 스튜디오 입장</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderCatalogSection() {
  const vis = getVisiblePkgs();
  const freeCount = vis.filter((p) => p.is_free_sample).length;
  const allBtn = document.getElementById('filterAllBtn');
  const freeBtn = document.getElementById('filterFreeBtn');

  if (allBtn) {
    allBtn.textContent = `전체 주차 (${vis.length})`;
    allBtn.setAttribute('aria-selected', String(catalogFilter === 'all'));
  }
  if (freeBtn) {
    freeBtn.textContent = `무료 공개 (${freeCount})`;
    freeBtn.setAttribute('aria-selected', String(catalogFilter === 'free'));
  }

  renderCatalogRowsOnly();
}

function renderAllHome() {
  renderHeroSection();
  renderDeptTracks();
  renderCatalogSection();
}

async function bootHome() {
  shellApi = initAppShell({
    activeNav: 'home',
    onModeChange: renderAllHome,
    onCheckoutSuccess: renderAllHome
  });

  const allBtn = document.getElementById('filterAllBtn');
  const freeBtn = document.getElementById('filterFreeBtn');
  const searchInput = document.getElementById('catalogSearchInput');

  if (allBtn) {
    allBtn.addEventListener('click', () => {
      catalogFilter = 'all';
      renderCatalogSection();
    });
  }
  if (freeBtn) {
    freeBtn.addEventListener('click', () => {
      catalogFilter = 'free';
      renderCatalogSection();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      catalogQuery = e.target.value;
      renderCatalogRowsOnly();
    });
  }

  try {
    await loadCatalogIndex();
    renderAllHome();
  } catch (err) {
    const ledger = document.getElementById('catalogLedger');
    if (ledger) ledger.innerHTML = `<div class="state-box state-box--error">${escapeHtml(err.message)}</div>`;
  }

  window.addEventListener('storage', () => {
    refreshLocalState();
    if (shellApi) shellApi.syncChrome();
    renderAllHome();
  });
}

window.addEventListener('DOMContentLoaded', bootHome);
