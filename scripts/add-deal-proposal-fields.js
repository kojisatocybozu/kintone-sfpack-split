/**
 * 案件管理アプリ フィールド追加スクリプト
 *
 * 対象：現在表示中の案件管理アプリ
 * 実行環境：kintoneの動作テスト環境
 *
 * 追加内容：
 * - 担当者テーブル（担当者、担当者No_）
 * - 共通の明細テーブル（提案商品_0、確度_0、商談フェーズ_0）
 * - 担当者別明細テーブル 5個
 * - 担当者別明細用フィールド 15個
 * - 担当者紐付け用管理フィールド 5個
 *
 * 注意：
 * - プレビュー環境の設定を変更します。
 * - 本番環境への反映は自動実行しません。
 * - 既存フィールドは変更・削除しません。
 * - selPerson / copyProposalDetails のスペースは別途フォームに配置してください。
 */

(async () => {
  'use strict';

  const APP_ID = kintone.app.getId();

  if (!APP_ID) {
    throw new Error('現在のアプリIDを取得できません。案件管理アプリの画面で実行してください。');
  }

  const FIELD_API = '/k/v1/preview/app/form/fields.json';
  const LAYOUT_API = '/k/v1/preview/app/form/layout.json';

  // ======================================
  // 1. 共通設定
  // ======================================

  const PRODUCTS = ['商品A', '商品B', '商品C', 'その他'];
  const PROBABILITIES = ['100%', '80%', '60%', '40%', '20%'];
  const PHASES = ['商談予定', '提案中', '内示', '受注', '失注', '保留/中止'];

  const toOptions = (values) =>
    Object.fromEntries(values.map((value, index) => [
      value,
      { label: value, index: String(index) },
    ]));

  const textField = (code, label) => ({
    type: 'SINGLE_LINE_TEXT',
    code,
    label,
    noLabel: false,
    required: false,
    minLength: '',
    maxLength: '',
    expression: '',
    hideExpression: false,
    unique: false,
    defaultValue: '',
  });

  const dropdownField = (code, label, options) => ({
    type: 'DROP_DOWN',
    code,
    label,
    noLabel: false,
    required: false,
    options: toOptions(options),
    defaultValue: '',
  });

  // ======================================
  // 2. 追加フィールド定義
  // ======================================

  const properties = {};
  const tableDefinitions = [];
  const managementFields = [];

  // 担当者テーブル
  properties['担当者テーブル'] = {
    type: 'SUBTABLE',
    code: '担当者テーブル',
    label: '担当者テーブル',
    noLabel: false,
    fields: {
      '担当者': textField('担当者', '担当者'),
      '担当者No_': textField('担当者No_', '担当者No.'),
    },
  };

  // 共通の明細テーブル（コピー元）
  properties['明細テーブル'] = {
    type: 'SUBTABLE',
    code: '明細テーブル',
    label: '明細テーブル',
    noLabel: false,
    fields: {
      '提案商品_0': dropdownField('提案商品_0', '提案商品', PRODUCTS),
      '確度_0': dropdownField('確度_0', '確度', PROBABILITIES),
      '商談フェーズ_0': dropdownField('商談フェーズ_0', '商談フェーズ', PHASES),
    },
  };

  // 担当者別明細テーブル5個と担当者No管理フィールド
  for (let i = 1; i <= 5; i++) {
    const suffix = String(i).padStart(2, '0');
    const tableCode = `担当者別明細${suffix}`;
    const productCode = `提案商品_${suffix}`;
    const probabilityCode = `確度_${suffix}`;
    const phaseCode = `商談フェーズ_${suffix}`;

    properties[tableCode] = {
      type: 'SUBTABLE',
      code: tableCode,
      label: tableCode,
      noLabel: false,
      fields: {
        [productCode]: dropdownField(productCode, '提案商品', PRODUCTS),
        [probabilityCode]: dropdownField(probabilityCode, '確度', PROBABILITIES),
        [phaseCode]: dropdownField(phaseCode, '商談フェーズ', PHASES),
      },
    };

    tableDefinitions.push({ tableCode, productCode, probabilityCode, phaseCode });

    const managerCode = `明細担当者No_${suffix}`;
    properties[managerCode] = textField(managerCode, `明細担当者No${suffix}`);
    managementFields.push(managerCode);
  }

  // ======================================
  // 3. 現在のフィールド取得・重複チェック
  // ======================================

  console.log('[Setup] 現在のフィールドを確認します。', { appId: APP_ID });

  const currentFields = await kintone.api(
    kintone.api.url(FIELD_API, true),
    'GET',
    { app: APP_ID }
  );

  const existingCodes = new Set(Object.keys(currentFields.properties));
  const targetCodes = Object.keys(properties);
  const existingTargetCodes = targetCodes.filter(code => existingCodes.has(code));

  console.log('[Setup] 既存の追加対象フィールド:', existingTargetCodes);
  console.log('[Setup] 新規追加対象フィールド:', targetCodes.filter(code => !existingCodes.has(code)));

  // 一部だけ存在する場合は、意図しない定義の混在を避けるため中断
  if (existingTargetCodes.length > 0 && existingTargetCodes.length < targetCodes.length) {
    throw new Error(
      '追加対象フィールドの一部が既に存在します。安全のため処理を中断しました。' +
      '既存フィールドを確認し、必要に応じてフォーム設定を整理してください。' +
      JSON.stringify(existingTargetCodes)
    );
  }

  if (existingTargetCodes.length === 0) {
    const confirmed = window.confirm(
      `案件管理アプリ (${APP_ID}) に${targetCodes.length}個のフィールド（テーブルを含む）を追加します。\n` +
      '既存フィールドは変更・削除しません。\n\n実行しますか？'
    );

    if (!confirmed) {
      console.log('[Setup] キャンセルしました。');
      return;
    }

    await kintone.api(
      kintone.api.url(FIELD_API, true),
      'POST',
      { app: APP_ID, revision: currentFields.revision, properties }
    );

    console.log('[Setup] フィールド追加完了');
  } else {
    console.log('[Setup] 追加対象フィールドはすべて存在します。フィールド追加をスキップします。');
  }

  // ======================================
  // 4. レイアウト取得
  // ======================================

  const currentLayout = await kintone.api(
    kintone.api.url(LAYOUT_API, true),
    'GET',
    { app: APP_ID }
  );
  const layout = currentLayout.layout.map(row => structuredClone(row));

  const hasTableLayout = (code) => layout.some(row => row.type === 'SUBTABLE' && row.code === code);

  const contactTableLayout = {
    type: 'SUBTABLE',
    code: '担当者テーブル',
    fields: [
      { type: 'SINGLE_LINE_TEXT', code: '担当者', size: { width: '180' } },
      { type: 'SINGLE_LINE_TEXT', code: '担当者No_', size: { width: '150' } },
    ],
  };

  const sourceTableLayout = {
    type: 'SUBTABLE',
    code: '明細テーブル',
    fields: [
      { type: 'DROP_DOWN', code: '提案商品_0', size: { width: '344' } },
      { type: 'DROP_DOWN', code: '確度_0', size: { width: '177' } },
      { type: 'DROP_DOWN', code: '商談フェーズ_0', size: { width: '167' } },
    ],
  };

  // 担当者テーブルを未配置の場合は、レイアウト末尾に追加
  if (!hasTableLayout('担当者テーブル')) {
    layout.push(contactTableLayout);
  }

  // 共通明細テーブルを未配置の場合は、担当者テーブルの後ろに追加
  if (!hasTableLayout('明細テーブル')) {
    const contactIndex = layout.findIndex(row => row.type === 'SUBTABLE' && row.code === '担当者テーブル');
    layout.splice(contactIndex >= 0 ? contactIndex + 1 : layout.length, 0, sourceTableLayout);
  }

  // ======================================
  // 5. 担当者別明細テーブルを共通明細の後ろに配置
  // ======================================

  const sourceTableIndex = layout.findIndex(row => row.type === 'SUBTABLE' && row.code === '明細テーブル');
  if (sourceTableIndex === -1) {
    throw new Error('共通の明細テーブルがレイアウトに見つかりません。');
  }

  let insertIndex = sourceTableIndex + 1;

  for (const table of tableDefinitions) {
    if (hasTableLayout(table.tableCode)) continue;

    layout.splice(insertIndex, 0, {
      type: 'SUBTABLE',
      code: table.tableCode,
      fields: [
        { type: 'DROP_DOWN', code: table.productCode, size: { width: '344' } },
        { type: 'DROP_DOWN', code: table.probabilityCode, size: { width: '177' } },
        { type: 'DROP_DOWN', code: table.phaseCode, size: { width: '167' } },
      ],
    });
    insertIndex++;
  }

  // ======================================
  // 6. 担当者No管理フィールドを配置
  // ======================================

  const missingManagementFields = managementFields.filter(code =>
    !layout.some(row => row.type === 'ROW' && row.fields.some(field => field.code === code))
  );

  if (missingManagementFields.length > 0) {
    const managementRow = {
      type: 'ROW',
      fields: missingManagementFields.map(code => ({
        type: 'SINGLE_LINE_TEXT',
        code,
        size: { width: '120' },
      })),
    };
    layout.splice(insertIndex, 0, managementRow);
  }

  // ======================================
  // 7. レイアウト更新
  // ======================================

  console.log('[Setup] レイアウトを更新します。');

  await kintone.api(
    kintone.api.url(LAYOUT_API, true),
    'PUT',
    { app: APP_ID, layout, revision: currentLayout.revision }
  );

  // ======================================
  // 8. 更新結果の検証
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

  const missingFields = targetCodes.filter(code => !verifyFields.properties[code]);
  const requiredTables = ['担当者テーブル', '明細テーブル', ...tableDefinitions.map(table => table.tableCode)];
  const missingLayouts = requiredTables.filter(code =>
    !verifyLayout.layout.some(row => row.type === 'SUBTABLE' && row.code === code)
  );

  if (missingFields.length > 0 || missingLayouts.length > 0) {
    throw new Error(
      `設定検証に失敗しました。未登録フィールド: ${missingFields.join(', ')} / 未配置テーブル: ${missingLayouts.join(', ')}`
    );
  }

  console.log('%c[Setup] 完了しました！', 'color:green;font-weight:bold;font-size:16px');
  console.table({
    appId: APP_ID,
    topLevelFieldCount: targetCodes.length,
    tableCount: requiredTables.length,
    managementFieldCount: managementFields.length,
    fieldRevision: verifyFields.revision,
    layoutRevision: verifyLayout.revision,
  });
  console.log('[Setup] 追加フィールド一覧:', targetCodes);
  console.log('[Setup] 注意：selPerson / copyProposalDetails のスペースはフォーム編集画面で別途配置してください。');
  console.log('[Setup] フォーム配置を確認後、アプリを更新してください。');

})().catch(error => {
  console.error('[Setup] フィールド追加失敗:', error);
  console.error('[Setup] 詳細:', error?.response?.data ?? error);
});
