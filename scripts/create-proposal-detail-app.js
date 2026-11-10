
(async () => {
  'use strict';

  const SOURCE_APP_ID = kintone.app.getId();
  const APP_NAME = '明細管理アプリ';

  if (!SOURCE_APP_ID) {
    throw new Error('案件管理アプリの画面で実行してください。');
  }

  const api = (path, method, body) =>
    kintone.api(kintone.api.url(path, true), method, body);

  const source = await api(
    '/k/v1/app/form/fields.json',
    'GET',
    { app: SOURCE_APP_ID }
  );

  // 担当者別明細の中から、対象フィールドを探す
  const tables = Object.values(source.properties)
    .filter(field =>
      field.type === 'SUBTABLE' &&
      /^担当者別明細0[1-5]$/.test(field.label)
    );

  if (tables.length !== 5) {
    throw new Error(
      `担当者別明細テーブルが${tables.length}件見つかりました。5件必要です。`
    );
  }

  const findField = (label) => {
    const matches = tables.flatMap(table =>
      Object.values(table.fields || {})
        .filter(field => field.label === label)
    );

    if (matches.length !== 5) {
      throw new Error(`${label}が5テーブルすべてに見つかりません。`);
    }

    if (new Set(matches.map(field =>
      JSON.stringify({
        type: field.type,
        options: field.options || null
      })
    )).size !== 1) {
      throw new Error(`${label}の型・選択肢がテーブル間で異なります。`);
    }

    return matches[0];
  };

  const field = (code, label, type, extra = {}) => ({
    type, code, label, ...extra
  });

  const copiedField = (code, label) => {
    const src = findField(label);
    const allowed = [
      'SINGLE_LINE_TEXT',
      'NUMBER',
      'DROP_DOWN',
      'RADIO_BUTTON',
      'CHECK_BOX',
      'MULTI_SELECT'
    ];

    if (!allowed.includes(src.type)) {
      throw new Error(
        `${label}の型 ${src.type} は自動複製の対象外です。`
      );
    }

    const extra = {};
    if (src.options) extra.options = src.options;
    return field(code, label, src.type, extra);
  };

  const definitions = [
    field('案件レコードID', '案件レコードID', 'NUMBER'),
    field('担当者No', '担当者No.', 'SINGLE_LINE_TEXT'),
    field('担当者名', '担当者名', 'SINGLE_LINE_TEXT'),
    copiedField('提案商品', '提案商品'),
    copiedField('確度', '確度'),
    copiedField('商談フェーズ', '商談フェーズ'),
    field('見込み金額', '見込み金額', 'NUMBER'),
    field('受注金額', '受注金額', 'NUMBER'),
    field('受注予定日', '受注予定日', 'DATE'),
    field('受注日', '受注日', 'DATE'),
    field('メモ', 'メモ', 'MULTI_LINE_TEXT'),
    field('コピー元明細行ID', 'コピー元明細行ID',
      'SINGLE_LINE_TEXT')
  ];

  console.table(definitions.map(({code, label, type}) => ({
    code, label, type
  })));

  if (!confirm(
    `「${APP_NAME}」を新規作成します。\n` +
    'フィールド定義を確認しましたか？'
  )) return;

  let newAppId;

  try {
    const created = await api(
      '/k/v1/preview/app.json',
      'POST',
      { name: APP_NAME }
    );

    newAppId = created.app;
    console.log('新規アプリID:', newAppId);

    await api(
      '/k/v1/preview/app/form/fields.json',
      'POST',
      {
        app: newAppId,
        properties: Object.fromEntries(
          definitions.map(item => [item.code, item])
        )
      }
    );

    await api(
      '/k/v1/preview/app/deploy.json',
      'POST',
      { apps: [{ app: newAppId }] }
    );

    console.log(
      '反映を開始しました。完了状況を確認してください。',
      `${location.origin}/k/${newAppId}/`
    );
    alert(`明細管理アプリ ID: ${newAppId}\n反映を開始しました。`);
  } catch (error) {
    console.error('処理失敗:', error);
    if (newAppId) {
      console.error('作成途中のアプリID:', newAppId);
    }
    throw error;
  }
})();
