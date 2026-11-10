
(async () => {
  'use strict';

  const appId = kintone.app.getId();

  if (!appId) {
    throw new Error('案件管理アプリの画面で実行してください。');
  }

  const api = (path, method, body) =>
    kintone.api(kintone.api.url(path, true), method, body);

  const definitions = {
    最終明細コピー日時: {
      type: 'DATETIME',
      code: '最終明細コピー日時',
      label: '最終明細コピー日時',
      required: false,
      defaultNowValue: false
    },
    最終明細コピー実行者: {
      type: 'USER_SELECT',
      code: '最終明細コピー実行者',
      label: '最終明細コピー実行者',
      required: false
    }
  };

  const current = await api(
    '/k/v1/preview/app/form/fields.json',
    'GET',
    { app: appId }
  );

  const missing = Object.fromEntries(
    Object.entries(definitions)
      .filter(([code]) => !current.properties[code])
  );

  if (Object.keys(missing).length === 0) {
    console.log('2フィールドはすでに存在します。');
    return;
  }

  console.table(
    Object.values(missing).map(({code, type}) => ({
      code, type
    }))
  );

  if (!confirm(
    `案件管理アプリ(ID:${appId})に` +
    `${Object.keys(missing).length}フィールドを追加します。`
  )) return;

  await api(
    '/k/v1/preview/app/form/fields.json',
    'POST',
    { app: appId, properties: missing }
  );

  await api(
    '/k/v1/preview/app/deploy.json',
    'POST',
    { apps: [{ app: appId }] }
  );

  console.log('フィールド追加・設定反映を開始しました。');
  alert('追加しました。アプリ設定の反映完了を確認してください。');
})();
