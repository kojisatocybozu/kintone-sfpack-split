/**
 * kintone 案件管理: 既存サブテーブルへ金額・日付フィールドを追加
 * 検証済みの POST /k/v1/preview/app/form/fields.json 方式
 * 実行: 案件管理アプリ画面の開発者ツール Console
 * アプリ更新（デプロイ）は行いません。
 */
(async () => {
  'use strict';
  const app = kintone.app.getId();
  if (!app) {
    console.error('案件管理アプリの画面から実行してください。');
    return;
  }

  const api = kintone.api.url('/k/v1/preview/app/form/fields.json', true);
  const definitions = [
    { label: '見込み金額', type: 'NUMBER' },
    { label: '受注金額', type: 'NUMBER' },
    { label: '受注予定日', type: 'DATE' },
    { label: '受注日', type: 'DATE' }
  ];
  const tables = [
    { code: '明細テーブル', suffix: '0' },
    ...Array.from({ length: 5 }, (_, i) => ({
      code: `担当者別明細${String(i + 1).padStart(2, '0')}`,
      suffix: String(i + 1).padStart(2, '0')
    }))
  ];

  try {
    let current = await kintone.api(api, 'GET', { app });
    const pending = [];
    const existing = [];

    for (const { code: tableCode, suffix } of tables) {
      const table = current.properties[tableCode];
      if (!table || table.type !== 'SUBTABLE') {
        throw new Error(`サブテーブルが見つかりません: ${tableCode}`);
      }
      for (const definition of definitions) {
        const fieldCode = `${definition.label}_${suffix}`;
        const found = table.fields?.[fieldCode];
        if (found) {
          if (found.type !== definition.type) {
            throw new Error(`既存フィールドの型が異なります: ${tableCode} / ${fieldCode} (${found.type})`);
          }
          existing.push({ table: tableCode, code: fieldCode, status: '既存・スキップ' });
        } else {
          pending.push({ table: tableCode, code: fieldCode, ...definition });
        }
      }
    }

    console.table([...existing, ...pending.map(({ table, code }) => ({ table, code, status: '追加予定' }))]);
    if (pending.length === 0) {
      console.log('24フィールドすべて存在します。追加は不要です。');
      return;
    }

    if (!window.confirm(`アプリID: ${app}\n追加予定: ${pending.length}フィールド\n既存・スキップ: ${existing.length}フィールド\n\nプレビュー設定へ追加します。よろしいですか？`)) {
      console.log('キャンセルしました。');
      return;
    }

    // 成功した最小テストと同じ構造で、1フィールドずつPOSTする。
    // 失敗した場合はそこで停止。次回は既存分をスキップできる。
    for (let index = 0; index < pending.length; index++) {
      const item = pending[index];
      const table = current.properties[item.table];
      const field = item.type === 'NUMBER'
        ? {
            type: 'NUMBER', code: item.code, label: item.label,
            required: false, defaultValue: '', digit: false, unique: false
          }
        : {
            type: 'DATE', code: item.code, label: item.label,
            required: false, defaultValue: ''
          };

      const body = {
        app,
        revision: current.revision,
        properties: {
          [item.table]: {
            type: 'SUBTABLE', code: item.table, label: table.label,
            fields: { [item.code]: field }
          }
        }
      };

      try {
        await kintone.api(api, 'POST', body);
      } catch (error) {
        console.error(`追加失敗 (${index + 1}/${pending.length}): ${item.table} / ${item.code}`, error);
        console.error('ここで停止しました。プレビュー設定を確認後、必要なら再実行してください。');
        return;
      }

      current = await kintone.api(api, 'GET', { app });
      if (!current.properties[item.table]?.fields?.[item.code]) {
        console.error(`POST後にフィールドを確認できません: ${item.table} / ${item.code}`);
        return;
      }
      console.log(`追加成功 (${index + 1}/${pending.length}): ${item.table} / ${item.code}`);
    }

    const finalState = await kintone.api(api, 'GET', { app });
    const verification = tables.flatMap(({ code: tableCode, suffix }) => definitions.map(({ label, type }) => {
      const fieldCode = `${label}_${suffix}`;
      const actual = finalState.properties[tableCode]?.fields?.[fieldCode];
      return {
        table: tableCode, code: fieldCode,
        status: actual?.type === type ? 'OK' : '未確認'
      };
    }));
    console.table(verification);
    const okCount = verification.filter(item => item.status === 'OK').length;
    console.log(`検証結果: ${okCount}/24フィールド`);
    console.log('フォーム設定画面で配置を確認し、問題なければ手動で「アプリを更新」してください。');
  } catch (error) {
    console.error('[案件管理 金額・日付フィールド追加] 中断しました:', error);
  }
})();
