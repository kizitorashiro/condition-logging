export type WorkStyle = 'remote' | 'office' | 'business_trip' | 'day_off';

export type ConditionLog = {
  id: string;
  logDate: string; // YYYY-MM-DD
  updatedAt: string; // ISO 8601
  mental: number; // 1–5
  skin: number; // 1–5
  brainFatigue: number; // 1–5
  workStyle: WorkStyle;
  memo: string;
};
