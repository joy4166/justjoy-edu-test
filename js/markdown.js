const INTERNAL_FILE_MAP = [
  [/`?(?:0[1-6]_[a-z_]+\/)?teaching_aid_ver_a\.html`?/gi, '선택 형식 A 활동지'],
  [/`?(?:0[1-6]_[a-z_]+\/)?teaching_aid\.html`?/gi, 'A4 활동지'],
  [/`?(?:0[1-6]_[a-z_]+\/)?teacher_packet\.html`?/gi, '교사 안내서 합본'],
  [/`?(?:0[1-6]_[a-z_]+\/)?kindergarten\.html`?/gi, '유치부 온라인교보재'],
  [/`?(?:0[1-6]_[a-z_]+\/)?elem_lower\.html`?/gi, '초등1부 온라인교보재'],
  [/`?(?:0[1-6]_[a-z_]+\/)?elem_upper\.html`?/gi, '초등2부 온라인교보재'],
  [/`?(?:0[1-6]_[a-z_]+\/)?youth\.html`?/gi, '청소년부 온라인교보재'],
  [/`?(?:0[1-6]_[a-z_]+\/)?mixed\.html`?/gi, '혼합 통합반 온라인교보재'],
  [/`?06_webapps\/index\.html`?/gi, '온라인교보재 통합 런처'],
  [/`?06_webapps\/`?/gi, '온라인교보재'],
  [/`?index\.html`?/gi, '온라인교보재 런처'],
  [/`?(?:0[1-6]_[a-z_]+\/)?research_brief\.md`?/gi, '본문 연구'],
  [/`?(?:0[1-6]_[a-z_]+\/)?sermon\.md`?/gi, '부서 설교문'],
  [/`?(?:0[1-6]_[a-z_]+\/)?lesson\.md`?/gi, '활동 대본'],
  [/`?(?:0[1-6]_[a-z_]+\/)?teaching_aid_guide\.md`?/gi, '교보재 안내서'],
  [/`?00_master_blueprint\.md`?/gi, '통합 설계안'],
  [/`?01_kindergarten`?/g, '유치부'],
  [/`?02_elem_lower`?/g, '초등1부'],
  [/`?03_elem_upper`?/g, '초등2부'],
  [/`?04_youth`?/g, '청소년부'],
  [/`?05_mixed`?/g, '혼합 통합반']
];

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeMinistryText(value) {
  let text = String(value || '')
    .replace(/\s*\(\s*`?(?:[0-9]{2}_[a-z_]+\/)?[A-Za-z0-9_]+\.md`?\s*\)/gi, '')
    .replace(/\[(?:교사 안내서 합본|teacher_packet\.html)\]/gi, '교사 안내서 합본')
    .replace(/\[(\d+)단계\]\s*/g, '$1단계: ')
    .replace(/부서\s*\(폴더\)/g, '부서')
    .replace(/모든 부서 폴더\(`?01_kindergarten`?\s*~\s*`?05_mixed`?\)/g, '모든 부서 자료')
    .replace(/웹앱\s*\(`?06_webapps\/`?\)/g, '온라인교보재')
    .replace(/([📖✋🌊])/gu, '')
    .replace(/⇅\s*/g, '상하 ')
    .replace(/⇄\s*/g, '좌우 ');

  for (const [pattern, replacement] of INTERNAL_FILE_MAP) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/A4\s*(?:교보재\s*인쇄|인쇄물|교보재)\s*\(\s*A4 활동지\s*\)/g, 'A4 교보재')
    .replace(/A4\s*(?:인쇄\s*교보재|교보재\s*인쇄)\s*\(\s*A4 활동지\s*,\s*/g, 'A4 인쇄 교보재 (')
    .replace(/웹앱\s*화면\s*\(([^)]*온라인교보재)\)/g, '$1')
    .replace(/스마트폰\s*1대\)\s*\(([^)]*온라인교보재)\s*실행\s*화면\)/g, '스마트폰 1대 ($1 실행 화면)')
    .replace(/오프라인 웹앱\s*\(온라인교보재\)/g, '오프라인 온라인교보재')
    .replace(/\(\s*\)/g, '');
}

export function cleanUiText(value) {
  return sanitizeMinistryText(value)
    .replace(/\s+[·•]\s+/g, ', ')
    .replace(/[·•]/g, ' ')
    .replace(/\*\*([^*\n]+)\*\*\s*→\s*/g, '**$1**: ')
    .replace(/대체\)\s*→\s*/g, '대체): ')
    .replace(/없을 때\s*→\s*/g, '없을 때: ')
    .replace(/\s*↔\s*/g, ' 및 ')
    .replace(/\s*[→←]\s*/g, ', ')
    .replace(/\s*[\u2013\u2014]\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanHeadingPrefix(rawHeading) {
  return cleanUiText(rawHeading)
    .replace(/^\d+단계:\s*(?=(?:주중|전\s*부서|작은교회))/, '')
    .replace(/^\[(?:유치부 설교문|유치부 활동 교안|초등2부 10분 설교문)\]\s*/, '')
    .trim();
}

function formatInline(raw) {
  const cleaned = cleanUiText(raw);
  const escaped = escapeHtml(cleaned)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  return escaped.replace(/\[([^\]]+)\]/g, (full, inner) => {
    const trimmed = inner.trim();
    return trimmed ? `<span class="stage-cue">${trimmed}</span>` : '';
  });
}

function detectBranchTag(line) {
  const primary = line.split('(')[0];
  if (/4~5명일\s*때/.test(primary)) return '4-5';
  if (/2~3명일\s*때/.test(primary)) return '2-3';
  if (/1명일\s*때/.test(primary)) return '1';
  if (/4~5명일\s*때/.test(line)) return '4-5';
  if (/2~3명일\s*때/.test(line)) return '2-3';
  if (/1명일\s*때/.test(line)) return '1';
  return '';
}

export function markdownToBlocks(md, options = {}) {
  const lines = String(md || '')
    .replace(/\r\n/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .split('\n');

  const blocks = [];
  let tableRows = [];
  let listItems = [];
  let checklistItems = [];
  let currentBranch = 'all';

  function flushList() {
    if (!listItems.length) return;
    const cls = currentBranch !== 'all' ? ` data-branch="${currentBranch}"` : '';
    blocks.push(`<ul${cls}>${listItems.map((li) => `<li>${li}</li>`).join('')}</ul>`);
    listItems = [];
  }

  function flushChecklist() {
    if (!checklistItems.length) return;
    const itemsHtml = checklistItems
      .map(
        (it) =>
          `<li class="checklist-item"><span class="check-box${it.checked ? ' is-checked' : ''}" aria-hidden="true"></span><span>${it.html}</span></li>`
      )
      .join('');
    blocks.push(`<ul class="checklist">${itemsHtml}</ul>`);
    checklistItems = [];
  }

  function flushTable() {
    if (!tableRows.length) return;
    const head = tableRows[0];
    const body = tableRows.slice(1);
    const ths = head.map((c) => `<th>${c}</th>`).join('');
    const trs = body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    blocks.push(`<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`);
    tableRows = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || (line.startsWith('<!--') && line.endsWith('-->')) || line === '---') {
      flushList();
      flushChecklist();
      flushTable();
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      flushChecklist();
      if (/^\|[\s\-:|]+\|$/.test(line)) continue;
      tableRows.push(line.slice(1, -1).split('|').map((c) => formatInline(c.trim())));
      continue;
    }
    flushTable();

    if (line.startsWith('> ')) {
      flushList();
      flushChecklist();
      blocks.push(`<blockquote><p>${formatInline(line.slice(2))}</p></blockquote>`);
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      flushChecklist();
      const text = line.slice(4);
      const branch = options.highlightBranches ? detectBranchTag(text) : '';
      if (branch) {
        currentBranch = branch;
        blocks.push(`<h3 class="branch-cue" data-branch="${branch}">${formatInline(text)}</h3>`);
      } else {
        currentBranch = 'all';
        blocks.push(`<h3>${formatInline(text)}</h3>`);
      }
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      flushChecklist();
      currentBranch = 'all';
      blocks.push(`<h2>${formatInline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      flushChecklist();
      currentBranch = 'all';
      if (!options.sermonMode) {
        const headingText = cleanHeadingPrefix(line.slice(2));
        if (headingText) {
          blocks.push(`<h2>${formatInline(headingText)}</h2>`);
        }
      }
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      const checkMatch = content.match(/^\[([ xX])\]\s+([\s\S]+)$/);
      if (checkMatch) {
        flushList();
        checklistItems.push({
          checked: checkMatch[1].toLowerCase() === 'x',
          html: formatInline(checkMatch[2])
        });
        continue;
      }

      flushChecklist();
      const isTopBullet = !/^\s{2,}|\t/.test(raw);
      const branch = options.highlightBranches && isTopBullet ? detectBranchTag(content) : '';
      if (branch) {
        flushList();
        currentBranch = branch;
        blocks.push(`<p class="branch-cue" data-branch="${branch}">${formatInline(content)}</p>`);
      } else {
        listItems.push(formatInline(content));
      }
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushChecklist();
      listItems.push(formatInline(line.replace(/^\d+\.\s+/, '')));
      continue;
    }

    flushList();
    flushChecklist();
    const cls = currentBranch !== 'all' ? ` data-branch="${currentBranch}"` : '';
    blocks.push(`<p${cls}>${formatInline(line)}</p>`);
  }

  flushList();
  flushChecklist();
  flushTable();
  return blocks;
}
