
/**
 * 担当者選択ダイアログ
 *
 * Kintone UI Component v1 を使用
 *
 * 使用コンポーネント
 * - Dialog
 * - Checkbox
 * - Button
 */

import { Dialog } from 'kintone-ui-component/lib/dialog';
import { Checkbox } from 'kintone-ui-component/lib/checkbox';
import { Button } from 'kintone-ui-component/lib/button';

const MAX_CONTACTS = 5;

// ========================================
// 1. 担当者選択ダイアログ
// ========================================

/**
 * 担当者選択ダイアログを表示する。
 *
 * @param {Array} contacts 担当者情報
 * @returns {Promise<Array|null>}
 */

export function showContactDialog(contacts) {

  if (!Array.isArray(contacts)) {
    throw new Error(
      '担当者情報が配列ではありません。'
    );
  }

  return new Promise((resolve) => {

    let settled = false;

    // ------------------------------------
    // ダイアログ内コンテンツ
    // ------------------------------------

    const content = document.createElement('div');

    content.className = 'sf-kuc-dialog-content';

    const description = document.createElement('p');

    description.textContent =
      '案件に追加する担当者を選択してください。';

    const count = document.createElement('p');

    count.className = 'sf-kuc-dialog-count';
    count.textContent = '0名選択中';

    content.append(description, count);

    // ------------------------------------
    // 担当者選択用チェックボックス
    // ------------------------------------

    const contactMap = new Map();

    const items = contacts.map((contact, index) => {

      // 担当者レコードIDを選択値として使用
      const id = String(
        contact.id || contact.contactNo || index
      );

      // 同じ選択値の重複を防止
      if (contactMap.has(id)) {
        throw new Error(
          `担当者IDが重複しています: ${id}`
        );
      }

      contactMap.set(id, contact);

      const department =
        contact.department || '部署未登録';

      const position =
        contact.position || '役職未登録';

      return {
        label: `${contact.name || '氏名未登録'} / ${department} / ${position}`,
        value: id,
      };

    });

    const checkbox = new Checkbox({
      label: '担当者一覧',
      items,
      value: [],
      itemLayout: 'vertical',
      borderVisible: true,
      disabled: contacts.length === 0,
    });

    content.appendChild(checkbox);

    // ------------------------------------
    // 選択件数の更新
    // ------------------------------------

    checkbox.addEventListener('change', (event) => {
        const selectedValues = event.detail.value;
        if (selectedValues.length > MAX_CONTACTS) {
            checkbox.value = selectedValues.slice(
            0,
            MAX_CONTACTS
        );
        }
        const selectedCount = checkbox.value.length;
        count.textContent = `${selectedCount}名選択中 / 最大${MAX_CONTACTS}名`;
    });

    // ------------------------------------
    // 担当者が存在しない場合
    // ------------------------------------

    if (contacts.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent =
        'この顧客に登録されている担当者はいません。';
      content.appendChild(emptyMessage);
    }

    // ------------------------------------
    // フッター
    // ------------------------------------

    const footer = document.createElement('div');

    footer.className = 'sf-kuc-dialog-footer';

    const cancelButton = new Button({
      text: 'キャンセル',
      type: 'normal',
    });

    const confirmButton = new Button({
      text: '選択した担当者を追加',
      type: 'submit',
      disabled: contacts.length === 0,
    });

    footer.append(cancelButton, confirmButton);

    // ------------------------------------
    // ダイアログ生成
    // ------------------------------------

    const dialog = new Dialog({
      title: '担当者選択',
      content,
      footer,
      icon: '',
      footerVisible: true,
    });

    // ------------------------------------
    // 終了処理
    // ------------------------------------

    const finish = (result, closeDialog = true) => {

      if (settled) return;

      settled = true;

      if (closeDialog) {
        dialog.close();
      }

      resolve(result);

    };

    // ------------------------------------
    // キャンセル
    // ------------------------------------

    cancelButton.addEventListener('click', () => {

      finish(null);

    });

    // ------------------------------------
    // 選択確定
    // ------------------------------------

    confirmButton.addEventListener('click', () => {

      const selectedValues = checkbox.value || [];

      const selectedContacts = selectedValues
        .map(id => contactMap.get(id))
        .filter(Boolean);

      finish(selectedContacts);

    });

    // ------------------------------------
    // ダイアログを閉じた場合
    // ------------------------------------

    dialog.addEventListener('close', () => {

      finish(null, false);

    });

    // ------------------------------------
    // 表示
    // ------------------------------------

    dialog.open();

  });

}
