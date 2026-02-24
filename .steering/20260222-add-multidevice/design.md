# 設計（複数デバイス対応）

## 実装方針

- リポジトリパターンを活かし、`SupabaseConditionLogRepository` を追加する
- `main.ts` でリポジトリの切り替えを行う（LocalStorage → Supabase）
- 認証状態の管理は `main.ts` が担い、UIレイヤーは認証を意識しない
- `ConditionLogRepository` インターフェースの全メソッドを非同期（`Promise`）に変更する
  - `LocalStorageConditionLogRepository` は `Promise.resolve()` でラップして対応
  - `ConditionLogService` の全メソッドを `async/await` に変更
  - 全UIレイヤー（`logScreen.ts` / `historyScreen.ts` / `chartScreen.ts`）のサービス呼び出しを `await` に変更

---

## Supabase セットアップ SQL

Supabaseダッシュボードの「SQL Editor」で以下を実行する。

```sql
-- テーブル作成
CREATE TABLE condition_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id),
  log_date      date        NOT NULL,
  updated_at    timestamptz NOT NULL,
  mental        smallint    NOT NULL CHECK (mental BETWEEN 1 AND 5),
  skin          smallint    NOT NULL CHECK (skin BETWEEN 1 AND 5),
  brain_fatigue smallint    NOT NULL CHECK (brain_fatigue BETWEEN 1 AND 5),
  work_style    text        NOT NULL CHECK (work_style IN ('remote', 'office', 'business_trip', 'day_off')),
  memo          text        NOT NULL DEFAULT '',
  UNIQUE (user_id, log_date)
);

-- 行レベルセキュリティの有効化
ALTER TABLE condition_logs ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分のデータにのみアクセスできる
CREATE POLICY "自分のデータのみアクセス可"
  ON condition_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 変更・追加するファイル

### 追加ファイル

| ファイル | 役割 |
|----------|------|
| `src/lib/supabaseClient.ts` | Supabaseクライアントのシングルトン |
| `src/repositories/supabaseConditionLogRepository.ts` | Supabase実装のリポジトリ |
| `src/ui/authScreen.ts` | ログイン画面のUIロジック |
| `.github/workflows/deploy.yml` | GitHub Actionsデプロイワークフロー |
| `.env.local` | ローカル開発用の環境変数（gitignore対象） |
| `.env.local.example` | 環境変数のテンプレート（コミット対象） |

### 変更ファイル

| ファイル | 変更内容 |
|----------|---------|
| `vite.config.ts` | `base: '/condition-logging/'` を追加 |
| `index.html` | ログイン画面セクション・サインアウトボタンを追加 |
| `src/style.css` | ログイン画面・サインアウトボタンのスタイルを追加（詳細は後述） |
| `src/main.ts` | 認証フロー・リポジトリ切り替えを実装 |
| `src/repositories/conditionLogRepository.ts` | 全メソッドを `Promise` 返却に変更 |
| `src/repositories/localStorageConditionLogRepository.ts` | 全メソッドを `Promise.resolve()` でラップ |
| `src/services/conditionLogService.ts` | 全メソッドを `async/await` に変更 |
| `src/ui/logScreen.ts` | サービス呼び出しを `await` に変更 |
| `src/ui/historyScreen.ts` | サービス呼び出しを `await` に変更 |
| `src/ui/chartScreen.ts` | サービス呼び出しを `await` に変更 |
| `package.json` | `@supabase/supabase-js` を追加 |
| `.gitignore` | `.env.local` を追加 |
| `docs/repository-structure.md` | `src/lib/` ディレクトリと新規ファイルを追記 |

---

## 各ファイルの実装内容

### `src/lib/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### `src/repositories/supabaseConditionLogRepository.ts`

Supabaseが返すスネークケースのカラム名とTypeScriptのキャメルケースをマッピングする。

**DBカラム名 ↔ TypeScript型のマッピング**

| DBカラム | TypeScript |
|----------|-----------|
| `log_date` | `logDate` |
| `updated_at` | `updatedAt` |
| `brain_fatigue` | `brainFatigue` |
| `work_style` | `workStyle` |

**主なメソッドの実装方針**

- `getAll()` — `SELECT * FROM condition_logs ORDER BY log_date DESC`
- `getByDateRange()` — `WHERE log_date BETWEEN from AND to`
- `getByLogDate()` — `WHERE log_date = logDate LIMIT 1`
- `save()` — `supabase.auth.getUser()` で現在のユーザーIDを取得し `user_id` に設定してUPSERT（IDをPKとして使用。同日レコードはサービス層が同IDを渡すため自然に上書きされる）
- `delete()` — `DELETE WHERE id = id`
- 各メソッドはSupabaseのエラーを`catch`し、`Error`をスローする

---

### `src/ui/authScreen.ts`

- フォームのsubmitで `supabase.auth.signInWithPassword({ email, password })` を呼ぶ
- 成功時は何もしない（`main.ts` の `onAuthStateChange` が `SIGNED_IN` を検知して画面切り替えを行う）
- サインインボタン押下中（Supabaseの応答待ち）はボタンを `disabled` にして連打を防ぐ。応答後（成功・失敗いずれも）`disabled` を解除する
- 失敗時はフォーム下部にエラーメッセージをインライン表示する
  - Supabaseのエラーコードによらず「メールアドレスまたはパスワードが正しくありません」と表示する（セキュリティ上の理由で詳細なエラーは表示しない）

---

### `src/main.ts` の変更

**起動時の認証フロー**

```
1. supabase.auth.getSession() でセッション確認
   ├─ セッションあり → メインアプリを表示（記録画面から開始）
   └─ セッションなし → ログイン画面を表示

2. supabase.auth.onAuthStateChange() でセッション変化を監視
   ├─ SIGNED_IN  → メインアプリを表示
   └─ SIGNED_OUT → ログイン画面を表示
```

**リポジトリの切り替え**

```typescript
// LocalStorageRepositoryの代わりにSupabaseRepositoryを使用
const repository = new SupabaseConditionLogRepository();
const service = new ConditionLogService(repository);
```

**サインアウト処理**

- サインアウトボタンのクリックで `supabase.auth.signOut()` を呼ぶ
- `onAuthStateChange` が `SIGNED_OUT` を検知し、自動でログイン画面に切り替わる

---

### `index.html` の変更

**ログイン画面の追加**

```html
<section id="screen-auth">
  <h1 class="auth-title">コンディションログ</h1>
  <form id="auth-form" novalidate>
    <label for="auth-email">メールアドレス</label>
    <input type="email" id="auth-email" autocomplete="email" required />
    <label for="auth-password">パスワード</label>
    <input type="password" id="auth-password" autocomplete="current-password" required />
    <button type="submit" id="auth-submit-btn">サインイン</button>
    <p id="auth-error" class="field-error" hidden></p>
  </form>
</section>
```

**サインアウトボタンの追加**

メインアプリ画面の右上（`<main>` の外、固定配置）に小さいサインアウトボタンを配置する。

```html
<button type="button" id="sign-out-btn" class="sign-out-btn" hidden>サインアウト</button>
```

**初期表示の変更**

- `<section id="screen-log">` は `hidden` 属性を付けてデフォルト非表示にする
- `<nav id="bottom-nav">` も `hidden` 属性を付けてデフォルト非表示にする
- `#screen-auth` のみ初期表示とし、サインイン後にメインアプリに切り替える

---

### `vite.config.ts` の変更

```typescript
export default defineConfig({
  base: '/condition-logging/',
});
```

---

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

### `src/style.css` の変更

**ログイン画面のスタイル**

- `#screen-auth` は `min-height: 100dvh` + `flexbox` で縦横センタリング
- フォームの最大幅は `360px`（スマートフォンでも見やすい幅）

**サインアウトボタンのスタイル**

- `.sign-out-btn` は `position: fixed; top: 1rem; right: 1rem;` で画面右上に固定配置
- 小さめのテキストボタン（`background: transparent; border: none;`）
- アクセントカラー（`var(--color-accent)`）でテキスト表示

---

### `.env.local.example`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 実装順序

1. `package.json` に `@supabase/supabase-js` を追加・インストール
2. `.env.local` / `.env.local.example` / `.gitignore` の設定
3. `vite.config.ts` に `base` を追加
4. `src/lib/supabaseClient.ts` を実装
5. `src/repositories/supabaseConditionLogRepository.ts` を実装
6. `src/ui/authScreen.ts` を実装
7. `index.html` を変更（ログイン画面・サインアウトボタン追加）
8. `src/style.css` にログイン画面・サインアウトボタンのスタイルを追加
9. `src/main.ts` を変更（認証フロー・リポジトリ切り替え）
10. `.github/workflows/deploy.yml` を作成
11. 動作確認（ローカル）
12. GitHub Secrets・GitHub Pages設定後にpushしてデプロイ確認
