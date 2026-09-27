import type { LedgerState } from "../domain/types";
import { seedLedger } from "../data/seed";

const STORAGE_KEY = "hxwl04-apex-ledger-v1";

/** 读取台账；没有存档或数据损坏时回退到初始数据 */
export function loadLedger(): LedgerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedLedger();
    const parsed = JSON.parse(raw) as LedgerState;
    if (!Array.isArray(parsed.devices) || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.measurements)) {
      return seedLedger();
    }
    return { ...parsed, stages: parsed.stages ?? {} };
  } catch {
    return seedLedger();
  }
}

export function saveLedger(state: LedgerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默失败，页面内状态仍然有效
  }
}

/** 清空存档并恢复初始数据 */
export function resetLedger(): LedgerState {
  const fresh = seedLedger();
  saveLedger(fresh);
  return fresh;
}
