[1mdiff --git a/src/config/fields.js b/src/config/fields.js[m
[1mindex 2d7fce1..dee1ef6 100644[m
[1m--- a/src/config/fields.js[m
[1m+++ b/src/config/fields.js[m
[36m@@ -2,26 +2,34 @@[m
 /**[m
  * kintone SFAパック フィールド定義[m
  *[m
[31m- * 案件管理       : App ID 941[m
[31m- * 顧客管理       : App ID 940[m
[31m- * 担当者管理     : App ID 942[m
[32m+[m[32m * 案件管理・顧客管理・担当者管理[m
[32m+[m[32m *[m
[32m+[m[32m * アプリIDは環境ごとに異なるため、固定値を持たない。[m
[32m+[m[32m * 担当者管理アプリIDは環境別設定ファイルから取得する。[m
  *[m
  * フィールドコードは各アプリのJSON定義に基づく。[m
  */[m
 [m
 // ========================================[m
[31m-// 1. アプリID[m
[32m+[m[32m// 1. 環境別設定の参照[m
 // ========================================[m
 [m
[31m-export const APP_IDS = Object.freeze({[m
[31m-  DEAL: 941,[m
[31m-  CUSTOMER: 940,[m
[31m-  CONTACT: 942,[m
[31m-});[m
[32m+[m[32m// 設定値の取得は実行時に行う。[m
[32m+[m[32m// fields.js の読み込み時にはエラーを発生させない。[m
[32m+[m[32mexport function getContactAppId() {[m
[32m+[m[32m  const appId = window.SFPACK_CONFIG?.contactAppId;[m
[32m+[m
[32m+[m[32m  if (!Number.isInteger(appId) || appId <= 0) {[m
[32m+[m[32m    throw new Error([m
[32m+[m[32m      '[SFA] 担当者管理アプリIDが正しく設定されていません。'[m
[32m+[m[32m    );[m
[32m+[m[32m  }[m
 [m
[32m+[m[32m  return appId;[m
[32m+[m[32m}[m
 [m
 // ========================================[m
[31m-// 2. 案件管理アプリ（941）[m
[32m+[m[32m// 2. 案件管理アプリ[m
 // ========================================[m
 [m
 export const DEAL_FIELDS = Object.freeze({[m
[36m@@ -44,13 +52,10 @@[m [mexport const DEAL_FIELDS = Object.freeze({[m
     FIELDS: {[m
       NAME: '担当者',[m
       CONTACT_NO: '担当者No_',[m
[31m-    }, [m
[32m+[m[32m    },[m
   },[m
 [m
[31m-  // ========================================[m
   // 担当者別明細テーブル[m
[31m-  // ========================================[m
[31m-[m
   PROPOSAL_TABLES: [[m
     {[m
       SLOT: 1,[m
[36m@@ -127,7 +132,7 @@[m [mexport const DEAL_FIELDS = Object.freeze({[m
     EXPECTED_ORDER_DATE: '受注予定日',[m
   },[m
 [m
[31m-  // DEAL_FIELDS オブジェクト内に追加[m
[32m+[m[32m  // コピー元明細テーブル[m
   PROPOSAL_SOURCE: {[m
     TABLE: '明細テーブル',[m
     FIELDS: {[m
[36m@@ -140,9 +145,8 @@[m [mexport const DEAL_FIELDS = Object.freeze({[m
   PROPOSAL_COPY_SPACE: 'copyProposalDetails',[m
 });[m
 [m
[31m-[m
 // ========================================[m
[31m-// 3. 顧客管理アプリ（940）[m
[32m+[m[32m// 3. 顧客管理アプリ[m
 // ========================================[m
 [m
 export const CUSTOMER_FIELDS = Object.freeze({[m
[36m@@ -154,7 +158,11 @@[m [mexport const CUSTOMER_FIELDS = Object.freeze({[m
   // 担当者一覧（関連レコード一覧）[m
   CONTACT_LIST: {[m
     TABLE: '担当者一覧',[m
[31m-    RELATED_APP_ID: APP_IDS.CONTACT,[m
[32m+[m
[32m+[m[32m    // アプリIDは固定せず、必要時に取得する[m
[32m+[m[32m    get RELATED_APP_ID() {[m
[32m+[m[32m      return getContactAppId();[m
[32m+[m[32m    },[m
 [m
     CONDITION: {[m
       CUSTOMER_ID: '顧客No',[m
[36m@@ -170,11 +178,19 @@[m [mexport const CUSTOMER_FIELDS = Object.freeze({[m
       'メールアドレス',[m
     ],[m
   },[m
[31m-});[m
 [m
[32m+[m[32m  // 本社・拠点階層管理[m
[32m+[m[32m  OFFICE: {[m
[32m+[m[32m    ID: 'office_id',[m
[32m+[m[32m    HEAD_OFFICE_ID: 'honsha_office_id',[m
[32m+[m[32m    PARENT_OFFICE_ID: 'parent_office_id',[m
[32m+[m[32m    GENBA_NG: 'genba_ng',[m
[32m+[m[32m    EFFECTIVE_GENBA_NG: 'effective_genba_ng',[m
[32m+[m[32m  },[m
[32m+[m[32m});[m
 [m
 // ========================================[m
[31m-// 4. 担当者管理アプリ（942）[m
[32m+[m[32m// 4. 担当者管理アプリ[m
 // ========================================[m
 [m
 export const CONTACT_FIELDS = Object.freeze({[m
[36m@@ -199,7 +215,6 @@[m [mexport const CONTACT_FIELDS = Object.freeze({[m
   EMAIL: 'メールアドレス',[m
 });[m
 [m
[31m-[m
 // ========================================[m
 // 5. アプリ間の関連定義[m
 // ========================================[m
[36m@@ -208,31 +223,27 @@[m [mexport const RELATIONS = Object.freeze({[m
 [m
   // 案件管理 → 顧客管理[m
   DEAL_TO_CUSTOMER: {[m
[31m-    SOURCE_APP: APP_IDS.DEAL,[m
[31m-    TARGET_APP: APP_IDS.CUSTOMER,[m
[31m-[m
     SOURCE_FIELD: DEAL_FIELDS.CUSTOMER.ID,[m
     TARGET_FIELD: CUSTOMER_FIELDS.ID,[m
   },[m
 [m
   // 顧客管理 → 担当者管理[m
   CUSTOMER_TO_CONTACT: {[m
[31m-    SOURCE_APP: APP_IDS.CUSTOMER,[m
[31m-    TARGET_APP: APP_IDS.CONTACT,[m
[31m-[m
     SOURCE_FIELD: CUSTOMER_FIELDS.ID,[m
     TARGET_FIELD: CONTACT_FIELDS.CUSTOMER_ID,[m
   },[m
 });[m
 [m
[31m-[m
 // ========================================[m
 // 6. 担当者取得設定[m
 // ========================================[m
 [m
 export const CONTACT_QUERY = Object.freeze({[m
 [m
[31m-  APP: APP_IDS.CONTACT,[m
[32m+[m[32m  // 実行時に環境別設定から取得する[m
[32m+[m[32m  get APP() {[m
[32m+[m[32m    return getContactAppId();[m
[32m+[m[32m  },[m
 [m
   // 担当者選択画面に表示する項目[m
   FIELDS: [[m
[36m@@ -247,4 +258,4 @@[m [mexport const CONTACT_QUERY = Object.freeze({[m
 [m
   // 取得上限[m
   LIMIT: 500,[m
[31m-});[m
\ No newline at end of file[m
[32m+[m[32m});[m
[1mdiff --git a/src/features/customerNgSync.js b/src/features/customerNgSync.js[m
[1mindex 7021bb7..7de5588 100644[m
[1m--- a/src/features/customerNgSync.js[m
[1m+++ b/src/features/customerNgSync.js[m
[36m@@ -1,12 +1,13 @@[m
 import { Button } from 'kintone-ui-component';[m
[32m+[m[32mimport { CUSTOMER_FIELDS } from '../config/fields.js';[m
 [m
[31m-const CUSTOMER_APP_ID = 940;[m
[32m+[m[32mconst CUSTOMER_APP_ID = kintone.app.getId();[m
 [m
 const FIELDS = {[m
[31m-  officeId: 'office_id',[m
[31m-  honshaOfficeId: 'honsha_office_id',[m
[31m-  genbaNg: 'genba_ng',[m
[31m-  effectiveGenbaNg: 'effective_genba_ng',[m
[32m+[m[32m  officeId: CUSTOMER_FIELDS.OFFICE.ID,[m
[32m+[m[32m  honshaOfficeId: CUSTOMER_FIELDS.OFFICE.HEAD_OFFICE_ID,[m
[32m+[m[32m  genbaNg: CUSTOMER_FIELDS.OFFICE.GENBA_NG,[m
[32m+[m[32m  effectiveGenbaNg: CUSTOMER_FIELDS.OFFICE.EFFECTIVE_GENBA_NG,[m
 };[m
 [m
 const NG_OPTION = '現場NG';[m
[1mdiff --git a/src/features/proposalCopy.js b/src/features/proposalCopy.js[m
[1mindex 1309d8f..9ffd612 100644[m
[1m--- a/src/features/proposalCopy.js[m
[1m+++ b/src/features/proposalCopy.js[m
[36m@@ -1,4 +1,3 @@[m
[31m-[m
 import { Button } from 'kintone-ui-component';[m
 import { DEAL_FIELDS } from '../config/fields.js';[m
 [m
[1mdiff --git a/src/main.js b/src/main.js[m
[1mindex e1e5a8e..4540881 100644[m
[1m--- a/src/main.js[m
[1m+++ b/src/main.js[m
[36m@@ -1,7 +1,6 @@[m
 import './styles/main.css';[m
 [m
 import {[m
[31m-  APP_IDS,[m
   DEAL_FIELDS,[m
   CUSTOMER_FIELDS,[m
   CONTACT_FIELDS,[m
[36m@@ -17,7 +16,6 @@[m [mimport { initializeProposalCopy } from './features/proposalCopy.js';[m
   'use strict';[m
 [m
   console.log('[SFA Customization] Config loaded', {[m
[31m-    APP_IDS,[m
     DEAL_FIELDS,[m
     CUSTOMER_FIELDS,[m
     CONTACT_FIELDS,[m
