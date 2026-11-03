/**
 * 担当者別明細管理
 *
 * 担当者テーブルと5つの明細テーブルを連携する。
 *
 * 仕様：
 * - 担当者の上限は5名
 * - 担当者Noをキーに明細テーブルを割り当てる
 * - 担当者解除時も明細データは保持する
 * - 同じ担当者を再追加すると以前の明細を再表示する
 */

import {
  DEAL_FIELDS,
} from '../config/fields.js';

// ========================================
// 1. 現在の担当者を取得
// ========================================

function getActiveContacts(record) {
  const tableCode = DEAL_FIELDS.CONTACT_TABLE.TABLE;
  const nameCode = DEAL_FIELDS.CONTACT_TABLE.FIELDS.NAME;
  const noCode = DEAL_FIELDS.CONTACT_TABLE.FIELDS.CONTACT_NO;
  const rows = record[tableCode]?.value ?? [];
  const contacts = rows
    .map(row => ({
      contactNo: String(
        row.value[noCode]?.value ?? ''
      ).trim(),
      name:
        row.value[nameCode]?.value ?? '',
    }))
    .filter(contact =>
      contact.contactNo !== ''
    );

  // 担当者Noによる重複排除
  const uniqueContacts = [
    ...new Map(
      contacts.map(contact => [
        contact.contactNo,
        contact,
      ])
    ).values(),
  ];
  if (uniqueContacts.length > 5) {
    throw new Error(
      '担当者は最大5名までです。'
    );
  }
  return uniqueContacts;
}

// ========================================
// 2. 明細テーブルにデータがあるか確認
// ========================================
function hasProposalData(record, tableCode) {

  const rows = record[tableCode]?.value ?? [];

  return rows.some(row =>
    Object.values(row.value).some(field =>
      field.value !== '' &&
      field.value !== null &&
      field.value !== undefined
    )
  );
}

// ========================================
// 3. 担当者Noと明細テーブルを同期
// ========================================

/**
 * 現在の担当者に明細テーブルを割り当てる。
 *
 * 既存の割り当ては変更しない。
 * 新規担当者には未使用の枠を割り当てる。
 *
 * @param {Object} record kintoneレコード
 * @returns {Object} 更新されたレコード
 */

export function syncProposalDetails(record) {
  const slots = DEAL_FIELDS.PROPOSAL_TABLES;
  const activeContacts = getActiveContacts(record);

  // --------------------------------------
  // 既存の割り当てを取得
  // --------------------------------------
  const assignments = new Map();
  slots.forEach((slot, index) => {
    const ownerId = String(
      record[slot.OWNER]?.value ?? ''
    ).trim();
    if (ownerId !== '') {
      if (assignments.has(ownerId)) {
        throw new Error(
          `担当者Noが複数の明細枠に割り当てられています: ${ownerId}`
        );
      }
      assignments.set(ownerId, index);
    }
  });

  // --------------------------------------
  // 新規担当者の割り当て
  // --------------------------------------
  activeContacts.forEach(contact => {
    // 既に割り当て済みなら何もしない
    if (assignments.has(contact.contactNo)) {
      return;
    }
    // 未使用枠を検索
    // 管理フィールドが空でも明細データが残っている枠は再利用しない
    const availableIndex = slots.findIndex(
      (slot, index) => {
        const ownerId = String(
          record[slot.OWNER]?.value ?? ''
        ).trim();
        return (
          ownerId === '' &&
          !hasProposalData(record, slot.TABLE)
        );
      }
    );

    if (availableIndex === -1) {
      throw new Error(
        '明細テーブルの割り当て枠がありません。' +
        '過去に割り当てた担当者の明細が保持されている可能性があります。'
      );
    }
    const slot = slots[availableIndex];

    // 担当者Noを保存
    record[slot.OWNER].value = contact.contactNo;
    assignments.set(
      contact.contactNo,
      availableIndex
    );
    console.log(
      '[Proposal Details] 枠を割り当てました。',
      {
        contactNo: contact.contactNo,
        contactName: contact.name,
        table: slot.TABLE,
      }
    );
  });
  return record;
}

// ========================================
// 4. 明細テーブルの表示制御
// ========================================

/**
 * 現在選択されている担当者の明細テーブルだけ表示する。
 *
 * 非表示にしてもテーブルのデータは削除されない。
 *
 * @param {Object} record kintoneレコード
 */

export function updateProposalDetailsVisibility(record) {
  const activeContacts = getActiveContacts(record);
  const activeIds = new Set(
    activeContacts.map(contact =>
      contact.contactNo
    )
  );
  DEAL_FIELDS.PROPOSAL_TABLES.forEach(slot => {
    const ownerId = String(
      record[slot.OWNER]?.value ?? ''
    ).trim();
    const isVisible =
      ownerId !== '' &&
      activeIds.has(ownerId);
    // テーブル表示・非表示
    kintone.app.record.setFieldShown(
      slot.TABLE,
      isVisible
    );
    // 管理フィールドは常に非表示
    kintone.app.record.setFieldShown(
      slot.OWNER,
      false
    );
  });
}


// ========================================
// 5. 初期表示
// ========================================
function handleShow(event) {
  try {
    syncProposalDetails(event.record);
    updateProposalDetailsVisibility(event.record);
  } catch (error) {
    console.error(
      '[Proposal Details] 初期化エラー',
      error
    );
    event.error = error.message;
  }
  return event;
}

// ========================================
// 6. 詳細画面表示
// ========================================

function handleDetailShow(event) {

  try {
    // 表示制御のみ実行する
    // レコードデータの変更・同期は行わない
    updateProposalDetailsVisibility(event.record);
  } catch (error) {
    console.error(
      '[Proposal Details] 詳細画面の表示制御エラー',
      error
    );
  }
  return event;
}

// ========================================
// 7. 担当者テーブル変更
// ========================================
function handleContactTableChange(event) {
  try {
    syncProposalDetails(event.record);
    updateProposalDetailsVisibility(event.record);
  } catch (error) {
    console.error(
      '[Proposal Details] 同期エラー',
      error
    );
    event.error = error.message;
  }
  return event;
}

// ========================================
// 8. 保存前の検証
// ========================================
function handleSubmit(event) {
  try {
    syncProposalDetails(event.record);
  } catch (error) {
    console.error(
      '[Proposal Details] 保存前検証エラー',
      error
    );
    event.error = error.message;
  }
  return event;
}

// ========================================
// 9. イベント登録
// ========================================

export function initializeProposalDetails() {
  // 新規登録・編集画面
  const showEvents = [
    'app.record.create.show',
    'app.record.edit.show',
  ];
  // 詳細画面
  const detailEvents = [
    'app.record.detail.show',
  ];
  // 担当者テーブル変更
  const changeEvents = [
    'app.record.create.change.担当者テーブル',
    'app.record.edit.change.担当者テーブル',
  ];
  // 保存前
  const submitEvents = [
    'app.record.create.submit',
    'app.record.edit.submit',
  ];
  kintone.events.on(
    showEvents,
    handleShow
  );
  kintone.events.on(
    detailEvents,
    handleDetailShow
  );
  kintone.events.on(
    changeEvents,
    handleContactTableChange
  );
  kintone.events.on(
    submitEvents,
    handleSubmit
  );
  console.log(
    '[Proposal Details] initialized'
  );
}