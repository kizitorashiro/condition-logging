import type { ConditionLog, WorkStyle } from '../types/conditionLog';
import type { ConditionLogService } from '../services/conditionLogService';
import { ValidationErrors } from '../services/conditionLogService';

const WORK_STYLE_LABELS: Record<WorkStyle, string> = {
  remote: '在宅',
  office: '出社',
  business_trip: '出張',
  day_off: '休み',
};

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

export class HistoryScreen {
  private editMental: number | null = null;
  private editSkin: number | null = null;
  private editBrainFatigue: number | null = null;
  private editWorkStyle: WorkStyle | null = null;
  private errorBannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly service: ConditionLogService) {}

  async init(): Promise<void> {
    await this.renderList();
    this.setupEditModal();
  }

  private async renderList(): Promise<void> {
    const container = document.querySelector<HTMLElement>('#history-list');
    if (!container) return;

    let logs: ConditionLog[];
    try {
      logs = await this.service.getAll();
    } catch (e) {
      this.showErrorBanner(e instanceof Error ? e.message : '読み込みに失敗しました');
      return;
    }

    logs.sort((a, b) => (a.logDate > b.logDate ? -1 : 1));

    if (logs.length === 0) {
      container.innerHTML = '<p style="color: var(--color-text-sub);">記録がありません</p>';
      return;
    }

    container.innerHTML = '';
    logs.forEach((log) => {
      const card = this.createCard(log);
      container.appendChild(card);
    });
  }

  private createCard(log: ConditionLog): HTMLElement {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.dataset['id'] = log.id;

    const memoHtml = log.memo
      ? `<p class="history-card__memo">${escapeHtml(log.memo)}</p>`
      : '';

    card.innerHTML = `
      <p class="history-card__date">${log.logDate}</p>
      <div class="history-card__metrics">
        <span class="history-card__metric">
          <span class="history-card__metric-label">メンタル </span>
          <span class="history-card__metric-value">${log.mental}</span>
        </span>
        <span class="history-card__metric">
          <span class="history-card__metric-label">スキン </span>
          <span class="history-card__metric-value">${log.skin}</span>
        </span>
        <span class="history-card__metric">
          <span class="history-card__metric-label">脳疲労 </span>
          <span class="history-card__metric-value">${log.brainFatigue}</span>
        </span>
      </div>
      <p class="history-card__workstyle">${WORK_STYLE_LABELS[log.workStyle]}</p>
      ${memoHtml}
      <div class="history-card__actions">
        <button type="button" class="edit-btn secondary" data-id="${log.id}">編集</button>
        <button type="button" class="delete-btn contrast" data-id="${log.id}">削除</button>
      </div>
    `;

    card.querySelector('.delete-btn')?.addEventListener('click', () => void this.handleDelete(log));
    card.querySelector('.edit-btn')?.addEventListener('click', () => this.handleEditOpen(log));

    return card;
  }

  private async handleDelete(log: ConditionLog): Promise<void> {
    if (!window.confirm(`${log.logDate} の記録を削除しますか？`)) return;
    try {
      await this.service.delete(log.id);
      await this.renderList();
    } catch (e) {
      this.showErrorBanner(e instanceof Error ? e.message : '削除に失敗しました');
    }
  }

  private handleEditOpen(log: ConditionLog): void {
    const modal = document.querySelector<HTMLDialogElement>('#edit-modal');
    const idInput = document.querySelector<HTMLInputElement>('#edit-id');
    const dateInput = document.querySelector<HTMLInputElement>('#edit-log-date');
    const memoInput = document.querySelector<HTMLTextAreaElement>('#edit-memo');
    if (!modal || !idInput || !dateInput || !memoInput) return;

    idInput.value = log.id;
    dateInput.value = log.logDate;
    memoInput.value = log.memo;

    this.editMental = log.mental;
    this.editSkin = log.skin;
    this.editBrainFatigue = log.brainFatigue;
    this.editWorkStyle = log.workStyle;

    this.updateEditRatingUI('mental', 'edit-mental-group', 'edit-mental-label', MENTAL_LABELS);
    this.updateEditRatingUI('skin', 'edit-skin-group', 'edit-skin-label', SKIN_LABELS);
    this.updateEditRatingUI('brainFatigue', 'edit-brain-group', 'edit-brain-label', BRAIN_LABELS);
    this.updateEditSegmentUI('edit-workstyle-group', this.editWorkStyle);

    modal.showModal();
  }

  private setupEditModal(): void {
    const form = document.querySelector<HTMLFormElement>('#edit-form');
    const cancelBtn = document.querySelector<HTMLButtonElement>('#edit-cancel-btn');
    const modal = document.querySelector<HTMLDialogElement>('#edit-modal');
    if (!form || !cancelBtn || !modal) return;

    cancelBtn.addEventListener('click', () => modal.close());

    // 評価ボタン
    const fields: Array<{
      field: 'editMental' | 'editSkin' | 'editBrainFatigue';
      groupId: string;
      labelId: string;
      labels: Record<number, string>;
    }> = [
      {
        field: 'editMental',
        groupId: 'edit-mental-group',
        labelId: 'edit-mental-label',
        labels: MENTAL_LABELS,
      },
      {
        field: 'editSkin',
        groupId: 'edit-skin-group',
        labelId: 'edit-skin-label',
        labels: SKIN_LABELS,
      },
      {
        field: 'editBrainFatigue',
        groupId: 'edit-brain-group',
        labelId: 'edit-brain-label',
        labels: BRAIN_LABELS,
      },
    ];

    fields.forEach(({ field, groupId, labelId, labels }) => {
      const group = document.querySelector(`#${groupId}`);
      if (!group) return;
      group.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.rating-btn');
        if (!btn) return;
        this[field] = Number(btn.dataset['value']);
        const metricField = field === 'editMental' ? 'mental' : field === 'editSkin' ? 'skin' : 'brainFatigue';
        this.updateEditRatingUI(metricField, groupId, labelId, labels);
      });
    });

    // 勤務状態
    const wsGroup = document.querySelector('#edit-workstyle-group');
    if (wsGroup) {
      wsGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.segment-btn');
        if (!btn) return;
        this.editWorkStyle = btn.dataset['value'] as WorkStyle;
        this.updateEditSegmentUI('edit-workstyle-group', this.editWorkStyle);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleEditSave();
    });
  }

  private async handleEditSave(): Promise<void> {
    const dateInput = document.querySelector<HTMLInputElement>('#edit-log-date');
    const memoInput = document.querySelector<HTMLTextAreaElement>('#edit-memo');
    const modal = document.querySelector<HTMLDialogElement>('#edit-modal');

    const logDate = dateInput?.value ?? '';
    const memo = memoInput?.value ?? '';

    try {
      await this.service.save({
        logDate,
        mental: this.editMental ?? 0,
        skin: this.editSkin ?? 0,
        brainFatigue: this.editBrainFatigue ?? 0,
        workStyle: this.editWorkStyle ?? ('' as WorkStyle),
        memo,
      });
      modal?.close();
      await this.renderList();
    } catch (e) {
      if (e instanceof ValidationErrors) {
        // モーダル内でのバリデーションエラーはバナーで表示
        const messages = e.errors.map((err) => err.message).join('、');
        this.showErrorBanner(messages);
      } else {
        this.showErrorBanner(e instanceof Error ? e.message : '保存に失敗しました');
      }
    }
  }

  private updateEditRatingUI(
    field: 'mental' | 'skin' | 'brainFatigue',
    groupId: string,
    labelId: string,
    labels: Record<number, string>
  ): void {
    const fieldMap = { mental: 'editMental', skin: 'editSkin', brainFatigue: 'editBrainFatigue' } as const;
    const value = this[fieldMap[field]];
    const group = document.querySelector(`#${groupId}`);
    const labelEl = document.querySelector<HTMLElement>(`#${labelId}`);

    if (group) {
      group.querySelectorAll<HTMLButtonElement>('.rating-btn').forEach((btn) => {
        btn.classList.toggle('rating-btn--selected', Number(btn.dataset['value']) === value);
      });
    }
    if (labelEl) {
      labelEl.textContent = value !== null ? (labels[value] ?? '') : '';
    }
  }

  private updateEditSegmentUI(groupId: string, selected: WorkStyle | null): void {
    const group = document.querySelector(`#${groupId}`);
    if (!group) return;
    group.querySelectorAll<HTMLButtonElement>('.segment-btn').forEach((btn) => {
      btn.classList.toggle('segment-btn--selected', btn.dataset['value'] === selected);
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
