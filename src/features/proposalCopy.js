/*
* 明細テーブルコピー機能
 *
 * 明細テーブルを設定それた担当者ごとのテープにコピーする
 * 
*/

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
    [SOURCE.FIELDS.PRODUCT, targetFields.PRODUCT, 'DROP_DOWN'],
    [SOURCE.FIELDS.PROBABILITY, targetFields.PROBABILITY, 'DROP_DOWN'],
    [SOURCE.FIELDS.PHASE, targetFields.PHASE, 'DROP_DOWN'],

    [SOURCE.FIELDS.EXPECTED_AMOUNT, targetFields.EXPECTED_AMOUNT, 'NUMBER'],
    [SOURCE.FIELDS.ORDER_AMOUNT, targetFields.ORDER_AMOUNT, 'NUMBER'],

    [SOURCE.FIELDS.EXPECTED_ORDER_DATE, targetFields.EXPECTED_ORDER_DATE, 'DATE'],
    [SOURCE.FIELDS.ORDER_DATE, targetFields.ORDER_DATE, 'DATE'],
  ];

  const value = {};

  for (const [sourceCode, targetCode, type] of mapping) {
    if (!sourceCode || !targetCode) {
      throw new Error(
        `コピー対象フィールドの定義が不足しています: ${type}`
      );
    }

    value[targetCode] = {
      type,
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

function clearProposalDetails() {
  const current = kintone.app.record.get();

  if (!current) {
    return;
  }

  const record = current.record;

  const targetTables = TARGETS.filter(
    (slot) => record[slot.TABLE]
  );

  if (targetTables.length !== TARGETS.length) {
    window.alert(
      '一部の担当者別明細テーブルが見つかりません。\n' +
      '安全のため、クリア処理を中止しました。'
    );
    return;
  }

  const message =
    '担当者別明細01〜05をすべてクリアします。\n\n' +
    'コピー済みの値だけでなく、手入力した金額や日付も' +
    '削除対象になります。\n\n' +
    '共通明細と担当者情報は変更しません。\n\n' +
    '実行してよろしいですか？';

  if (!window.confirm(message)) {
    return;
  }

  for (const slot of targetTables) {
    // テーブル内の既存行を削除する
    record[slot.TABLE].value = [];
  }

  kintone.app.record.set({ record });

  window.alert(
    '担当者別明細01〜05をクリアしました。\n\n' +
    '再コピーする場合は「テーブルコピー」を押してください。\n' +
    '変更を確定するにはレコードを保存してください。'
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
      // 担当者別明細のコピーボタン
      const button = new Button({
        text: 'テーブルコピー',
        type: 'submit',
        disable: false,
      });
      button.addEventListener('click', copyProposalDetails);
      space.appendChild(button);
      // 担当者別明細の一括クリアボタン
      const clearButton = new Button({
        text: '担当者別明細クリア',
        type: 'normal',
        disable: false,
      });
      clearButton.addEventListener('click', clearProposalDetails);
      space.appendChild(clearButton);
      console.log('[Proposal Copy] button mounted');
      return event;
    }
  );
}
