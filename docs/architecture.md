# 技術仕様書

## テクノロジースタック

### MVP構成

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| 言語 | TypeScript | 最新安定版 | アプリケーション全体 |
| ビルドツール | Vite | 最新安定版 | 開発サーバー・バンドル |
| グラフ | Chart.js | 最新安定版 | 時系列折れ線グラフ |
| CSSフレームワーク | Pico CSS（Class-conditional版） | 最新安定版 | ベーススタイリング |
| カスタムCSS | CSS Variables | – | Pico CSSで対応できないコンポーネントのスタイリング |
| フォント | Inter（Google Fonts） | – | アプリ全体のタイポグラフィ |
| データ保存 | ブラウザ LocalStorage | – | コンディションログの永続化 |

> 各ライブラリのバージョンは開発開始時点の最新安定版を `package.json` で固定する。

### MVP以降（保留）

バックエンドDBによるデータ永続化・複数デバイス間同期の実現方法、およびホスティング先（GitHub Pages・Netlify等）は、MVPの動作確認後に検討する。

---

## 技術選定の理由

| 技術 | 理由 |
|------|------|
| Vanilla TypeScript | フレームワークなしで依存を最小化。型安全性を確保しつつシンプルな実装を実現する |
| Vite | 設定が少なく開発サーバーの起動が高速。TypeScriptをそのままサポート |
| Chart.js | 軽量で導入が簡単。折れ線グラフに必要な機能を十分にカバーする |
| Pico CSS（Class-conditional版） | 設定不要で落ち着いたミニマルなデザインが得られる。Class-conditional版を採用し、カスタムCSSとの干渉を防ぐ |
| カスタムCSS | 5段階評価ボタン・勤務状態のセグメントボタンなど、Pico CSSではカバーできないカスタムコンポーネントに使用 |
| LocalStorage | バックエンド不要でブラウザのみで動作。MVP段階での実装コストを最小化する |

---

## アーキテクチャ方針

### レイヤー構成

```
src/
├── main.ts                  # エントリーポイント・画面ルーティング
├── ui/                      # UIレイヤー（画面・コンポーネント）
│   ├── logScreen.ts         # 記録画面
│   ├── historyScreen.ts     # 履歴画面
│   └── chartScreen.ts       # グラフ画面
├── services/                # サービス層（ビジネスロジック）
│   └── conditionLogService.ts
├── repositories/            # リポジトリ層
│   ├── conditionLogRepository.ts        # インターフェース定義
│   └── localStorageConditionLogRepository.ts  # LocalStorage実装
└── types/                   # 型定義
    └── conditionLog.ts
```

### データアクセス層の抽象化

将来のバックエンド移行を容易にするため、リポジトリパターンを採用する。
UI・サービス層は `ConditionLogRepository` インターフェースのみに依存し、LocalStorage実装の詳細を知らない。

```
UI層
  ↓ 呼び出し
ConditionLogService（サービス層）
  ↓ 呼び出し
ConditionLogRepository（インターフェース）
  ↓ 実装
LocalStorageConditionLogRepository（MVP）
  将来: ApiConditionLogRepository（MVP以降）
```

バックエンド移行時は `ApiConditionLogRepository` を実装し、`main.ts` の1箇所を変更するだけでUI・サービス層の変更は不要とする。

```typescript
// MVP
const repository = new LocalStorageConditionLogRepository();

// MVP以降（この1行を変更するだけ）
const repository = new ApiConditionLogRepository();

const service = new ConditionLogService(repository);
```

---

## LocalStorage設計

### ストレージキー

| キー | 内容 |
|-----|------|
| `condition_logs` | コンディションログ全件をJSON配列で保存 |

### データ形式

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "logDate": "2026-02-22",
    "updatedAt": "2026-02-22T22:30:00.000Z",
    "mental": 3,
    "skin": 4,
    "brainFatigue": 3,
    "workStyle": "remote",
    "memo": "午後から頭痛気味"
  }
]
```

### 容量の考え方

- 1件あたり約200バイト（JSON文字列）
- 1年365件で約73KB
- LocalStorageの上限は一般的に5MB
- 個人利用・数年分のデータでも容量超過の心配はほぼない

---

## デプロイ

### MVP
Viteでビルドした `dist/` をブラウザで直接開いて動作確認する（ローカルファイル）。
この段階ではスマートフォンからのアクセスは対象外とする。

### MVP以降（保留）
外部からアクセスできる静的ホスティング環境（GitHub Pages・Netlify等）へのデプロイ方法はMVP動作確認後に検討する。

---

## 開発環境

| 項目 | 内容 |
|------|------|
| パッケージマネージャー | npm |
| Node.js | LTS版 |
| エディタ | VS Code（推奨） |
| ブラウザ | Chrome / Safari（動作確認対象） |

---

## UUID生成

`ConditionLog.id` の生成にはブラウザ標準APIの `crypto.randomUUID()` を使用する。外部ライブラリは追加しない。

---

## エラーハンドリング方針

- LocalStorage への読み書き操作は `try/catch` で囲み、失敗時は画面上にエラーメッセージを表示して処理を中断する
- エラーメッセージは該当操作（保存・削除など）の近くに表示し、ユーザーが気づけるようにする
- エラーの原因（容量超過・プライベートブラウジングなど）の詳細はコンソールにログ出力する

---

## 状態管理方針

- アプリのデータ状態はモジュールスコープの変数として各画面ファイル内に保持する
- 画面切り替え時は毎回リポジトリからデータを取得して再描画する（キャッシュなし）
- 画面間での状態共有は行わず、必要なデータはその都度リポジトリから取得する
- この方針により状態管理がシンプルになる。LocalStorageへのアクセスは同期処理のため、個人利用規模のデータ量では性能上の問題は生じない

---

## 技術的制約と要件

- フレームワークを使わないため、DOM操作・状態管理はすべて TypeScript で手動実装する
- Pico CSS（Class-conditional版）を採用する。`.pico` クラスを指定した要素にのみスタイルが適用されるため、カスタムCSSとの干渉を防ぎやすい
- LocalStorage はブラウザのキャッシュ消去で失われる。MVPの制約として許容する
- HTTPS環境での利用を前提とする（product-requirements に準拠）
- 使用するサードパーティライブラリは Chart.js・Pico CSS・Inter フォント（Google Fonts）の3つとし、それ以外の追加は原則行わない
- Inter フォントは Google Fonts CDN の `<link>` タグで読み込む（インターネット接続が前提）

---

## テスト方針

- E2EテストにPlaywrightを使用し、主要なユーザーシナリオ（記録→グラフ反映・履歴編集→反映確認）を自動テストで検証する
- ユニットテスト・統合テストはMVPでは書かない

---

## パフォーマンス要件

- 初期表示3秒以内（product-requirements に準拠）
- Vite によるバンドル最適化で達成する
- LocalStorage へのアクセスは同期処理のため、大量データでも数百ミリ秒以内に収まる想定
