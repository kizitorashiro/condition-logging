import type { ConditionLog } from '../types/conditionLog';
import type { ConditionLogRepository } from './conditionLogRepository';

const STORAGE_KEY = 'condition_logs';

export class LocalStorageConditionLogRepository implements ConditionLogRepository {
  async getAll(): Promise<ConditionLog[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      return JSON.parse(raw) as ConditionLog[];
    } catch (e) {
      console.error('Failed to load condition logs', e);
      throw new Error('コンディションログの読み込みに失敗しました');
    }
  }

  async getByDateRange(from: string, to: string): Promise<ConditionLog[]> {
    try {
      const all = await this.getAll();
      return all.filter((log) => log.logDate >= from && log.logDate <= to);
    } catch (e) {
      console.error('Failed to load condition logs by date range', e);
      throw new Error('コンディションログの読み込みに失敗しました');
    }
  }

  async getByLogDate(logDate: string): Promise<ConditionLog | null> {
    try {
      const all = await this.getAll();
      return all.find((log) => log.logDate === logDate) ?? null;
    } catch (e) {
      console.error('Failed to load condition log by date', e);
      throw new Error('コンディションログの読み込みに失敗しました');
    }
  }

  async save(log: ConditionLog): Promise<void> {
    try {
      const all = await this.getAll();
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

  async delete(id: string): Promise<void> {
    try {
      const all = await this.getAll();
      const filtered = all.filter((log) => log.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete condition log', e);
      throw new Error('コンディションログの削除に失敗しました');
    }
  }
}
