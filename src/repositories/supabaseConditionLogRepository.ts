import { supabase } from '../lib/supabaseClient';
import type { ConditionLog } from '../types/conditionLog';
import type { ConditionLogRepository } from './conditionLogRepository';

type DbRow = {
  id: string;
  user_id: string;
  log_date: string;
  updated_at: string;
  mental: number;
  skin: number;
  brain_fatigue: number;
  work_style: string;
  memo: string;
};

function toConditionLog(row: DbRow): ConditionLog {
  return {
    id: row.id,
    logDate: row.log_date,
    updatedAt: row.updated_at,
    mental: row.mental,
    skin: row.skin,
    brainFatigue: row.brain_fatigue,
    workStyle: row.work_style as ConditionLog['workStyle'],
    memo: row.memo,
  };
}

export class SupabaseConditionLogRepository implements ConditionLogRepository {
  async getAll(): Promise<ConditionLog[]> {
    const { data, error } = await supabase
      .from('condition_logs')
      .select('*')
      .order('log_date', { ascending: false });

    if (error) throw new Error('コンディションログの読み込みに失敗しました');
    return (data as DbRow[]).map(toConditionLog);
  }

  async getByDateRange(from: string, to: string): Promise<ConditionLog[]> {
    const { data, error } = await supabase
      .from('condition_logs')
      .select('*')
      .gte('log_date', from)
      .lte('log_date', to)
      .order('log_date', { ascending: true });

    if (error) throw new Error('コンディションログの読み込みに失敗しました');
    return (data as DbRow[]).map(toConditionLog);
  }

  async getByLogDate(logDate: string): Promise<ConditionLog | null> {
    const { data, error } = await supabase
      .from('condition_logs')
      .select('*')
      .eq('log_date', logDate)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error('コンディションログの読み込みに失敗しました');
    return data ? toConditionLog(data as DbRow) : null;
  }

  async save(log: ConditionLog): Promise<void> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('ユーザー情報の取得に失敗しました');

    const { error } = await supabase
      .from('condition_logs')
      .upsert(
        {
          id: log.id,
          user_id: userData.user.id,
          log_date: log.logDate,
          updated_at: log.updatedAt,
          mental: log.mental,
          skin: log.skin,
          brain_fatigue: log.brainFatigue,
          work_style: log.workStyle,
          memo: log.memo,
        },
        { onConflict: 'id' }
      );

    if (error) throw new Error('コンディションログの保存に失敗しました');
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('condition_logs')
      .delete()
      .eq('id', id);

    if (error) throw new Error('コンディションログの削除に失敗しました');
  }
}
