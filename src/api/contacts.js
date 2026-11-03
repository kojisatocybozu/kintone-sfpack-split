
/**
 * 担当者管理アプリ API
 *
 * 担当者管理アプリ（App ID: 942）から
 * 指定された顧客に紐づく担当者情報を取得する。
 */

import {
  CONTACT_QUERY,
  CONTACT_FIELDS,
} from '../config/fields.js';


// ========================================
// 1. 顧客に紐づく担当者を取得
// ========================================

/**
 * 指定された顧客Noに紐づく担当者を取得する。
 *
 * @param {string|number} customerId 顧客No
 * @returns {Promise<Array>} 担当者レコードの配列
 */

export async function getContactsByCustomer(customerId) {

  // --------------------------------------
  // 入力チェック
  // --------------------------------------

  if (
    customerId === null ||
    customerId === undefined ||
    String(customerId).trim() === ''
  ) {
    throw new Error(
      '顧客Noが指定されていません。'
    );
  }

  // 顧客Noは数値フィールドなので数値として検証
  const numericCustomerId = Number(customerId);

  if (
    !Number.isSafeInteger(numericCustomerId) ||
    numericCustomerId < 0
  ) {
    throw new Error(
      `顧客Noが不正です: ${customerId}`
    );
  }

  // --------------------------------------
  // kintone APIパラメータ
  // --------------------------------------

  const query =
    `${CONTACT_FIELDS.CUSTOMER_ID} = ${numericCustomerId}` +
    ` order by ${CONTACT_FIELDS.ID} asc` +
    ` limit ${CONTACT_QUERY.LIMIT}`;

  const params = {
    app: CONTACT_QUERY.APP,
    query,
    fields: CONTACT_QUERY.FIELDS,
  };

  // --------------------------------------
  // REST API実行
  // --------------------------------------

  try {

    const response = await kintone.api(
      kintone.api.url(
        '/k/v1/records.json',
        true
      ),
      'GET',
      params
    );

    console.log(
      '[Contacts API] 担当者取得成功',
      {
        customerId: numericCustomerId,
        count: response.records.length,
      }
    );

    return response.records;

  } catch (error) {

    console.error(
      '[Contacts API] 担当者取得失敗',
      {
        customerId: numericCustomerId,
        error,
      }
    );

    throw new Error(
      `担当者情報の取得に失敗しました。顧客No: ${numericCustomerId}`,
      { cause: error }
    );
  }
}


// ========================================
// 2. 担当者レコードを整形
// ========================================

/**
 * kintoneのレコード形式を画面表示用に変換する。
 *
 * @param {Array} records kintoneレコード配列
 * @returns {Array} 担当者情報の配列
 */

export function formatContacts(records) {

  if (!Array.isArray(records)) {
    throw new Error(
      '担当者レコードの形式が不正です。'
    );
  }

  return records.map((record) => ({
    id: record.$id?.value ?? '',
    contactNo:
      record[CONTACT_FIELDS.ID]?.value ?? '',
    customerId:
      record[CONTACT_FIELDS.CUSTOMER_ID]?.value ?? '',
    name:
      record[CONTACT_FIELDS.NAME]?.value ?? '',
    department:
      record[CONTACT_FIELDS.DEPARTMENT]?.value ?? '',
    position:
      record[CONTACT_FIELDS.POSITION]?.value ?? '',
    email:
      record[CONTACT_FIELDS.EMAIL]?.value ?? '',
  }));
}
