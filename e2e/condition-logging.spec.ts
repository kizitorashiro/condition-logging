import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const SCREENSHOTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'screenshots'
);

const SUPABASE_URL = 'https://nzpvdkybvsjnwoqjctwp.supabase.co';
const SUPABASE_PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const FAKE_USER_ID = '00000000-0000-0000-0000-000000000001';

// Supabase JS v2 が localStorage に保存するセッション形式
const FAKE_SESSION = {
  access_token: 'fake-access-token',
  refresh_token: 'fake-refresh-token',
  expires_at: 9999999999, // 遠い未来（リフレッシュ不要）
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: FAKE_USER_ID,
    email: 'test@example.com',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  },
};

type LogRecord = Record<string, unknown>;

async function screenshot(page: Page, filename: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename) });
}

// 認証済み状態を localStorage に事前設定（ページ読み込み前に実行）
async function setupAuthSession(page: Page): Promise<void> {
  await page.addInitScript(({ session, projectRef }) => {
    localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session));
  }, { session: FAKE_SESSION, projectRef: SUPABASE_PROJECT_REF });
}

// Supabase API を page.route() でモック
async function setupSupabaseMocks(
  page: Page,
  store: { logs: LogRecord[] }
): Promise<void> {
  // Auth: getUser（save() 内で呼ばれる）
  await page.route(
    (url) => url.href.includes('/auth/v1/user'),
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: FAKE_USER_ID, email: 'test@example.com', role: 'authenticated' }),
      });
    }
  );

  // REST: condition_logs の CRUD
  await page.route(
    (url) => url.href.includes('/rest/v1/condition_logs'),
    (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
        let result = [...store.logs];
        // log_date フィルタ（getByLogDate 用）
        const logDateMatch = url.match(/log_date=eq\.([^&]+)/);
        if (logDateMatch) {
          const filterDate = decodeURIComponent(logDateMatch[1]);
          result = result.filter((l) => l['log_date'] === filterDate);
        }
        if (url.includes('limit=1')) {
          result = result.slice(0, 1);
        }
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(result),
        });
      } else if (method === 'POST') {
        // UPSERT
        const records: LogRecord[] = JSON.parse(route.request().postData() ?? '[]');
        const list = Array.isArray(records) ? records : [records];
        for (const record of list) {
          const idx = store.logs.findIndex((l) => l['id'] === record['id']);
          if (idx >= 0) {
            store.logs[idx] = record;
          } else {
            store.logs.push(record);
          }
        }
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(list),
        });
      } else if (method === 'DELETE') {
        const idMatch = url.match(/id=eq\.([^&]+)/);
        if (idMatch) {
          const id = decodeURIComponent(idMatch[1]);
          store.logs = store.logs.filter((l) => l['id'] !== id);
        }
        route.fulfill({ status: 204, body: '' });
      } else {
        route.continue();
      }
    }
  );
}

// ============================================================
// テストシナリオ 1：記録からグラフ反映の確認
// ============================================================
test.describe('テストシナリオ 1：記録からグラフ反映の確認', () => {
  let store: { logs: LogRecord[] };

  test.beforeEach(async ({ page }) => {
    store = { logs: [] };
    await setupAuthSession(page);
    await setupSupabaseMocks(page, store);
    await page.goto('/');
    await page.waitForSelector('main:not([hidden])', { timeout: 10000 });
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

// ============================================================
// テストシナリオ 2：履歴編集の反映確認
// ============================================================
test.describe('テストシナリオ 2：履歴編集の反映確認', () => {
  let store: { logs: LogRecord[] };

  test.beforeEach(async ({ page }) => {
    store = { logs: [] };
    await setupAuthSession(page);
    await setupSupabaseMocks(page, store);
    await page.goto('/');
    await page.waitForSelector('main:not([hidden])', { timeout: 10000 });
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

// ============================================================
// テストシナリオ 3：サインイン失敗の確認
// ============================================================
test.describe('テストシナリオ 3：サインイン失敗の確認', () => {
  test.beforeEach(async ({ page }) => {
    // 認証状態なし（セッション未設定）でページを開く
    // サインインAPIを失敗させるモック
    await page.route(
      (url) => url.href.includes('/auth/v1/token'),
      (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      }
    );
    await page.goto('/');
    await page.waitForSelector('#auth-form');
  });

  test('誤った認証情報でエラーメッセージが表示されることを確認する', async ({ page }) => {
    // ステップ1: ログイン画面が表示されていることを確認
    await expect(page.locator('#screen-auth')).toBeVisible();
    await screenshot(page, '03-01-auth-screen.png');

    // ステップ2: 誤った認証情報を入力してサインイン
    await page.locator('#auth-email').fill('wrong@example.com');
    await page.locator('#auth-password').fill('wrongpassword');
    await page.locator('#auth-submit-btn').click();

    // ステップ3: エラーメッセージが表示されることを確認
    await expect(page.locator('#auth-error')).toBeVisible();
    await expect(page.locator('#auth-error')).toContainText('メールアドレスまたはパスワードが正しくありません');
    await screenshot(page, '03-02-auth-error.png');
  });
});
