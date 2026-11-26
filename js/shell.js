import { icon } from './icons.js';
import {
  initCheckoutDialog,
  initRoleSwitcherPill,
  initShareDialog,
  openShareDialog
} from './modals.js';
import { getEffectiveChurchName, isSubscribed, state } from './store.js';

function ensureSharedOverlays() {
  if (!document.getElementById('checkoutDialog')) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <aside class="sim-floating" aria-label="시연 도구">
        <div id="simPanel" class="sim-panel" hidden>
          <div class="sim-panel-section">
            <div class="sim-panel-title">시연 권한 선택</div>
            <div class="sim-role-list" role="group" aria-label="시연 역할 전환">
              <button type="button" class="sim-role-btn" data-sim-mode="visitor" aria-pressed="true">일반 방문자 (무료 공개호 체험)</button>
              <button type="button" class="sim-role-btn" data-sim-mode="subscriber" aria-pressed="false">정기 구독자 (전 호수 열람)</button>
              <button type="button" class="sim-role-btn" data-sim-mode="pastor" aria-pressed="false">목회자 관리자 (검수 포함)</button>
            </div>
          </div>
          <div class="sim-panel-section">
            <div class="sim-panel-title">관리자 콘솔 이동</div>
            <div class="sim-link-list">
              <a id="simAdminLink" class="sim-nav-link" href="./admin.html">목회자 검수 및 업로드 콘솔</a>
            </div>
          </div>
        </div>
        <button type="button" id="simPillToggle" class="sim-pill-btn" aria-expanded="false" aria-controls="simPanel">
          ${icon('sliders')}
          <span>시연 도구</span>
        </button>
      </aside>

      <dialog id="checkoutDialog" class="checkout-dialog" aria-labelledby="checkoutTitle" closedby="any">
        <div class="dialog-head">
          <div>
            <h1 id="checkoutTitle">정기구독 시작 및 전체 열람</h1>
            <p class="dialog-sub">프로토타입 체험 모드로 실제 과금되지 않습니다.</p>
          </div>
          <button type="button" class="btn btn-secondary" id="closeCheckoutBtn">닫기</button>
        </div>
        <div class="dialog-body">
          <div class="dialog-item-summary">
            <strong>선택 자료</strong>
            <div id="checkoutItemName">정규 호 전 부서 패키지</div>
          </div>
          <form id="checkoutForm">
            <div class="form-field">
              <label for="checkoutPlan">구독 플랜</label>
              <select id="checkoutPlan" name="plan" class="form-select">
                <option value="monthly">스탠다드 월간 구독 (월 15,000원, 전 부서 무제한)</option>
                <option value="annual" selected>강소교회 연간 동역 플랜 (월 12,000원, 연 144,000원)</option>
              </select>
            </div>
            <div class="form-field">
              <label for="checkoutChurchInput">파일명 각인 교회 이름</label>
              <input id="checkoutChurchInput" name="churchName" type="text" class="form-input" autocomplete="organization" placeholder="예: 은혜작은교회" />
            </div>
            <div class="form-field">
              <fieldset>
                <legend>결제 수단 (체험 선택)</legend>
                <div class="pay-method-grid">
                  <div class="pay-radio-item"><input type="radio" id="payCard" name="payMethod" value="card" checked /><label for="payCard">신용 체크카드</label></div>
                  <div class="pay-radio-item"><input type="radio" id="payKakao" name="payMethod" value="kakao" /><label for="payKakao">카카오페이</label></div>
                  <div class="pay-radio-item"><input type="radio" id="payNaver" name="payMethod" value="naver" /><label for="payNaver">네이버페이</label></div>
                  <div class="pay-radio-item"><input type="radio" id="payBank" name="payMethod" value="bank" /><label for="payBank">교회 계좌이체</label></div>
                </div>
              </fieldset>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">구독 체험 시작하고 전체 열람</button>
          </form>
        </div>
      </dialog>

      <dialog id="shareDialog" class="checkout-dialog" aria-labelledby="shareDialogTitle" closedby="any">
        <div class="dialog-head">
          <div>
            <h1 id="shareDialogTitle">페이지 링크 공유 및 앱 설치</h1>
            <p class="dialog-sub">교사와 가정에 주간 수업 주소를 바로 전달하세요.</p>
          </div>
          <button type="button" class="btn btn-secondary" id="closeShareBtn">닫기</button>
        </div>
        <div class="dialog-body">
          <div class="form-field">
            <label for="shareLinkInput">공유할 페이지 주소</label>
            <div class="share-url-row">
              <input id="shareLinkInput" type="text" readonly class="form-input share-url-input" />
              <button type="button" class="btn btn-primary" id="copyShareLinkBtn">복사</button>
            </div>
          </div>
          <div class="share-actions-col">
            <button type="button" class="btn btn-secondary" id="nativeShareBtn">
              ${icon('share')}
              <span>메신저 또는 문자로 공유하기</span>
            </button>
            <button type="button" class="btn btn-primary" id="pwaInstallBtn" hidden>
              <span>기기에 JUSTJOY 앱 설치하기</span>
            </button>
          </div>
          <section class="pwa-guide-section" aria-label="웹앱 홈 화면 추가 안내">
            <h2>기기에 웹앱으로 설치하기</h2>
            <ul class="pwa-guide-list">
              <li>아이폰 및 아이패드(Safari): 하단 공유 버튼을 누른 뒤 홈 화면에 추가 선택</li>
              <li>안드로이드(Chrome): 우측 상단 메뉴에서 앱 설치 또는 홈 화면에 추가 선택</li>
              <li>데스크톱(Chrome 및 Edge): 주소창 오른쪽 설치 아이콘 클릭</li>
            </ul>
          </section>
        </div>
      </dialog>

      <div id="studioToast" class="toast-banner" role="status" aria-live="polite" hidden></div>
    `;
    while (wrapper.firstElementChild) {
      document.body.appendChild(wrapper.firstElementChild);
    }
  }
}

export function registerAppServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('[sw] Service worker skipped:', err);
      });
    });
  }
}

export function syncShellChrome(activeNav) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.getAttribute('data-nav') === activeNav) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const pricingLink = document.getElementById('navPricingLink');
  if (pricingLink) {
    pricingLink.textContent = isSubscribed() ? '내 멤버십' : '정기구독';
  }

  const headerCta = document.getElementById('headerStatusCta');
  if (headerCta) {
    if (state.mode === 'pastor') {
      headerCta.textContent = '목회자 관리자 콘솔';
      headerCta.href = './admin.html';
      headerCta.className = 'btn btn-secondary';
    } else if (state.mode === 'subscriber') {
      headerCta.textContent = `${getEffectiveChurchName()} 구독 중`;
      headerCta.href = './pricing.html';
      headerCta.className = 'btn btn-secondary';
    } else {
      headerCta.textContent = '월 15,000원 정기구독';
      headerCta.href = './pricing.html';
      headerCta.className = 'btn btn-primary';
    }
  }
}

export function initAppShell({ activeNav, onModeChange, onCheckoutSuccess } = {}) {
  registerAppServiceWorker();
  ensureSharedOverlays();
  syncShellChrome(activeNav);

  const shareBtn = document.getElementById('openShareBtn');
  if (shareBtn && !shareBtn.dataset.bound) {
    shareBtn.dataset.bound = 'true';
    shareBtn.addEventListener('click', openShareDialog);
  }

  initShareDialog();
  initCheckoutDialog((churchName) => {
    syncShellChrome(activeNav);
    if (rolePill) rolePill.syncUi();
    if (onCheckoutSuccess) onCheckoutSuccess(churchName);
  });

  const rolePill = initRoleSwitcherPill((nextMode) => {
    syncShellChrome(activeNav);
    if (onModeChange) onModeChange(nextMode);
  });

  return {
    syncChrome: () => {
      syncShellChrome(activeNav);
      if (rolePill) rolePill.syncUi();
    }
  };
}
