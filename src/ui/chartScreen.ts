import Chart from 'chart.js/auto';

import type { ConditionLogService } from '../services/conditionLogService';
import { getTodayString, addDays, generateDateRange } from '../utils/date';

type Period = '7' | '30' | '90' | 'custom';

export class ChartScreen {
  private chart: Chart | null = null;
  private currentPeriod: Period = '30';
  private errorBannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly service: ConditionLogService) {}

  async init(): Promise<void> {
    this.setupPeriodFilter();
    this.setupCustomRange();
    await this.renderChart();
  }

  private setupPeriodFilter(): void {
    const group = document.querySelector('#period-group');
    if (!group) return;
    group.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.segment-btn');
      if (!btn || !btn.dataset['period']) return;

      this.currentPeriod = btn.dataset['period'] as Period;

      group.querySelectorAll<HTMLButtonElement>('.segment-btn').forEach((b) => {
        b.classList.toggle('segment-btn--selected', b === btn);
      });

      const customRange = document.querySelector<HTMLElement>('#custom-range');
      if (customRange) {
        customRange.hidden = this.currentPeriod !== 'custom';
      }

      if (this.currentPeriod !== 'custom') {
        void this.renderChart();
      }
    });
  }

  private setupCustomRange(): void {
    const fromInput = document.querySelector<HTMLInputElement>('#chart-from');
    const toInput = document.querySelector<HTMLInputElement>('#chart-to');
    if (!fromInput || !toInput) return;

    const onCustomChange = () => {
      if (this.currentPeriod === 'custom' && fromInput.value && toInput.value) {
        void this.renderChart();
      }
    };

    fromInput.addEventListener('change', onCustomChange);
    toInput.addEventListener('change', onCustomChange);
  }

  private getDateRange(): { from: string; to: string } | null {
    const today = getTodayString();

    if (this.currentPeriod === 'custom') {
      const from = document.querySelector<HTMLInputElement>('#chart-from')?.value ?? '';
      const to = document.querySelector<HTMLInputElement>('#chart-to')?.value ?? '';
      if (!from || !to) return null;
      return { from, to };
    }

    const days = Number(this.currentPeriod);
    return { from: addDays(today, -(days - 1)), to: today };
  }

  private async renderChart(): Promise<void> {
    const range = this.getDateRange();
    const noDataEl = document.querySelector<HTMLElement>('#chart-no-data');
    const containerEl = document.querySelector<HTMLElement>('#chart-container');

    if (!range) return;

    let logs;
    try {
      logs = await this.service.getByDateRange(range.from, range.to);
    } catch (e) {
      this.showErrorBanner(e instanceof Error ? e.message : '読み込みに失敗しました');
      return;
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (logs.length === 0) {
      if (noDataEl) noDataEl.hidden = false;
      if (containerEl) containerEl.hidden = true;
      return;
    }

    if (noDataEl) noDataEl.hidden = true;
    if (containerEl) containerEl.hidden = false;

    const labels = generateDateRange(range.from, range.to);
    const logMap = new Map(logs.map((log) => [log.logDate, log]));

    const mentalData = labels.map((date) => logMap.get(date)?.mental ?? null);
    const skinData = labels.map((date) => logMap.get(date)?.skin ?? null);
    const brainData = labels.map((date) => logMap.get(date)?.brainFatigue ?? null);

    const canvas = document.querySelector<HTMLCanvasElement>('#condition-chart');
    if (!canvas) return;

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'メンタル',
            data: mentalData,
            borderColor: '#c47a56',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#c47a56',
            spanGaps: false,
            tension: 0.3,
            pointStyle: 'circle',
          },
          {
            label: 'スキン',
            data: skinData,
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#F59E0B',
            spanGaps: false,
            tension: 0.3,
            pointStyle: 'circle',
          },
          {
            label: '脳疲労',
            data: brainData,
            borderColor: '#3B82F6',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#3B82F6',
            spanGaps: false,
            tension: 0.3,
            pointStyle: 'circle',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: { stepSize: 1 },
          },
          x: {
            ticks: {
              maxTicksLimit: 10,
              maxRotation: 45,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
        },
      },
    });
  }

  showErrorBanner(message: string): void {
    const banner = document.querySelector<HTMLElement>('#error-banner');
    const msg = document.querySelector<HTMLElement>('#error-banner-message');
    if (!banner || !msg) return;
    msg.textContent = message;
    banner.hidden = false;
    if (this.errorBannerTimer !== null) clearTimeout(this.errorBannerTimer);
    this.errorBannerTimer = setTimeout(() => {
      banner.hidden = true;
    }, 5000);
  }
}
