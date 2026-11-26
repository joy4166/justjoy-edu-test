import {
  copyTextWithFeedback,
  getEffectiveChurchName,
  setChurchName,
  setSiteMode,
  showToast,
  state
} from './store.js';

let onUnlockedCallback = null;
let deferredInstallPrompt = null;

function setupDialogLightDismiss(dialog) {
  if ('closedBy' in HTMLDialogElement.prototype) return;
  let pressedOutside = false;
  const isOutside = (e) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  dialog.addEventListener('pointerdown', (e) => {
    pressedOutside = isOutside(e);
  });
  dialog.addEventListener('pointerup', (e) => {
    if (pressedOutside && isOutside(e)) dialog.close();
  });
}

export function initCheckoutDialog(onComplete) {
  onUnlockedCallback = onComplete;
  const dialog = document.getElementById('checkoutDialog');
  const form = document.getElementById('checkoutForm');
  const closeBtn = document.getElementById('closeCheckoutBtn');
  if (!dialog || !form || !closeBtn || dialog.dataset.bound) return;
  dialog.dataset.bound = 'true';

  setupDialogLightDismiss(dialog);
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const churchInput = document.getElementById('checkoutChurchInput');
    if (churchInput && churchInput.value.trim()) {
      setChurchName(churchInput.value.trim());
    }
    setSiteMode('subscriber');
    dialog.close();
    if (onUnlockedCallback) {
      onUnlockedCallback(getEffectiveChurchName());
    }
  });
}

export function openCheckoutDialog(itemLabel, planKey) {
  const dialog = document.getElementById('checkoutDialog');
  if (!dialog) return;
  const itemEl = document.getElementById('checkoutItemName');
  const churchInput = document.getElementById('checkoutChurchInput');
  const planSelect = document.getElementById('checkoutPlan');
  if (itemEl) itemEl.textContent = itemLabel || '정규 호 전 부서 패키지';
  if (churchInput) churchInput.value = state.churchName || '';
  if (planSelect && planKey) planSelect.value = planKey;
  if (!dialog.open) dialog.showModal();
}

export function initShareDialog() {
  const dialog = document.getElementById('shareDialog');
  const closeBtn = document.getElementById('closeShareBtn');
  const copyBtn = document.getElementById('copyShareLinkBtn');
  const nativeBtn = document.getElementById('nativeShareBtn');
  const installBtn = document.getElementById('pwaInstallBtn');
  if (!dialog || dialog.dataset.bound) return;
  dialog.dataset.bound = 'true';

  setupDialogLightDismiss(dialog);
  if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyTextWithFeedback(
        window.location.href,
        '현재 페이지 주소를 복사했습니다. 필요한 곳에 붙여넣어 전달하세요.'
      );
    });
  }

  if (nativeBtn) {
    nativeBtn.addEventListener('click', () => {
      const shareData = {
        title: 'JUSTJOY 강소교회 다음세대 교육 스튜디오',
        text: '한 주일의 성경 본문으로 다섯 세대의 예배와 공과를 준비합니다.',
        url: window.location.href
      };
      if (navigator.share && window.location.protocol.startsWith('http')) {
        navigator.share(shareData).catch(() => {
          copyTextWithFeedback(window.location.href, '현재 페이지 주소를 복사했습니다.');
        });
      } else {
        copyTextWithFeedback(window.location.href, '현재 페이지 주소를 복사했습니다.');
      }
    });
  }

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      dialog.close();
    });
  }
}

export function openShareDialog() {
  const dialog = document.getElementById('shareDialog');
  if (!dialog) return;
  const input = document.getElementById('shareLinkInput');
  if (input) input.value = window.location.href;
  if (!dialog.open) dialog.showModal();
}

export function initRoleSwitcherPill(onModeChanged) {
  const toggleBtn = document.getElementById('simPillToggle');
  const panel = document.getElementById('simPanel');
  if (!toggleBtn || !panel || toggleBtn.dataset.bound) return;
  toggleBtn.dataset.bound = 'true';

  const modeLabels = {
    visitor: '일반 방문자',
    subscriber: '정기 구독자',
    pastor: '목회자 관리자'
  };

  function syncUi() {
    panel.querySelectorAll('[data-sim-mode]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-sim-mode') === state.mode));
    });
  }

  toggleBtn.addEventListener('click', () => {
    const nextOpen = panel.hidden;
    panel.hidden = !nextOpen;
    toggleBtn.setAttribute('aria-expanded', String(nextOpen));
  });

  panel.querySelectorAll('[data-sim-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextMode = btn.getAttribute('data-sim-mode');
      setSiteMode(nextMode);
      syncUi();
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      showToast(`${modeLabels[nextMode] || nextMode} 상태로 전환되었습니다.`);
      if (onModeChanged) onModeChanged(nextMode);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
    }
  });

  syncUi();
  return { syncUi };
}
