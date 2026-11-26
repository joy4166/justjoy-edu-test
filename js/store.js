const REMOTE_DOWNLOAD_ORIGIN = 'https://justjoy-edu.web.app';
const ASSET_BASE = './';

export const UNIT_LIST = [
  { id: 'unit1', label: '1교시 목표와 브리핑', masterLabel: '1교시 주중 교사 브리핑' },
  { id: 'unit2', label: '2교시 설교 원고 전문', masterLabel: '2교시 표준 설교 초안' },
  { id: 'unit3', label: '3교시 35분 소인원 대본', masterLabel: '3교시 부서별 한눈 비교' },
  { id: 'unit4', label: '4교시 무가위 A4 활동지 미리보기', masterLabel: '4교시 통합 웹앱 런처' }
];

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`[store] Failed to read ${key}:`, err);
    return fallback;
  }
}

export const state = {
  mode: localStorage.getItem('churchEduSiteMode') || 'visitor',
  churchName: localStorage.getItem('churchEduChurchName') || '',
  approvalMap: readJsonStorage('churchEduApprovalMap', {}),
  customUploads: readJsonStorage('churchEduCustomUploads', []),
  textSize: localStorage.getItem('justjoyStudioTextSize') || 'default',
  proseFont: localStorage.getItem('justjoyStudioProseFont') || 'sans',
  activeWeekId: '',
  activeDeptId: '01_kindergarten',
  activeUnitId: 'unit1',
  branchFilter: 'all',
  previewSource: 'aid',
  selectedAidVer: {},
  pendingAction: null
};

let catalogCache = null;
const packCache = new Map();

export function resolveAssetUrl(relPath) {
  if (!relPath) return '';
  if (/^(https?:|data:|blob:|\/|\.\/|\.\.\/)/.test(relPath)) return relPath;
  return `${ASSET_BASE}${relPath}`;
}

export function resolveDownloadUrl(relPath) {
  if (!relPath) return '';
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocal && relPath.startsWith('downloads/')) {
    return `${REMOTE_DOWNLOAD_ORIGIN}/${relPath}`;
  }
  if (/^(https?:|data:|blob:|\/|\.\/|\.\.\/)/.test(relPath)) return relPath;
  return `${ASSET_BASE}${relPath}`;
}

export async function loadCatalogIndex() {
  if (catalogCache) return catalogCache;
  const res = await fetch(`${ASSET_BASE}data/catalog-index.json`);
  if (!res.ok) {
    throw new Error(`주차 목록을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  catalogCache = await res.json();
  return catalogCache;
}

export async function loadPackDetail(packId) {
  if (!packId) return null;
  if (packCache.has(packId)) return packCache.get(packId);
  const res = await fetch(`${ASSET_BASE}data/packs/${encodeURIComponent(packId)}.json`);
  if (!res.ok) {
    throw new Error(`주차 상세 교재를 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const detail = await res.json();
  packCache.set(packId, detail);
  return detail;
}

export function getAllPkgs() {
  return (catalogCache && catalogCache.packages) || [];
}

export function getPackApproval(pkg) {
  if (!pkg) return 'pending_review';
  if (state.approvalMap && state.approvalMap[pkg.pack_id]) {
    return state.approvalMap[pkg.pack_id];
  }
  return pkg.status || 'approved';
}

export function getVisiblePkgs() {
  const all = getAllPkgs();
  if (state.mode === 'pastor') return all;
  return all.filter((p) => getPackApproval(p) === 'approved');
}

export function getLatestVisiblePkg() {
  const vis = getVisiblePkgs();
  return vis[0] || null;
}

export function getFreeSamplePkg() {
  const vis = getVisiblePkgs();
  return vis.find((p) => p.is_free_sample) || vis[0] || null;
}

export function isSubscribed() {
  return state.mode === 'subscriber' || state.mode === 'pastor';
}

export function isPkgUnlocked(pkg) {
  if (isSubscribed()) return true;
  return Boolean(pkg && pkg.is_free_sample);
}

export function getEffectiveChurchName() {
  return (state.churchName || '').trim() || '우리교회';
}

export function setChurchName(val) {
  state.churchName = (val || '').trim();
  try {
    if (state.churchName) localStorage.setItem('churchEduChurchName', state.churchName);
    else localStorage.removeItem('churchEduChurchName');
  } catch (err) {
    console.warn('[store] Failed to write churchName:', err);
  }
}

export function setSiteMode(mode) {
  state.mode = mode;
  try {
    localStorage.setItem('churchEduSiteMode', mode);
  } catch (err) {
    console.warn('[store] Failed to write mode:', err);
  }
}

export function setTextSize(size) {
  state.textSize = size === 'large' ? 'large' : 'default';
  try {
    localStorage.setItem('justjoyStudioTextSize', state.textSize);
  } catch (err) {
    console.warn('[store] Failed to write textSize:', err);
  }
}

export function setProseFont(font) {
  state.proseFont = font === 'serif' ? 'serif' : 'sans';
  try {
    localStorage.setItem('justjoyStudioProseFont', state.proseFont);
  } catch (err) {
    console.warn('[store] Failed to write proseFont:', err);
  }
}

export function refreshLocalState() {
  state.mode = localStorage.getItem('churchEduSiteMode') || state.mode;
  state.churchName = localStorage.getItem('churchEduChurchName') || '';
  state.approvalMap = readJsonStorage('churchEduApprovalMap', {});
  state.customUploads = readJsonStorage('churchEduCustomUploads', []);
}

export function getDeptUploads(packId, deptId) {
  return (state.customUploads || []).filter(
    (u) => u.deptId === deptId && (!u.packId || u.packId === packId)
  );
}

export function buildStudioUrl(weekId, deptId = '01_kindergarten', unitId = 'unit1') {
  const params = new URLSearchParams();
  if (weekId) params.set('week', weekId);
  if (deptId) params.set('dept', deptId);
  if (unitId) params.set('unit', unitId);
  return `./studio.html?${params.toString()}`;
}

export function buildRoomShareUrl() {
  const url = new URL('./studio.html', window.location.href);
  if (state.activeWeekId) url.searchParams.set('week', state.activeWeekId);
  if (state.activeDeptId) url.searchParams.set('dept', state.activeDeptId);
  if (state.activeUnitId) url.searchParams.set('unit', state.activeUnitId);
  return url.toString();
}

export async function copyTextWithFeedback(text, successMsg, fallbackMsg) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error('Clipboard API unavailable');
    }
    showToast(successMsg);
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg);
    } catch {
      showToast(fallbackMsg || text);
    }
  }
}

export async function copyRoomShareUrl() {
  const shareUrl = buildRoomShareUrl();
  await copyTextWithFeedback(
    shareUrl,
    '이 교실 주소를 복사했습니다. 카카오톡 등에 바로 붙여넣기 하세요.',
    `교실 주소: ${shareUrl}`
  );
}

export function syncUrlParams() {
  const url = new URL(window.location.href);
  if (state.activeWeekId) url.searchParams.set('week', state.activeWeekId);
  if (state.activeDeptId) url.searchParams.set('dept', state.activeDeptId);
  if (state.activeUnitId) url.searchParams.set('unit', state.activeUnitId);
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

let toastTimer = null;

export function showToast(msg) {
  const el = document.getElementById('studioToast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3400);
}
