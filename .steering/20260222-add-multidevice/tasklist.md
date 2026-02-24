# タスクリスト（複数デバイス対応）

## 事前作業（開発者が手動で行う）

- [ ] Supabaseプロジェクトを作成する
- [ ] Supabase SQL Editorで `design.md` のSQLを実行する（テーブル作成・RLS設定）
- [ ] Supabase AuthでAuthentication > Sign In / Up > Sign upsを「Disabled」にする
- [ ] Supabase Authでユーザーアカウントを手動作成する（Authentication > Users > Add user）
- [ ] `.env.local` を作成し、SupabaseのURLとAnon Keyを設定する
- [ ] GitHubリポジトリのSettings > Secrets > ActionsにVITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを登録する
- [ ] GitHubリポジトリのSettings > PagesでSourceを「GitHub Actions」に設定する

---

## 実装タスク

### T01: パッケージ追加
- [ ] `npm install @supabase/supabase-js` を実行する
- [ ] `package.json` に `@supabase/supabase-js` が追加されていることを確認する

### T02: 環境設定ファイル
- [ ] `.env.local.example` を作成する
- [ ] `.gitignore` に `.env.local` を追加する

### T03: vite.config.ts の変更
- [ ] `base: '/condition-logging/'` を追加する

### T04: Supabaseクライアント実装
- [ ] `src/lib/supabaseClient.ts` を作成する

### T05: ConditionLogRepository インターフェースの非同期化
> **注意: T06 → T07 → T08 → T08b の順に続けて実施すること。途中で止めると型エラーが残る。**
- [ ] `src/repositories/conditionLogRepository.ts` の全メソッドを `Promise` 返却に変更する

### T06: LocalStorageConditionLogRepository の非同期化
> **依存: T05 完了後に実施する**
- [ ] `src/repositories/localStorageConditionLogRepository.ts` の全メソッドを `Promise.resolve()` でラップする

### T07: ConditionLogService の非同期化
> **依存: T06 完了後に実施する**
- [ ] `src/services/conditionLogService.ts` の全メソッドを `async/await` に変更する

### T08: UIレイヤーの非同期化
> **依存: T07 完了後に実施する**
- [ ] `src/ui/logScreen.ts` のサービス呼び出しを `await` に変更する
- [ ] `src/ui/historyScreen.ts` のサービス呼び出しを `await` に変更する
- [ ] `src/ui/chartScreen.ts` のサービス呼び出しを `await` に変更する

### T08b: 非同期化後の型チェック
> **依存: T08 完了後に実施する**
- [ ] `npm run build` を実行してTypeScriptコンパイルエラーがないことを確認する

### T09: SupabaseConditionLogRepository 実装
- [ ] `src/repositories/supabaseConditionLogRepository.ts` を作成する
- [ ] `getAll()` / `getByDateRange()` / `getByLogDate()` / `save()` / `delete()` を実装する
- [ ] `save()` 内で `supabase.auth.getUser()` から `user_id` を取得してUPSERTする

### T10: authScreen.ts 実装
- [ ] `src/ui/authScreen.ts` を作成する
- [ ] サインインフォームのsubmitで `supabase.auth.signInWithPassword()` を呼ぶ
- [ ] ボタン押下中は `disabled` にする
- [ ] 失敗時はインラインエラーを表示する

### T11: index.html の変更
- [ ] ログイン画面セクション（`#screen-auth`）を追加する
- [ ] サインアウトボタン（`#sign-out-btn`）を追加する
- [ ] `#screen-log` と `#bottom-nav` に `hidden` 属性を付ける
- [ ] ネットワークエラーバナー要素（`#network-error-banner`）を追加する（初期状態は `hidden`）

### T12: style.css の変更
- [ ] ログイン画面（`#screen-auth`）のスタイルを追加する（縦横センタリング、max-width: 360px）
- [ ] サインアウトボタン（`.sign-out-btn`）のスタイルを追加する（固定右上配置）
- [ ] ネットワークエラーバナーのスタイルを追加する（画面上部固定、既存のエラーバナーと同じ見た目）

### T13: main.ts の変更
- [ ] 起動時に `supabase.auth.getSession()` でセッション確認する
- [ ] `supabase.auth.onAuthStateChange()` で画面切り替えを実装する
- [ ] リポジトリを `SupabaseConditionLogRepository` に切り替える
- [ ] サインアウトボタンのクリックハンドラを追加する
- [ ] ネットワークエラーバナーの表示ユーティリティを実装する（バナーを表示し5秒後に自動消去）
- [ ] 各UIスクリーンのサービス呼び出しがエラーをスローした際にバナーを表示する仕組みを組み込む

### T14: GitHub Actions ワークフロー作成
- [ ] `.github/workflows/deploy.yml` を作成する

### T15: docs/repository-structure.md の更新
- [ ] `src/lib/` ディレクトリと `supabaseClient.ts` を追記する
- [ ] `src/repositories/supabaseConditionLogRepository.ts` を追記する
- [ ] `src/ui/authScreen.ts` を追記する

### T16: E2Eテストの認証対応
- [ ] Playwright の `page.route()` で Supabase 認証エンドポイントをモックする
  - `POST /auth/v1/token` （サインイン成功レスポンス）
  - `GET /auth/v1/user` （ユーザー情報レスポンス）
- [ ] Playwright の `page.route()` で Supabase REST エンドポイントをモックする
  - `GET /rest/v1/condition_logs` （一覧取得）
  - `POST /rest/v1/condition_logs` （UPSERT）
  - `DELETE /rest/v1/condition_logs` （削除）
- [ ] 認証済み状態が必要なテストでは、ページ読み込み前に `localStorage` へ Supabase のフェイクセッションをセットするヘルパーを用意する
- [ ] 既存のE2Eテストシナリオをログイン画面対応に更新する（サインインステップを追加、またはフェイクセッションで認証済み状態にする）
- [ ] サインイン失敗時のインラインエラー表示を確認するテストシナリオを追加する

---

## 動作確認タスク

### V01: ローカル動作確認
- [ ] `.env.local` を用意した状態で `npm run dev` を実行する
- [ ] ログイン画面が表示されることを確認する
- [ ] 正しい認証情報でサインインできることを確認する
- [ ] 誤った認証情報でエラーが表示されることを確認する
- [ ] 記録・履歴・グラフの各画面が正常に動作することを確認する
- [ ] サインアウトでログイン画面に戻ることを確認する
- [ ] ページリロード後にセッションが維持されることを確認する

### V02: デプロイ確認（事前作業完了後）
- [ ] `main` ブランチにpushしてGitHub Actionsが成功することを確認する
- [ ] GitHub PagesのURLにアクセスしてアプリが表示されることを確認する
- [ ] 本番環境でサインイン・各画面操作・サインアウトが正常に動作することを確認する
- [ ] **手動確認** 別のデバイス（スマートフォンなど）からサインインし、同じデータが表示されることを確認する
