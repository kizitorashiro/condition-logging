import './style.css';

import { LocalStorageConditionLogRepository } from './repositories/localStorageConditionLogRepository';
import { ConditionLogService } from './services/conditionLogService';
import { LogScreen } from './ui/logScreen';
import { HistoryScreen } from './ui/historyScreen';
import { ChartScreen } from './ui/chartScreen';

// 依存関係の組み立て
const repository = new LocalStorageConditionLogRepository();
const service = new ConditionLogService(repository);

// 各画面の初期化
const logScreen = new LogScreen(service);
const historyScreen = new HistoryScreen(service);
const chartScreen = new ChartScreen(service);

// 画面切り替え
type ScreenId = 'log' | 'history' | 'chart';
const screens: ScreenId[] = ['log', 'history', 'chart'];

function showScreen(screenId: ScreenId): void {
  screens.forEach((id) => {
    const section = document.querySelector<HTMLElement>(`#screen-${id}`);
    if (section) section.hidden = id !== screenId;
  });

  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
    btn.classList.toggle('nav-btn--active', btn.dataset['screen'] === screenId);
  });

  // 画面表示時に初期化
  if (screenId === 'log') logScreen.init();
  if (screenId === 'history') historyScreen.init();
  if (screenId === 'chart') chartScreen.init();
}

// ボトムナビゲーション
const nav = document.querySelector('#bottom-nav');
if (nav) {
  nav.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.nav-btn');
    if (!btn || !btn.dataset['screen']) return;
    showScreen(btn.dataset['screen'] as ScreenId);
  });
}

// 初期表示
showScreen('log');
