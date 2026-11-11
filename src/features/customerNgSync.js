import { Button } from 'kintone-ui-component';
import { CUSTOMER_FIELDS } from '../config/fields.js';

const CUSTOMER_APP_ID = kintone.app.getId();

const FIELDS = {
  officeId: CUSTOMER_FIELDS.OFFICE.ID,
  honshaOfficeId: CUSTOMER_FIELDS.OFFICE.HEAD_OFFICE_ID,
  genbaNg: CUSTOMER_FIELDS.OFFICE.GENBA_NG,
  effectiveGenbaNg: CUSTOMER_FIELDS.OFFICE.EFFECTIVE_GENBA_NG,
};

const NG_OPTION = '現場NG';
const RETRY_BUTTON_ID = 'customer-ng-sync-button';

function isCustomerApp() {
  return Number(kintone.app.getId()) === CUSTOMER_APP_ID;
}

function isHeadOffice(record) {
  const officeId = record[FIELDS.officeId]?.value?.trim();
  const honshaId = record[FIELDS.honshaOfficeId]?.value?.trim();

  return Boolean(officeId && honshaId && officeId === honshaId);
}

function getEffectiveStatus(record) {
  const checked = record[FIELDS.genbaNg]?.value ?? [];
  return checked.includes(NG_OPTION) ? 'NG' : 'OK';
}

function setFieldRestrictions(record) {
  const headOffice = isHeadOffice(record);

  // 本社以外では現場NG設定を編集不可
  record[FIELDS.genbaNg].disabled = !headOffice;

  // 現場NG判定は全レコードで編集不可
  record[FIELDS.effectiveGenbaNg].disabled = true;

  return record;
}

function escapeQueryValue(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

async function getTargetRecords(honshaId) {
  const allRecords = [];
  let lastId = 0;

  // $idを使ったページングで全件取得
  while (true) {
    const query =
      `${FIELDS.honshaOfficeId} = "${escapeQueryValue(honshaId)}" ` +
      `and $id > ${lastId} ` +
      'order by $id asc limit 500';

    const response = await kintone.api(
      kintone.api.url('/k/v1/records.json', true),
      'GET',
      {
        app: CUSTOMER_APP_ID,
        query,
        fields: ['$id', FIELDS.effectiveGenbaNg],
      }
    );

    const records = response.records;
    allRecords.push(...records);

    if (records.length < 500) {
      break;
    }

    lastId = Number(records[records.length - 1].$id.value);
  }

  return allRecords;
}

async function updateTargetRecords(records, status, headOfficeRecordId) {
  const BATCH_SIZE = 100;
  let updatedCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const requests = batch.map((record) => {
      const isHeadOfficeRecord =
        String(record.$id.value) === String(headOfficeRecordId);

      // 本社自身は常にOK
      const effectiveStatus = isHeadOfficeRecord ? 'OK' : status;

      return {
        id: record.$id.value,
        record: {
          [FIELDS.effectiveGenbaNg]: {
            value: effectiveStatus,
          },
        },
      };
    });

    await kintone.api(
      kintone.api.url('/k/v1/records.json', true),
      'PUT',
      {
        app: CUSTOMER_APP_ID,
        records: requests,
      }
    );

    updatedCount += batch.length;
  }

  return updatedCount;
}

async function syncHeadOffice(record) {
  if (!isHeadOffice(record)) {
    throw new Error('本社レコードではないため同期できません。');
  }

  const honshaId = record[FIELDS.officeId].value.trim();
  const status = getEffectiveStatus(record);

  console.log('[Customer NG] 同期開始', { honshaId, status });

  const targets = await getTargetRecords(honshaId);

  // 本社自身も更新対象に含める
  const headOfficeRecordId = String(record.$id?.value ?? '');
  if (
    headOfficeRecordId &&
    !targets.some((target) => target.$id.value === headOfficeRecordId)
  ) {
    throw new Error(
      '本社自身が同期対象に含まれていません。事業所IDを確認してください。'
    );
  }

  const updatedCount = await updateTargetRecords(
    targets,
    status,
    headOfficeRecordId
  );
  
  console.log('[Customer NG] 同期完了', {
    honshaId,
    status,
    updatedCount,
  });

  return { honshaId, status, updatedCount };
}

// 保存前に本社の設定を参照し、新規レコード自身の判定を確定する
async function setCreatedRecordStatus(event) {
  const record = event.record;
  if (isHeadOffice(record)) {
    record[FIELDS.effectiveGenbaNg].value = 'OK';
    console.log('[Customer NG] 新規本社の保存前判定', { status: 'OK' });
    return event;
  }

  const honshaId = String(record[FIELDS.honshaOfficeId]?.value ?? '').trim();
  if (!honshaId) {
    event.error = '本社事業所IDを指定してください。現場NG判定を確定できません。';
    return event;
  }

  try {
    const response = await kintone.api(
      kintone.api.url('/k/v1/records.json', true),
      'GET',
      {
        app: CUSTOMER_APP_ID,
        query: `${FIELDS.officeId} = "${escapeQueryValue(honshaId)}" and ` +
          `${FIELDS.honshaOfficeId} = "${escapeQueryValue(honshaId)}" limit 2`,
        fields: ['$id', FIELDS.genbaNg],
      }
    );

    if (response.records.length !== 1) {
      throw new Error(`本社レコードが一意に見つかりません（本社事業所ID: ${honshaId}）。`);
    }

    const status = getEffectiveStatus(response.records[0]);
    record[FIELDS.effectiveGenbaNg].value = status;
    console.log('[Customer NG] 新規事業所の保存前判定', { honshaId, status });
  } catch (error) {
    console.error('[Customer NG] 新規登録時の判定取得失敗', error);
    event.error = `現場NG判定を確定できないため、登録を中止しました。${error.message ?? String(error)}`;
  }

  return event;
}

function showSyncError(error) {
  console.error('[Customer NG] 同期失敗', error);

  window.alert(
    '現場NG判定の連鎖更新に失敗しました。\n' +
    '本社レコードの保存は完了している可能性があります。\n\n' +
    '詳細画面の「現場NG判定を再同期」ボタンから再実行してください。\n\n' +
    `エラー: ${error.message ?? String(error)}`
  );
}

function addRetryButton(event) {
  if (!isHeadOffice(event.record)) {
    return event;
  }

  const header = kintone.app.record.getHeaderMenuSpaceElement();

  if (!header || document.getElementById(RETRY_BUTTON_ID)) {
    return event;
  }

  // KUC Buttonを生成
  const button = new Button({
    text: '現場NG判定を再同期',
    type: 'normal',
    disabled: false,
  });

  button.id = RETRY_BUTTON_ID;

  button.addEventListener('click', async () => {
    const confirmed = window.confirm(
      '本社の現場NG設定を傘下事業所へ再同期しますか？'
    );

    if (!confirmed) return;

    button.disabled = true;
    button.text = '同期中...';

    try {
      const result = await syncHeadOffice(event.record);

      window.alert(
        `現場NG判定を同期しました。\n` +
        `判定: ${result.status}\n` +
        `更新件数: ${result.updatedCount}件`
      );

      window.location.reload();
    } catch (error) {
      showSyncError(error);
    } finally {
      button.disabled = false;
      button.text = '現場NG判定を再同期';
    }
  });

  header.appendChild(button);

  return event;
}


export function initCustomerNgSync() {
  // 誤って案件管理アプリへ登録された場合は何もしない
  if (!isCustomerApp()) {
    return;
  }

  // 作成・編集画面で入力制限を設定
  kintone.events.on(
    [
      'app.record.create.show',
      'app.record.edit.show',
      'app.record.create.change.office_id',
      'app.record.create.change.honsha_office_id',
      'app.record.edit.change.office_id',
      'app.record.edit.change.honsha_office_id',
    ],
    (event) => {
      setFieldRestrictions(event.record);
      return event;
    }
  );

  // 新規登録時は保存前に実効NGを確定（非同期イベントの完了を待つ）
  kintone.events.on('app.record.create.submit', setCreatedRecordStatus);

  // 本社の保存成功後は、従来どおり傘下レコードへ連鎖更新
  kintone.events.on(
    [
      'app.record.create.submit.success',
      'app.record.edit.submit.success',
    ],
    (event) => {
      if (isHeadOffice(event.record)) {
        // 保存後のAPI更新は非同期・非トランザクション
        void syncHeadOffice(event.record).catch(showSyncError);
      }
      return event;
    }
  );

  // 詳細画面から手動再同期できるようにする
  kintone.events.on('app.record.detail.show', addRetryButton);

  console.log('[Customer NG] initialized');
}
