import { cleanUiText, escapeHtml } from './markdown.js';
import { getPackApproval, getVisiblePkgs, state } from './store.js';

const ROOM_LABELS = {
  master: '주중 교사 브리핑',
  '01_kindergarten': '유치부 4~7세',
  '02_elem_lower': '초등1부 1~3학년',
  '03_elem_upper': '초등2부 4~6학년',
  '04_youth': '청소년부 중고등',
  '05_mixed': '혼합 통합반'
};

const desktopMedia = window.matchMedia('(min-width: 60.01rem)');

function weekShortLabel(pkg) {
  return pkg ? cleanUiText(pkg.scripture) : '';
}

function syncRailOpenState(detailsEl) {
  if (!detailsEl) return;
  detailsEl.open = desktopMedia.matches;
}

export function renderCurriculumRail(container, activePkg, onSelectWeek, onSelectDept) {
  const visible = getVisiblePkgs();
  const sorted = [...visible].sort((a, b) => Number(b.is_free_sample) - Number(a.is_free_sample));

  const weekButtons = sorted
    .map((pkg) => {
      const isCurrent = activePkg && pkg.pack_id === activePkg.pack_id;
      const approval = getPackApproval(pkg);
      const badgeClass = pkg.is_free_sample ? 'rail-tag-free' : 'rail-tag-sub';
      const badgeLabel = approval === 'pending_review'
        ? '보류'
        : pkg.is_free_sample
          ? '무료 공개'
          : '정규 호';

      return `
        <button
          type="button"
          class="rail-week-btn"
          data-week-id="${escapeHtml(pkg.pack_id)}"
          aria-current="${isCurrent ? 'true' : 'false'}"
        >
          <span class="rail-week-text">${escapeHtml(weekShortLabel(pkg))}</span>
          <span class="${badgeClass}">${escapeHtml(badgeLabel)}</span>
        </button>
      `;
    })
    .join('');

  const depts = (activePkg && activePkg.departments) || [];
  const deptRooms = [
    { id: 'master', name: ROOM_LABELS.master, meta: '공통' },
    ...depts.map((d) => ({
      id: d.id,
      name: ROOM_LABELS[d.id] || d.name,
      meta: `${d.lesson_minutes}분`
    }))
  ];

  const roomButtons = deptRooms
    .map((room) => {
      const isCurrent = state.activeDeptId === room.id;
      return `
        <button
          type="button"
          class="rail-room-btn"
          data-dept-id="${escapeHtml(room.id)}"
          aria-current="${isCurrent ? 'page' : 'false'}"
        >
          <span class="rail-room-name">${escapeHtml(room.name)}</span>
          <span class="rail-room-meta">${escapeHtml(room.meta)}</span>
        </button>
      `;
    })
    .join('');

  const activeRoomLabel = ROOM_LABELS[state.activeDeptId] || '유치부 4~7세';
  const emptyNote = !sorted.length
    ? '<p class="rail-subnote">현재 공개된 주차가 없습니다. 우측 하단 시연 도구에서 목회자 관리자를 선택해 확인하세요.</p>'
    : `<p class="rail-subnote">${escapeHtml(cleanUiText(activePkg.week_date))} 주일 성경 본문 기준</p>`;

  container.innerHTML = `
    <details class="rail-details" id="railDetails" ${desktopMedia.matches ? 'open' : ''}>
      <summary class="rail-mobile-summary">
        <span class="rail-summary-current">
          <strong>${escapeHtml(weekShortLabel(activePkg))}</strong>
          <span class="rail-summary-room">${escapeHtml(activeRoomLabel)}</span>
        </span>
        <span class="rail-summary-action">교실 변경</span>
      </summary>
      <div class="rail-details-body">
        <div class="rail-section">
          <h2 class="rail-heading">주차 선택</h2>
          <div class="rail-list" role="group" aria-label="주차 호수 선택">
            ${weekButtons}
          </div>
          ${emptyNote}
        </div>
        <nav class="rail-section" aria-label="교과 부서 교실">
          <h2 class="rail-heading">6개 교육실</h2>
          <div class="rail-list">
            ${roomButtons}
          </div>
        </nav>
      </div>
    </details>
  `;

  const detailsEl = container.querySelector('#railDetails');
  if (detailsEl && !detailsEl.dataset.boundMedia) {
    detailsEl.dataset.boundMedia = 'true';
    desktopMedia.addEventListener('change', () => syncRailOpenState(detailsEl));
  }

  container.querySelectorAll('[data-week-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!desktopMedia.matches && detailsEl) detailsEl.open = false;
      onSelectWeek(btn.getAttribute('data-week-id'));
    });
  });

  container.querySelectorAll('[data-dept-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!desktopMedia.matches && detailsEl) detailsEl.open = false;
      onSelectDept(btn.getAttribute('data-dept-id'));
    });
  });
}
