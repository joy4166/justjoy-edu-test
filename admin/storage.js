/** Persistence keys and shared domain helpers for the admin console. */
export const STORAGE_KEYS = {
  approval: 'churchEduApprovalMap',
  notes: 'churchEduReviewNoteMap',
  uploads: 'churchEduCustomUploads'
};

export const DEPT_NAMES = {
  '01_kindergarten': '유치부',
  '02_elem_lower': '초등1부',
  '03_elem_upper': '초등2부',
  '04_youth': '청소년부',
  '05_mixed': '혼합 통합반'
};

export const TEXT_EXTS = new Set(['md', 'txt', 'html', 'htm']);
export const ALLOWED_EXTS = new Set(['html', 'htm', 'md', 'txt', 'pdf', 'jpg', 'jpeg', 'png']);
export const DEFAULT_NOTE = '신학 및 교수법 사전 검수, 5개 부서 정렬 확인 완료';

export function readStorageJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.warn(`[admin] Failed to read ${key}:`, err);
    return fallback;
  }
}

export function readStorageArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`[admin] Failed to read ${key}:`, err);
    return [];
  }
}

export function writeStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    const isQuota = Boolean(
      err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014)
    );
    return { ok: false, isQuota, err };
  }
}

export function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getPackApproval(pkg, approvalMap) {
  if (!pkg) return 'pending_review';
  const stored = approvalMap?.[pkg.pack_id];
  if (stored === 'approved' || stored === 'pending_review') return stored;
  return pkg.status || 'approved';
}

export function getDeptKoreanName(deptId, pkg) {
  if (DEPT_NAMES[deptId]) return DEPT_NAMES[deptId];
  const matched = pkg?.departments?.find((d) => d.id === deptId);
  return matched ? matched.name : deptId;
}
