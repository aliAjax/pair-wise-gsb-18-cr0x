// 页面显示辅助：时间、日期、时长格式化
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

/** 距校准到期的天数（负数表示已过期） */
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const due = new Date(dateStr + "T00:00:00").getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / 86400000);
}

export function minutesSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
}

export function fmtLength(mm: number): string {
  return `${mm.toFixed(1)}mm`;
}
