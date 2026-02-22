# 実装設計（初回実装）

## 実装アプローチ

### 全体方針

- `index.html` を唯一のHTMLファイルとし、3画面（記録・履歴・グラフ）を `<section>` で定義する
- 各 `<section>` の表示/非表示をJavaScriptで切り替えてSPAとして動作させる
- 依存関係は `main.ts` で一元的に組み立て、各モジュールに注入する

### 実装順序

以下の順序で実装する。下位レイヤーから上位レイヤーへ積み上げていく。

```
1. プロジェクトセットアップ
2. 型定義（src/types/）
3. リポジトリ層（src/repositories/）
4. サービス層（src/services/）
5. UIレイヤー（src/ui/）
6. エントリーポイント・ナビゲーション（main.ts）
7. スタイリング（style.css）
8. E2Eテスト（e2e/）
```

---

## プロジェクトセットアップ

### 使用パッケージ

| パッケージ | 用途 | インストール種別 |
|-----------|------|--------------|
| `vite` | ビルドツール | devDependencies |
| `typescript` | 言語 | devDependencies |
| `prettier` | フォーマッター | devDependencies |
| `@playwright/test` | E2Eテスト | devDependencies |
| `chart.js` | グラフ描画 | dependencies |

Pico CSS・Interフォントは CDN（`<link>` タグ）で読み込む。npmパッケージとしてはインストールしない。

### 設定ファイル

| ファイル | 内容 |
|---------|------|
| `vite.config.ts` | Viteの基本設定のみ（最小構成） |
| `tsconfig.json` | `strict: true` を有効化 |
| `.prettierrc` | `development-guidelines.md` 記載の設定値を使用 |
| `playwright.config.ts` | ベースURL・ブラウザ（Chromium）・テストディレクトリを設定 |

---

## ユーティリティ（`src/utils/date.ts`）

ローカルタイムゾーンの「今日」の日付文字列を取得する関数を定義する。`new Date().toISOString()` はUTCを返すため直接使用しない。

```typescript
export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

この関数をサービス層・UIレイヤーの「当日の日付」が必要な箇所で使用する。

---

## 型定義（`src/types/conditionLog.ts`）

```typescript
type WorkStyle = 'remote' | 'office' | 'business_trip' | 'day_off';

type ConditionLog = {
  id: string;
  logDate: string;       // YYYY-MM-DD
  updatedAt: string;     // ISO 8601
  mental: number;        // 1–5
  skin: number;          // 1–5
  brainFatigue: number;  // 1–5
  workStyle: WorkStyle;
  memo: string;
};
```

---

## リポジトリ層

### `src/repositories/conditionLogRepository.ts`（インターフェース）

```typescript
interface ConditionLogRepository {
  getAll(): ConditionLog[];
  getByDateRange(from: string, to: string): ConditionLog[];
  getByLogDate(logDate: string): ConditionLog | null;
  save(log: ConditionLog): void;
  delete(id: string): void;
}
```

### `src/repositories/localStorageConditionLogRepository.ts`（MVP実装）

- ストレージキー: `condition_logs`
- 全件を JSON 配列として1キーに保存
- `save()` は `getByLogDate()` で同日レコードを確認し、あれば同 `id` で上書き、なければ追加
- 各メソッドを `try/catch` で囲み、失敗時は `Error` をスロー

---

## サービス層（`src/services/conditionLogService.ts`）

### 責務

- 入力値のバリデーション
- `id`（`crypto.randomUUID()`）と `updatedAt`（`new Date().toISOString()`）の自動付与
- `logDate` 未指定時は `getTodayString()` で当日の日付を設定
- リポジトリへの委譲（保存・削除・取得すべてサービス層を経由する）

### バリデーションルール

| フィールド | ルール |
|-----------|--------|
| `mental` / `skin` / `brainFatigue` | 1以上5以下の整数 |
| `workStyle` | `'remote'` / `'office'` / `'business_trip'` / `'day_off'` のいずれか |
| `logDate` | YYYY-MM-DD 形式の文字列 |
| `memo` | 任意。未入力時は空文字 `''` とする |

---

## UIレイヤー

### `src/ui/logScreen.ts`（記録画面）

- 画面表示時に `logDate` が当日の記録を取得し、あれば既存値をフォームに初期表示・バッジ表示
- 保存ボタン押下時、バリデーションエラーがあれば該当フィールドにエラーメッセージを表示
- 保存成功後、フォームを初期化する。ただし当日の記録が存在する場合はその値を読み込み直し、記録済みバッジと上書き注記を表示した状態にする
- LocalStorageエラー時は画面上部にエラーバナーを表示し、5秒後に自動で非表示にする

### `src/ui/historyScreen.ts`（履歴画面）

- 画面表示時に全件取得し、新しい `logDate` 順にカード一覧を生成
- 削除: `window.confirm()` で確認ダイアログを表示し、OKなら `ConditionLogService.delete()` → 一覧を再描画
- 編集: モーダルを開き既存値を初期表示 → `ConditionLogService.save()` → 一覧を再描画
- 編集モーダルは `<dialog>` 要素を使用

### `src/ui/chartScreen.ts`（グラフ画面）

- Chart.js の `Chart` インスタンスを管理
- 画面表示時・フィルター変更時に既存の `Chart` インスタンスを `destroy()` してから新しいインスタンスを生成する（シンプルさ優先）
- 期間フィルターの日付計算（今日を含む過去N日間）:
  - 7日: 開始日 = 今日 - 6日、終了日 = 今日（計7日分）
  - 30日: 開始日 = 今日 - 29日、終了日 = 今日（計30日分）
  - 90日: 開始日 = 今日 - 89日、終了日 = 今日（計90日分）
  - カスタム: 開始日・終了日の日付ピッカー入力
- データが0件の場合はグラフを非表示にし「記録がありません」テキストを表示
- Chart.jsの設定:
  - `type: 'line'`
  - `spanGaps: false`（記録のない日は折れ線を途切れさせる）
  - datasets: mental・skin・brainFatigue の3本
  - 各折れ線の色はデザイントークンの値（`#8B5CF6` / `#F59E0B` / `#3B82F6`）を使用
- X軸ラベルは選択した期間の開始日〜終了日の連続した日付配列を生成して使用する
- 各日付に記録がある場合はレベル値を、ない場合は `null` を各datasetに渡す（`null` の点で折れ線が途切れる）

---

## スタイリング（`src/style.css`）

Pico CSSのインポートとCSS Variablesの定義に加え、以下のカスタムコンポーネントのスタイルを実装する。

| コンポーネント | 実装内容 |
|--------------|---------|
| ボトムナビゲーション | 下部固定・横並び・現在タブのハイライト（`--color-accent`） |
| 5段階評価ボタン | 数字ボタングループ・選択状態のアクセントカラー（`--color-accent` / `--color-accent-light`） |
| 勤務状態セグメントボタン | 4択横並びボタングループ・選択状態（`--color-accent` / `--color-accent-light`） |
| 記録済みバッジ | インラインバッジ（`--color-success`） |
| エラーメッセージ | 赤色インラインテキスト（`--color-error`） |

---

## エントリーポイント（`src/main.ts`）

```typescript
// 依存関係の組み立て
const repository = new LocalStorageConditionLogRepository();
const service = new ConditionLogService(repository);

// 各画面の初期化
const logScreen = new LogScreen(service);
const historyScreen = new HistoryScreen(service);
const chartScreen = new ChartScreen(service);

// ボトムナビゲーションのタブ切り替え
// 初期表示は記録画面
```

---

## `index.html` の構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <!-- Pico CSS（CDN） -->
  <!-- Inter フォント（Google Fonts） -->
</head>
<body class="pico">
  <main>
    <section id="screen-log">...</section>
    <section id="screen-history" hidden>...</section>
    <section id="screen-chart" hidden>...</section>
  </main>

  <nav id="bottom-nav">
    <button data-screen="log">記録</button>
    <button data-screen="history">履歴</button>
    <button data-screen="chart">グラフ</button>
  </nav>

  <!-- 編集モーダル -->
  <dialog id="edit-modal">...</dialog>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

## E2Eテスト（`e2e/condition-logging.spec.ts`）

テストシナリオの詳細・アサート条件・スクリーンショット手順は `requirements.md` の「E2Eテスト」セクションを参照。

### 実装方針

- 各テストの `beforeEach` で `localStorage.clear()` を実行し、データが空の状態から開始する
- 各ステップで `page.screenshot()` を呼び出し、`e2e/screenshots/` に保存する
- `playwright.config.ts` の `webServer` に `vite preview` を設定し、テスト実行時に自動起動する

```typescript
// playwright.config.ts のwebServer設定
webServer: {
  command: 'npm run build && npm run preview',
  url: 'http://localhost:4173',
  reuseExistingServer: !process.env.CI,
}
```
