import { DEFAULT_NOTE, escapeHtml, getDeptKoreanName, getPackApproval } from './storage.js';

/** Render the weekly ledger summary and table rows. */
export function renderLedger(el, packages, selectedPackId, approvalMap) {
  const approvedCount = packages.filter((p) => getPackApproval(p, approvalMap) === 'approved').length;
  const pendingCount = packages.length - approvedCount;
  el.ledgerSummary.textContent = `전체 ${packages.length}건 (공개 ${approvedCount}건, 점검 대기 ${pendingCount}건)`;

  el.ledgerBody.innerHTML = packages
    .map((pkg) => {
      const isSelected = pkg.pack_id === selectedPackId;
      const isApproved = getPackApproval(pkg, approvalMap) === 'approved';
      const typeTag = pkg.is_free_sample
        ? '<span class="status-tag status-free">무료 샘플</span>'
        : '<span class="status-tag status-muted">정규 구독</span>';
      const approvalTag = isApproved
        ? '<span class="status-tag status-approved">승인 공개 중</span>'
        : '<span class="status-tag status-warn">점검 대기</span>';
      return `<tr class="${isSelected ? 'is-selected' : ''}">
        <td class="num-cell">${escapeHtml(pkg.week_date)}</td>
        <td>${escapeHtml(pkg.scripture)}</td>
        <td>${escapeHtml(pkg.title)}</td>
        <td>${typeTag}</td>
        <td>${approvalTag}</td>
        <td><button type="button" class="btn btn-secondary btn-sm" data-select-pack="${escapeHtml(pkg.pack_id)}"${isSelected ? ' aria-current="true"' : ''}>${isSelected ? '선택됨' : '관리 선택'}</button></td>
      </tr>`;
    })
    .join('');
}

/** Populate the package dropdown selector. */
export function renderPackSelect(el, packages, selectedPackId, approvalMap) {
  el.packSelect.innerHTML = packages
    .map((pkg) => {
      const statusText = getPackApproval(pkg, approvalMap) === 'approved' ? '승인 공개' : '점검 대기';
      const sampleText = pkg.is_free_sample ? ' [무료 샘플]' : '';
      return `<option value="${escapeHtml(pkg.pack_id)}">${escapeHtml(pkg.week_date)} | ${escapeHtml(pkg.scripture)}${sampleText} (${statusText})</option>`;
    })
    .join('');
  if (selectedPackId) el.packSelect.value = selectedPackId;
}

/** Render uploaded custom materials for the active package. */
export function renderUploads(el, pkg, customUploads) {
  const filtered = customUploads.filter((u) => !u.packId || u.packId === pkg.pack_id);
  el.uploadsCount.textContent = String(filtered.length);
  if (!filtered.length) {
    el.customUploadsContainer.innerHTML = '<div class="uploads-empty">이 주차에 등록된 교회 자체 보조 자료가 없습니다.</div>';
    return;
  }

  const rows = filtered
    .map((item) => {
      const deptLabel = getDeptKoreanName(item.deptId, pkg);
      const subText = [item.fileName, item.uploadedAt, item.desc].filter(Boolean).join(' / ');
      return `<li class="upload-row">
        <div class="upload-meta">
          <div class="upload-title-line">
            <span class="status-tag status-approved">${escapeHtml(deptLabel)}</span>
            <span class="status-tag status-muted">${escapeHtml(item.category || '보조 자료')}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </div>
          <div class="upload-file-line">${escapeHtml(subText)}</div>
        </div>
        <button type="button" class="btn btn-danger-outline btn-sm" data-delete-upload="${escapeHtml(item.id)}">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          </svg>
          <span>삭제</span>
        </button>
      </li>`;
    })
    .join('');

  el.customUploadsContainer.innerHTML = `<ul class="uploads-list">${rows}</ul>`;
}

/** Render active package status badge and review note input. */
export function renderPackageDetail(el, pkg, approvalMap, reviewNoteMap) {
  const isApproved = getPackApproval(pkg, approvalMap) === 'approved';
  el.statusBadge.className = isApproved ? 'status-tag status-approved' : 'status-tag status-warn';
  el.statusBadge.textContent = isApproved ? '승인 공개 중' : '점검 대기 (비공개)';

  const savedNote = reviewNoteMap[pkg.pack_id];
  el.reviewNoteInput.value = savedNote !== undefined ? savedNote : pkg.reviewer_note || DEFAULT_NOTE;
}
