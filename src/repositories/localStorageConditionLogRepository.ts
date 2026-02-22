import type { ConditionLog } from '../types/conditionLog';
import type { ConditionLogRepository } from './conditionLogRepository';

const STORAGE_KEY = 'condition_logs';

export class LocalStorageConditionLogRepository implements ConditionLogRepository {
  getAll(): ConditionLog[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      return JSON.parse(raw) as ConditionLog[];
    } catch (e) {
      console.error('Failed to load condition logs', e);
      throw new Error('コンディションログの読み込みに失敗しました');
    }
  }

  getByDateRange(from: string, to: string): ConditionLog[] {
    try {
      return this.getAll().filter((log) => log.logDate >= from && log.logDate <= to);
    } catch (e) {
      console.error('Failed to load condition logs by date range', e);
      throw new Error('コンディションログの読み込みに失敗しました');
    }
  }

  getByLogDate(logDate: string): ConditionLog | null {
    try {
      const all = this.getAll();
      return all.find((log) => log.logDate === logDate) ?? null;
    } catch (e) {
      console.error('Failed to load condition log by date', e);
      throw new Error('コンディションログの読み込みに失敗しました');
    }
  }

  save(log: ConditionLog): void {
    try {
      const all = this.getAll();
      const existingIndex = all.findIndex((l) => l.logDate === log.logDate);
      if (existingIndex >= 0) {
        all[existingIndex] = { ...log, id: all[existingIndex].id };
      } else {
        all.push(log);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save condition log', e);
      throw new Error('コンディションログの保存に失敗しました');
    }
  }

  delete(id: string): void {
    try {
      const all = this.getAll();
      const filtered = all.filter((log) => log.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete condition log', e);
      throw new Error('コンディションログの削除に失敗しました');
    }
  }
}
