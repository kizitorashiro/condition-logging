# 開発ガイドライン

## コーディング規約

### フォーマッター

Prettierを使用してコードフォーマットを自動統一する。VS Codeの「保存時に自動フォーマット」を有効にして使う。
ESLintは使用しない。

Prettierの設定（`.prettierrc`）：

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 全般

- インデントはスペース2つ（Prettierで自動統一）
- 文字コードはUTF-8
- 改行コードはLF
- ファイル末尾に空行を1つ置く
- `console.log` はデバッグ用途のみ。リリース前に削除する（エラーログの `console.error` は残してよい）

### TypeScript

- `strict: true` を有効にする（`tsconfig.json` で設定）
- `any` 型の使用は原則禁止。型が不明な場合は `unknown` を使い、適切に型ガードする
- アプリ全体で共有する型は `src/types/` に定義する
- 特定のファイル内でのみ使用する局所的な型（関数の引数の形など）は、そのファイル内にインラインで定義してよい
- `interface` よりも `type` を優先して使用する
- 関数の戻り値の型は明示的に書く
- `null` と `undefined` は混在させず、存在しない値の表現は `null` に統一する
- 非nullアサーション演算子（`!`）は使用禁止。必ず `null` チェックを書く

### インポート順序

`import` 文は以下の順序で記述し、グループ間に空行を入れる。

```typescript
// 1. 外部ライブラリ
import Chart from 'chart.js/auto';

// 2. 内部モジュール（types → repositories → services → ui の順）
import type { ConditionLog } from '../types/conditionLog';
import { LocalStorageConditionLogRepository } from '../repositories/localStorageConditionLogRepository';
```

```typescript
// Good
function getLog(date: string): ConditionLog | null { ... }

// Bad
function getLog(date: string) { ... }  // 戻り値型なし
```

### DOM操作

- `document.getElementById` よりも `document.querySelector` を優先して使用する
- 要素が存在しない可能性がある場合は `null` チェックを必ず行う
- イベントリスナーは画面の初期化関数内でまとめて登録する

```typescript
// Good
const btn = document.querySelector<HTMLButtonElement>('#save-btn');
if (!btn) return;
btn.addEventListener('click', handleSave);
```

---

## 命名規則

### ファイル名

| 対象 | 規則 | 例 |
|------|------|-----|
| TypeScriptファイル | camelCase | `conditionLogService.ts` |
| CSSファイル | kebab-case | `style.css` |

### TypeScript

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `conditionLog`, `getByDate()` |
| 型・インターフェース | PascalCase | `ConditionLog`, `WorkStyle` |
| 定数 | UPPER_SNAKE_CASE | `STORAGE_KEY` |
| クラス | PascalCase | `LocalStorageConditionLogRepository` |
| プライベートメソッド | `private` キーワードを使用。`_` 接頭辞はつけない | `private validate()` |

### HTML / CSS

| 対象 | 規則 | 例 |
|------|------|-----|
| `id` 属性 | kebab-case | `id="save-btn"` |
| `class` 属性 | kebab-case | `class="rating-btn"` |
| CSS Variables | kebab-case（`--` 接頭辞） | `--color-accent` |
| CSS クラス | kebab-case | `.rating-btn--selected` |

---

## スタイリング規約

### 基本方針

- Pico CSS（Class-conditional版）をベースとし、カスタムCSSはデザイントークン（CSS Variables）経由で行う
- MVPでは `src/style.css` 1ファイルにすべてのスタイルを集約する。HTML要素のインラインスタイル（`style=""`）は使わない
- 将来コンポーネントが増えてファイルの見通しが悪くなった場合は、コンポーネントごとのCSSファイルを `src/ui/` 以下に配置することを検討する
- Pico CSSが提供するクラス（`.pico`・`[data-theme]` 等）はそのまま使用する
- Pico CSSでカバーできないカスタムコンポーネント（5段階評価ボタン・勤務状態セグメントボタン・ボトムナビゲーション等）にのみBEM記法（Block__Element--Modifier）でクラスを定義する

```css
/* Block */
.rating-btn { }

/* Block__Element */
.rating-btn__label { }

/* Block--Modifier */
.rating-btn--selected { }
```

### デザイントークン（CSS Variables）

`src/style.css` の先頭に以下の変数を定義し、全体で使用する。

```css
:root {
  /* カラー */
  --color-bg:           #F9F8F6;  /* ページ背景 */
  --color-surface:      #FFFFFF;  /* カード・モーダル背景 */
  --color-text:         #1A1A1A;  /* メインテキスト */
  --color-text-sub:     #6B7280;  /* サブテキスト・ラベル */
  --color-accent:       #8B5CF6;  /* アクセント・選択状態 */
  --color-accent-light: #EDE9FE;  /* 選択状態の背景色 */
  --color-border:       #E5E7EB;  /* ボーダー・区切り線 */
  --color-error:        #EF4444;  /* エラーメッセージ */
  --color-success:      #10B981;  /* 記録済みバッジ */

  /* グラフ（Chart.js 折れ線の色） */
  --color-chart-mental:      #8B5CF6;  /* メンタル（パープル） */
  --color-chart-skin:        #F59E0B;  /* スキン（アンバー） */
  --color-chart-brain:       #3B82F6;  /* 脳疲労（ブルー） */

  /* タイポグラフィ */
  --font-family:        'Inter', sans-serif;
  --font-size-base:     16px;
  --font-size-sm:       14px;
  --font-size-lg:       20px;
  --font-weight-normal: 400;   /* 本文 */
  --font-weight-medium: 500;   /* ラベル・強調 */
  --font-weight-bold:   600;   /* 見出し */

  /* 余白 */
  --spacing-sm:         8px;
  --spacing-md:         16px;
  --spacing-lg:         24px;

  /* 形状 */
  --radius:             10px;
  --shadow:             0 1px 3px rgba(0, 0, 0, 0.08);
}
```

### フォントの適用

`:root` で `--font-family` を定義し、`body` に適用する。これにより全要素に継承される。

```css
body {
  font-family: var(--font-family);
}
```

### レスポンシブ対応

MVPではブレークポイントを定義しない。ボトムナビゲーション統一・シンプルレイアウトの方針により、スマートフォン・PCで同じレイアウトを使用する。必要になった時点でブレークポイントを追加する。

### カラーの使用ルール

- 色の値（`#8B5CF6` など）をCSSに直接書かない。必ずCSS Variablesを経由する
- デザイントークンに定義されていない色が必要な場合は、トークンに追加してから使用する

---

## Git規約

### ブランチ戦略

個人開発のため、`main` ブランチ1本で開発する。

### コミットメッセージ

以下のプレフィックスを使って種別を明示する。

| プレフィックス | 用途 | 例 |
|--------------|------|-----|
| `feat:` | 新機能の追加 | `feat: 記録画面の5段階評価ボタンを実装` |
| `fix:` | バグ修正 | `fix: 保存後にフォームがリセットされない問題を修正` |
| `docs:` | ドキュメントのみの変更 | `docs: 機能設計書にグラフ仕様を追記` |
| `style:` | コードの動作に影響しないスタイル変更 | `style: インデントを修正` |
| `refactor:` | バグ修正・機能追加を伴わないリファクタリング | `refactor: リポジトリ層のメソッドを整理` |
| `chore:` | ビルドプロセスや補助ツールの変更 | `chore: Viteの設定を更新` |

### コミットの粒度

- 1コミット1つの変更に留める
- `tasklist.md` の1タスク完了ごとにコミットすることを目安にする

---

## テスト規約

- E2EテストにPlaywrightを使用する
- テストファイルは `e2e/` ディレクトリに配置する
- ユニットテスト・統合テストはMVPでは書かない
- テストシナリオは `.steering/[日付]-[タイトル]/requirements.md` の「E2Eテスト」セクションに記載する
