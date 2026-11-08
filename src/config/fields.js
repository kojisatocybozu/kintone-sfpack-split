
/**
 * kintone SFAパック フィールド定義
 *
 * 案件管理・顧客管理・担当者管理
 *
 * アプリIDは環境ごとに異なるため、固定値を持たない。
 * 担当者管理アプリIDは環境別設定ファイルから取得する。
 *
 * フィールドコードは各アプリのJSON定義に基づく。
 */

// ========================================
// 1. 環境別設定の参照
// ========================================

// 設定値の取得は実行時に行う。
// fields.js の読み込み時にはエラーを発生させない。
export function getContactAppId() {
  const appId = window.SFPACK_CONFIG?.contactAppId;

  if (!Number.isInteger(appId) || appId <= 0) {
    throw new Error(
      '[SFA] 担当者管理アプリIDが正しく設定されていません。'
    );
  }

  return appId;
}

// ========================================
// 2. 案件管理アプリ
// ========================================

export const DEAL_FIELDS = Object.freeze({

  // 案件管理のボタンスペース
  UI: {
    CONTACT_SELECTOR_SPACE: 'selPerson',
  },

  // 顧客情報
  CUSTOMER: {
    NAME: '会社名',
    ID: '顧客No_',
  },

  // 担当者テーブル
  CONTACT_TABLE: {
    TABLE: '担当者テーブル',

    FIELDS: {
      NAME: '担当者',
      CONTACT_NO: '担当者No_',
    },
  },

  // 担当者別明細テーブル
  PROPOSAL_TABLES: [
    {
      SLOT: 1,
      TABLE: '担当者別明細01',
      OWNER: '明細担当者No_01',
      FIELDS: {
        PRODUCT: '提案商品_01',
        PROBABILITY: '確度_01',
        PHASE: '商談フェーズ_01',
      },
    },
    {
      SLOT: 2,
      TABLE: '担当者別明細02',
      OWNER: '明細担当者No_02',
      FIELDS: {
        PRODUCT: '提案商品_02',
        PROBABILITY: '確度_02',
        PHASE: '商談フェーズ_02',
      },
    },
    {
      SLOT: 3,
      TABLE: '担当者別明細03',
      OWNER: '明細担当者No_03',
      FIELDS: {
        PRODUCT: '提案商品_03',
        PROBABILITY: '確度_03',
        PHASE: '商談フェーズ_03',
      },
    },
    {
      SLOT: 4,
      TABLE: '担当者別明細04',
      OWNER: '明細担当者No_04',
      FIELDS: {
        PRODUCT: '提案商品_04',
        PROBABILITY: '確度_04',
        PHASE: '商談フェーズ_04',
      },
    },
    {
      SLOT: 5,
      TABLE: '担当者別明細05',
      OWNER: '明細担当者No_05',
      FIELDS: {
        PRODUCT: '提案商品_05',
        PROBABILITY: '確度_05',
        PHASE: '商談フェーズ_05',
      },
    },
  ],

  // 提案明細テーブル
  PROPOSAL_TABLE: {
    TABLE: '明細テーブル',

    FIELDS: {
      PRODUCT: '提案商品_0',
      PROBABILITY: '確度_0',
      PHASE: '商談フェーズ_0',
    },
  },

  // 既存の案件情報
  GENERAL: {
    NAME: '案件名',
    OWNER: '主担当',
    SALES: '売上',
    PRODUCT: '提案商品',
    PROBABILITY: '確度',
    PHASE: '商談フェーズ',
    NEXT_ACTION_DATE: '次回アクション日',
    EXPECTED_ORDER_DATE: '受注予定日',
  },

  // コピー元明細テーブル
  PROPOSAL_SOURCE: {
    TABLE: '明細テーブル',
    FIELDS: {
      PRODUCT: '提案商品_0',
      PROBABILITY: '確度_0',
      PHASE: '商談フェーズ_0',
    },
  },

  PROPOSAL_COPY_SPACE: 'copyProposalDetails',
});

// ========================================
// 3. 顧客管理アプリ
// ========================================

export const CUSTOMER_FIELDS = Object.freeze({

  // 顧客情報
  ID: '顧客No',
  NAME: '会社名',

  // 担当者一覧（関連レコード一覧）
  CONTACT_LIST: {
    TABLE: '担当者一覧',

    // アプリIDは固定せず、必要時に取得する
    get RELATED_APP_ID() {
      return getContactAppId();
    },

    CONDITION: {
      CUSTOMER_ID: '顧客No',
      RELATED_CUSTOMER_ID: '顧客No_',
    },

    DISPLAY_FIELDS: [
      'お名前',
      '部署',
      '役職',
      '電話番号',
      '携帯番号',
      'メールアドレス',
    ],
  },

  // 本社・拠点階層管理
  OFFICE: {
    ID: 'office_id',
    HEAD_OFFICE_ID: 'honsha_office_id',
    PARENT_OFFICE_ID: 'parent_office_id',
    GENBA_NG: 'genba_ng',
    EFFECTIVE_GENBA_NG: 'effective_genba_ng',
  },
});

// ========================================
// 4. 担当者管理アプリ
// ========================================

export const CONTACT_FIELDS = Object.freeze({

  // 担当者の識別情報
  ID: '担当者No_',

  // 顧客との紐付け
  CUSTOMER_ID: '顧客No_',
  CUSTOMER_NAME: '顧客名',

  // 担当者情報
  NAME: 'お名前',
  LAST_NAME: '姓',
  FIRST_NAME: '名',
  DEPARTMENT: '部署',
  POSITION: '役職',

  // 連絡先
  PHONE: '電話番号',
  MOBILE: '携帯番号',
  EMAIL: 'メールアドレス',
});

// ========================================
// 5. アプリ間の関連定義
// ========================================

export const RELATIONS = Object.freeze({

  // 案件管理 → 顧客管理
  DEAL_TO_CUSTOMER: {
    SOURCE_FIELD: DEAL_FIELDS.CUSTOMER.ID,
    TARGET_FIELD: CUSTOMER_FIELDS.ID,
  },

  // 顧客管理 → 担当者管理
  CUSTOMER_TO_CONTACT: {
    SOURCE_FIELD: CUSTOMER_FIELDS.ID,
    TARGET_FIELD: CONTACT_FIELDS.CUSTOMER_ID,
  },
});

// ========================================
// 6. 担当者取得設定
// ========================================

export const CONTACT_QUERY = Object.freeze({

  // 実行時に環境別設定から取得する
  get APP() {
    return getContactAppId();
  },

  // 担当者選択画面に表示する項目
  FIELDS: [
    '$id',
    CONTACT_FIELDS.ID,
    CONTACT_FIELDS.CUSTOMER_ID,
    CONTACT_FIELDS.NAME,
    CONTACT_FIELDS.DEPARTMENT,
    CONTACT_FIELDS.POSITION,
    CONTACT_FIELDS.EMAIL,
  ],

  // 取得上限
  LIMIT: 500,
});
