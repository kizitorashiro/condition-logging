# リポジトリ構造定義書

## ディレクトリ構成

```
condition-logging/
├── index.html                        # アプリエントリーHTML
├── public/                           # 静的ファイル（Viteがそのまま配信）
│   └── favicon.ico
├── src/                              # アプリケーションソースコード
│   ├── main.ts                       # エントリーポイント・画面ルーティング
│   ├── style.css                     # グローバルスタイル（Pico CSSインポート・CSS Variables定義）
│   ├── ui/                           # UIレイヤー（画面描画・イベント処理）
│   │   ├── logScreen.ts              # 記録画面
│   │   ├── historyScreen.ts          # 履歴画面
│   │   └── chartScreen.ts            # グラフ画面
│   ├── services/                     # サービス層（ビジネスロジック・バリデーション）
│   │   └── conditionLogService.ts
│   ├── repositories/                 # リポジトリ層（データアクセス）
│   │   ├── conditionLogRepository.ts               # インターフェース定義
│   │   └── localStorageConditionLogRepository.ts   # LocalStorage実装（MVP）
│   ├── utils/                        # ユーティリティ関数
│   │   └── date.ts                   # 日付関連ユーティリティ（getTodayString等）
│   └── types/                        # 型定義
│       └── conditionLog.ts
├── e2e/                              # E2Eテスト（Playwright）
│   ├── condition-logging.spec.ts     # メインテストシナリオ
│   └── screenshots/                  # テスト実行時のスクリーンショット（エビデンス）
├── docs/                             # 永続的ドキュメント
│   ├── product-requirements.md       # プロダクト要求定義書
│   ├── functional-design.md          # 機能設計書
│   ├── architecture.md               # 技術仕様書
│   ├── repository-structure.md       # リポジトリ構造定義書（本ファイル）
│   ├── development-guidelines.md     # 開発ガイドライン
│   └── glossary.md                   # ユビキタス言語定義
├── .steering/                        # 作業単位のドキュメント
│   └── YYYYMMDD-[開発タイトル]/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
├── package.json                      # 依存パッケージ定義
├── tsconfig.json                     # TypeScript設定
├── vite.config.ts                    # Vite設定
├── .gitignore
└── CLAUDE.md                         # AIエージェント向けプロジェクトメモリ
```

---

## 各ディレクトリ・ファイルの役割

### `index.html`
Viteのエントリーポイントとなる唯一のHTMLファイル。
`<div id="app">` をマウントポイントとして定義し、`src/main.ts` を読み込む。

### `public/`
Viteがビルド時にそのまま出力先にコピーする静的ファイル置き場。
ファビコンなど加工不要なファイルを配置する。

### `src/main.ts`
アプリケーションのエントリーポイント。以下を担う。
- 依存関係の組み立て（リポジトリ・サービスのインスタンス生成）
- ボトムナビゲーションのタブ切り替えロジック
- 初期画面の表示

### `src/style.css`
アプリ全体のグローバルスタイル。
- Pico CSS のインポート
- CSS Variables（デザイントークン）の定義
- ボトムナビゲーション・5段階評価ボタン・セグメントボタンなどのカスタムコンポーネントのスタイル

### `src/ui/`
各画面のDOM生成・イベント処理を担うUIレイヤー。
サービス層を通じてデータを操作し、リポジトリの実装詳細は知らない。

| ファイル | 役割 |
|---------|------|
| `logScreen.ts` | 記録フォームの描画・バリデーションエラー表示・保存処理の呼び出し |
| `historyScreen.ts` | 履歴一覧の描画・編集モーダルの開閉・削除確認ダイアログ |
| `chartScreen.ts` | Chart.jsを使った折れ線グラフの描画・期間フィルタリング |

### `src/services/`
ビジネスロジックを担うサービス層。UIとリポジトリの間に位置する。

| ファイル | 役割 |
|---------|------|
| `conditionLogService.ts` | 入力バリデーション・id/updatedAt の自動付与・1日1件ルールの制御 |

### `src/repositories/`
データアクセスを担うリポジトリ層。

| ファイル | 役割 |
|---------|------|
| `conditionLogRepository.ts` | `ConditionLogRepository` インターフェースの定義 |
| `localStorageConditionLogRepository.ts` | LocalStorageを使ったMVP実装 |

### `src/types/`
アプリ全体で共有する型定義。

| ファイル | 役割 |
|---------|------|
| `conditionLog.ts` | `ConditionLog` 型・`WorkStyle` 列挙型の定義 |

---

## ファイル配置ルール

- `src/ui/` には画面単位のファイルのみ配置する。複数画面で共通利用するDOM部品が生じた場合は `src/ui/components/` を作成して配置する
- `src/repositories/` に将来バックエンドAPI実装を追加する場合は `apiConditionLogRepository.ts` として同ディレクトリに配置する
- 型定義は `src/types/` に集約する。各レイヤーのファイル内に型をインラインで定義しない
- ドキュメントは `docs/`（永続的）と `.steering/`（作業単位）を厳密に使い分ける
