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
 * - 金額・日付24項目、担当者名5項目、コピー履歴2項目も追加します。
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

  // 既存テーブルがある場合は、必須の基本3列が揃っていることを確認する。
  // 既存の一部だけがある場合も、不足するトップレベル項目だけ追加する。
  const missingProperties = {};
  for (const [code, definition] of Object.entries(properties)) {
    const existing = currentFields.properties[code];
    if (!existing) {
      missingProperties[code] = definition;
      continue;
    }
    if (existing.type !== definition.type) {
      throw new Error(`既存フィールドの型が異なります: ${code} (${existing.type} / ${definition.type})`);
    }
    if (definition.type === 'SUBTABLE') {
      for (const [childCode, child] of Object.entries(definition.fields)) {
        const actual = existing.fields?.[childCode];
        if (!actual || actual.type !== child.type) {
          throw new Error(`既存テーブルの基本列が不足または型違いです: ${code} / ${childCode}`);
        }
      }
    }
  }
  const targetCodes = Object.keys(properties);
  console.log('[Setup] 新規追加対象:', Object.keys(missingProperties));
  if (Object.keys(missingProperties).length > 0) {
    if (!window.confirm(`案件管理アプリ(${APP_ID})に基本フィールド ${Object.keys(missingProperties).length}件を追加しますか？`)) {
      console.log('[Setup] キャンセルしました。');
      return;
    }
    await kintone.api(kintone.api.url(FIELD_API, true), 'POST', {
      app: APP_ID, revision: currentFields.revision, properties: missingProperties
    });
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

  if (JSON.stringify(layout) !== JSON.stringify(currentLayout.layout)) {
    console.log('[Setup] 基本テーブルのレイアウトを更新します。');
    await kintone.api(kintone.api.url(LAYOUT_API, true), 'PUT', {
      app: APP_ID, layout, revision: currentLayout.revision,
    });
  } else {
    console.log('[Setup] 基本テーブルのレイアウトは変更不要です。');
  }

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

  // ======================================
  // 9. 金額・日付24項目: 検証済みの1列ずつPOSTする方式を維持
  // ======================================
  const financialDefinitions = [
    { label: '見込み金額', type: 'NUMBER' },
    { label: '受注金額', type: 'NUMBER' },
    { label: '受注予定日', type: 'DATE' },
    { label: '受注日', type: 'DATE' },
  ];
  const financialTables = [
    { code: '明細テーブル', suffix: '0' },
    ...Array.from({ length: 5 }, (_, i) => ({
      code: `担当者別明細${String(i + 1).padStart(2, '0')}`,
      suffix: String(i + 1).padStart(2, '0'),
    })),
  ];
  let financialState = await kintone.api(kintone.api.url(FIELD_API, true), 'GET', { app: APP_ID });
  const financialPending = [];
  for (const { code: tableCode, suffix } of financialTables) {
    const table = financialState.properties[tableCode];
    if (!table || table.type !== 'SUBTABLE') throw new Error(`サブテーブルがありません: ${tableCode}`);
    for (const def of financialDefinitions) {
      const code = `${def.label}_${suffix}`;
      const existing = table.fields?.[code];
      if (existing && existing.type !== def.type) throw new Error(`型不一致: ${tableCode} / ${code}`);
      if (!existing) financialPending.push({ tableCode, code, ...def });
    }
  }
  console.log(`[Setup] 金額・日付: 追加 ${financialPending.length}件 / 既存 ${24 - financialPending.length}件`);
  if (financialPending.length && !window.confirm(`金額・日付 ${financialPending.length}項目を追加しますか？`)) {
    console.log('[Setup] キャンセルしました。'); return;
  }
  for (const [index, item] of financialPending.entries()) {
    const table = financialState.properties[item.tableCode];
    const field = item.type === 'NUMBER'
      ? { type: 'NUMBER', code: item.code, label: item.label, required: false, defaultValue: '', digit: false, unique: false }
      : { type: 'DATE', code: item.code, label: item.label, required: false, defaultValue: '' };
    await kintone.api(kintone.api.url(FIELD_API, true), 'POST', {
      app: APP_ID, revision: financialState.revision,
      properties: {
        [item.tableCode]: {
          type: 'SUBTABLE', code: item.tableCode, label: table.label,
          fields: { [item.code]: field },
        },
      },
    });
    financialState = await kintone.api(kintone.api.url(FIELD_API, true), 'GET', { app: APP_ID });
    if (financialState.properties[item.tableCode]?.fields?.[item.code]?.type !== item.type) {
      throw new Error(`追加後の確認失敗: ${item.tableCode} / ${item.code}`);
    }
    console.log(`[Setup] 金額・日付 ${index + 1}/${financialPending.length}: ${item.tableCode} / ${item.code}`);
  }

  // ======================================
  // 10. コピー履歴2項目 + 担当者名5項目（テーブル外）
  // ======================================
  const extraDefinitions = {
    '最終明細コピー日時': {
      type: 'DATETIME', code: '最終明細コピー日時', label: '最終明細コピー日時',
      required: false, defaultNowValue: false,
    },
    '最終明細コピー実行者': {
      type: 'USER_SELECT', code: '最終明細コピー実行者', label: '最終明細コピー実行者',
      required: false,
    },
    ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => {
      const code = `担当者名${String(i + 1).padStart(2, '0')}`;
      return [code, { type: 'SINGLE_LINE_TEXT', code, label: code, required: false }];
    })),
  };
  const extraState = await kintone.api(kintone.api.url(FIELD_API, true), 'GET', { app: APP_ID });
  const extraMissing = {};
  for (const [code, def] of Object.entries(extraDefinitions)) {
    const existing = extraState.properties[code];
    if (existing && existing.type !== def.type) throw new Error(`型不一致: ${code}`);
    if (!existing) extraMissing[code] = def;
  }
  if (Object.keys(extraMissing).length) {
    if (!window.confirm(`コピー履歴・担当者名 ${Object.keys(extraMissing).length}項目を追加しますか？`)) {
      console.log('[Setup] キャンセルしました。'); return;
    }
    await kintone.api(kintone.api.url(FIELD_API, true), 'POST', {
      app: APP_ID, revision: extraState.revision, properties: extraMissing,
    });
  }

  // ======================================
  // 11. 最終確認（プレビュー設定のみ。自動デプロイしない）
  // ======================================
  const finalFields = await kintone.api(kintone.api.url(FIELD_API, true), 'GET', { app: APP_ID });
  for (const [code, def] of Object.entries(extraDefinitions)) {
    if (finalFields.properties[code]?.type !== def.type) throw new Error(`最終確認失敗: ${code}`);
  }
  for (const { code: tableCode, suffix } of financialTables) {
    for (const def of financialDefinitions) {
      const code = `${def.label}_${suffix}`;
      if (finalFields.properties[tableCode]?.fields?.[code]?.type !== def.type) {
        throw new Error(`最終確認失敗: ${tableCode} / ${code}`);
      }
    }
  }
  console.log('%c[Setup] 全フィールド追加・確認が完了しました。', 'color:green;font-weight:bold');
  console.log('[Setup] 担当者名01～05・コピー履歴2項目はフォーム編集で配置してください。');
  console.log('[Setup] selPerson / copyProposalDetails のスペースも手動で配置してください。');
  console.log('[Setup] 配置調整後に「アプリを更新」してください（自動反映しません）。');
})().catch(error => {
  console.error('[Setup] 中断しました。プレビュー設定を確認し、必要なら再実行してください。', error);
  console.error('[Setup] 詳細:', error?.response?.data ?? error);
});
