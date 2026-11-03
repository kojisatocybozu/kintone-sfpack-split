
/**
 * 案件管理アプリ フィールド追加スクリプト
 *
 * 対象：App ID 941
 * 実行環境：kintoneの動作テスト環境
 *
 * 追加内容：
 * - 担当者別明細テーブル 5個
 * - 担当者別明細用フィールド 15個
 * - 担当者紐付け用管理フィールド 5個
 *
 * 注意：
 * - 本番環境への反映は行わない
 * - 既存フィールドは変更・削除しない
 */

(async () => {
  'use strict';

  const APP_ID = 941;

  const FIELD_API =
    '/k/v1/preview/app/form/fields.json';

  const LAYOUT_API =
    '/k/v1/preview/app/form/layout.json';

  // ======================================
  // 1. 共通設定
  // ======================================

  const PRODUCTS = [
    '商品A',
    '商品B',
    '商品C',
    'その他',
  ];

  const PROBABILITIES = [
    '100%',
    '80%',
    '60%',
    '40%',
    '20%',
  ];

  const PHASES = [
    '商談予定',
    '提案中',
    '内示',
    '受注',
    '失注',
    '保留/中止',
  ];

  const toOptions = (values) =>
    Object.fromEntries(
      values.map((value, index) => [
        value,
        {
          label: value,
          index: String(index),
        },
      ])
    );

  // ======================================
  // 2. 追加フィールド定義
  // ======================================

  const properties = {};

  const tableDefinitions = [];

  const managementFields = [];

  for (let i = 1; i <= 5; i++) {

    const suffix = String(i).padStart(2, '0');

    const tableCode = `担当者別明細${suffix}`;

    const productCode = `提案商品_${suffix}`;

    const probabilityCode = `確度_${suffix}`;

    const phaseCode = `商談フェーズ_${suffix}`;

    // テーブル内フィールド
    const tableFields = {

      [productCode]: {
        type: 'DROP_DOWN',
        code: productCode,
        label: '提案商品',
        noLabel: false,
        required: false,
        options: toOptions(PRODUCTS),
        defaultValue: '',
      },

      [probabilityCode]: {
        type: 'DROP_DOWN',
        code: probabilityCode,
        label: '確度',
        noLabel: false,
        required: false,
        options: toOptions(PROBABILITIES),
        defaultValue: '',
      },

      [phaseCode]: {
        type: 'DROP_DOWN',
        code: phaseCode,
        label: '商談フェーズ',
        noLabel: false,
        required: false,
        options: toOptions(PHASES),
        defaultValue: '',
      },

    };

    // テーブル定義
    properties[tableCode] = {
      type: 'SUBTABLE',
      code: tableCode,
      label: `担当者別明細${suffix}`,
      noLabel: false,
      fields: tableFields,
    };

    tableDefinitions.push({
      tableCode,
      productCode,
      probabilityCode,
      phaseCode,
    });

    // 担当者No管理フィールド
    const managerCode = `明細担当者No_${suffix}`;

    properties[managerCode] = {
      type: 'SINGLE_LINE_TEXT',
      code: managerCode,
      label: `明細担当者No${suffix}`,
      noLabel: false,
      required: false,
      minLength: '',
      maxLength: '',
      expression: '',
      hideExpression: false,
      unique: false,
      defaultValue: '',
    };

    managementFields.push(managerCode);

  }

  // ======================================
  // 3. 現在のフィールド取得
  // ======================================

  console.log('[Setup] 現在のフィールドを確認します。');

  const currentFields = await kintone.api(
    kintone.api.url(FIELD_API, true),
    'GET',
    { app: APP_ID }
  );

  const existingCodes = new Set(
    Object.keys(currentFields.properties)
  );

  const targetCodes = Object.keys(properties);

  const existingTargetCodes = targetCodes.filter(
    code => existingCodes.has(code)
  );

  // ======================================
  // 4. 重複チェック
  // ======================================

  if (
    existingTargetCodes.length > 0 &&
    existingTargetCodes.length < targetCodes.length
  ) {
    throw new Error(
      '追加対象の一部が既に存在します。' +
      '安全のため処理を中断しました。' +
      JSON.stringify(existingTargetCodes)
    );
  }

  if (existingTargetCodes.length === 0) {

    console.log(
      '[Setup] フィールドを追加します。',
      targetCodes
    );

    await kintone.api(
      kintone.api.url(FIELD_API, true),
      'POST',
      {
        app: APP_ID,
        properties,
      }
    );

    console.log('[Setup] フィールド追加完了');

  } else {

    console.log(
      '[Setup] 追加対象フィールドは既に存在します。追加をスキップします。'
    );

  }

  // ======================================
  // 5. 最新レイアウト取得
  // ======================================

  const currentLayout = await kintone.api(
    kintone.api.url(LAYOUT_API, true),
    'GET',
    { app: APP_ID }
  );

  const layout = currentLayout.layout.map(
    row => structuredClone(row)
  );

  // ======================================
  // 6. 既存テーブルの後ろに配置
  // ======================================

  const oldTableIndex = layout.findIndex(
    row =>
      row.type === 'SUBTABLE' &&
      row.code === '明細テーブル'
  );

  if (oldTableIndex === -1) {
    throw new Error(
      '既存の明細テーブルが見つかりません。'
    );
  }

  let insertIndex = oldTableIndex + 1;

  for (const table of tableDefinitions) {

    const alreadyPlaced = layout.some(
      row =>
        row.type === 'SUBTABLE' &&
        row.code === table.tableCode
    );

    if (alreadyPlaced) continue;

    layout.splice(insertIndex, 0, {
      type: 'SUBTABLE',
      code: table.tableCode,
      fields: [
        {
          type: 'DROP_DOWN',
          code: table.productCode,
          size: { width: '344' },
        },
        {
          type: 'DROP_DOWN',
          code: table.probabilityCode,
          size: { width: '177' },
        },
        {
          type: 'DROP_DOWN',
          code: table.phaseCode,
          size: { width: '167' },
        },
      ],
    });

    insertIndex++;

  }

  // ======================================
  // 7. 管理フィールド配置
  // ======================================

  const managementRow = {
    type: 'ROW',
    fields: managementFields.map(code => ({
      type: 'SINGLE_LINE_TEXT',
      code,
      size: { width: '120' },
    })),
  };

  const missingManagementFields =
    managementFields.filter(code =>
      !layout.some(row =>
        row.type === 'ROW' &&
        row.fields.some(field => field.code === code)
      )
    );

  if (missingManagementFields.length > 0) {

    const rowsToAdd = {
      ...managementRow,
      fields: managementRow.fields.filter(
        field => missingManagementFields.includes(field.code)
      ),
    };

    layout.splice(insertIndex, 0, rowsToAdd);

  }

  // ======================================
  // 8. レイアウト更新
  // ======================================

  console.log('[Setup] レイアウトを更新します。');

  await kintone.api(
    kintone.api.url(LAYOUT_API, true),
    'PUT',
    {
      app: APP_ID,
      layout,
      revision: currentLayout.revision,
    }
  );

  // ======================================
  // 9. 更新結果の検証
  // ======================================

  const verifyFields = await kintone.api(
    kintone.api.url(FIELD_API, true),
    'GET',
    { app: APP_ID }
  );

  const verifyLayout = await kintone.api(
    kintone.api.url(LAYOUT_API, true),
    'GET',
    { app: APP_ID }
  );

  const missingFields = targetCodes.filter(
    code => !verifyFields.properties[code]
  );

  if (missingFields.length > 0) {
    throw new Error(
      `フィールド検証失敗: ${missingFields.join(', ')}`
    );
  }

  console.log(
    '%c[Setup] 完了しました！',
    'color:green;font-weight:bold;font-size:16px'
  );

  console.table({
    appId: APP_ID,
    fieldCount: targetCodes.length,
    tableCount: tableDefinitions.length,
    managementFieldCount: managementFields.length,
    fieldRevision: verifyFields.revision,
    layoutRevision: verifyLayout.revision,
  });

  console.log(
    '[Setup] 追加フィールド一覧',
    targetCodes
  );

})();
