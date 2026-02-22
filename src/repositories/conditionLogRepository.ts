import type { ConditionLog } from '../types/conditionLog';

export interface ConditionLogRepository {
  getAll(): ConditionLog[];
  getByDateRange(from: string, to: string): ConditionLog[];
  getByLogDate(logDate: string): ConditionLog | null;
  save(log: ConditionLog): void;
  delete(id: string): void;
}
