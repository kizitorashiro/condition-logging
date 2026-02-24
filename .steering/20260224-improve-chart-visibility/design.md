# design.md — グラフ視認性の改善

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/ui/chartScreen.ts` | Chart.js設定変更・トグルボタン追加 |
| `index.html` | カラーチップトグルボタンのHTML追加 |
| `src/style.css` | トグルボタンのスタイル追加 |

---

## 変更内容詳細

### A. X軸の日付フォーマット（`YYYY-MM-DD` → `M/D`）

`generateDateRange()` が返す `YYYY-MM-DD` 文字列を、Chart.jsの `ticks.callback` で `M/D` に変換する。

```ts
// x軸
ticks: {
  maxTicksLimit: 10,
  maxRotation: 45,
  callback: (_, index, ticks) => {
    const label = labels[index];
    if (!label) return '';
    const [, m, d] = label.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
  },
},
```

---

### B. 線のスタイル差別化

色に加えて線種でも各指標を区別できるようにする。

| 指標 | 線種 | `borderDash` |
|------|------|-------------|
| メンタル | 実線 | `[]` |
| スキン | 破線 | `[6, 3]` |
| 脳疲労 | 点線 | `[2, 4]` |

---

### C. 線・点のサイズ調整

```ts
borderWidth: 2.5,
pointRadius: 3,
pointHoverRadius: 5,
```

---

### D. Y軸の上下余白（点の見切れ対策）

`min: 1` / `max: 5` を維持しつつ、`layout.padding` と `clip: false` を組み合わせてY=1・Y=5の点が切れないようにする。

```ts
// chart options
layout: {
  padding: { top: 8, bottom: 8 },
},
scales: {
  y: {
    min: 1,
    max: 5,
    ticks: { stepSize: 1 },
  },
},

// 各dataset
clip: false,
```

---

### E. Tooltip のカスタマイズ

タップ/ホバーした日付の3指標値を縦に並べて表示する。

```ts
tooltip: {
  mode: 'index',
  intersect: false,
},
```

Chart.jsのデフォルト `mode: 'index'` により、同じX座標の全データセット値が1つのtooltipにまとめて表示される。

---

### F. カラーチップ型トグルボタン

Chart.jsの凡例（取り消し線方式）を完全に置き換える。

#### HTML（`index.html`）

グラフ画面の `<canvas>` の直前に追加する。

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

#### CSS（`src/style.css`）

```css
.chart-legend {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-sm);
}

.legend-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: opacity 0.15s;
  margin-bottom: 0;
}
.legend-chip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-btn--mental { border-color: var(--color-chart-mental); color: var(--color-chart-mental); }
.legend-btn--skin   { border-color: var(--color-chart-skin);   color: var(--color-chart-skin); }
.legend-btn--brain  { border-color: var(--color-chart-brain);  color: var(--color-chart-brain); }
.legend-btn--mental .legend-chip { background: var(--color-chart-mental); }
.legend-btn--skin   .legend-chip { background: var(--color-chart-skin); }
.legend-btn--brain  .legend-chip { background: var(--color-chart-brain); }

.legend-btn--mental.legend-btn--active { background: #fdf0ea; }
.legend-btn--skin.legend-btn--active   { background: #fef9ee; }
.legend-btn--brain.legend-btn--active  { background: #eff6ff; }
.legend-btn--inactive { opacity: 0.3; }
```

#### TypeScript（`src/ui/chartScreen.ts`）

Chart.js凡例を非表示にし、トグルボタンのクリックでデータセットの表示/非表示を制御する。

```ts
// Chart.js legend 非表示
plugins: {
  legend: { display: false },
}

// トグルボタンのイベント登録（renderChart後に呼ぶ）
private setupLegendButtons(): void {
  const container = document.querySelector('#chart-legend');
  if (!container || !this.chart) return;
  container.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.legend-btn');
    if (!btn || btn.dataset['datasetIndex'] === undefined) return;
    const idx = parseInt(btn.dataset['datasetIndex']);
    const meta = this.chart!.getDatasetMeta(idx);
    meta.hidden = !meta.hidden;
    btn.classList.toggle('legend-btn--active', !meta.hidden);
    btn.classList.toggle('legend-btn--inactive', meta.hidden);
    this.chart!.update();
  });
}
```

---

## E2Eテストへの影響

テストシナリオ1・2はグラフ画面の表示確認（`#condition-chart` の visible チェック）のみのため、今回の変更による影響はない。テスト修正は不要。
