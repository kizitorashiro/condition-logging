import type { ConditionLog, WorkStyle } from '../types/conditionLog';
import type { ConditionLogRepository } from '../repositories/conditionLogRepository';
import { getTodayString } from '../utils/date';

const VALID_WORK_STYLES: WorkStyle[] = ['remote', 'office', 'business_trip', 'day_off'];

type SaveInput = {
  logDate?: string;
  mental: number;
  skin: number;
  brainFatigue: number;
  workStyle: WorkStyle;
  memo: string;
};

type ValidationError = {
  field: string;
  message: string;
};

export class ConditionLogService {
  constructor(private readonly repository: ConditionLogRepository) {}

  save(input: SaveInput): void {
    const errors = this.validate(input);
    if (errors.length > 0) {
      throw new ValidationErrors(errors);
    }

    const logDate = input.logDate ?? getTodayString();
    const existing = this.repository.getByLogDate(logDate);

    const log: ConditionLog = {
      id: existing?.id ?? crypto.randomUUID(),
      logDate,
      updatedAt: new Date().toISOString(),
      mental: input.mental,
      skin: input.skin,
      brainFatigue: input.brainFatigue,
      workStyle: input.workStyle,
      memo: input.memo,
    };

    this.repository.save(log);
  }

  delete(id: string): void {
    this.repository.delete(id);
  }

  getAll(): ConditionLog[] {
    return this.repository.getAll();
  }

  getByDateRange(from: string, to: string): ConditionLog[] {
    return this.repository.getByDateRange(from, to);
  }

  getByLogDate(logDate: string): ConditionLog | null {
    return this.repository.getByLogDate(logDate);
  }

  private validate(input: SaveInput): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Number.isInteger(input.mental) || input.mental < 1 || input.mental > 5) {
      errors.push({ field: 'mental', message: 'メンタルを1〜5で選択してください' });
    }
    if (!Number.isInteger(input.skin) || input.skin < 1 || input.skin > 5) {
      errors.push({ field: 'skin', message: 'スキンを1〜5で選択してください' });
    }
    if (!Number.isInteger(input.brainFatigue) || input.brainFatigue < 1 || input.brainFatigue > 5) {
      errors.push({ field: 'brainFatigue', message: '脳疲労を1〜5で選択してください' });
    }
    if (!VALID_WORK_STYLES.includes(input.workStyle)) {
      errors.push({ field: 'workStyle', message: '勤務状態を選択してください' });
    }
    if (input.logDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(input.logDate)) {
      errors.push({ field: 'logDate', message: '日付の形式が正しくありません' });
    }

    return errors;
  }
}

export class ValidationErrors extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Validation failed');
  }
}
