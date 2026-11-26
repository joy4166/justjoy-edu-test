import { cleanUiText, escapeHtml } from './markdown.js';
import {
  renderDeptUnit1,
  renderDeptUnit2,
  renderDeptUnit3,
  renderDeptUnit4,
  renderMasterUnit
} from './reader-units.js';
import {
  UNIT_LIST,
  getDeptUploads,
  getPackApproval,
  isPkgUnlocked,
  state
} from './store.js';

const BRANCH_LABELS = {
  all: '전체 순서',
  '1': '학생 1명',
  '2-3': '2~3명',
  '4-5': '4~5명'
};

export function renderReaderStage(container, pkg, handlers) {
  const isMaster = state.activeDeptId === 'master';
  const dept = !isMaster
    ? (pkg.departments || []).find((d) => d.id === state.activeDeptId) || pkg.departments[0]
    : null;
  const unlocked = isPkgUnlocked(pkg);
  const approval = getPackApproval(pkg);

  const roomLabel = isMaster ? '주중 교사 브리핑' : `${dept.name} (${cleanUiText(dept.age)})`;
  const stageTitle = isMaster ? cleanUiText(pkg.title) : cleanUiText(dept.sermon_title || pkg.title);

  const badgeHtml = approval === 'pending_review'
    ? '<span class="status-badge status-badge--hold">점검 대기 (비공개)</span>'
    : pkg.is_free_sample
      ? '<span class="status-badge status-badge--free">무료 공개 샘플</span>'
      : unlocked
        ? '<span class="status-badge status-badge--paid">정기구독 열람 가능</span>'
        : '<span class="status-badge status-badge--paid">정기구독 전용 (상단 미리보기)</span>';

  const tabsHtml = UNIT_LIST.map((u, idx) => {
    let label = isMaster ? u.masterLabel : u.label;
    if (!isMaster && u.id === 'unit3' && dept) {
      label = `3교시 ${dept.lesson_minutes}분 소인원 대본`;
    }
    const selected = state.activeUnitId === u.id;
    return `
      <button
        type="button"
        class="unit-tab"
        role="tab"
        id="tab-${u.id}"
        aria-selected="${selected}"
        tabindex="${selected ? '0' : '-1'}"
        data-unit-id="${u.id}"
        data-tab-idx="${idx}"
      >${escapeHtml(label)}</button>
    `;
  }).join('');

  let panelHtml = '';
  if (isMaster) {
    panelHtml = renderMasterUnit(pkg, state.activeUnitId, unlocked);
  } else if (state.activeUnitId === 'unit1') {
    panelHtml = renderDeptUnit1(pkg, dept, unlocked);
  } else if (state.activeUnitId === 'unit2') {
    panelHtml = renderDeptUnit2(dept, unlocked);
  } else if (state.activeUnitId === 'unit3') {
    panelHtml = renderDeptUnit3(dept, unlocked);
  } else {
    panelHtml = renderDeptUnit4(pkg, dept, unlocked);
  }

  const sizeClass = state.textSize === 'large' ? 'is-large' : '';
  const fontClass = state.proseFont === 'serif' ? 'is-serif' : '';

  container.innerHTML = `
    <div class="stage-head">
      <nav class="breadcrumb-nav" aria-label="현재 위치">
        <span>${escapeHtml(cleanUiText(pkg.scripture))}</span>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
        <span>${escapeHtml(roomLabel)}</span>
      </nav>
      <h1 class="stage-title">${escapeHtml(stageTitle)}</h1>
      <div class="stage-meta-row">
        <div class="stage-meta-info">
          ${badgeHtml}
          <span class="num">${escapeHtml(pkg.week_date)} 주일</span>
          ${dept ? `<span class="num">설교 ${escapeHtml(cleanUiText(dept.sermon_target))}</span>` : ''}
          ${dept ? `<span class="num">활동 ${dept.lesson_minutes}분</span>` : ''}
        </div>
        <div class="reader-controls">
          <div class="seg-group" role="group" aria-label="본문 글자 크기">
            <button type="button" class="seg-btn" data-text-size="default" aria-pressed="${state.textSize === 'default'}">기본</button>
            <button type="button" class="seg-btn" data-text-size="large" aria-pressed="${state.textSize === 'large'}">크게</button>
          </div>
          <div class="seg-group" role="group" aria-label="설교 읽기 서체">
            <button type="button" class="seg-btn" data-prose-font="sans" aria-pressed="${state.proseFont === 'sans'}">고딕</button>
            <button type="button" class="seg-btn" data-prose-font="serif" aria-pressed="${state.proseFont === 'serif'}">명조</button>
          </div>
        </div>
      </div>
    </div>

    <div class="unit-tablist" role="tablist" aria-label="교시별 수업 자료">
      ${tabsHtml}
    </div>

    <div
      class="unit-panel-wrap ${sizeClass} ${fontClass}"
      role="tabpanel"
      aria-labelledby="tab-${escapeHtml(state.activeUnitId)}"
    >
      ${panelHtml}
    </div>
  `;

  if (unlocked && state.activeUnitId === 'unit4' && dept) {
    const customId = state.previewSource.startsWith('custom:') ? state.previewSource.slice(7) : '';
    const customItem = customId ? getDeptUploads(pkg.pack_id, dept.id).find((u) => u.id === customId) : null;
    const frame = document.getElementById('inlinePreviewFrame');
    if (frame && customItem && ['html', 'htm'].includes(customItem.ext)) {
      frame.srcdoc = customItem.content || '';
    }
  }

  bindReaderEvents(container, handlers);
  applyBranchFilter(container, false);
}

function scrollToBranchTarget(el) {
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

function updateBranchSummaryBanner(container, allEls, matchingEls) {
  const banner = container.querySelector('#branchSummaryBanner');
  if (!banner) return;

  const filter = state.branchFilter;
  const label = BRANCH_LABELS[filter] || filter;

  if (filter === 'all') {
    const hasBranches = allEls.length > 0;
    banner.innerHTML = `
      <div class="branch-summary-copy">
        <strong>전체 순서 보기 (${hasBranches ? `인원별 분기 ${allEls.length}개 블록 포함` : '기본 대본'})</strong>
        <span>학생 인원수(1명, 2~3명, 4~5명)를 고르면 맞춤 운영 구간을 바로 강조해 이동합니다.</span>
      </div>
      ${hasBranches ? '<button type="button" class="btn btn-secondary" data-jump-branch>인원별 팁 바로 보기</button>' : ''}
    `;
  } else {
    const firstText = matchingEls[0] ? matchingEls[0].textContent.trim().slice(0, 56) : '';
    banner.innerHTML = `
      <div class="branch-summary-copy">
        <strong>${escapeHtml(label)} 맞춤 진행 블록 ${matchingEls.length}개 강조 중</strong>
        <span>${firstText ? escapeHtml(firstText) : '해당 인원 운영 팁이 강조되었습니다.'}</span>
      </div>
      <div class="upload-row-actions">
        ${matchingEls.length ? '<button type="button" class="btn btn-secondary" data-jump-branch>해당 위치로 이동</button>' : ''}
        <button type="button" class="btn btn-quiet" data-reset-branch>전체 보기</button>
      </div>
    `;
  }

  const jumpBtn = banner.querySelector('[data-jump-branch]');
  if (jumpBtn) {
    const target = filter === 'all' ? allEls[0] : matchingEls[0];
    jumpBtn.addEventListener('click', () => scrollToBranchTarget(target));
  }

  const resetBtn = banner.querySelector('[data-reset-branch]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.branchFilter = 'all';
      container.querySelectorAll('[data-branch-filter]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-branch-filter') === 'all'));
      });
      applyBranchFilter(container, false);
    });
  }
}

function applyBranchFilter(container, shouldScroll) {
  const article = container.querySelector('#lessonScriptArticle');
  if (!article) return;

  const filter = state.branchFilter;
  const allEls = [...article.querySelectorAll('[data-branch]')];
  const matchingEls = [];

  allEls.forEach((el) => {
    const match = el.getAttribute('data-branch') === filter;
    el.hidden = filter !== 'all' && !match;
    el.classList.toggle('is-branch-focus', filter !== 'all' && match);
    if (match) matchingEls.push(el);
  });

  updateBranchSummaryBanner(container, allEls, matchingEls);

  if (shouldScroll && filter !== 'all' && matchingEls.length) {
    scrollToBranchTarget(matchingEls[0]);
  }
}

function bindReaderEvents(container, handlers) {
  const tabButtons = [...container.querySelectorAll('[role="tab"]')];
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => handlers.onSelectUnit(btn.getAttribute('data-unit-id')));
    btn.addEventListener('keydown', (e) => {
      const idx = Number(btn.getAttribute('data-tab-idx'));
      let next = null;
      if (e.key === 'ArrowRight') next = tabButtons[(idx + 1) % tabButtons.length];
      else if (e.key === 'ArrowLeft') next = tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length];
      else if (e.key === 'Home') next = tabButtons[0];
      else if (e.key === 'End') next = tabButtons[tabButtons.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      handlers.onSelectUnit(next.getAttribute('data-unit-id'));
    });
  });

  container.querySelectorAll('[data-text-size]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onChangeTextSize(btn.getAttribute('data-text-size')));
  });

  container.querySelectorAll('[data-prose-font]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onChangeProseFont(btn.getAttribute('data-prose-font')));
  });

  container.querySelectorAll('[data-branch-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.branchFilter = btn.getAttribute('data-branch-filter');
      container.querySelectorAll('[data-branch-filter]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyBranchFilter(container, state.branchFilter !== 'all');
    });
  });

  container.querySelectorAll('[data-preview-source]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.previewSource = btn.getAttribute('data-preview-source');
      handlers.onRerenderStage();
    });
  });

  container.querySelectorAll('[data-open-unlock]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onOpenPaywall(btn.getAttribute('data-open-unlock')));
  });

  container.querySelectorAll('[data-preview-custom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.previewSource = `custom:${btn.getAttribute('data-preview-custom')}`;
      handlers.onSelectUnit('unit4');
    });
  });

  container.querySelectorAll('[data-dl-custom]').forEach((btn) => {
    btn.addEventListener('click', () => handlers.onDownloadCustom(btn.getAttribute('data-dl-custom')));
  });
}
