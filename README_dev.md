# 開発ガイド — kintone SFA Pack Customization

本書は**開発・セットアップ・デプロイ・Git運用**の手順を記載します。機能の背景・仕様・検証状況は **[README.md](README.md)** を参照してください。

> 本書のコマンド・スクリプト例は元のREADMEを継承しています。実行前にリポジトリの `package.json` と実際のファイル構成を確認してください。

---

## 1. 開発環境

| 項目 | 使用技術・バージョン |
|---|---|
| OS | Windows |
| エディタ | Visual Studio Code |
| Runtime | Node.js |
| Package Manager | pnpm 10.32.1 |
| Build Tool | Vite 8.3.5 |
| Test Framework | Vitest 5.1.0 |
| UI Library | kintone UI Component v1 1.26.0 |
| Local Server | VS Code Live Server |
| Local HTTPS | mkcert |
| Version Control | Git / GitHub |

### 開発方針

- パッケージ管理はpnpmに統一する。
- JavaScriptはES Modules形式で記述する。
- Viteで依存モジュールをバンドルする。
- kintone標準UIとの統一性を考慮し、必要に応じてKUCを使用する。
- API処理、画面制御、UI部品を機能単位で分離する。
- 案件管理と顧客管理は別々のJavaScriptファイルとしてビルドする。
- アプリIDなどの環境依存値は、可能な限り環境別設定に分離する。
- 標準機能やプラグインで実現できる部分は、独自JavaScriptを増やさない。
- ソースコードはGitHubで管理する。

---

## 2. フォルダ構成

主要ファイルの構成は以下のとおりです。

```text
kintone-sfpack-split/
│
├── src/
│   ├── config/
│   │   ├── fields.js
│   │   ├── staging.js
│   │   └── production.js
│   │
│   ├── api/
│   │   └── contacts.js
│   │
│   ├── features/
│   │   ├── contactSelector.js
│   │   ├── proposalDetails.js
│   │   ├── proposalCopy.js
│   │   ├── customerNgSync.js
│   │   └── proposalAppCopy.js
│   │
│   ├── ui/
│   │   └── dialog.js
│   │
│   ├── styles/
│   │   └── main.css
│   │
│   ├── main.js
│   └── customerMain.js
│
├── dist/
│   ├── sfpack-customization.js
│   └── customer-customization.js
│
├── scripts/
│   └── add-deal-proposal-fields.js
│
├── add-customer-hierarchy-fields.js
├── add-proposal-financial-fields-post.js
├── create-proposal-detail-app.js
├── .vscode/
│   └── settings.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── vite.config.js
├── .gitignore
├── README.md
└── README_dev.md
```

※ 主要ファイルを示した構成例です。今回追加した2つのセットアップ用スクリプトの配置場所は未照合のため、上記ではリポジトリ直下に仮記載しています。実際の配置や補助ファイルはローカルリポジトリを正とします。`dist/` はビルド時に生成されます。

### 各モジュールの役割

| ファイル | 役割 |
|---|---|
| `config/fields.js` | アプリのフィールドコード・フィールド間の関連定義 |
| `config/staging.js` | ステージング環境固有の設定（担当者管理アプリIDなど） |
| `config/production.js` | 本番環境固有の設定 |
| `api/contacts.js` | 担当者管理アプリからの担当者情報取得 |
| `features/contactSelector.js` | 担当者選択機能 |
| `features/proposalDetails.js` | 担当者別明細テーブルの同期・表示制御 |
| `features/proposalCopy.js` | 担当者別明細テーブル間のコピー |
| `features/customerNgSync.js` | 現場NG設定の連鎖更新・再同期 |
| `features/proposalAppCopy.js` | 案件管理の担当者別明細を明細管理アプリにレコード化 |
| `ui/dialog.js` | KUCによる担当者選択ダイアログ |
| `styles/main.css` | 案件管理側の独自CSS |
| `main.js` | 案件管理用エントリーポイント |
| `customerMain.js` | 顧客管理用エントリーポイント |

現場NGの警告表示専用JavaScriptモジュールは削除しています。視覚的な強調表示は、条件書式プラグイン等の利用を検討します。

---

## 3. Vite設定・ビルド構成

### 4.1 package.json

ES Modulesを使用するため、`type: module` を指定します。主要なスクリプトは以下のとおりです。

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build:deal": "vite build",
    "build:customer": "vite build --mode customer",
    "build": "pnpm run build:deal && pnpm run build:customer",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 4.2 vite.config.js

```javascript
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isCustomer = mode === 'customer';

  return {
    build: {
      outDir: 'dist',
      emptyOutDir: !isCustomer,
      lib: {
        entry: isCustomer
          ? 'src/customerMain.js'
          : 'src/main.js',
        name: isCustomer
          ? 'CustomerCustomization'
          : 'SfpackCustomization',
        formats: ['iife'],
        fileName: () =>
          isCustomer
            ? 'customer-customization.js'
            : 'sfpack-customization.js',
      },
      minify: false,
      sourcemap: true,
    },
  };
});
```

kintoneに読み込ませるため、IIFE形式のJavaScriptを生成します。

### 4.3 アプリ別の出力

| 対象アプリ | エントリーポイント | 出力ファイル |
|---|---|---|
| 案件管理 | `src/main.js` | `sfpack-customization.js` |
| 顧客管理 | `src/customerMain.js` | `customer-customization.js` |

### 4.4 ビルドコマンド

両アプリをまとめてビルド：

```powershell
pnpm run build
```

案件管理のみ：

```powershell
pnpm run build:deal
```

顧客管理のみ：

```powershell
pnpm run build:customer
```

現在のVite設定では、案件管理側のビルド時に `dist/` がクリアされます。そのため、両アプリの成果物を揃える場合は `pnpm run build` を使用します。

---

## 4. KUC（kintone UI Component）

UIはkintone標準画面との統一性を重視し、必要に応じてKUCを使用します。

| コンポーネント | 用途 | 状態 |
|---|---|---|
| Dialog | 担当者選択画面 | 実装済み |
| Checkbox | 担当者の複数選択 | 実装済み |
| Button | 担当者選択・テーブルコピー・担当者別明細クリア・明細レコード化 | 実装済み |
| Button | 現場NG判定の再同期 | 実装状況を確認して管理 |
| Dropdown | 担当者別明細の入力UI | 今後検討 |

公式ドキュメント：

https://ui-component.kintone.dev/ja/

---

## 5. 環境別設定・ローカル開発手順

### 13.1 環境別設定

案件管理アプリから参照する担当者管理アプリのIDは、環境によって異なる可能性があるため、環境別設定ファイルで管理します。

```text
src/config/
├── fields.js
├── staging.js
└── production.js
```

ステージング環境では `staging.js`、本番環境では `production.js` を読み込みます。

例：

```javascript
// staging.js（例）
window.SFPACK_CONFIG = Object.freeze({
  contactAppId: 942,
});
```

本番用ファイルには、本番環境の担当者管理アプリIDを設定します。

環境別設定ファイルはViteのバンドルに含めず、案件管理アプリのJavaScriptカスタマイズ設定で、共通バンドルより先に読み込みます。

### 13.2 依存パッケージのインストール

```powershell
pnpm install
```

### 13.3 開発用ビルド

```powershell
pnpm run dev
```

現在の `dev` スクリプトは案件管理用のビルドを監視します。顧客管理用の変更は、次のコマンドでビルドできます。

```powershell
pnpm run build:customer
```

### 13.4 Live Server

VS CodeのLive ServerをHTTPSで起動します。

案件管理用：

```text
https://127.0.0.1:5500/dist/sfpack-customization.js
```

顧客管理用：

```text
https://127.0.0.1:5500/dist/customer-customization.js
```

※ ポート番号はLive Serverの設定に合わせます。localhostまたは127.0.0.1の証明書はmkcertで生成し、信頼ストアに登録します。

### 13.5 両アプリのビルド

```powershell
pnpm run build
```

### 13.6 テスト

```powershell
pnpm run test
```

---

## 6. kintoneへの適用

### PoC期間

- kintoneの動作テスト環境を使用する。
- JavaScriptはLive ServerのローカルHTTPS URLから読み込む。
- 案件管理と顧客管理で別々のJavaScriptを登録する。
- 案件管理では環境別設定ファイルを共通バンドルより先に登録する。
- フィールド設定は必要に応じてREST APIを利用して管理する。
- 本番環境への反映は行わない。

### アプリ別の登録

| アプリ | 登録するJavaScript |
|---|---|
| 案件管理 | 環境別 `staging.js` または `production.js` → `sfpack-customization.js` |
| 顧客管理 | `customer-customization.js` |

案件管理の独自CSSは、必要に応じて別途登録します。

### 本番リリース時

1. Viteで本番用ビルドを実行する。
2. 生成されたJavaScript・必要なCSSをkintoneに登録する。
3. 案件管理には本番用 `production.js` を共通バンドルより先に登録する。
4. 動作テスト環境で最終確認する。
5. アプリ設定を運用環境へ反映する。

本番環境にはlocalhostや127.0.0.1のURLを設定しません。

---

## 7. フォーム設定の管理

案件管理および顧客管理アプリのフィールド定義・レイアウトは、kintone REST APIを利用して取得・変更します。

### プレビュー環境のAPI

フィールド一覧：

```text
GET /k/v1/preview/app/form/fields.json
```

レイアウト：

```text
GET /k/v1/preview/app/form/layout.json
```

フィールド追加：

```text
POST /k/v1/preview/app/form/fields.json
```

レイアウト変更：

```text
PUT /k/v1/preview/app/form/layout.json
```

アプリ設定の運用環境への反映：

```text
POST /k/v1/preview/app/deploy.json
```

### フィールド追加用スクリプト

SFAパックの初期状態のアプリに対して、案件管理・顧客管理の追加フィールドを設定するためのスクリプトです。**通常のJavaScriptカスタマイズとして登録するファイルではなく、アプリ画面のブラウザー開発者ツール（Console）で一度実行するセットアップ用コード**です。

| 対象アプリ | ファイル | 主な追加内容 |
|---|---|---|
| 案件管理 | `scripts/add-deal-proposal-fields.js` | 担当者テーブル、共通明細テーブル、担当者別明細テーブル5個、管理フィールド5個 |
| 顧客管理 | `add-customer-hierarchy-fields.js` | 事業所階層・現場NG関連の5フィールド |
| 案件管理 | `add-proposal-financial-fields-post.js` | 共通明細と担当者別明細5テーブルへ金額・日付の計24フィールドを追加 |
| 明細管理（新規アプリ） | `create-proposal-detail-app.js` | 案件管理の定義を参照し、12フィールドを持つ新規アプリを作成 |

> **ファイル名について：** 案件管理用は、担当者テーブルと共通明細テーブルの追加にも対応した**修正版**を使用してください。配布ZIP内の `add-deal-proposal-fields-v2.js` を、リポジトリの `scripts/add-deal-proposal-fields.js` に置き換えて管理する想定です。旧版は共通明細テーブルが既に存在する前提のため、初期状態のアプリには使用できません。

**補足：** 初期セットアップ用の `add-deal-proposal-fields.js` だけでは最新のフォーム構成が完成するとは限りません。金額・日付の4列は `add-proposal-financial-fields-post.js` で追加します。担当者名管理フィールドやコピー履歴フィールドなど、上記スクリプトで作成しない設定は別途確認が必要です。

### 案件管理の金額・日付フィールド追加（`add-proposal-financial-fields-post.js`）

- **対象：** 案件管理アプリ。対象アプリの画面でブラウザーの開発者ツール（Console）から実行します。`kintone.app.getId()` で現在のアプリIDを取得するため、別アプリ上では実行しないでください。
- **前提：** 共通の `明細テーブル` と `担当者別明細01` ～ `担当者別明細05` が存在すること。初期テーブル構築後に実行します。
- **追加する列：** `見込み金額`（NUMBER）、`受注金額`（NUMBER）、`受注予定日`（DATE）、`受注日`（DATE）。共通明細はサフィックス `_0`、担当者別明細は `_01` ～ `_05` を付けたフィールドコードです。6テーブル × 4列 = **24フィールド**が対象です。
- **実行処理：** プレビュー設定のフィールド定義を取得し、存在しない列を1件ずつ `POST /k/v1/preview/app/form/fields.json` で追加します。既存列は型を確認し、同じ型ならスキップします。型が異なる場合は中断します。
- **実行後：** Consoleの追加結果と検証結果（24件）を確認し、フォーム編集画面で列の配置を確認してから、**手動で「アプリを更新」**します。このスクリプト自体はデプロイしません。
- **再実行時：** 同型の既存フィールドはスキップできますが、失敗後の状態を確認せずに繰り返し実行しないでください。既存フィールドの選択肢・表示設定等まで照合するスクリプトではありません。

### 明細管理アプリの新規作成（`create-proposal-detail-app.js`）

- **実行場所：** 追加済みの担当者別明細を持つ**案件管理アプリ**の画面のConsole。案件管理アプリの公開済みフィールド定義を `GET /k/v1/app/form/fields.json` で参照します。
- **前提：** `担当者別明細01` ～ `担当者別明細05` の5テーブルが公開済みで、各テーブルに `提案商品`・`確度`・`商談フェーズ` が存在し、同じ項目について型・選択肢が一致すること。金額・日付フィールド追加後は案件管理側で「アプリを更新」し、公開状態を揃えてから実行してください。
- **作成内容：** `明細管理アプリ` を新規作成し、`案件レコードID`、`担当者No`、`担当者名`、`提案商品`、`確度`、`商談フェーズ`、`見込み金額`、`受注金額`、`受注予定日`、`受注日`、`メモ`、`コピー元明細行ID` の**12フィールド**を追加します。商品・確度・商談フェーズは案件管理の設定を参照します。
- **実行処理：** `POST /k/v1/preview/app.json` でアプリを作成し、プレビューのフィールド追加APIで項目を設定した後、`POST /k/v1/preview/app/deploy.json` で**設定反映を開始**します。反映完了まで自動確認するコードではありません。
- **実行後：** Consoleに表示された新規アプリIDを控え、アプリ設定の反映完了、フィールドコードと型、閲覧・追加・編集権限を確認します。ステージング環境では `src/config/staging.js` の `proposalDetailAppId` に作成したアプリIDを設定し、案件管理のカスタマイズから参照できるようにします。
- **重要：** このスクリプトは**既存の明細管理アプリを検出・再利用しません**。再実行すると別の新規アプリを作成する可能性があります。エラー時はConsoleの「作成途中のアプリID」を確認し、重複作成を避けてください。

### 初期セットアップ時の推奨順序

1. 検証用の案件管理アプリで、初期テーブル作成用 `scripts/add-deal-proposal-fields.js` を実行し、必要なフォーム設定を確認して「アプリを更新」します。
2. 同じ案件管理アプリで `add-proposal-financial-fields-post.js` を実行し、24フィールドを検証して「アプリを更新」します。
3. 公開済みの担当者別明細5テーブルと必要な選択肢を確認後、案件管理アプリのConsoleで `create-proposal-detail-app.js` を**一度だけ**実行します。
4. 新規明細管理アプリの設定反映完了を確認し、アプリIDを環境別設定の `proposalDetailAppId` に設定します。
5. コピー履歴フィールド、担当者名管理フィールド、スペース要素ID、アクセス権など、スクリプトで自動作成しない設定を確認し、カスタマイズの動作をテストします。

> **既存のステージング環境では初期セットアップ手順を再実行しないでください。** 上記は新規環境を構築する場合の順序です。すでに明細管理アプリが存在する場合は、アプリIDとスキーマを照合して既存アプリを利用します。

### 実行前の準備

1. SFAパックの案件管理・顧客管理アプリを用意し、**動作テスト環境または検証用に複製したアプリ**で作業します。
2. フィールド・フォームレイアウトなどの既存設定をバックアップします。
3. 対象アプリの管理権限を持つユーザーでログインします。アプリ設定変更APIを利用できる権限が必要です。
4. 実行するアプリを確認し、該当するスクリプトの全文をテキストエディターで開きます。
5. **すでにカスタマイズ済みのアプリでは、安易に再実行しないでください。** 案件管理用スクリプトは追加対象が一部だけ存在すると安全のため中断します。既存のフィールド定義と重複・型の整合性を先に確認してください。

### 実行方法（ブラウザーの開発者ツール）

案件管理と顧客管理は**それぞれ対象アプリの画面を開いて**実行します。

1. kintoneで対象アプリの一覧画面などを開きます。
2. ブラウザーで `F12`（または `Ctrl + Shift + J`）を押し、開発者ツールの **Console** タブを開きます。
3. 対象スクリプトの**全文**をコピーしてConsoleに貼り付け、実行します。ブラウザーが貼り付けを制限する場合は、その警告内容を確認してください。内容を理解しているコードだけを実行してください。
4. 確認ダイアログが出たら、表示されたアプリIDと対象アプリを確認して続行します。
5. Consoleに成功ログが表示され、エラーが出ていないことを確認します。エラーが出た場合は繰り返し実行せず、内容と追加済みのフィールドを確認します。
6. kintoneの**アプリ設定 → フォーム**を開き、追加結果と配置を確認します。
7. 必要な手動設定を行った後、**「アプリを更新」**して設定を反映します。スクリプトは自動でアプリを更新しません。

#### 案件管理アプリ：追加内容

| 対象 | フィールドコード | 内容 |
|---|---|---|
| 担当者テーブル | `担当者テーブル` | 内部フィールド `担当者`、`担当者No_` |
| 共通明細テーブル | `明細テーブル` | 内部フィールド `提案商品_0`、`確度_0`、`商談フェーズ_0` |
| 担当者別明細 | `担当者別明細01` ～ `担当者別明細05` | 各テーブル内に `提案商品_01` ～ `_05`、`確度_01` ～ `_05`、`商談フェーズ_01` ～ `_05` |
| 管理フィールド | `明細担当者No_01` ～ `明細担当者No_05` | 担当者別明細と担当者の紐付けに利用 |

上記のテーブルと管理フィールドはスクリプトでフォーム上にも配置します。標準フィールドの `会社名` と `顧客No_` は追加しません。

**案件管理で必須の手動設定：** フォーム編集画面にスペースフィールドを2つ配置し、要素IDを次のとおり設定してください。

| スペースの要素ID | 用途 |
|---|---|
| `selPerson` | 担当者選択ボタンを表示する場所 |
| `copyProposalDetails` | 共通明細を担当者別明細へコピーするボタンを表示する場所 |

スペースはこのスクリプトでは追加しません。フォーム上の配置位置は利用者が操作しやすい場所を選びます。

**案件管理スクリプトの注意：** `kintone.app.getId()` で現在表示中のアプリIDを取得します。フィールド定義の一部だけが既存の場合は中断します。**全フィールドが既存の場合も、既存の型や選択肢が正しいかまでは検証しません**ので、別途フォーム設定を確認してください。

#### 顧客管理アプリ：追加内容

| フィールドコード | 種別 | 用途 |
|---|---|---|
| `office_id` | 文字列（1行） | 事業所ID（重複禁止） |
| `honsha_office_id` | 文字列（1行） | 本社の事業所ID |
| `parent_office_id` | 文字列（1行） | 直属の親事業所ID |
| `genba_ng` | チェックボックス | 本社の現場NG設定。選択肢は `現場NG` |
| `effective_genba_ng` | 文字列（1行） | 現場NG判定。初期値は `OK` |

顧客管理用スクリプトは**フィールドを追加しますが、フォーム上への配置は自動化していません**。アプリ設定のフォーム編集画面で5フィールドを適切な位置に配置してください。

**顧客管理スクリプトの注意：** 配布元の `add-customer-hierarchy-fields.js` には `APP_ID = 940` の固定指定が含まれる版があります。お客様環境では、事前に `const APP_ID = kintone.app.getId();` へ変更されていることを必ず確認してください。固定IDのままでは別環境で実行できません。また、既存フィールドと同じコードは追加をスキップしますが、既存の型や設定の一致までは保証しません。

### 設定反映後の確認

- 案件管理：担当者テーブル、共通明細テーブル、担当者別明細5テーブル、管理フィールド5個が表示される。
- 案件管理：`selPerson` と `copyProposalDetails` のスペースが配置され、要素IDが一致する。
- 顧客管理：階層・現場NG関連の5フィールドが配置され、フィールドコードと選択肢が一致する。
- 両アプリ：「アプリを更新」後、追加フィールドが利用できる。
- JavaScriptカスタマイズを別途登録後、担当者選択・明細コピー・現場NG連鎖更新を**テストデータ**で確認する。

### 運用上の注意

- 本手順は検証用の初期セットアップを想定しています。既存データがある運用アプリへの適用は、影響を確認してから実施してください。
- `getId()` を使う場合、**現在開いているアプリが変更対象**です。案件管理用コードを顧客管理アプリで実行しないよう注意してください。
- 追加用スクリプトはプレビュー環境のフォーム設定APIを使用します。実行後はアプリの更新操作が必要です。
- 顧客管理の `office_id` は重複禁止のため、既存データへの適用時には値の重複に注意してください。
- フィールド追加だけでは、カスタマイズ機能は動作しません。別途、環境別設定・ビルド済みJavaScriptの登録と必要なアクセス権設定を行ってください（「14. kintoneへの適用」を参照）。
- REST APIでのレコード更新には、実行ユーザーの権限が必要です。

---

## 8. GitHub運用

GitHubリポジトリ：

https://github.com/kojisatocybozu/kintone-sfpack-split

### ブランチ運用

- `main`：統合済みのコードを管理する。
- `feature/*`：機能開発用ブランチ。
- 開発・動作確認後、Pull Requestを通じて `main` へ統合する。

### 基本操作

変更確認：

```powershell
git status -sb
```

変更をステージング：

```powershell
git add .
```

コミット：

```powershell
git commit -m "Update feature description"
```

GitHubへPush：

```powershell
git push
```

開発開始時：

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/new-feature
```

### 管理対象

Gitで管理するもの：

- `src/`
- `scripts/`
- フィールド設定用スクリプト
- `package.json`
- `pnpm-lock.yaml`
- `vite.config.js`
- `README.md` と `README_dev.md`

原則としてGit管理しないもの：

- `node_modules/`
- `dist/`（運用方針に応じて管理対象とする場合を除く）
- 秘密鍵・証明書の秘密情報
- APIトークン
- 個人環境固有の設定

環境別設定ファイルにはアプリIDなどの公開情報のみを格納し、認証情報や秘密情報は格納しません。

---

## 9. 開発上の基本方針

本プロジェクトでは、以下を重視します。

- 機能ごとにソースコードを分割する。
- アプリごとにビルド成果物を分離する。
- 環境依存の設定値は環境別設定ファイルに分離する。
- フィールドコードは設定モジュールで管理する。
- API処理とUI処理を分離する。
- 必要に応じてKUCを使用する。
- kintone標準機能やプラグインで対応できる部分は標準機能・プラグインを優先する。
- kintone標準のデータ保存機構を利用する。
- 既存データを不用意に削除・変更しない。
- 開発・検証は動作テスト環境で行う。
- GitHubで変更履歴を管理する。
- PoCで確認できた機能と、本番運用で必要な品質要件を区別する。

## 明細管理アプリへのコピー機能の設定

- 案件管理側のエントリーポイント `src/main.js` から `src/features/proposalAppCopy.js` の `initializeProposalAppCopy()` を呼び出します。
- `src/config/fields.js` にコピー履歴のフィールドコードと `getProposalDetailAppId()` を定義します。
- 環境別設定は、案件管理用バンドルより**前**に読み込みます。

```javascript
// src/config/staging.js
window.SFPACK_CONFIG = Object.freeze({
  contactAppId: 942,
  proposalDetailAppId: 947,
});

// src/config/production.js（本番の明細管理アプリIDは未確定）
window.SFPACK_CONFIG = Object.freeze({
  contactAppId: 946,
  proposalDetailAppId: null,
});
```

案件管理アプリに `最終明細コピー日時`（日時）と `最終明細コピー実行者`（ユーザー選択）を用意します。明細管理アプリのフィールドコードと型は [README.md](README.md#担当者別明細のレコード化明細管理アプリ) を参照してください。

画面のボタンからREST APIを呼び出すため、コピー先の閲覧・追加・編集権限、コピー元の編集権限を確認します。`proposalDetailAppId: null` のまま本番実行しないでください。コピー途中でエラーになった場合はコンソールを確認し、コピー先の状態を点検してください。

---
