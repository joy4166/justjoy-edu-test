import { icon } from './icons.js';
import { escapeHtml } from './markdown.js';
import { openCheckoutDialog } from './modals.js';
import { initAppShell } from './shell.js';
import {
  buildStudioUrl,
  getEffectiveChurchName,
  getFreeSamplePkg,
  isSubscribed,
  loadCatalogIndex,
  refreshLocalState,
  setChurchName,
  setSiteMode,
  showToast,
  state
} from './store.js';

let shellApi = null;

function renderPricingPage() {
  const container = document.getElementById('pricingContainer');
  if (!container) return;

  const samplePkg = getFreeSamplePkg();
  const sampleUrl = samplePkg ? buildStudioUrl(samplePkg.pack_id, '01_kindergarten', 'unit1') : './studio.html';

  if (isSubscribed()) {
    const sampleFilename = `${getEffectiveChurchName()}_01_유치부_A4교보재_2면.pdf`;
    container.innerHTML = `
      <section class="page-intro" aria-label="내 구독 멤버십">
        <h1>내 구독 멤버십 및 우리 교회 각인 설정</h1>
        <p class="page-intro-lead">
          현재 시연용 구독 모드가 활성화되어 모든 주차의 설교문과 소인원 대본 열람, 무가위 A4 PDF 및 통합 ZIP 다운로드가 열려 있습니다.
        </p>
      </section>

      <div class="two-col-grid">
        <section class="sheet-card" aria-label="구독 상태 안내">
          <div class="plan-head">
            <h2>강소교회 정기구독 멤버십</h2>
            <span class="status-tag status-paid">구독 활성화 중</span>
          </div>
          <p class="page-intro-lead">
            모든 주차의 다섯 세대 수업 스튜디오 잠금이 해제되어 있으며, 인쇄용 A4 완제품 PDF와 오프라인 HTML5 웹앱을 제한 없이 이용할 수 있습니다.
          </p>
          <div class="page-intro-actions">
            <a class="btn btn-primary" href="./studio.html">수업 준비 스튜디오 열기</a>
            ${
              state.mode === 'pastor'
                ? '<a class="btn btn-secondary" href="./admin.html">목회자 관리자 콘솔 열기</a>'
                : '<button type="button" class="btn btn-secondary" id="switchVisitorBtn">일반 방문자 상태로 돌아가기</button>'
            }
          </div>
        </section>

        <section class="sheet-card" aria-label="우리 교회 이름 각인 설정">
          <h2>우리 교회 이름 파일 각인 관리</h2>
          <p class="page-intro-lead">
            입력한 교회 이름이 다운로드되는 모든 PDF, ZIP, HTML5 온라인교보재 파일명 앞에 자동으로 붙습니다.
          </p>
          <div class="form-field">
            <label for="memberChurchInput">교회 이름</label>
            <input
              id="memberChurchInput"
              type="text"
              class="form-input"
              autocomplete="organization"
              value="${escapeHtml(state.churchName)}"
              placeholder="예: 은혜작은교회 (비워두면 우리교회)"
            />
            <p class="imprint-preview-note" id="memberImprintPreview">${escapeHtml(sampleFilename)}</p>
          </div>
          <button type="button" class="btn btn-primary" id="saveMemberChurchBtn">
            ${icon('check')}
            <span>각인 설정 저장하기</span>
          </button>
        </section>
      </div>
    `;

    const churchInput = document.getElementById('memberChurchInput');
    const previewEl = document.getElementById('memberImprintPreview');
    if (churchInput && previewEl) {
      churchInput.addEventListener('input', (e) => {
        setChurchName(e.target.value);
        previewEl.textContent = `${getEffectiveChurchName()}_01_유치부_A4교보재_2면.pdf`;
        if (shellApi) shellApi.syncChrome();
      });
    }

    const saveBtn = document.getElementById('saveMemberChurchBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        showToast(`교회 이름 각인 설정을 저장했습니다: ${getEffectiveChurchName()}`);
      });
    }

    const switchBtn = document.getElementById('switchVisitorBtn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        setSiteMode('visitor');
        if (shellApi) shellApi.syncChrome();
        renderPricingPage();
        showToast('일반 방문자 상태로 전환되었습니다.');
      });
    }
    return;
  }

  container.innerHTML = `
    <section class="page-intro" aria-label="정기구독 안내">
      <h1>월 1~2만 원 정기구독으로 다섯 세대 전체 수업을 제한 없이 준비하세요</h1>
      <p class="page-intro-lead">
        결제 전에 교재 품질을 직접 확인하고 싶다면 먼저 <a href="${escapeHtml(sampleUrl)}">무료 공개 샘플 주차</a>에서 전 부서 설교문과 A4 활동지, 온라인교보재를 무료로 열어 보세요.
      </p>
    </section>

    <div class="two-col-grid">
      <section class="sheet-card" aria-label="스탠다드 월간 플랜">
        <div class="plan-head">
          <h2>강소교회 스탠다드 월간 플랜</h2>
          <span class="status-tag status-muted">월간 정기구독</span>
        </div>
        <div class="plan-price tabular">₩15,000 <span>/ 월 (부가세 포함)</span></div>
        <ul class="check-list">
          <li>${icon('check')}<span>매주 5개 부서 전체 설교문 및 소인원 대본 열람</span></li>
          <li>${icon('check')}<span>무가위 A4 2면 다형식 교보재 완제품 PDF 다운로드</span></li>
          <li>${icon('check')}<span>교보재 안내서 및 주중 교사 총괄 브리핑 전체 포함</span></li>
          <li>${icon('check')}<span>오프라인 HTML5 온라인교보재 5종 및 통합 ZIP 제공</span></li>
        </ul>
        <button type="button" class="btn btn-secondary" id="selectMonthlyBtn">월 15,000원 구독 체험하기</button>
      </section>

      <section class="sheet-card sheet-card--featured" aria-label="연간 동역 플랜">
        <div class="plan-head">
          <h2>강소교회 연간 동역 플랜</h2>
          <span class="status-tag status-paid">추천 20% 할인</span>
        </div>
        <div class="plan-price tabular">₩12,000 <span>/ 월 (연 144,000원)</span></div>
        <ul class="check-list">
          <li>${icon('check')}<span>월간 플랜의 5개 부서 열람 및 다운로드 혜택 100% 포함</span></li>
          <li>${icon('check')}<span>부서별 선택버전(형식 A, B 순환) 교보재 전체 포함</span></li>
          <li>${icon('check')}<span>오프라인 HTML5 온라인교보재 5종 및 전 부서 통합 런처</span></li>
          <li>${icon('check')}<span>우리 교회 이름 파일 각인 및 공개된 전체 주차 아카이브 이용</span></li>
        </ul>
        <button type="button" class="btn btn-primary" id="selectAnnualBtn">월 12,000원 연간 구독 체험하기</button>
      </section>
    </div>

    <section class="content-band" aria-label="상용 전환 전 고지 및 미확정 항목">
      <h2>상용 전환 전 고지 및 미확정 항목 (시연 프로토타입 안내)</h2>
      <ul class="check-list">
        <li>${icon('info')}<span><strong>사업자 및 통신판매업 정보 [추후 확정 예정]:</strong> 정식 서비스 개시 시 고유번호 또는 사업자등록번호, 대표자명, 통신판매업신고번호가 반영됩니다.</span></li>
        <li>${icon('info')}<span><strong>세금계산서 및 환불 정책 [추후 확정 예정]:</strong> 지출증빙 현금영수증 발행 절차와 중도 해지 및 환불 규정은 운영 확정 후 공지됩니다.</span></li>
        <li>${icon('info')}<span><strong>공유 라이선스 및 업로드 시각 [추후 확정 예정]:</strong> 본 교회 내 교사 공유 외 타 지교회 전달 범위 및 주간 정기 업로드 요일은 추후 확정됩니다. 현재 화면에서는 실결제 없이 체험해 보실 수 있습니다.</span></li>
      </ul>
    </section>
  `;

  document.getElementById('selectMonthlyBtn').addEventListener('click', () => {
    openCheckoutDialog('강소교회 스탠다드 월간 플랜 (월 15,000원)', 'monthly');
  });
  document.getElementById('selectAnnualBtn').addEventListener('click', () => {
    openCheckoutDialog('강소교회 연간 동역 플랜 (연 144,000원)', 'annual');
  });
}

async function bootPricing() {
  shellApi = initAppShell({
    activeNav: 'pricing',
    onModeChange: renderPricingPage,
    onCheckoutSuccess: (churchName) => {
      renderPricingPage();
      showToast(`${churchName} 정기구독 체험 모드가 활성화되었습니다.`);
    }
  });

  try {
    await loadCatalogIndex();
  } catch (err) {
    console.warn('[pricing] catalog load skipped:', err);
  }
  renderPricingPage();

  window.addEventListener('storage', () => {
    refreshLocalState();
    if (shellApi) shellApi.syncChrome();
    renderPricingPage();
  });
}

window.addEventListener('DOMContentLoaded', bootPricing);
