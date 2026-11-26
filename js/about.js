import { DEPT_DIRECTIONS, FORMAT_LINEUP, MINISTRY_PILLARS } from './directions.js';
import { icon } from './icons.js';
import { escapeHtml } from './markdown.js';
import { initAppShell } from './shell.js';
import { buildStudioUrl, getFreeSamplePkg, getLatestVisiblePkg, loadCatalogIndex, refreshLocalState } from './store.js';

let activeDeptTab = '01_kindergarten';
let shellApi = null;

function renderAboutPage() {
  const container = document.getElementById('aboutContainer');
  if (!container) return;

  const deptKeys = Object.keys(DEPT_DIRECTIONS);
  const current = DEPT_DIRECTIONS[activeDeptTab] || DEPT_DIRECTIONS['01_kindergarten'];
  const targetPkg = getLatestVisiblePkg() || getFreeSamplePkg();
  const samplePkg = getFreeSamplePkg();

  const openLatestUrl = targetPkg
    ? buildStudioUrl(targetPkg.pack_id, current.id, 'unit1')
    : `./studio.html?dept=${encodeURIComponent(current.id)}`;
  const openFreeUrl = samplePkg
    ? buildStudioUrl(samplePkg.pack_id, '01_kindergarten', 'unit1')
    : './studio.html';

  container.innerHTML = `
    <section class="page-intro" aria-label="스튜디오 소개">
      <h1>작은교회 교사 한 사람을 위해 다섯 세대의 예배와 공과를 매주 완성합니다</h1>
      <p class="page-intro-lead">
        학생 1~5명과 교사 한 분이 마주 앉는 강소교회 현장에는 대형교회식 경쟁 게임이나 번거로운 가위질 공과가 맞지 않습니다.
        JUSTJOY는 한 주일의 성경 본문 하나로 다섯 세대가 함께 예배하고 나눌 수 있는 설교문, 진행 대본, 무가위 A4 2면 교보재, 오프라인 HTML5 웹앱을 설계합니다.
      </p>
      <div class="page-intro-actions">
        <a class="btn btn-primary" href="${escapeHtml(openFreeUrl)}">무료 공개 수업 체험하기</a>
        <a class="btn btn-secondary" href="./index.html#curriculumCatalog">주간 커리큘럼 목록 보기</a>
      </div>
    </section>

    <section class="content-band" aria-label="핵심 사역 원칙">
      <h2>강소교회 현장 맞춤 3대 설계 원칙</h2>
      <div class="pillars-3">
        ${MINISTRY_PILLARS.map(
          (item) => `
          <div class="pillar-cell">
            <span class="pillar-icon">${icon(item.icon)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.desc)}</p>
          </div>
        `
        ).join('')}
      </div>
    </section>

    <section class="content-band" aria-label="5개 부서별 교육 방향성">
      <div class="band-head">
        <h2>5개 부서별 교육 방향성</h2>
        <div class="dept-tab-strip" role="tablist" aria-label="부서 선택">
          ${deptKeys
            .map((key) => {
              const dept = DEPT_DIRECTIONS[key];
              return `
                <button
                  type="button"
                  class="dept-tab-btn"
                  role="tab"
                  aria-selected="${activeDeptTab === key}"
                  data-about-dept="${escapeHtml(key)}"
                >${escapeHtml(dept.name)}</button>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="vision-sheet">
        <h3>${escapeHtml(current.vision)}</h3>
        <div class="vision-meta">
          <span class="status-tag status-paid">${escapeHtml(current.name)} (${escapeHtml(current.age)})</span>
          <a class="btn btn-secondary" href="${escapeHtml(openLatestUrl)}">${escapeHtml(current.name)} 수업 스튜디오 열기</a>
        </div>
      </div>

      <div class="pillars-3">
        ${current.pillars
          .map(
            (pillar) => `
            <div class="pillar-cell">
              <h3>${escapeHtml(pillar.title)}</h3>
              <p>${escapeHtml(pillar.desc)}</p>
            </div>
          `
          )
          .join('')}
      </div>
    </section>

    <section class="content-band" aria-label="부서별 다형식 교보재 라인업">
      <h2>부서별 다형식 교보재(Format A, B, C) 라인업</h2>
      <div class="lineup-table-wrap">
        <table class="lineup-table">
          <thead>
            <tr>
              <th scope="col">대상 부서</th>
              <th scope="col">형식 A (서사 및 모험형)</th>
              <th scope="col">형식 B (도감 및 매거진형)</th>
              <th scope="col">형식 C (극장 및 라운드테이블형)</th>
            </tr>
          </thead>
          <tbody>
            ${FORMAT_LINEUP.map(
              (row) => `
              <tr>
                <td>
                  <strong>${escapeHtml(row.dept)}</strong>
                  <span class="dept-age-sub">${escapeHtml(row.age)}</span>
                </td>
                <td data-label="형식 A">${escapeHtml(row.formatA)}</td>
                <td data-label="형식 B">${escapeHtml(row.formatB)}</td>
                <td data-label="형식 C">${escapeHtml(row.formatC)}</td>
              </tr>
            `
            ).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-about-dept]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeDeptTab = btn.getAttribute('data-about-dept');
      renderAboutPage();
    });
  });
}

async function bootAbout() {
  const paramDept = new URLSearchParams(window.location.search).get('dept');
  if (paramDept && DEPT_DIRECTIONS[paramDept]) {
    activeDeptTab = paramDept;
  }

  shellApi = initAppShell({
    activeNav: 'about',
    onModeChange: renderAboutPage,
    onCheckoutSuccess: renderAboutPage
  });

  try {
    await loadCatalogIndex();
  } catch (err) {
    console.warn('[about] catalog load skipped:', err);
  }
  renderAboutPage();

  window.addEventListener('storage', () => {
    refreshLocalState();
    if (shellApi) shellApi.syncChrome();
    renderAboutPage();
  });
}

window.addEventListener('DOMContentLoaded', bootAbout);
