import type { WorkStyle } from '../types/conditionLog';
import type { ConditionLogService } from '../services/conditionLogService';
import { ValidationErrors } from '../services/conditionLogService';
import { getTodayString } from '../utils/date';

const MENTAL_LABELS: Record<number, string> = {
  1: '焦燥感、もう無理感あり',
  2: '予兆あり',
  3: '安定',
  4: '前向き',
  5: '躁傾向',
};

const SKIN_LABELS: Record<number, string> = {
  1: '全身不調',
  2: '部分的に不調',
  3: '回復傾向',
  4: '一部出てるが気にならない',
  5: '出てない',
};

const BRAIN_LABELS: Record<number, string> = {
  1: '限界',
  2: '集中力なし',
  3: '集中力ダウン',
  4: '余力あり',
  5: '余裕',
};

export class LogScreen {
  private mental: number | null = null;
  private skin: number | null = null;
  private brainFatigue: number | null = null;
  private workStyle: WorkStyle | null = null;
  private errorBannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly service: ConditionLogService) {}

  async init(): Promise<void> {
    const dateInput = document.querySelector<HTMLInputElement>('#log-date');
    if (!dateInput) return;

    dateInput.value = getTodayString();

    await this.loadExistingRecord(getTodayString());
    this.setupRatingButtons();
    this.setupSegmentButtons();
    this.setupDateChange();
    this.setupForm();
  }

  private async loadExistingRecord(logDate: string): Promise<void> {
    const badge = document.querySelector<HTMLElement>('#log-recorded-badge');
    const note = document.querySelector<HTMLElement>('#log-overwrite-note');
    const memoEl = document.querySelector<HTMLTextAreaElement>('#log-memo');

    try {
      const existing = await this.service.getByLogDate(logDate);
      if (existing) {
        this.mental = existing.mental;
        this.skin = existing.skin;
        this.brainFatigue = existing.brainFatigue;
        this.workStyle = existing.workStyle;
        if (memoEl) memoEl.value = existing.memo;
        if (badge) badge.hidden = false;
        if (note) note.hidden = false;
      } else {
        this.mental = null;
        this.skin = null;
        this.brainFatigue = null;
        this.workStyle = null;
        if (memoEl) memoEl.value = '';
        if (badge) badge.hidden = true;
        if (note) note.hidden = true;
      }
    } catch (e) {
      this.showErrorBanner(e instanceof Error ? e.message : '読み込みに失敗しました');
    }

    this.updateRatingUI('mental', 'mental-group', 'mental-label', MENTAL_LABELS);
    this.updateRatingUI('skin', 'skin-group', 'skin-label', SKIN_LABELS);
    this.updateRatingUI('brainFatigue', 'brain-group', 'brain-label', BRAIN_LABELS);
    this.updateSegmentUI('workstyle-group', this.workStyle);
  }

  private updateRatingUI(
    field: 'mental' | 'skin' | 'brainFatigue',
    groupId: string,
    labelId: string,
    labels: Record<number, string>
  ): void {
    const value = this[field];
    const group = document.querySelector(`#${groupId}`);
    const labelEl = document.querySelector<HTMLElement>(`#${labelId}`);

    if (group) {
      group.querySelectorAll<HTMLButtonElement>('.rating-btn').forEach((btn) => {
        const btnVal = Number(btn.dataset['value']);
        btn.classList.toggle('rating-btn--selected', btnVal === value);
      });
    }
    if (labelEl) {
      labelEl.textContent = value !== null ? (labels[value] ?? '') : '';
    }
  }

  private updateSegmentUI(groupId: string, selected: WorkStyle | null): void {
    const group = document.querySelector(`#${groupId}`);
    if (!group) return;
    group.querySelectorAll<HTMLButtonElement>('.segment-btn').forEach((btn) => {
      btn.classList.toggle('segment-btn--selected', btn.dataset['value'] === selected);
    });
  }

  private setupRatingButtons(): void {
    const fields: Array<{
      field: 'mental' | 'skin' | 'brainFatigue';
      groupId: string;
      labelId: string;
      labels: Record<number, string>;
    }> = [
      { field: 'mental', groupId: 'mental-group', labelId: 'mental-label', labels: MENTAL_LABELS },
      { field: 'skin', groupId: 'skin-group', labelId: 'skin-label', labels: SKIN_LABELS },
      {
        field: 'brainFatigue',
        groupId: 'brain-group',
        labelId: 'brain-label',
        labels: BRAIN_LABELS,
      },
    ];

    fields.forEach(({ field, groupId, labelId, labels }) => {
      const group = document.querySelector(`#${groupId}`);
      if (!group) return;
      group.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.rating-btn');
        if (!btn || btn.dataset['field'] !== field) return;
        this[field] = Number(btn.dataset['value']);
        this.updateRatingUI(field, groupId, labelId, labels);
        this.clearFieldError(`${field === 'brainFatigue' ? 'brain' : field}-error`);
      });
    });
  }

  private setupSegmentButtons(): void {
    const group = document.querySelector('#workstyle-group');
    if (!group) return;
    group.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.segment-btn');
      if (!btn) return;
      this.workStyle = btn.dataset['value'] as WorkStyle;
      this.updateSegmentUI('workstyle-group', this.workStyle);
      this.clearFieldError('workstyle-error');
    });
  }

  private setupDateChange(): void {
    const dateInput = document.querySelector<HTMLInputElement>('#log-date');
    if (!dateInput) return;
    dateInput.addEventListener('change', () => {
      this.clearAllErrors();
      void this.loadExistingRecord(dateInput.value);
    });
  }

  private setupForm(): void {
    const form = document.querySelector<HTMLFormElement>('#log-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSave();
    });
  }

  private async handleSave(): Promise<void> {
    const dateInput = document.querySelector<HTMLInputElement>('#log-date');
    const memoEl = document.querySelector<HTMLTextAreaElement>('#log-memo');
    const logDate = dateInput?.value ?? getTodayString();
    const memo = memoEl?.value ?? '';

    this.clearAllErrors();

    try {
      await this.service.save({
        logDate,
        mental: this.mental ?? 0,
        skin: this.skin ?? 0,
        brainFatigue: this.brainFatigue ?? 0,
        workStyle: this.workStyle ?? ('' as WorkStyle),
        memo,
      });
      await this.loadExistingRecord(logDate);
    } catch (e) {
      if (e instanceof ValidationErrors) {
        e.errors.forEach(({ field, message }) => {
          const errorId =
            field === 'brainFatigue' ? 'brain-error' : `${field}-error`;
          this.showFieldError(errorId, message);
        });
      } else {
        this.showErrorBanner(e instanceof Error ? e.message : '保存に失敗しました');
      }
    }
  }

  private showFieldError(errorId: string, message: string): void {
    const el = document.querySelector<HTMLElement>(`#${errorId}`);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  private clearFieldError(errorId: string): void {
    const el = document.querySelector<HTMLElement>(`#${errorId}`);
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  private clearAllErrors(): void {
    ['mental-error', 'skin-error', 'brain-error', 'workstyle-error'].forEach((id) =>
      this.clearFieldError(id)
    );
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
