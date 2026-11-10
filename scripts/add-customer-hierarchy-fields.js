
(async () => {
  'use strict';

  const APP_ID = kintone.app.getId();

  // 安全のため、アプリ設定の反映は自動実行しません。
  const fields = {
    office_id: {
      type: 'SINGLE_LINE_TEXT',
      code: 'office_id',
      label: '事業所ID',
      required: false,
      unique: true
    },
    honsha_office_id: {
      type: 'SINGLE_LINE_TEXT',
      code: 'honsha_office_id',
      label: '本社の事業所ID',
      required: false
    },
    parent_office_id: {
      type: 'SINGLE_LINE_TEXT',
      code: 'parent_office_id',
      label: '親事業所ID',
      required: false
    },
    genba_ng: {
      type: 'CHECK_BOX',
      code: 'genba_ng',
      label: '現場NG設定',
      required: false,
      options: {
        '現場NG': {
          label: '現場NG',
          index: '0'
        }
      },
      defaultValue: []
    },
    effective_genba_ng: {
      type: 'SINGLE_LINE_TEXT',
      code: 'effective_genba_ng',
      label: '現場NG判定',
      required: false,
      defaultValue: 'OK'
    }
  };

  const api = (path, method, body) =>
    kintone.api(kintone.api.url(path, true), method, body);

  try {
    const currentApp = kintone.app.getId();

    if (currentApp !== APP_ID) {
      throw new Error(
        `対象アプリが異なります。現在: ${currentApp} / 対象: ${APP_ID}`
      );
    }

    // プレビュー環境の既存フィールドを確認
    const current = await api(
      '/k/v1/preview/app/form/fields.json',
      'GET',
      { app: APP_ID }
    );

    const missing = Object.fromEntries(
      Object.entries(fields).filter(
        ([code]) => !(code in current.properties)
      )
    );

    const existing = Object.keys(fields).filter(
      code => code in current.properties
    );

    console.log('既存フィールド:', existing);
    console.table(
      Object.values(missing).map(f => ({
        code: f.code,
        label: f.label,
        type: f.type
      }))
    );

    if (Object.keys(missing).length === 0) {
      console.log('追加対象はありません。');
      return;
    }

    const confirmed = window.confirm(
      `顧客管理アプリ (${APP_ID}) に` +
      `${Object.keys(missing).length}フィールドを追加します。\n` +
      '既存フィールドは変更しません。\n\n実行しますか？'
    );

    if (!confirmed) {
      console.log('キャンセルしました。');
      return;
    }

    const result = await api(
      '/k/v1/preview/app/form/fields.json',
      'POST',
      {
        app: APP_ID,
        revision: current.revision,
        properties: missing
      }
    );

    console.log('フィールド追加成功:', Object.keys(missing));
    console.log('設定リビジョン:', result.revision);
    console.log(
      'アプリ設定への追加が完了しました。' +
      'フォームの配置と内容を確認してから「アプリを更新」してください。'
    );

  } catch (error) {
    console.error('フィールド追加失敗:', error);
    console.error(
      '詳細:',
      error?.response?.data ?? error
    );
  }
})();
