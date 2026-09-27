// 保存：台账状态落 localStorage，重开页面可继续按牙位追溯
import type { LedgerState } from "../domain/types";
import { seedState } from "../data/seed";

const STORAGE_KEY = "hxwl04-apex-ledger-v1";

export function loadState(): LedgerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as LedgerState;
    if (
      !Array.isArray(parsed.devices) ||
      !Array.isArray(parsed.teeth) ||
      !Array.isArray(parsed.assignments) ||
      !Array.isArray(parsed.measurements)
    ) {
      return seedState();
    }
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state: LedgerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时保持内存态，不阻断操作
  }
}

export function resetState(): LedgerState {
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}
