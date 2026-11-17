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
│   └── add-customer-hieararchy-fields.js
│   └── add-deal-fields.js
│   └── create-proposal-detail-app.js
│
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
