/** 担当者別明細を明細管理アプリへレコード化する。 */
import { Button } from 'kintone-ui-component';
import { DEAL_FIELDS, getProposalDetailAppId } from '../config/fields.js';

const TARGET = Object.freeze({
  DEAL_ID: '案件レコードID',
  CONTACT_NO: '担当者No',
  CONTACT_NAME: '担当者名',
  PRODUCT: '提案商品',
  PROBABILITY: '確度',
  PHASE: '商談フェーズ',
  EXPECTED_AMOUNT: '見込み金額',
  ORDER_AMOUNT: '受注金額',
  EXPECTED_ORDER_DATE: '受注予定日',
  ORDER_DATE: '受注日',
  SOURCE_ROW_ID: 'コピー元明細行ID',
});

const SOURCE_COPY_AT = DEAL_FIELDS.COPY_HISTORY.LAST_AT;
const SOURCE_COPY_BY = DEAL_FIELDS.COPY_HISTORY.LAST_BY;
const BUTTON_ID = 'sfpack-proposal-app-copy-button';
const API_LIMIT = 500;


function api(path, method, body) {
  return kintone.api(kintone.api.url(path, true), method, body);
}

function hasContent(row, slot) {
  return Object.values(slot.FIELDS).some(code => {
    const value = row.value[code]?.value;
    return Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined;
  });
}

function collectRows(sourceRecord, dealId) {
  const result = [];
  const seen = new Set();
  for (const slot of DEAL_FIELDS.PROPOSAL_TABLES) {
    const contactNo = String(sourceRecord[slot.OWNER]?.value ?? '').trim();
    const contactName = String(sourceRecord[slot.OWNER_NAME]?.value ?? '');
    for (const row of sourceRecord[slot.TABLE]?.value ?? []) {
      if (!hasContent(row, slot)) continue;
      if (!contactNo) {
        throw new Error(`${slot.TABLE}に明細がありますが、担当者No.が未設定です。`);
      }
      if (!row.id) {
        throw new Error(`${slot.TABLE}の明細行IDが取得できません。保存済みレコードを使用してください。`);
      }
      const rowId = String(row.id);
      if (seen.has(rowId)) throw new Error(`明細行IDが重複しています: ${rowId}`);
      seen.add(rowId);
      const mapping = [
        [TARGET.PRODUCT, slot.FIELDS.PRODUCT],
        [TARGET.PROBABILITY, slot.FIELDS.PROBABILITY],
        [TARGET.PHASE, slot.FIELDS.PHASE],
        [TARGET.EXPECTED_AMOUNT, slot.FIELDS.EXPECTED_AMOUNT],
        [TARGET.ORDER_AMOUNT, slot.FIELDS.ORDER_AMOUNT],
        [TARGET.EXPECTED_ORDER_DATE, slot.FIELDS.EXPECTED_ORDER_DATE],
        [TARGET.ORDER_DATE, slot.FIELDS.ORDER_DATE],
      ];
      const record = {
        [TARGET.DEAL_ID]: { value: String(dealId) },
        [TARGET.CONTACT_NO]: { value: contactNo },
        [TARGET.CONTACT_NAME]: { value: contactName },
        [TARGET.SOURCE_ROW_ID]: { value: rowId },
      };
      for (const [targetCode, sourceCode] of mapping) {
        record[targetCode] = { value: row.value[sourceCode]?.value ?? '' };
      }
      result.push({ rowId, record });
    }
  }
  return result;
}

async function fetchExisting(appId, dealId) {
  const found = new Map();
  let offset = 0;
  while (true) {
    const response = await api('/k/v1/records.json', 'GET', {
      app: appId,
      fields: ['$id', TARGET.DEAL_ID, TARGET.SOURCE_ROW_ID],
      query: `${TARGET.DEAL_ID} = ${Number(dealId)} order by $id asc limit ${API_LIMIT} offset ${offset}`,
    });
    for (const record of response.records) {
      const rowId = String(record[TARGET.SOURCE_ROW_ID]?.value ?? '');
      if (!rowId) continue;
      if (found.has(rowId)) {
        throw new Error(`コピー先に同じ明細行IDのレコードが複数あります: ${rowId}`);
      }
      found.set(rowId, record.$id.value);
    }
    if (response.records.length < API_LIMIT) break;
    offset += API_LIMIT;
    if (offset >= 10000) throw new Error('コピー先の検索件数が上限に達しました。');
  }
  return found;
}

async function applyChanges(appId, rows, existing) {
  const creates = [];
  const updates = [];
  for (const item of rows) {
    const existingId = existing.get(item.rowId);
    if (existingId) updates.push({ id: existingId, record: item.record });
    else creates.push(item.record);
  }
  // kintone records bulk APIs: maximum 100 records per call.
  for (let start = 0; start < creates.length; start += 100) {
    await api('/k/v1/records.json', 'POST', {
      app: appId,
      records: creates.slice(start, start + 100),
    });
  }
  for (let start = 0; start < updates.length; start += 100) {
    await api('/k/v1/records.json', 'PUT', {
      app: appId,
      records: updates.slice(start, start + 100),
    });
  }
  return { created: creates.length, updated: updates.length };
}

async function runCopy(button, dealId) {
  const targetAppId = getProposalDetailAppId();
  const sourceAppId = kintone.app.getId();
  const source = await api('/k/v1/record.json', 'GET', { app: sourceAppId, id: dealId });
  const rows = collectRows(source.record, dealId);
  if (rows.length === 0) {
    alert('コピー対象の明細がありません。');
    return;
  }
  if (!confirm(`${rows.length}件の明細をレコード化します。\nコピー先アプリID: ${targetAppId}\nよろしいですか？`)) return;

  button.disabled = true;
  button.text = 'コピー中...';
  try {
    const existing = await fetchExisting(targetAppId, dealId);
    const counts = await applyChanges(targetAppId, rows, existing);
    const userCode = kintone.getLoginUser().code;
    const timestamp = new Date().toISOString();
    await api('/k/v1/record.json', 'PUT', {
      app: sourceAppId,
      id: dealId,
      record: {
        [SOURCE_COPY_AT]: { value: timestamp },
        [SOURCE_COPY_BY]: { value: [{ code: userCode }] },
      },
    });
    alert(`明細レコード化が完了しました。\n新規: ${counts.created}件\n更新: ${counts.updated}件`);
    location.reload();
  } catch (error) {
    console.error('[Proposal App Copy] failed', error);
    alert('コピー処理が完了しませんでした。\n一部のコピー先レコードが更新されている可能性があります。\n再実行前にConsoleのエラーをご確認ください。');
  } finally {
    button.disabled = false;
    button.text = '明細レコード化';
  }
}

export function initializeProposalAppCopy() {
  kintone.events.on('app.record.detail.show', event => {
    const space = kintone.app.record.getSpaceElement(
      DEAL_FIELDS.PROPOSAL_COPY_SPACE
    );
    if (!space || document.getElementById(BUTTON_ID)) return event;
    const button = new Button({
      text: '明細レコード化',
      type: 'normal',
      disabled: false,
    });
    button.id = BUTTON_ID;
    button.style.marginLeft = '0px';
    button.addEventListener('click', () => runCopy(button, event.recordId));
    space.appendChild(button);
    return event;
  });
  console.log('[Proposal App Copy] initialized');
}
