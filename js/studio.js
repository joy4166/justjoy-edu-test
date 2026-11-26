import { buildDownloadSpec, renderPrepDock } from './dock.js';
import { cleanUiText, escapeHtml } from './markdown.js';
import { openCheckoutDialog } from './modals.js';
import { renderCurriculumRail } from './rail.js';
import { renderReaderStage } from './reader.js';
import { initAppShell } from './shell.js';
import {
  UNIT_LIST,
  copyRoomShareUrl,
  getAllPkgs,
  getEffectiveChurchName,
  getVisiblePkgs,
  isPkgUnlocked,
  loadCatalogIndex,
  loadPackDetail,
  refreshLocalState,
  resolveDownloadUrl,
  setChurchName,
  setProseFont,
  setTextSize,
  showToast,
  state,
  syncUrlParams
} from './store.js';

let activePkgDetail = null;
let shellApi = null;

function resolveWeekId(paramWeek) {
  const visible = getVisiblePkgs();
  const pool = visible.length ? visible : getAllPkgs();
  if (!pool.length) return '';

  if (paramWeek) {
    const lower = paramWeek.toLowerCase();
    const direct = pool.find((p) => p.pack_id === paramWeek || p.week_date === paramWeek);
    if (direct) return direct.pack_id;
    if (lower === 'vol1' || lower === 'vol-01' || lower === 'free') {
      const free = pool.find((p) => p.is_free_sample);
      if (free) return free.pack_id;
    }
    if (lower === 'vol2' || lower === 'vol-02') {
      const paid = pool.find((p) => !p.is_free_sample);
      if (paid) return paid.pack_id;
    }
  }

  if (state.mode === 'visitor') {
    const free = pool.find((p) => p.is_free_sample);
    if (free) return free.pack_id;
  }
  return pool[0].pack_id;
}

function resolveDeptId(paramDept, pkg) {
  const validIds = ['master', ...((pkg && pkg.departments) || []).map((d) => d.id)];
  if (paramDept && validIds.includes(paramDept)) return paramDept;
  return '01_kindergarten';
}

function resolveUnitId(paramUnit) {
  if (paramUnit && UNIT_LIST.some((u) => u.id === paramUnit)) return paramUnit;
  return 'unit1';
}

function triggerDownload(url, filename, label) {
  const finalUrl = resolveDownloadUrl(url);
  const a = document.createElement('a');
  a.href = finalUrl;
  a.setAttribute('download', filename || '');
  if (/^https?:/.test(finalUrl)) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`다운로드 시작: ${label}`);
}

function handleDownloadAction(dlType, deptId) {
  if (!activePkgDetail) return;
  const dept = (activePkgDetail.departments || []).find((d) => d.id === deptId) || activePkgDetail.departments[0];
  const spec = buildDownloadSpec(activePkgDetail, dept, dlType);
  if (!spec) return;

  if (!isPkgUnlocked(activePkgDetail)) {
    state.pendingAction = { type: 'download', spec };
    openCheckoutDialog(spec.label);
    return;
  }
  triggerDownload(spec.url, spec.filename, spec.label);
}

function handleLaunchWebapp(url, label) {
  if (!activePkgDetail) return;
  if (!isPkgUnlocked(activePkgDetail)) {
    state.pendingAction = { type: 'launch', url, label };
    openCheckoutDialog(label);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function handleCustomDownload(itemId) {
  if (!activePkgDetail) return;
  const item = (state.customUploads || []).find((u) => u.id === itemId);
  if (!item) return;

  let dataUrl = item.content;
  if (item.isText) {
    const mime = ['html', 'htm'].includes(item.ext) ? 'text/html' : 'text/plain';
    dataUrl = `data:${mime};charset=utf-8,${encodeURIComponent(item.content)}`;
  }

  const filename = `${getEffectiveChurchName()}_${item.fileName}`;
  const label = `${item.title} (${item.fileName})`;
  if (!isPkgUnlocked(activePkgDetail)) {
    state.pendingAction = { type: 'download', spec: { url: dataUrl, filename, label } };
    openCheckoutDialog(label);
    return;
  }
  triggerDownload(dataUrl, filename, label);
}

function buildReaderHandlers() {
  return {
    onSelectUnit: (unitId) => {
      state.activeUnitId = unitId;
      syncUrlParams();
      renderReaderStageForState();
    },
    onChangeTextSize: (size) => {
      setTextSize(size);
      renderReaderStageForState();
    },
    onChangeProseFont: (font) => {
      setProseFont(font);
      renderReaderStageForState();
    },
    onRerenderStage: () => {
      renderReaderStageForState();
    },
    onOpenPaywall: (label) => {
      state.pendingAction = null;
      openCheckoutDialog(label);
    },
    onDownloadCustom: handleCustomDownload
  };
}

function renderReaderStageForState() {
  const stageEl = document.getElementById('studioStage');
  if (!stageEl || !activePkgDetail) return;
  renderReaderStage(stageEl, activePkgDetail, buildReaderHandlers());
}

function renderAllPanes() {
  if (!activePkgDetail) return;
  const railEl = document.getElementById('studioRail');
  const stageEl = document.getElementById('studioStage');
  const dockEl = document.getElementById('studioDock');

  renderCurriculumRail(
    railEl,
    activePkgDetail,
    async (weekId) => {
      if (weekId === state.activeWeekId) return;
      state.activeWeekId = weekId;
      state.previewSource = 'aid';
      window.scrollTo({ top: 0, behavior: 'auto' });
      await openActiveWeek();
    },
    (deptId) => {
      state.activeDeptId = deptId;
      state.previewSource = 'aid';
      state.branchFilter = 'all';
      syncUrlParams();
      window.scrollTo({ top: 0, behavior: 'auto' });
      renderAllPanes();
    }
  );

  renderReaderStage(stageEl, activePkgDetail, buildReaderHandlers());

  renderPrepDock(dockEl, activePkgDetail, {
    onChurchNameChange: (val) => {
      setChurchName(val);
      if (shellApi) shellApi.syncChrome();
    },
    onSelectAidVer: (deptId, ver) => {
      state.selectedAidVer[`${activePkgDetail.pack_id}:${deptId}`] = ver;
      renderAllPanes();
    },
    onDownload: handleDownloadAction,
    onLaunchWebapp: handleLaunchWebapp,
    onSaveLockedHtml: (spec) => {
      state.pendingAction = { type: 'download', spec };
      openCheckoutDialog(spec.label);
    },
    onSaveUnlockedHtml: (filename) => {
      showToast(`오프라인 HTML5 저장 시작: ${filename}`);
    },
    onCopyRoomUrl: copyRoomShareUrl
  });
}

async function openActiveWeek() {
  const stageEl = document.getElementById('studioStage');
  if (stageEl) {
    stageEl.innerHTML = '<div class="state-box">주차 교재를 불러오는 중입니다.</div>';
  }
  try {
    activePkgDetail = await loadPackDetail(state.activeWeekId);
    if (!activePkgDetail) {
      throw new Error('선택한 주차 데이터를 찾을 수 없습니다.');
    }
    state.activeDeptId = resolveDeptId(state.activeDeptId, activePkgDetail);
    syncUrlParams();
    document.title = `${cleanUiText(activePkgDetail.scripture)} 수업 스튜디오 | JUSTJOY`;
    renderAllPanes();
  } catch (err) {
    if (stageEl) {
      stageEl.innerHTML = `<div class="state-box state-box--error">${escapeHtml(err.message)}</div>`;
    }
  }
}

async function bootStudio() {
  const params = new URLSearchParams(window.location.search);

  shellApi = initAppShell({
    activeNav: 'studio',
    onModeChange: async () => {
      const visible = getVisiblePkgs();
      if (visible.length && !visible.some((p) => p.pack_id === state.activeWeekId)) {
        state.activeWeekId = resolveWeekId('');
        await openActiveWeek();
        return;
      }
      renderAllPanes();
    },
    onCheckoutSuccess: (churchName) => {
      showToast(`${churchName} 구독 체험 모드가 활성화되었습니다.`);
      const pending = state.pendingAction;
      state.pendingAction = null;
      renderAllPanes();
      if (pending && pending.type === 'download') {
        triggerDownload(pending.spec.url, pending.spec.filename, pending.spec.label);
      } else if (pending && pending.type === 'launch') {
        window.open(pending.url, '_blank', 'noopener,noreferrer');
      }
    }
  });

  try {
    await loadCatalogIndex();
    state.activeWeekId = resolveWeekId(params.get('week'));
    state.activeUnitId = resolveUnitId(params.get('unit'));
    state.activeDeptId = params.get('dept') || '01_kindergarten';
    await openActiveWeek();
  } catch (err) {
    const stageEl = document.getElementById('studioStage');
    if (stageEl) {
      stageEl.innerHTML = `<div class="state-box state-box--error">${escapeHtml(err.message)}</div>`;
    }
  }

  window.addEventListener('storage', async () => {
    refreshLocalState();
    if (shellApi) shellApi.syncChrome();
    state.activeWeekId = resolveWeekId(state.activeWeekId);
    await openActiveWeek();
  });

  window.addEventListener('popstate', async () => {
    const nextParams = new URLSearchParams(window.location.search);
    const nextWeek = resolveWeekId(nextParams.get('week'));
    state.activeUnitId = resolveUnitId(nextParams.get('unit'));
    state.activeDeptId = nextParams.get('dept') || '01_kindergarten';
    if (nextWeek !== state.activeWeekId) {
      state.activeWeekId = nextWeek;
      await openActiveWeek();
    } else {
      renderAllPanes();
    }
  });
}

window.addEventListener('DOMContentLoaded', bootStudio);
