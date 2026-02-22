# タスクリスト（初回実装）

## 進捗凡例

- `[ ]` 未着手
- `[x]` 完了

---

## 1. プロジェクトセットアップ

- [ ] `package.json` を作成し、依存パッケージ（vite・typescript・prettier・@playwright/test・chart.js）と以下のスクリプトを定義する
  - `"dev": "vite"`
  - `"build": "tsc && vite build"`
  - `"preview": "vite preview"`
- [ ] `npm install` を実行する
- [ ] `vite.config.ts` を作成する（最小構成）
- [ ] `tsconfig.json` を作成する（`strict: true`）
- [ ] `.prettierrc` を作成する
- [ ] `playwright.config.ts` を作成する（baseURL・Chromium・webServer設定）
  - webServer: `command: 'npm run build && npm run preview'`、`url: 'http://localhost:4173'`
- [ ] `.gitignore` を作成する
- [ ] `public/favicon.ico` を配置する（空ファイルでも可）
- [ ] `e2e/screenshots/` ディレクトリを作成する（`.gitkeep` を置く）

---

## 2. 型定義（`src/types/conditionLog.ts`）

- [ ] `WorkStyle` 型を定義する
- [ ] `ConditionLog` 型を定義する

---

## 3. ユーティリティ（`src/utils/date.ts`）

- [ ] `getTodayString()` 関数を実装する

---

## 4. リポジトリ層

- [ ] `src/repositories/conditionLogRepository.ts` にインターフェース `ConditionLogRepository` を定義する
- [ ] `src/repositories/localStorageConditionLogRepository.ts` に `LocalStorageConditionLogRepository` クラスを実装する
  - [ ] `getAll()` を実装する
  - [ ] `getByDateRange()` を実装する
  - [ ] `getByLogDate()` を実装する
  - [ ] `save()` を実装する（同日レコードがあれば上書き、なければ追加）
  - [ ] `delete()` を実装する
  - [ ] 各メソッドを `try/catch` で囲みエラー時に `Error` をスローする

---

## 5. サービス層（`src/services/conditionLogService.ts`）

- [ ] `ConditionLogService` クラスを実装する
  - [ ] コンストラクタで `ConditionLogRepository` を受け取る
  - [ ] `save()` を実装する（バリデーション・id/updatedAt 自動付与・logDate デフォルト設定）
  - [ ] `delete()` を実装する
  - [ ] `getAll()` を実装する
  - [ ] `getByDateRange()` を実装する
  - [ ] `getByLogDate()` を実装する

---

## 6. HTML（`index.html`）

- [ ] Pico CSS・Inter フォントの `<link>` タグを記述する
- [ ] `<section id="screen-log">` に記録画面のHTML構造を記述する
- [ ] `<section id="screen-history" hidden>` に履歴画面のHTML構造を記述する
- [ ] `<section id="screen-chart" hidden>` にグラフ画面のHTML構造を記述する
- [ ] `<nav id="bottom-nav">` にボトムナビゲーションを記述する
- [ ] `<dialog id="edit-modal">` に編集モーダルのHTML構造を記述する
- [ ] `<script type="module" src="/src/main.ts">` を記述する

---

## 7. スタイリング（`src/style.css`）

- [ ] Pico CSSのインポートを記述する
- [ ] CSS Variables（デザイントークン）を定義する
- [ ] ボトムナビゲーションのスタイルを実装する（下部固定・横並び・現在タブのハイライト）
- [ ] 5段階評価ボタンのスタイルを実装する（数字ボタングループ・選択状態）
- [ ] 勤務状態セグメントボタンのスタイルを実装する（4択横並び・選択状態）
- [ ] 記録済みバッジのスタイルを実装する
- [ ] エラーメッセージのスタイルを実装する
- [ ] エラーバナーのスタイルを実装する

---

## 8. UIレイヤー

### 8-1. 記録画面（`src/ui/logScreen.ts`）

- [ ] 画面表示時に当日の記録を取得し、フォームに初期表示・記録済みバッジ表示を実装する
- [ ] 5段階評価ボタン（メンタル・スキン・脳疲労）の選択処理を実装する
- [ ] 各メトリクスの選択中レベル定義ラベルをボタン下に表示する処理を実装する
- [ ] 勤務状態セグメントボタンの選択処理を実装する
- [ ] 日付ピッカーの変更時に選択日の既存記録を読み込み直す処理を実装する
- [ ] 保存ボタンの処理を実装する（バリデーション → 保存 → フォーム再初期化）
- [ ] バリデーションエラー時のエラーメッセージ表示を実装する
- [ ] LocalStorageエラー時のエラーバナー表示（5秒後自動非表示）を実装する

### 8-2. 履歴画面（`src/ui/historyScreen.ts`）

- [ ] 画面表示時に全件取得し、新しい `logDate` 順にカード一覧を生成する処理を実装する
- [ ] メモがある場合のみメモを表示する処理を実装する
- [ ] 削除ボタンの処理を実装する（`window.confirm()` → `delete()` → 一覧再描画）
- [ ] 編集ボタンの処理を実装する（`<dialog>` モーダルを開き既存値を初期表示）
- [ ] 編集モーダルの保存処理を実装する（`save()` → モーダルを閉じる → 一覧再描画）
- [ ] LocalStorageエラー時のエラーバナー表示（5秒後自動非表示）を実装する

### 8-3. グラフ画面（`src/ui/chartScreen.ts`）

- [ ] 初期表示を直近30日に設定する
- [ ] 画面表示時・フィルター変更時の `Chart` インスタンス管理を実装する（`destroy()` して再生成）
- [ ] 期間フィルター（7日・30日・90日・カスタム）の日付計算を実装する
- [ ] カスタム選択時に開始日・終了日の日付ピッカーを表示し、それ以外では非表示にする処理を実装する
- [ ] X軸用の連続日付配列を生成する処理を実装する
- [ ] 各日付に対して記録値または `null` を返す処理を実装する
- [ ] データが0件の場合に「記録がありません」を表示する処理を実装する
- [ ] Chart.js の設定（type・spanGaps・datasets・色）を実装する
- [ ] LocalStorageエラー時のエラーバナー表示（5秒後自動非表示）を実装する

---

## 9. エントリーポイント（`src/main.ts`）

- [ ] 依存関係の組み立て（リポジトリ・サービスのインスタンス生成）を実装する
- [ ] 各画面クラスの初期化を実装する
- [ ] ボトムナビゲーションのタブ切り替えロジックを実装する
- [ ] 初期表示として記録画面を表示する処理を実装する

---

## 10. 動作確認

- [ ] `npx tsc --noEmit` で型エラーがないことを確認する
- [ ] `npm run dev` で開発サーバーを起動し、ブラウザで基本動作を確認する
- [ ] 記録・履歴・グラフの全画面が正常に表示されることを確認する
- [ ] 記録の保存・上書き・削除・編集が正常に動作することを確認する
- [ ] ブラウザを閉じて再度開いてもデータが保持されていることを確認する

---

## 11. E2Eテスト（`e2e/condition-logging.spec.ts`）

- [ ] テストシナリオ 1（記録からグラフ反映の確認）を実装する
  - [ ] `beforeEach` で `localStorage.clear()` を実行する
  - [ ] ステップ1: 記録画面を開き `01-01-log-screen.png` を保存する
  - [ ] ステップ2: メンタル・スキン・脳疲労・勤務状態・メモを入力し `01-02-filled-form.png` を保存する
  - [ ] ステップ3: 保存ボタンをクリックし、記録済みバッジ「✓ 本日の記録は完了しています」が表示されることをアサートし `01-03-recorded-badge.png` を保存する
  - [ ] ステップ4: グラフ画面に切り替え、`<canvas>` 要素が表示されることをアサートし `01-04-chart.png` を保存する
- [ ] テストシナリオ 2（履歴編集の反映確認）を実装する
  - [ ] `beforeEach` で `localStorage.clear()` を実行する
  - [ ] ステップ1: 記録画面でメンタル=3・スキン=4・脳疲労=3・勤務状態=在宅を保存し `02-01-saved.png` を保存する
  - [ ] ステップ2: 履歴画面に切り替え、履歴カードにメンタル=3・スキン=4・脳疲労=3 が表示されることをアサートし `02-02-history.png` を保存する
  - [ ] ステップ3: 編集ボタンをクリックし、編集モーダルが開いていることをアサートし `02-03-edit-modal.png` を保存する
  - [ ] ステップ4: メンタルを3から5に変更して保存し、モーダルが閉じていることをアサートし `02-04-modal-closed.png` を保存する
  - [ ] ステップ5: 履歴カードにメンタル=5 が表示されることをアサートし `02-05-history-updated.png` を保存する
  - [ ] ステップ6: グラフ画面に切り替え、`<canvas>` 要素が表示されることをアサートし `02-06-chart.png` を保存する
- [ ] `npx playwright test` を実行する（playwright.config の webServer が自動的にビルド・起動する）
- [ ] 全シナリオがパスすることを確認する
- [ ] `e2e/screenshots/` にスクリーンショットが保存されていることを確認する
