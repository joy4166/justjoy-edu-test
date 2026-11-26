import {
  ALLOWED_EXTS,
  STORAGE_KEYS,
  TEXT_EXTS,
  getDeptKoreanName,
  readStorageArray,
  readStorageJson,
  writeStorageJson
} from './storage.js';
import { renderLedger, renderPackSelect, renderPackageDetail, renderUploads } from './render.js';

const DEFAULT_DROPZONE_TEXT = '클릭하거나 파일을 끌어다 놓아 선택하세요 (.html, .md, .txt, .pdf, .jpg, .png)';

const state = {
  packages: [],
  selectedPackId: '',
  approvalMap: readStorageJson(STORAGE_KEYS.approval, {}),
  reviewNoteMap: readStorageJson(STORAGE_KEYS.notes, {}),
  customUploads: readStorageArray(STORAGE_KEYS.uploads),
  pendingFile: null,
  isReadingFile: false
};

const el = {};
let toastTimer = null;

function getActivePack() {
  return state.packages.find((p) => p.pack_id === state.selectedPackId) || state.packages[0] || null;
}

function showQuotaAlert(msg) {
  el.quotaAlertText.textContent = msg;
  el.quotaAlert.hidden = false;
  el.politeAnnouncer.textContent = msg;
}

function hideQuotaAlert() {
  el.quotaAlert.hidden = true;
  el.quotaAlertText.textContent = '';
}

function persistStorage(key, value, contextLabel) {
  const res = writeStorageJson(key, value);
  if (res.ok) {
    hideQuotaAlert();
    return true;
  }
  const msg = res.isQuota
    ? `브라우저 저장 공간(localStorage) 한도를 초과해 ${contextLabel} 내용을 저장하지 못했습니다. 더 작은 파일을 선택하거나 기존 등록 자료를 삭제해 주세요.`
    : `브라우저 저장소에 ${contextLabel} 내용을 저장하지 못했습니다. 저장 공간 권한이나 개인정보 보호 모드를 확인해 주세요.`;
  showQuotaAlert(msg);
  showToast(msg);
  return false;
}

function showToast(msg, undoHandler = null) {
  el.toastMessage.textContent = msg;
  el.politeAnnouncer.textContent = msg;
  el.toastUndoBtn.hidden = !undoHandler;
  el.toastUndoBtn.onclick = undoHandler ? () => { undoHandler(); hideToast(); } : null;
  el.statusToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (!el.statusToast.contains(document.activeElement)) hideToast();
  }, 5000);
}

function hideToast() {
  clearTimeout(toastTimer);
  el.statusToast.hidden = true;
  el.toastUndoBtn.hidden = true;
  el.toastUndoBtn.onclick = null;
}

function syncUrlAndStudioLink(packId) {
  if (!packId) return;
  const url = new URL(window.location.href);
  url.searchParams.set('pack', packId);
  window.history.replaceState(null, '', url.toString());
  if (el.openStudioLink) el.openStudioLink.href = `./studio.html?week=${encodeURIComponent(packId)}`;
}

function renderAll() {
  const pkg = getActivePack();
  if (!pkg) return;
  state.selectedPackId = pkg.pack_id;
  syncUrlAndStudioLink(pkg.pack_id);
  renderLedger(el, state.packages, state.selectedPackId, state.approvalMap);
  renderPackSelect(el, state.packages, state.selectedPackId, state.approvalMap);
  renderPackageDetail(el, pkg, state.approvalMap, state.reviewNoteMap);
  renderUploads(el, pkg, state.customUploads);
}

function updatePackStatus(nextStatus) {
  const pkg = getActivePack();
  if (!pkg) return;
  const prevStatus = state.approvalMap[pkg.pack_id];
  const prevNote = state.reviewNoteMap[pkg.pack_id];

  if (nextStatus) state.approvalMap[pkg.pack_id] = nextStatus;
  state.reviewNoteMap[pkg.pack_id] = el.reviewNoteInput.value.trim();

  const ok = persistStorage(STORAGE_KEYS.approval, state.approvalMap, '승인 상태')
    && persistStorage(STORAGE_KEYS.notes, state.reviewNoteMap, '점검 메모');
  if (!ok) {
    if (prevStatus === undefined) delete state.approvalMap[pkg.pack_id];
    else state.approvalMap[pkg.pack_id] = prevStatus;
    if (prevNote === undefined) delete state.reviewNoteMap[pkg.pack_id];
    else state.reviewNoteMap[pkg.pack_id] = prevNote;
    return;
  }

  renderAll();
  if (nextStatus === 'approved') showToast(`${pkg.scripture} 주차가 승인 공개 상태로 전환되었습니다.`);
  else if (nextStatus === 'pending_review') showToast(`${pkg.scripture} 주차가 점검 대기(비공개) 상태로 전환되었습니다.`);
  else showToast(`${pkg.scripture} 주차의 점검 메모를 저장했습니다.`);
}

function setFieldInvalid(inputEl, errorEl, isInvalid, message) {
  inputEl.classList.toggle('user-invalid-fallback', isInvalid);
  inputEl.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  errorEl.classList.toggle('is-visible', isInvalid);
  if (message) errorEl.textContent = message;
}

function handleFileSelection(file) {
  if (!file) return;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    state.pendingFile = null;
    el.adminFileInput.value = '';
    el.fileLabel.textContent = DEFAULT_DROPZONE_TEXT;
    setFieldInvalid(el.adminFileInput, el.uploadFileError, true, '지원하지 않는 파일 형식입니다 (.html, .md, .txt, .pdf, .jpg, .png만 가능).');
    return;
  }

  setFieldInvalid(el.adminFileInput, el.uploadFileError, false);
  state.isReadingFile = true;
  el.submitUploadBtn.disabled = true;
  el.fileLabel.textContent = `파일 읽는 중: ${file.name}`;

  const isText = TEXT_EXTS.has(ext);
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.isReadingFile = false;
    el.submitUploadBtn.disabled = false;
    state.pendingFile = { name: file.name, ext, isText, content: ev.target.result };
    el.fileLabel.textContent = `선택됨: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (!el.uploadTitleInput.value.trim()) {
      el.uploadTitleInput.value = file.name.replace(/\.[^.]+$/, '');
      setFieldInvalid(el.uploadTitleInput, el.uploadTitleError, false);
    }
  };
  reader.onerror = () => {
    state.isReadingFile = false;
    el.submitUploadBtn.disabled = false;
    state.pendingFile = null;
    el.fileLabel.textContent = DEFAULT_DROPZONE_TEXT;
    setFieldInvalid(el.adminFileInput, el.uploadFileError, true, '파일을 읽는 중 오류가 발생했습니다. 다시 선택해 주세요.');
  };

  if (isText) reader.readAsText(file, 'utf-8');
  else reader.readAsDataURL(file);
}

function handleUploadSubmit(event) {
  event.preventDefault();
  if (state.isReadingFile) {
    showToast('파일을 읽고 있습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  const title = el.uploadTitleInput.value.trim();
  const titleBad = !title;
  const fileBad = !state.pendingFile;
  setFieldInvalid(el.uploadTitleInput, el.uploadTitleError, titleBad, '자료 제목을 입력해 주세요.');
  setFieldInvalid(el.adminFileInput, el.uploadFileError, fileBad, '업로드할 파일을 먼저 선택해 주세요.');
  if (titleBad) { el.uploadTitleInput.focus(); return; }
  if (fileBad) { el.adminFileInput.focus(); return; }

  const pkg = getActivePack();
  if (!pkg) return;

  const item = {
    id: `up_${Date.now()}`,
    packId: pkg.pack_id,
    deptId: el.uploadDeptSelect.value,
    category: el.uploadCatInput.value,
    title,
    desc: el.uploadDescInput.value.trim(),
    uploadedAt: new Date().toLocaleDateString('ko-KR'),
    fileName: state.pendingFile.name,
    ext: state.pendingFile.ext,
    isText: state.pendingFile.isText,
    content: state.pendingFile.content
  };

  const nextUploads = [item, ...state.customUploads];
  if (!persistStorage(STORAGE_KEYS.uploads, nextUploads, '부서 보조 자료')) return;

  state.customUploads = nextUploads;
  state.pendingFile = null;
  el.adminUploadForm.reset();
  el.fileLabel.textContent = DEFAULT_DROPZONE_TEXT;
  setFieldInvalid(el.uploadTitleInput, el.uploadTitleError, false);
  setFieldInvalid(el.adminFileInput, el.uploadFileError, false);
  renderAll();
  showToast(`${getDeptKoreanName(item.deptId, pkg)}에 "${item.title}" 자료가 등록되었습니다.`);
}

function deleteUploadItem(id) {
  const idx = state.customUploads.findIndex((u) => u.id === id);
  if (idx < 0) return;
  const removed = state.customUploads[idx];
  const nextUploads = state.customUploads.filter((u) => u.id !== id);
  if (!persistStorage(STORAGE_KEYS.uploads, nextUploads, '자료 삭제')) return;

  state.customUploads = nextUploads;
  renderAll();
  showToast(`"${removed.title}" 자료를 삭제했습니다.`, () => {
    const restored = [...state.customUploads];
    restored.splice(Math.min(idx, restored.length), 0, removed);
    if (!persistStorage(STORAGE_KEYS.uploads, restored, '자료 복구')) return;
    state.customUploads = restored;
    renderAll();
    showToast(`"${removed.title}" 자료를 복구했습니다.`);
  });
}

async function loadCatalog() {
  el.loadingState.hidden = false;
  el.errorState.hidden = true;
  el.emptyState.hidden = true;
  el.adminContent.hidden = true;
  try {
    const res = await fetch('./data/catalog-index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status} 오류로 카탈로그를 불러오지 못했습니다.`);
    const data = await res.json();
    const pkgs = Array.isArray(data?.packages) ? data.packages : [];
    el.loadingState.hidden = true;
    if (!pkgs.length) { el.emptyState.hidden = false; return; }
    state.packages = pkgs;
    const paramPack = new URLSearchParams(window.location.search).get('pack');
    const matched = pkgs.find((p) => p.pack_id === paramPack);
    state.selectedPackId = matched ? matched.pack_id : pkgs[0].pack_id;
    el.adminContent.hidden = false;
    renderAll();
  } catch (err) {
    el.loadingState.hidden = true;
    el.errorMessage.textContent = err?.message || '교재 목록을 불러오지 못했습니다.';
    el.errorState.hidden = false;
  }
}

function bindEvents() {
  el.retryLoadBtn.addEventListener('click', loadCatalog);
  el.quotaAlertCloseBtn.addEventListener('click', hideQuotaAlert);
  el.toastCloseBtn.addEventListener('click', hideToast);
  el.packSelect.addEventListener('change', () => { state.selectedPackId = el.packSelect.value; renderAll(); });
  el.ledgerBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-select-pack]');
    if (!btn) return;
    state.selectedPackId = btn.getAttribute('data-select-pack');
    renderAll();
    el.packSelect.focus();
  });
  el.approvePackBtn.addEventListener('click', () => updatePackStatus('approved'));
  el.holdPackBtn.addEventListener('click', () => updatePackStatus('pending_review'));
  el.saveNoteBtn.addEventListener('click', () => updatePackStatus(null));
  el.uploadTitleInput.addEventListener('blur', () => setFieldInvalid(el.uploadTitleInput, el.uploadTitleError, !el.uploadTitleInput.value.trim()));
  el.uploadTitleInput.addEventListener('input', () => { if (el.uploadTitleInput.value.trim()) setFieldInvalid(el.uploadTitleInput, el.uploadTitleError, false); });
  el.adminFileInput.addEventListener('change', () => { if (el.adminFileInput.files?.[0]) handleFileSelection(el.adminFileInput.files[0]); });
  ['dragenter', 'dragover'].forEach((evt) => el.uploadDropzone.addEventListener(evt, (e) => { e.preventDefault(); el.uploadDropzone.classList.add('is-dragover'); }));
  ['dragleave', 'drop'].forEach((evt) => el.uploadDropzone.addEventListener(evt, (e) => { e.preventDefault(); el.uploadDropzone.classList.remove('is-dragover'); }));
  el.uploadDropzone.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); });
  el.adminUploadForm.addEventListener('submit', handleUploadSubmit);
  el.customUploadsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-upload]');
    if (btn) deleteUploadItem(btn.getAttribute('data-delete-upload'));
  });
  window.addEventListener('storage', (e) => {
    if (!Object.values(STORAGE_KEYS).includes(e.key)) return;
    state.approvalMap = readStorageJson(STORAGE_KEYS.approval, {});
    state.reviewNoteMap = readStorageJson(STORAGE_KEYS.notes, {});
    state.customUploads = readStorageArray(STORAGE_KEYS.uploads);
    if (state.packages.length) renderAll();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  try { localStorage.setItem('churchEduSiteMode', 'pastor'); } catch {}
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  const ids = 'openStudioLink,quotaAlert,quotaAlertText,quotaAlertCloseBtn,loadingState,errorState,errorMessage,retryLoadBtn,emptyState,adminContent,ledgerSummary,ledgerBody,statusBadge,packSelect,reviewNoteInput,approvePackBtn,holdPackBtn,saveNoteBtn,adminUploadForm,uploadDeptSelect,uploadCatInput,uploadTitleInput,uploadTitleError,uploadDescInput,adminFileInput,uploadDropzone,fileLabel,uploadFileError,submitUploadBtn,uploadsCount,customUploadsContainer,statusToast,toastMessage,toastUndoBtn,toastCloseBtn,politeAnnouncer';
  ids.split(',').forEach((id) => { el[id] = document.getElementById(id); });
  bindEvents();
  loadCatalog();
});
