import { getAidSimpleTitle } from './directions.js';
import { icon } from './icons.js';
import { cleanUiText, escapeHtml } from './markdown.js';
import {
  getEffectiveChurchName,
  isPkgUnlocked,
  resolveAssetUrl,
  state
} from './store.js';

export function buildDownloadSpec(pkg, dept, dlType) {
  const prefix = getEffectiveChurchName();
  if (dlType === 'full_zip') {
    return {
      label: `${cleanUiText(pkg.scripture)} 전 부서 통합 ZIP`,
      url: pkg.full_zip_url,
      filename: `${prefix}_${pkg.pack_id}_전부서_통합패키지.zip`
    };
  }
  const d = dept || (pkg.departments && pkg.departments[0]);
  if (!d) return null;
  const aidTitle = getAidSimpleTitle(d);
  if (dlType === 'alt_aid_pdf' && d.alt_aid) {
    return {
      label: `${aidTitle} 형식 A PDF`,
      url: d.alt_aid.download_url,
      filename: `${prefix}_${d.code}_${d.name}_A4교보재_선택버전A_2면.pdf`
    };
  }
  if (dlType === 'aid_pdf') {
    return {
      label: `${aidTitle} A4 2면 PDF`,
      url: d.download_urls?.aid_pdf,
      filename: `${prefix}_${d.code}_${d.name}_A4교보재_2면.pdf`
    };
  }
  if (dlType === 'packet_pdf') {
    return {
      label: `${d.name} 설교와 안내서 PDF`,
      url: d.download_urls?.packet_pdf,
      filename: `${prefix}_${d.code}_${d.name}_교사패킷.pdf`
    };
  }
  return {
    label: `${d.name} 부서 전체 ZIP`,
    url: d.download_urls?.dept_zip,
    filename: `${prefix}_${d.code}_${d.name}_올인원패키지.zip`
  };
}

export function buildWebappHtmlSpec(pkg, dept, isMaster) {
  const prefix = getEffectiveChurchName();
  const relUrl = isMaster ? pkg.launcher_url : dept?.preview_urls?.webapp_html;
  return {
    label: isMaster ? '전 부서 온라인교보재 HTML5' : `${dept.name} 온라인교보재 HTML5`,
    url: resolveAssetUrl(relUrl),
    filename: isMaster
      ? `${prefix}_${pkg.pack_id}_전부서_온라인교보재.html`
      : `${prefix}_${dept.code}_${dept.name}_온라인교보재.html`
  };
}

export function renderPrepDock(container, pkg, handlers) {
  const isMaster = state.activeDeptId === 'master';
  const dept = !isMaster
    ? (pkg.departments || []).find((d) => d.id === state.activeDeptId) || pkg.departments[0]
    : null;
  const unlocked = isPkgUnlocked(pkg);

  const thumbUrl = resolveAssetUrl(isMaster ? pkg.hero_image : dept.thumb_image);
  const thumbAlt = isMaster
    ? `${cleanUiText(pkg.scripture)} 주일 설교 대표 일러스트`
    : `${dept.name} 주일 활동 일러스트`;
  const thumbCaption = isMaster
    ? '전 부서 공통 브리핑 및 표준 원고'
    : `${dept.name} (${cleanUiText(dept.age)})`;

  const verKey = dept && dept.alt_aid && state.selectedAidVer[`${pkg.pack_id}:${dept.id}`] === 'alt' ? 'alt' : 'primary';
  const aidDlType = verKey === 'alt' ? 'alt_aid_pdf' : 'aid_pdf';
  const sampleSpec = buildDownloadSpec(pkg, dept, isMaster ? 'full_zip' : aidDlType);
  const htmlSpec = buildWebappHtmlSpec(pkg, dept, isMaster);

  const formatSwitcherHtml = dept && dept.alt_aid
    ? `
      <div class="dock-section">
        <span class="dock-field-label">교보재 형식 선택</span>
        <div class="format-toggle-group" role="group" aria-label="활동지 형식 A와 B 전환">
          <button type="button" class="format-btn" data-aid-ver="primary" aria-pressed="${verKey === 'primary'}">
            ${escapeHtml(cleanUiText(dept.aid_format?.badge || '형식 B 기본'))}
          </button>
          <button type="button" class="format-btn" data-aid-ver="alt" aria-pressed="${verKey === 'alt'}">
            ${escapeHtml(cleanUiText(dept.alt_aid.badge))}
          </button>
        </div>
      </div>
    `
    : '';

  const webappUrl = htmlSpec.url;
  const lockHint = unlocked ? '' : ' (구독)';
  const htmlSaveLink = unlocked
    ? `<a class="btn btn-quiet" id="dockSaveHtmlLink" href="${escapeHtml(htmlSpec.url)}" download="${escapeHtml(htmlSpec.filename)}">${icon('save')}<span>HTML5 파일 저장</span></a>`
    : `<a class="btn btn-quiet" id="dockSaveHtmlLink" href="#checkoutDialog" data-locked-html="true">${icon('save')}<span>HTML5 파일 저장 (구독)</span></a>`;

  const shareCopyBtn = `
    <button type="button" class="btn btn-secondary" id="copyRoomUrlBtn">
      ${icon('copy')}
      <span>이 교실 주소 복사</span>
    </button>
  `;

  const actionsHtml = isMaster
    ? `
      <button type="button" class="btn btn-primary" data-dock-dl="full_zip">
        ${icon('zip')}
        <span>전 부서 통합 ZIP${lockHint}</span>
      </button>
      <button type="button" class="btn btn-secondary" data-dock-webapp="${escapeHtml(webappUrl)}">
        ${icon('external')}
        <span>HTML5 웹앱 실행${lockHint}</span>
      </button>
      ${htmlSaveLink}
      ${shareCopyBtn}
    `
    : `
      <button type="button" class="btn btn-primary" data-dock-dl="${aidDlType}">
        ${icon('download')}
        <span>A4 활동지 2면 PDF${lockHint}</span>
      </button>
      <button type="button" class="btn btn-secondary" data-dock-dl="packet_pdf">
        ${icon('fileText')}
        <span>설교와 안내서 PDF${lockHint}</span>
      </button>
      <button type="button" class="btn btn-secondary" data-dock-webapp="${escapeHtml(webappUrl)}">
        ${icon('external')}
        <span>HTML5 웹앱 실행${lockHint}</span>
      </button>
      ${htmlSaveLink}
      <div class="dock-btn-pair">
        <button type="button" class="btn btn-quiet" data-dock-dl="dept_zip">
          ${icon('zip')}
          <span>부서 ZIP${lockHint}</span>
        </button>
        <button type="button" class="btn btn-quiet" data-dock-dl="full_zip">
          ${icon('book')}
          <span>통합 ZIP${lockHint}</span>
        </button>
      </div>
      ${shareCopyBtn}
    `;

  container.innerHTML = `
    <figure class="dock-thumb-figure">
      <img class="dock-thumb-img" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(thumbAlt)}" width="300" height="169" />
      <figcaption class="dock-thumb-caption">${escapeHtml(thumbCaption)}</figcaption>
    </figure>

    <div class="dock-section">
      <label class="dock-field-label" for="churchImprintInput">우리 교회 이름 각인</label>
      <input
        id="churchImprintInput"
        class="dock-input"
        type="text"
        name="churchName"
        autocomplete="organization"
        value="${escapeHtml(state.churchName)}"
        placeholder="예: 은혜작은교회"
        aria-describedby="imprintFilePreview"
      />
      <p class="dock-filename-preview" id="imprintFilePreview">${escapeHtml(sampleSpec ? sampleSpec.filename : '')}</p>
    </div>

    ${formatSwitcherHtml}

    <div class="dock-section">
      <div class="dock-actions">
        ${actionsHtml}
      </div>
    </div>
  `;

  const input = document.getElementById('churchImprintInput');
  const previewEl = document.getElementById('imprintFilePreview');
  const saveHtmlEl = document.getElementById('dockSaveHtmlLink');
  if (input && previewEl) {
    input.addEventListener('input', (e) => {
      handlers.onChurchNameChange(e.target.value);
      const updated = buildDownloadSpec(pkg, dept, isMaster ? 'full_zip' : aidDlType);
      previewEl.textContent = updated ? updated.filename : '';
      if (saveHtmlEl && unlocked) {
        const updatedHtml = buildWebappHtmlSpec(pkg, dept, isMaster);
        saveHtmlEl.setAttribute('download', updatedHtml.filename);
      }
    });
  }

  container.querySelectorAll('[data-aid-ver]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handlers.onSelectAidVer(dept.id, btn.getAttribute('data-aid-ver'));
    });
  });

  container.querySelectorAll('[data-dock-dl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handlers.onDownload(btn.getAttribute('data-dock-dl'), dept ? dept.id : '');
    });
  });

  const webappBtn = container.querySelector('[data-dock-webapp]');
  if (webappBtn) {
    webappBtn.addEventListener('click', () => {
      handlers.onLaunchWebapp(webappBtn.getAttribute('data-dock-webapp'), isMaster ? '전 부서 온라인교보재' : `${dept.name} 온라인교보재`);
    });
  }

  if (saveHtmlEl) {
    saveHtmlEl.addEventListener('click', (e) => {
      if (!unlocked) {
        e.preventDefault();
        handlers.onSaveLockedHtml(buildWebappHtmlSpec(pkg, dept, isMaster));
      } else {
        handlers.onSaveUnlockedHtml(saveHtmlEl.getAttribute('download') || htmlSpec.filename);
      }
    });
  }

  const copyBtn = document.getElementById('copyRoomUrlBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      handlers.onCopyRoomUrl();
    });
  }
}
