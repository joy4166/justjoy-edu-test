import { DEPT_DIRECTIONS, getAidSimpleTitle } from './directions.js';
import { icon } from './icons.js';
import { cleanUiText, escapeHtml, markdownToBlocks } from './markdown.js';
import { getDeptUploads, resolveAssetUrl, state } from './store.js';

export function renderGateNotice(label) {
  return `
    <div class="gate-notice">
      <div class="gate-notice-copy">
        <h2>정기구독 회원 전체 열람 구역</h2>
        <p>일반 방문자 모드에서는 1교시 목표 브리핑과 설교 상단 본문까지 공개됩니다. 아래 전체 원고와 A4 활동지 인쇄는 구독 체험 시작 후 바로 열립니다.</p>
      </div>
      <button type="button" class="btn btn-primary" data-open-unlock="${escapeHtml(label)}">
        ${icon('lock')}
        <span>구독 체험으로 전체 열람</span>
      </button>
    </div>
  `;
}

function renderFlowStepsList(rawFlow) {
  const steps = String(rawFlow || '')
    .split('\u2192')
    .map((s) => cleanUiText(s).replace(/^(?:\d+단계\s*:\s*|\d+\.\s*)/, '').trim())
    .filter(Boolean);

  if (!steps.length) return '';
  return `<ol class="flow-steps">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`;
}

function renderCustomUploadsBlock(pkg, dept, unlocked) {
  const uploads = getDeptUploads(pkg.pack_id, dept.id);
  if (!uploads.length) return '';

  const rows = uploads
    .map((item) => {
      const desc = cleanUiText(item.desc || item.fileName);
      return `
        <div class="upload-row">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="rail-subnote">${escapeHtml(item.category)} (${escapeHtml(desc)})</div>
          </div>
          <div class="upload-row-actions">
            <button type="button" class="btn btn-secondary" data-preview-custom="${escapeHtml(item.id)}">
              ${unlocked ? '미리보기' : '구독 확인'}
            </button>
            <button type="button" class="btn btn-quiet" data-dl-custom="${escapeHtml(item.id)}">
              ${icon('download')}
              <span>받기</span>
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="briefing-block">
      <h2>우리 교회 추가 업로드 자료</h2>
      ${rows}
    </section>
  `;
}

function renderLockedCoverPreview(thumbUrl, title, subtitle, unlockLabel) {
  return `
    <div class="locked-preview-cover">
      <img class="locked-preview-thumb" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(title)} 표지 미리보기" width="220" height="138" />
      <div class="locked-preview-body">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
        <div class="locked-sample-lines" aria-hidden="true">
          <span>1면: 본문 핵심 도안 및 소인원 협동 활동 구성 영역</span>
          <span>2면: 가정 연계 미션 및 우리 교회 이름 각인 인쇄 영역</span>
        </div>
        <button type="button" class="btn btn-primary" data-open-unlock="${escapeHtml(unlockLabel)}">
          ${icon('lock')}
          <span>구독 체험 후 미리보기 및 인쇄 열기</span>
        </button>
      </div>
    </div>
  `;
}

export function renderDeptUnit1(pkg, dept, unlocked) {
  const dir = DEPT_DIRECTIONS[dept.id] || DEPT_DIRECTIONS['01_kindergarten'];
  const goals = dept.goals || {};
  const overview = dept.overview || {};

  return `
    <section class="briefing-block">
      <h2>교육 목표</h2>
      <dl class="goal-dl">
        <dt>인지 목표</dt>
        <dd>${escapeHtml(cleanUiText(goals.cognitive))}</dd>
        <dt>정서 목표</dt>
        <dd>${escapeHtml(cleanUiText(goals.affective))}</dd>
        <dt>실천 목표</dt>
        <dd>${escapeHtml(cleanUiText(goals.action))}</dd>
      </dl>
    </section>
    <section class="briefing-block">
      <h2>수업 진행 요약</h2>
      <dl class="goal-dl">
        <dt>설교 핵심</dt>
        <dd>${escapeHtml(cleanUiText(overview.sermon_point))}</dd>
        <dt>활동 흐름</dt>
        <dd>${renderFlowStepsList(overview.activity_flow)}</dd>
        <dt>준비물</dt>
        <dd>${escapeHtml(cleanUiText(overview.prep_items))}</dd>
      </dl>
    </section>
    <section class="briefing-block">
      <h2>세대별 지도 원칙</h2>
      <dl class="goal-dl">
        ${dir.pillars
          .map((p) => `<dt>${escapeHtml(cleanUiText(p.title))}</dt><dd>${escapeHtml(cleanUiText(p.desc))}</dd>`)
          .join('')}
      </dl>
    </section>
    ${renderCustomUploadsBlock(pkg, dept, unlocked)}
  `;
}

export function renderDeptUnit2(dept, unlocked) {
  const blocks = markdownToBlocks(dept.contents?.sermon_md || '', { sermonMode: true });
  if (unlocked) {
    return `<article class="prose-reader">${blocks.join('\n')}</article>`;
  }

  const openBlocks = blocks.slice(0, 7).join('\n');
  const teaserBlocks = blocks.slice(7, 11).join('\n');
  return `
    <article class="prose-reader">
      ${openBlocks}
      ${teaserBlocks ? `<div class="gated-blur-preview" aria-hidden="true">${teaserBlocks}</div>` : ''}
    </article>
    ${renderGateNotice(`${dept.name} 설교 원고 전문`)}
  `;
}

export function renderDeptUnit3(dept, unlocked) {
  if (!unlocked) {
    const blocks = markdownToBlocks(dept.contents?.lesson_md || '', { highlightBranches: true });
    return `
      <article class="prose-reader">${blocks.slice(0, 5).join('\n')}</article>
      ${renderGateNotice(`${dept.name} ${dept.lesson_minutes}분 소인원 대본`)}
    `;
  }

  const filterButtons = [
    { id: 'all', label: '전체 순서' },
    { id: '1', label: '학생 1명' },
    { id: '2-3', label: '2~3명' },
    { id: '4-5', label: '4~5명' }
  ]
    .map(
      (f) => `
      <button type="button" class="seg-btn" data-branch-filter="${f.id}" aria-pressed="${state.branchFilter === f.id}">
        ${f.label}
      </button>
    `
    )
    .join('');

  const blocks = markdownToBlocks(dept.contents?.lesson_md || '', { highlightBranches: true });
  return `
    <div class="branch-filter-row">
      <span class="rail-subnote">소그룹 인원 분기 멘트 강조</span>
      <div class="seg-group" role="group" aria-label="소그룹 인원 분기 보기">${filterButtons}</div>
    </div>
    <div class="branch-summary-banner" id="branchSummaryBanner" aria-live="polite"></div>
    <article class="prose-reader" id="lessonScriptArticle">${blocks.join('\n')}</article>
  `;
}

export function renderDeptUnit4(pkg, dept, unlocked) {
  const verKey = dept.alt_aid && state.selectedAidVer[`${pkg.pack_id}:${dept.id}`] === 'alt' ? 'alt' : 'primary';
  const aidUrl = verKey === 'alt' ? dept.alt_aid.preview_url : dept.preview_urls?.teaching_aid_html;
  const aidTitle = `${getAidSimpleTitle(dept)} (${verKey === 'alt' ? '형식 A' : cleanUiText(dept.aid_format?.code || '기본')})`;
  const uploads = getDeptUploads(pkg.pack_id, dept.id).filter((u) => ['html', 'htm', 'md', 'txt', 'jpg', 'jpeg', 'png'].includes(u.ext));

  const sources = [
    { id: 'aid', label: '무가위 A4 활동지', url: resolveAssetUrl(aidUrl), title: aidTitle },
    { id: 'packet', label: '교사 안내서 합본', url: resolveAssetUrl(dept.preview_urls?.teacher_packet_html), title: `${dept.name} 교보재 안내서` },
    { id: 'webapp', label: '온라인교보재 화면', url: resolveAssetUrl(dept.preview_urls?.webapp_html), title: `${dept.name} 온라인교보재` },
    ...uploads.map((u) => ({ id: `custom:${u.id}`, label: u.title, customItem: u, title: u.title }))
  ];

  const activeSource = sources.find((s) => s.id === state.previewSource) || sources[0];
  const sourceButtons = sources
    .map(
      (s) => `
      <button type="button" class="seg-btn" data-preview-source="${escapeHtml(s.id)}" aria-pressed="${activeSource.id === s.id}">
        ${escapeHtml(s.label)}
      </button>
    `
    )
    .join('');

  let frameContent = '';
  if (!unlocked) {
    const thumbUrl = resolveAssetUrl(dept.thumb_image || pkg.hero_image);
    const subtitle = `${dept.name} (${cleanUiText(dept.age)}) 무가위 A4 ${dept.aid_pdf_pages}면 활동지와 온라인교보재는 정기구독 회원에게 전체 공개됩니다.`;
    frameContent = renderLockedCoverPreview(thumbUrl, activeSource.title, subtitle, activeSource.title);
  } else if (activeSource.customItem) {
    const item = activeSource.customItem;
    if (['jpg', 'jpeg', 'png'].includes(item.ext)) {
      frameContent = `<img src="${item.content}" alt="${escapeHtml(item.title)}" />`;
    } else if (['html', 'htm'].includes(item.ext)) {
      frameContent = `<iframe class="preview-iframe" id="inlinePreviewFrame" title="${escapeHtml(item.title)}"></iframe>`;
    } else {
      frameContent = `<div class="unit-panel-wrap"><article class="prose-reader">${markdownToBlocks(item.content).join('\n')}</article></div>`;
    }
  } else {
    frameContent = `<iframe class="preview-iframe" id="inlinePreviewFrame" src="${escapeHtml(activeSource.url)}" title="${escapeHtml(activeSource.title)}"></iframe>`;
  }

  return `
    <div class="preview-toolbar">
      <div class="seg-group" role="group" aria-label="미리보기 자료 전환">${sourceButtons}</div>
      ${
        unlocked && activeSource.url
          ? `<a class="btn btn-secondary" href="${escapeHtml(activeSource.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}<span>새 탭에서 크게 보기</span></a>`
          : ''
      }
    </div>
    <div class="preview-frame-wrap ${unlocked ? '' : 'is-locked'}">${frameContent}</div>
    ${unlocked ? '' : renderGateNotice(activeSource.title)}
  `;
}

export function renderMasterUnit(pkg, unitId, unlocked) {
  if (unitId === 'unit1') {
    const blocks = markdownToBlocks(pkg.master_docs?.midweek_briefing_md || '');
    return `<article class="prose-reader">${blocks.join('\n')}</article>`;
  }
  if (unitId === 'unit2') {
    const blocks = markdownToBlocks(pkg.master_docs?.master_sermon_md || '', { sermonMode: true });
    if (unlocked) return `<article class="prose-reader">${blocks.join('\n')}</article>`;
    return `<article class="prose-reader">${blocks.slice(0, 6).join('\n')}</article>${renderGateNotice('전 부서 표준 설교 초안')}`;
  }
  if (unitId === 'unit3') {
    const rows = (pkg.departments || [])
      .map(
        (d) => `
        <tr>
          <td><strong>${escapeHtml(d.name)}</strong></td>
          <td class="num">${escapeHtml(cleanUiText(d.age))}</td>
          <td class="num">${escapeHtml(cleanUiText(d.sermon_target))}</td>
          <td class="num">${d.lesson_minutes}분</td>
          <td>${escapeHtml(cleanUiText(d.aid_format?.badge || ''))}</td>
        </tr>
      `
      )
      .join('');
    return `
      <div class="prose-reader">
        <h2>부서별 교육 편성 비교</h2>
        <table>
          <thead><tr><th>부서</th><th>대상 연령</th><th>설교 분량</th><th>공과 시간</th><th>교보재 형식</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  const launcherUrl = resolveAssetUrl(pkg.launcher_url);
  const frameHtml = unlocked
    ? `<iframe class="preview-iframe" src="${escapeHtml(launcherUrl)}" title="전 부서 온라인교보재 런처"></iframe>`
    : renderLockedCoverPreview(
        resolveAssetUrl(pkg.hero_image),
        '전 부서 온라인교보재 통합 런처',
        '5개 부서 오프라인 HTML5 웹앱을 한 화면에서 전환해 실행하는 통합 런처입니다.',
        '전 부서 통합 웹앱 런처'
      );

  return `
    <div class="preview-toolbar">
      <span class="rail-subnote">전 부서 온라인교보재 통합 런처</span>
      ${unlocked ? `<a class="btn btn-secondary" href="${escapeHtml(launcherUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')}<span>새 탭에서 실행</span></a>` : ''}
    </div>
    <div class="preview-frame-wrap ${unlocked ? '' : 'is-locked'}">${frameHtml}</div>
    ${unlocked ? '' : renderGateNotice('전 부서 통합 웹앱 런처')}
  `;
}
