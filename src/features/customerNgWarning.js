
const CUSTOMER_APP_ID = 940;
const STATUS_FIELD = 'effective_genba_ng';

const WARNING_TEXT =
  '現場NG：この事業所への直接アプローチは禁止されています。' +
  '本社または担当窓口へ確認してください。';

function isCustomerApp() {
  return Number(kintone.app.getId()) === CUSTOMER_APP_ID;
}

function createWarningElement() {
  const warning = document.createElement('div');

  warning.style.cssText = [
    'background:#fff1f0',
    'border:2px solid #cf1322',
    'border-radius:6px',
    'padding:14px 18px',
    'margin:12px 0',
    'color:#a8071a',
    'font-size:15px',
    'font-weight:bold',
    'line-height:1.6',
  ].join(';');

  warning.setAttribute('role', 'alert');
  warning.textContent = `⚠ ${WARNING_TEXT}`;

  return warning;
}

// 詳細画面の警告表示
function showDetailWarning(event) {
  const header = kintone.app.record.getHeaderMenuSpaceElement();
  if (!header) return event;

  const oldWarning = document.getElementById('customer-ng-detail-warning');
  oldWarning?.remove();

  if (isApproachProhibited(event.record)) {
    const warning = createWarningElement();
    warning.id = 'customer-ng-detail-warning';
    header.appendChild(warning);
  }

  return event;
}

// 一覧画面の警告表示
function showIndexWarnings(event) {
  const records = event.records || [];

  // 一覧画面の表示領域
  const header = kintone.app.getHeaderSpaceElement();
  if (!header) return event;

  document.getElementById('customer-ng-index-warning')?.remove();

  const ngRecords = records.filter(isApproachProhibited);

  if (ngRecords.length > 0) {
    const warning = createWarningElement();
    warning.id = 'customer-ng-index-warning';

    warning.textContent =
      `⚠ 現在表示中の顧客に現場NGが ${ngRecords.length} 件あります。` +
      ' 対象顧客への直接アプローチは禁止されています。';

    header.appendChild(warning);
  }

  // 標準一覧の行をレコードIDに基づいて強調表示
  const ngRecordIds = new Set(
    ngRecords.map((record) => String(record.$id.value))
  );

  const rows = document.querySelectorAll(
    'tr.recordlist-row-gaia'
  );

  rows.forEach((row) => {
    const recordLink = row.querySelector('a[href*="/show#record="]');
    if (!recordLink) return;

    const match = recordLink.href.match(/record=(\d+)/);
    if (!match) return;

    const recordId = match[1];

    if (ngRecordIds.has(recordId)) {
      row.style.backgroundColor = '#fff1f0';
      row.style.outline = '2px solid #ff7875';
    } else {
      row.style.backgroundColor = '';
      row.style.outline = '';
    }
  });

  return event;
}

export function initCustomerNgWarning() {
  if (!isCustomerApp()) return;

  kintone.events.on('app.record.detail.show', showDetailWarning);
  kintone.events.on('app.record.index.show', showIndexWarnings);

  console.log('[Customer NG Warning] initialized');
}

function isApproachProhibited(record) {
  const status = record.effective_genba_ng?.value;
  const officeId = record.office_id?.value?.trim();
  const honshaId = record.honsha_office_id?.value?.trim();

  // 事業所ID・本社IDが不明な場合は、警告を抑制せず確認を促す
  if (!officeId || !honshaId) {
    return status === 'NG';
  }

  // 本社はアプローチ可能、配下のみ警告
  return status === 'NG' && officeId !== honshaId;
}