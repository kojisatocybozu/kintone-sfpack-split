
import { Button } from 'kintone-ui-component';
import { DEAL_FIELDS } from '../config/fields.js';

const SOURCE = DEAL_FIELDS.PROPOSAL_SOURCE;
const TARGETS = DEAL_FIELDS.PROPOSAL_TABLES;
const CONTACT_NUMBER_FIELD = DEAL_FIELDS.CONTACT_TABLE.FIELDS.CONTACT_NO;

function hasData(row, fields) {
  return Object.values(fields).some((code) => {
    const value = row.value?.[code]?.value;
    return value !== '' && value !== null && value !== undefined;
  });
}

function createCopyRow(sourceRow, targetFields) {
  const mapping = [
    [SOURCE.FIELDS.PRODUCT, targetFields.PRODUCT],
    [SOURCE.FIELDS.PROBABILITY, targetFields.PROBABILITY],
    [SOURCE.FIELDS.PHASE, targetFields.PHASE],
  ];

  const value = {};

  for (const [sourceCode, targetCode] of mapping) {
    value[targetCode] = {
      type: 'DROP_DOWN',
      value: sourceRow.value[sourceCode]?.value ?? '',
    };
  }

  // 新規行として追加するため、行IDは引き継がない
  return { value };
}

function copyProposalDetails() {
  const current = kintone.app.record.get();

  if (!current) {
    return;
  }

  const record = current.record;
  const sourceRows = record[SOURCE.TABLE]?.value ?? [];

  const validSourceRows = sourceRows.filter((row) =>
    hasData(row, SOURCE.FIELDS)
  );

  if (validSourceRows.length === 0) {
    window.alert('コピー元の明細テーブルにデータがありません。');
    return;
  }

  const contactRows = record[DEAL_FIELDS.CONTACT_TABLE.TABLE]?.value ?? [];
  const selectedContactNos = new Set(
    contactRows
      .map((row) => String(
        row.value[CONTACT_NUMBER_FIELD]?.value ?? ''
      ).trim())
      .filter(Boolean)
  );

  console.log('[Proposal Copy] selected contacts:', [
    ...selectedContactNos,
  ]);

  if (selectedContactNos.size === 0) {
    window.alert('担当者が選択されていません。');
    return;
  }

  const copyTargets = [];
  const skippedTargets = [];

  for (const slot of TARGETS) {
    const ownerNo = String(
      record[slot.OWNER]?.value ?? ''
    ).trim();

    // 現在選択中の担当者に対応するスロットだけを対象とする
    if (!ownerNo || !selectedContactNos.has(ownerNo)) {
      continue;
    }

    const existingRows = record[slot.TABLE]?.value ?? [];

    // 既存の入力済み明細は保護する
    if (existingRows.some((row) =>
      hasData(row, slot.FIELDS)
    )) {
      skippedTargets.push(slot.TABLE);
      continue;
    }

    copyTargets.push(slot);
  }

  if (copyTargets.length === 0) {
    window.alert(
      'コピー可能な担当者別明細がありません。\n' +
      '既存の入力済み明細は上書きしません。'
    );
    return;
  }

  const message =
    `共通明細 ${validSourceRows.length} 行を、` +
    `${copyTargets.length} 件の担当者別明細へコピーします。\n\n` +
    (skippedTargets.length > 0
      ? `入力済みのためスキップ: ${skippedTargets.join('、')}\n\n`
      : '') +
    '実行してよろしいですか？';

  if (!window.confirm(message)) {
    return;
  }

  for (const slot of copyTargets) {
    record[slot.TABLE].value = validSourceRows.map(
      (row) => createCopyRow(row, slot.FIELDS)
    );
  }

  kintone.app.record.set({ record });

  window.alert(
    `${copyTargets.length} 件の担当者別明細にコピーしました。\n` +
    '保存ボタンを押すと変更が確定します。'
  );
}

export function initializeProposalCopy() {
  console.log('[Proposal Copy] initialized');

  kintone.events.on(
    ['app.record.create.show', 'app.record.edit.show'],
    (event) => {
      console.log('[Proposal Copy] show event:', event.type);

      const space = kintone.app.record.getSpaceElement(
        DEAL_FIELDS.PROPOSAL_COPY_SPACE
      );

      console.log('[Proposal Copy] space:', space);

      if (!space) {
        console.warn('[Proposal Copy] コピー用スペースが見つかりません');
        return event;
      }

      space.replaceChildren();

      const button = new Button({
        text: 'テーブルコピー',
        type: 'normal',
      });

      button.addEventListener('click', copyProposalDetails);
      space.appendChild(button);

      console.log('[Proposal Copy] button mounted');

      return event;
    }
  );
}
