import './style.css';

import { supabase } from './lib/supabaseClient';
import { SupabaseConditionLogRepository } from './repositories/supabaseConditionLogRepository';
import { ConditionLogService } from './services/conditionLogService';
import { AuthScreen } from './ui/authScreen';
import { LogScreen } from './ui/logScreen';
import { HistoryScreen } from './ui/historyScreen';
import { ChartScreen } from './ui/chartScreen';

// 依存関係の組み立て
const repository = new SupabaseConditionLogRepository();
const service = new ConditionLogService(repository);

// 各画面の初期化
const authScreen = new AuthScreen();
const logScreen = new LogScreen(service);
const historyScreen = new HistoryScreen(service);
const chartScreen = new ChartScreen(service);

// ネットワークエラーバナー
function showNetworkErrorBanner(message: string): void {
  const banner = document.querySelector<HTMLElement>('#error-banner');
  const msg = document.querySelector<HTMLElement>('#error-banner-message');
  if (!banner || !msg) return;
  msg.textContent = message;
  banner.hidden = false;
  setTimeout(() => {
    banner.hidden = true;
  }, 5000);
}

// 画面切り替え
type ScreenId = 'log' | 'history' | 'chart';
const screens: ScreenId[] = ['log', 'history', 'chart'];

async function showScreen(screenId: ScreenId): Promise<void> {
  screens.forEach((id) => {
    const section = document.querySelector<HTMLElement>(`#screen-${id}`);
    if (section) section.hidden = id !== screenId;
  });

  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
    btn.classList.toggle('nav-btn--active', btn.dataset['screen'] === screenId);
  });

  try {
    if (screenId === 'log') await logScreen.init();
    if (screenId === 'history') await historyScreen.init();
    if (screenId === 'chart') await chartScreen.init();
  } catch (e) {
    showNetworkErrorBanner(e instanceof Error ? e.message : '読み込みに失敗しました');
  }
}

// メインアプリを表示
async function showApp(): Promise<void> {
  document.querySelector<HTMLElement>('#screen-auth')!.hidden = true;
  document.querySelector<HTMLElement>('main')!.hidden = false;
  document.querySelector<HTMLElement>('#bottom-nav')!.hidden = false;
  document.querySelector<HTMLElement>('#sign-out-btn')!.hidden = false;
  await showScreen('log');
}

// ログイン画面を表示
function showAuth(): void {
  document.querySelector<HTMLElement>('#screen-auth')!.hidden = false;
  document.querySelector<HTMLElement>('main')!.hidden = true;
  document.querySelector<HTMLElement>('#bottom-nav')!.hidden = true;
  document.querySelector<HTMLElement>('#sign-out-btn')!.hidden = true;
  authScreen.init();
}

// ボトムナビゲーション
const nav = document.querySelector('#bottom-nav');
if (nav) {
  nav.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.nav-btn');
    if (!btn || !btn.dataset['screen']) return;
    void showScreen(btn.dataset['screen'] as ScreenId);
  });
}

// サインアウトボタン
document.querySelector('#sign-out-btn')?.addEventListener('click', () => {
  void supabase.auth.signOut();
});

// 認証状態の監視
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') {
    void showApp();
  } else if (event === 'SIGNED_OUT') {
    showAuth();
  }
});

// 起動時のセッション確認
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    void showApp();
  } else {
    showAuth();
  }
});
