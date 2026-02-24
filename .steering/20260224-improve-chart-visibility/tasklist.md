# tasklist.md — グラフ視認性の改善

## タスク一覧

| ID | タスク | 状態 |
|----|--------|------|
| T01 | `index.html` にカラーチップトグルボタンのHTMLを追加 | 未着手 |
| T02 | `src/style.css` にトグルボタンのスタイルを追加 | 未着手 |
| T03 | `src/ui/chartScreen.ts` のChart.js設定を更新 | 未着手 |
| T04 | ビルド確認（`npm run build`） | 未着手 |
| T05 | E2Eテスト実行（`npx playwright test`） | 未着手 |
| T06 | コミット＆プッシュ | 未着手 |

---

## タスク詳細

### T01: index.html — トグルボタンHTML追加

`#chart-container` の直前に `#chart-legend` を追加する。

```html
<div class="chart-legend" id="chart-legend">
  <button type="button" class="legend-btn legend-btn--mental legend-btn--active" data-dataset-index="0">
    <span class="legend-chip"></span>メンタル
  </button>
  <button type="button" class="legend-btn legend-btn--skin legend-btn--active" data-dataset-index="1">
    <span class="legend-chip"></span>スキン
  </button>
  <button type="button" class="legend-btn legend-btn--brain legend-btn--active" data-dataset-index="2">
    <span class="legend-chip"></span>脳疲労
  </button>
</div>
```

### T02: style.css — トグルボタンスタイル追加

`.chart-legend`、`.legend-btn`、`.legend-chip` およびカラー別・状態別クラスを追加する。

### T03: chartScreen.ts — Chart.js設定更新

以下をすべて反映する。

- **A**: X軸 `ticks.callback` で `M/D` フォーマット
- **B**: 各データセットに `borderDash` を設定（実線・破線・点線）
- **C**: `borderWidth: 2.5`、`pointRadius: 3`、`pointHoverRadius: 5`
- **D**: `layout.padding: { top: 8, bottom: 8 }`、各データセットに `clip: false`
- **E**: `tooltip: { mode: 'index', intersect: false }`
- **F**: `legend: { display: false }` + `setupLegendButtons()` メソッド追加

### T04: ビルド確認

```bash
npm run build
```

TypeScriptエラー・ビルドエラーがないことを確認する。

### T05: E2Eテスト実行

```bash
npx playwright test
```

3テストすべてパスすることを確認する。

### T06: コミット＆プッシュ

変更ファイル: `index.html`、`src/style.css`、`src/ui/chartScreen.ts`
