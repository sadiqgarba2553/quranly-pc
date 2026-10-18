export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export const clampGoal = value => Math.max(1, Math.min(180, Math.round(Number(value) || 10)));
