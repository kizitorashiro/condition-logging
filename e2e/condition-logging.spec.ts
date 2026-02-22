import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const SCREENSHOTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'screenshots'
);

async function screenshot(page: import('@playwright/test').Page, filename: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename) });
}

test.describe('テストシナリオ 1：記録からグラフ反映の確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('記録を保存してグラフに反映されることを確認する', async ({ page }) => {
    // ステップ1: 記録画面を開く
    await expect(page.locator('#screen-log')).toBeVisible();
    await screenshot(page, '01-01-log-screen.png');

    // ステップ2: 各項目を入力する
    await page.locator('#mental-group [data-value="4"]').click();
    await page.locator('#skin-group [data-value="3"]').click();
    await page.locator('#brain-group [data-value="5"]').click();
    await page.locator('#workstyle-group [data-value="remote"]').click();
    await page.locator('#log-memo').fill('テスト用のメモです');
    await screenshot(page, '01-02-filled-form.png');

    // ステップ3: 保存する
    await page.locator('#log-save-btn').click();
    await expect(page.locator('#log-recorded-badge')).toBeVisible();
    await expect(page.locator('#log-recorded-badge')).toContainText('本日の記録は完了しています');
    await screenshot(page, '01-03-recorded-badge.png');

    // ステップ4: グラフ画面に切り替える
    await page.locator('[data-screen="chart"]').click();
    await expect(page.locator('#condition-chart')).toBeVisible();
    await screenshot(page, '01-04-chart.png');
  });
});

test.describe('テストシナリオ 2：履歴編集の反映確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('記録を編集して履歴とグラフに反映されることを確認する', async ({ page }) => {
    // ステップ1: 記録を保存する（メンタル=3・スキン=4・脳疲労=3・勤務状態=在宅）
    await page.locator('#mental-group [data-value="3"]').click();
    await page.locator('#skin-group [data-value="4"]').click();
    await page.locator('#brain-group [data-value="3"]').click();
    await page.locator('#workstyle-group [data-value="remote"]').click();
    await page.locator('#log-save-btn').click();
    await expect(page.locator('#log-recorded-badge')).toBeVisible();
    await screenshot(page, '02-01-saved.png');

    // ステップ2: 履歴画面に切り替える
    await page.locator('[data-screen="history"]').click();
    await expect(page.locator('#screen-history')).toBeVisible();
    const card = page.locator('.history-card').first();
    await expect(card).toContainText('メンタル');
    // メンタル=3・スキン=4・脳疲労=3 が表示されていること
    const metrics = card.locator('.history-card__metric-value');
    await expect(metrics.nth(0)).toHaveText('3'); // mental
    await expect(metrics.nth(1)).toHaveText('4'); // skin
    await expect(metrics.nth(2)).toHaveText('3'); // brainFatigue
    await screenshot(page, '02-02-history.png');

    // ステップ3: 編集ボタンをクリックする
    await card.locator('.edit-btn').click();
    const modal = page.locator('#edit-modal');
    await expect(modal).toBeVisible();
    await screenshot(page, '02-03-edit-modal.png');

    // ステップ4: メンタルを3から5に変更して保存する
    await page.locator('#edit-mental-group [data-value="5"]').click();
    await page.locator('#edit-save-btn').click();
    await expect(modal).not.toBeVisible();
    await screenshot(page, '02-04-modal-closed.png');

    // ステップ5: 履歴カードにメンタル=5 が表示されていること
    const updatedCard = page.locator('.history-card').first();
    await expect(updatedCard.locator('.history-card__metric-value').nth(0)).toHaveText('5');
    await screenshot(page, '02-05-history-updated.png');

    // ステップ6: グラフ画面に切り替える
    await page.locator('[data-screen="chart"]').click();
    await expect(page.locator('#condition-chart')).toBeVisible();
    await screenshot(page, '02-06-chart.png');
  });
});
