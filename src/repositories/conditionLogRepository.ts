import type { ConditionLog } from '../types/conditionLog';

export interface ConditionLogRepository {
  getAll(): Promise<ConditionLog[]>;
  getByDateRange(from: string, to: string): Promise<ConditionLog[]>;
  getByLogDate(logDate: string): Promise<ConditionLog | null>;
  save(log: ConditionLog): Promise<void>;
  delete(id: string): Promise<void>;
}
