/**
 * 案件管理：担当者選択機能
 *
 * 処理内容
 * 1. 顧客選択状態を監視
 * 2. 担当者選択ボタンを表示
 * 3. 担当者情報を取得
 * 4. 選択ダイアログを表示
 * 5. 選択結果を担当者テーブルに反映
 */

import { DEAL_FIELDS, } from '../config/fields.js';
import {
  getContactsByCustomer,
  formatContacts,
} from '../api/contacts.js';

import { showContactDialog, } from '../ui/dialog.js';

import {
  syncProposalDetails,
  updateProposalDetailsVisibility,
} from './proposalDetails.js';

import { Button } from 'kintone-ui-component/lib/button';

// ========================================
// 1. モジュール内状態
// ========================================
let previousCustomerId = null;
let isLoading = false;

// ========================================
// 2. フィールド値取得
// ========================================
function getCustomerId(record) {
  return record[DEAL_FIELDS.CUSTOMER.ID]?.value ?? '';
}

// ========================================
// 3. 担当者テーブル初期化
// ========================================
function clearContactTable(record) {
  record[DEAL_FIELDS.CONTACT_TABLE.TABLE].value = [];
}

/**
 * 担当者テーブル更新
 *
 * 空行を除外し、選択された担当者を追加する。
 * 既存担当者との重複登録も防止する。
 */
function addContactsToTable(selectedContacts) {
  const current = kintone.app.record.get();
  if (!current?.record) {
    throw new Error(
      'レコード情報を取得できません。'
    );
  }
  const record = current.record;
  const tableCode = DEAL_FIELDS.CONTACT_TABLE.TABLE;
  const fields = DEAL_FIELDS.CONTACT_TABLE.FIELDS;
  const table = record[tableCode].value;

  // --------------------------------------
  // 1. 空行を除外
  // --------------------------------------
  const existingRows = table.filter(row => {
    const name = row.value[fields.NAME]?.value ?? '';
    const contactNo = row.value[fields.CONTACT_NO]?.value ?? '';
    // 担当者名・担当者No.の両方が空なら空行
    return name !== '' || contactNo !== '';
  });

  // --------------------------------------
  // 2. 既存担当者Noを取得
  // --------------------------------------
  const existingIds = new Set(
    existingRows.map(row =>
      row.value[fields.CONTACT_NO]?.value
    )
  );

  // --------------------------------------
  // 3. 重複を除外して追加
  // --------------------------------------
  const newRows = selectedContacts
    .filter(contact =>
      !existingIds.has(String(contact.contactNo))
    )
    .map(contact => ({
      value: {
        [fields.NAME]: {
          type: 'SINGLE_LINE_TEXT',
          value: contact.name,
        },
        [fields.CONTACT_NO]: {
          type: 'SINGLE_LINE_TEXT',
          value: String(contact.contactNo),
        },
      },
    }));

  // --------------------------------------
  // 4. テーブル更新
  // --------------------------------------
  record[tableCode].value = [
    ...existingRows,
    ...newRows,
  ];

  // 担当者と明細テーブルの割り当てを同期
  syncProposalDetails(record);

  // レコードを画面に反映
  kintone.app.record.set({ record });

  // 明細テーブルの表示を更新
  updateProposalDetailsVisibility(record);

  console.log(
    '[Contact Selector] 担当者テーブル更新',
    {
      removedEmptyRows: table.length - existingRows.length,
      added: newRows.length,
      total: record[tableCode].value.length,
    }
  );

}

// ========================================
// 5. 担当者選択ボタン生成
// ========================================

function renderContactButton(record) {
  const spaceCode =
    DEAL_FIELDS.UI.CONTACT_SELECTOR_SPACE;
  const space = kintone.app.record.getSpaceElement(
    spaceCode
  );
  if (!space) {
    console.error(
      `[Contact Selector] スペースフィールドが見つかりません: ${spaceCode}`
    );
    return;
  }

  // 既存ボタンをクリア
  space.replaceChildren();
  const customerId = getCustomerId(record);
  // 顧客未選択ならボタンを表示しない
  if (!customerId) {
    return;
  }

  const button = new Button({
    text: '担当者を選択',
    type: 'submit',
    disabled: false,
  });

  button.addEventListener('click', async () => {
    if (isLoading) return;
    isLoading = true;
    button.disabled = true;
    button.text = '担当者を取得中...';
    try {
      // 担当者取得
      const records = await getContactsByCustomer(
        customerId
      );
      const contacts = formatContacts(records);
      if (contacts.length === 0) {
        window.alert(
          'この顧客に登録されている担当者はいません。'
        );
        return;
      }

      // ダイアログ表示
      const selectedContacts = await showContactDialog(
        contacts
      );

      // キャンセル
      if (selectedContacts === null) {
        return;
      }

      // 選択結果をテーブルに反映
      if (selectedContacts.length > 0) {
        addContactsToTable(selectedContacts);

      }

    } catch (error) {
      console.error(
        '[Contact Selector] エラー',
        error
      );
      window.alert(
        error.message || '担当者の処理に失敗しました。'
      );
    } finally {
      isLoading = false;
      button.disabled = false;
      button.text = '担当者を選択';
    }
  });
  space.appendChild(button);
}

// ========================================
// 6. 画面表示イベント
// ========================================
function handleShow(event) {
  previousCustomerId = getCustomerId(event.record);
  renderContactButton(event.record);
  return event;
}

// ========================================
// 7. 顧客変更イベント
// ========================================
function handleCustomerChange(event) {
  const currentCustomerId = getCustomerId(event.record);

  console.log('[Contact Selector] Customer changed', {
    customerId: currentCustomerId,
    companyName: event.record[DEAL_FIELDS.CUSTOMER.NAME]?.value,
  });

  // 顧客が変更された場合のみ担当者をクリア
  if (
    previousCustomerId !== null &&
    String(previousCustomerId) !== String(currentCustomerId)
  ) {
    clearContactTable(event.record);
    console.log(
      '[Contact Selector] 顧客変更に伴い担当者をクリア'
    );
  }
  previousCustomerId = currentCustomerId;
  renderContactButton(event.record);
  return event;
}

// ========================================
// 8. イベント登録
// ========================================

export function initializeContactSelector() {

  const showEvents = [
    'app.record.create.show',
    'app.record.edit.show',
  ];

  const changeEvents = [
    // 会社名（ルックアップ）の変更
    `app.record.create.change.${DEAL_FIELDS.CUSTOMER.NAME}`,
    `app.record.edit.change.${DEAL_FIELDS.CUSTOMER.NAME}`,

    // ルックアップで取得される顧客Noの変更
    `app.record.create.change.${DEAL_FIELDS.CUSTOMER.ID}`,
    `app.record.edit.change.${DEAL_FIELDS.CUSTOMER.ID}`,
  ];

  kintone.events.on(showEvents, handleShow);
  kintone.events.on(changeEvents, handleCustomerChange);
}
