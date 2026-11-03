# kintone SFA Pack Customization

`kintone-sfpack-split`

kintone SFAパックの案件管理アプリを対象としたJavaScriptカスタマイズプロジェクトです。

Viteによるバンドル、pnpmによるパッケージ管理、Kintone UI Component（KUC）によるUI構築を採用し、機能単位でソースコードを分割することで、保守性・拡張性の高い開発を目指します。

現在はPoC（Proof of Concept）フェーズです。

---

## 1. プロジェクト概要

### 目的

案件管理アプリにおいて、顧客に紐づく複数の担当者を選択し、担当者ごとに提案商品・確度・商談フェーズを管理できるようにする。

### 対象アプリ

| アプリ名 | App ID | 役割 |
|---|---:|---|
| 案件管理 | 941 | 案件情報・担当者・提案明細の管理 |
| 顧客管理 | 940 | 顧客情報の管理 |
| 担当者管理 | 942 | 顧客に紐づく担当者情報の管理 |
| 活動履歴 | 939 | 案件・顧客の活動履歴 |

### アプリ間の関連

- 案件管理の「会社名」は顧客管理アプリを参照するルックアップフィールド。
- 案件管理の「顧客No_」と顧客管理の「顧客No」で顧客を識別する。
- 担当者管理の「顧客No_」によって顧客と担当者を関連付ける。
- 担当者管理の「担当者No_」を担当者の識別キーとして使用する。

---

## 2. 開発環境

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

- npmは使用せず、パッケージ管理はpnpmに統一する。
- JavaScriptはES Modules形式で記述する。
- Viteで依存モジュールをバンドルする。
- kintone標準UIとの統一性を考慮し、KUCを優先的に使用する。
- kintone API処理、画面制御、UI部品を機能単位で分離する。
- ソースコードはGitHubで管理する。

---

## 3. フォルダ構成

```text
kintone-sfpack-split/
│
├── src/
│   ├── config/
│   │   └── fields.js
│   │
│   ├── api/
│   │   └── contacts.js
│   │
│   ├── features/
│   │   ├── contactSelector.js
│   │   └── proposalDetails.js
│   │
│   ├── ui/
│   │   └── dialog.js
│   │
│   ├── styles/
│   │   └── main.css
│   │
│   └── main.js
│
├── dist/
│   └── sfpack-customization.js
│
├── scripts/
│   └── add-deal-proposal-fields.js
│
├── .vscode/
│   └── settings.json
│
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── vite.config.js
├── .gitignore
└── README.md
```

※ 実際に存在するファイルを基準に管理し、今後の追加・変更に合わせて更新する。

### 各モジュールの役割

| ファイル | 役割 |
|---|---|
| `config/fields.js` | アプリID・フィールドコードの一元管理 |
| `api/contacts.js` | 担当者管理アプリからの担当者情報取得 |
| `features/contactSelector.js` | 担当者選択機能全体の制御 |
| `features/proposalDetails.js` | 担当者と明細テーブルの同期・表示制御 |
| `ui/dialog.js` | KUCによる担当者選択ダイアログ |
| `styles/main.css` | 必要最小限の独自CSS |
| `main.js` | 各機能のエントリーポイント |

---

## 4. Vite設定

### package.json

`type: module` を指定し、ES Modulesを使用する。

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### vite.config.js

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/main.js',
      name: 'SfpackCustomization',
      formats: ['iife'],
      fileName: () => 'sfpack-customization.js',
    },
    minify: false,
    sourcemap: true,
  },
});
```

kintoneに読み込ませるため、IIFE形式のJavaScriptを生成する。

---

## 5. 担当者選択機能

### 概要

案件管理アプリで顧客を選択すると、担当者選択ボタンを表示する。

ボタンをクリックすると、担当者管理アプリから対象顧客の担当者を取得し、KUCのダイアログで複数選択できる。

### 処理フロー

1. 案件管理アプリで顧客を選択。
2. 顧客Noを取得。
3. 担当者選択ボタンを表示。
4. 担当者管理アプリ（942）から該当担当者を取得。
5. KUC Dialog・Checkboxで担当者を選択。
6. 選択した担当者を案件管理の「担当者テーブル」に登録。

### 担当者選択仕様

| 項目 | 仕様 |
|---|---|
| 最大選択数 | 5名 |
| 選択方式 | チェックボックス |
| UI | KUC |
| 担当者識別 | 担当者No_ |
| 登録先 | 担当者テーブル |
| 重複登録 | 防止 |
| 空行 | 除外 |

### 関連フィールド

案件管理アプリ：

| フィールド名 | フィールドコード |
|---|---|
| 会社名 | 会社名 |
| 顧客No | 顧客No_ |
| 担当者テーブル | 担当者テーブル |
| 担当者名 | 担当者 |
| 担当者No | 担当者No_ |

担当者管理アプリ：

| フィールド名 | フィールドコード |
|---|---|
| 担当者No | 担当者No_ |
| 顧客No | 顧客No_ |
| お名前 | お名前 |
| 部署 | 部署 |
| 役職 | 役職 |
| メールアドレス | メールアドレス |

---

## 6. 担当者別明細管理

### 概要

担当者ごとに独立した提案明細テーブルを使用する。

kintoneではJavaScriptからテーブルフィールド自体を動的生成できないため、事前に5つのテーブルを作成している。

### 明細テーブル

| テーブル | 対応担当者 |
|---|---|
| 担当者別明細01 | 1人目 |
| 担当者別明細02 | 2人目 |
| 担当者別明細03 | 3人目 |
| 担当者別明細04 | 4人目 |
| 担当者別明細05 | 5人目 |

各テーブルには次の3項目を設ける。

- 提案商品
- 確度
- 商談フェーズ

### 担当者との紐付け

各テーブルに対応する担当者No管理フィールドを設ける。

```text
明細担当者No_01
明細担当者No_02
明細担当者No_03
明細担当者No_04
明細担当者No_05
```

### データ管理方針

- 担当者Noをキーとして明細テーブルを割り当てる。
- 担当者の解除時も明細データは保持する。
- 同じ担当者を再追加した場合は以前の明細を復元する。
- 明細データが残っている枠を別担当者に自動再利用しない。
- 1人の担当者につき複数の提案明細を登録可能とする。

---

## 7. KUC（kintone UI Component）

UIはkintone標準画面との統一性を重視し、KUCを優先的に使用する。

現在の利用状況：

| コンポーネント | 用途 | 状態 |
|---|---|---|
| Dialog | 担当者選択画面 | 実装済み |
| Checkbox | 担当者の複数選択 | 実装済み |
| Button | 担当者選択ボタン | KUC移行予定 |
| Dropdown | 担当者別明細の入力UI | 今後検討 |

公式ドキュメント：

https://ui-component.kintone.dev/ja/

---

## 8. ローカル開発手順

### 8.1 依存パッケージのインストール

```powershell
pnpm install
```

### 8.2 開発用ビルド

```powershell
pnpm run dev
```

Viteがソースコードの変更を監視し、distフォルダを再ビルドする。

### 8.3 Live Server

VS CodeのLive ServerをHTTPSで起動する。

kintoneに登録する開発用JavaScript URL：

```text
https://localhost:5500/dist/sfpack-customization.js
```

※ localhostの証明書はmkcertで生成し、Windowsの信頼ストアに登録する。

### 8.4 ビルド

```powershell
pnpm run build
```

---

## 9. kintoneへの適用

### PoC期間

- kintoneの動作テスト環境を使用する。
- JavaScriptはLive ServerのローカルHTTPS URLから読み込む。
- フィールド設定はREST APIを利用して管理する。
- 本番環境への反映は行わない。

### 本番リリース時

1. Viteで本番用ビルドを実行。
2. 生成されたJavaScript・CSSをkintoneにアップロード。
3. ローカルURLからアップロードファイルに切り替える。
4. 動作テスト環境で最終確認。
5. アプリを更新して運用環境へ反映。

本番環境にはlocalhostのURLを設定しないこと。

---

## 10. フォーム設定の管理

案件管理アプリのフィールド定義・レイアウトはkintone REST APIを利用して取得・変更する。

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

アプリ設定の本番反映：

```text
POST /k/v1/preview/app/deploy.json
```

本番反映APIは、PoCの動作確認が完了するまで実行しない。

フィールド定義やレイアウトを変更する場合は、既存設定をバックアップしてから実施する。

---

## 11. GitHub運用

GitHubリポジトリ：

https://github.com/kojisatocybozu/kintone-sfpack-split

### 基本操作

変更確認：

```powershell
git status
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
git pull
```

### 管理対象

Gitで管理するもの：

- src/
- scripts/
- config/
- package.json
- pnpm-lock.yaml
- vite.config.js
- README.md

原則としてGit管理しないもの：

- node_modules/
- dist/
- certs/
- 秘密鍵
- APIトークン
- 個人環境固有の設定

---

## 12. 現在のPoC実装状況

| 機能 | 状態 |
|---|---|
| 開発環境構築 | 完了 |
| pnpm + Vite | 完了 |
| HTTPS Live Server | 完了 |
| GitHub連携 | 完了 |
| フィールド定義管理 | 完了 |
| 担当者取得API | 完了 |
| KUC Dialog | 完了 |
| KUC Checkbox | 完了 |
| KUC Button | 移行予定 |
| 担当者選択機能 | 完了 |
| 担当者上限5名 | 完了 |
| 担当者テーブルへの登録 | 完了 |
| 空行除外・重複防止 | 完了 |
| 担当者別明細テーブル5個 | 作成済み |
| 担当者と明細の紐付け | 実装済み |
| 明細の表示・非表示 | 動作確認済み |
| 担当者解除時の明細保持 | 動作確認済み |
| 同一担当者の再追加・復元 | 動作確認済み |
| 保存・再編集 | 動作確認済み |
| 本番環境への反映 | 未実施 |

---

## 13. 今後の開発予定

優先順位を付けて、以下の順番で進める。

### 優先度：高

1. 担当者選択ボタンのKUC化
2. 顧客変更時の担当者・明細データ整合性対応
3. 担当者枠の再利用ルールの整備

### 優先度：中

4. 担当者別明細の見出し表示
5. 入力チェック・エラー処理の強化
6. Vitestによる単体テスト
7. ソースコードの整理・リファクタリング

### 優先度：後

8. PoCの評価・改善
9. 担当者上限の拡張検討
10. 本番リリース準備

---

## 14. 開発上の基本方針

本プロジェクトでは、以下を重視する。

- 機能ごとにソースコードを分割する。
- フィールドコードはfields.jsに集約する。
- API処理とUI処理を分離する。
- KUCを優先してUIを構築する。
- kintone標準のデータ保存機構を利用する。
- 既存データを不用意に削除・変更しない。
- 開発・検証は動作テスト環境で行う。
- GitHubで変更履歴を管理する。

**本プロジェクトは、PoCを通じて実用性を検証しながら、段階的に機能と品質を高めていく。**