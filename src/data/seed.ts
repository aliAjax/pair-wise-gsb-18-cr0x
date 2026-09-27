import type { LedgerState } from "../domain/types";

/** 常用牙位（FDI） */
export const TEETH = ["11", "14", "26", "36", "46", "47"];

const iso = (d: Date) => d.toISOString();
const minutesAgo = (n: number) => new Date(Date.now() - n * 60000);

/**
 * 初始台账：
 * - AL-02 校准过期、AL-03 探头维修中 → 落在待检区
 * - 牙位 36 正占用 AL-01，且有一笔换机复测停在待复核
 * - 牙位 11 已完成测长并进入预备
 */
export function seedLedger(): LedgerState {
  return {
    devices: [
      { id: "AL-01", label: "根测仪 AL-01", model: "Root ZX mini", calibrationDue: "2027-03-31", probeStatus: "ok" },
      { id: "AL-02", label: "根测仪 AL-02", model: "ProPex Pixi", calibrationDue: "2026-08-15", probeStatus: "ok" },
      { id: "AL-03", label: "根测仪 AL-03", model: "Woodpex V", calibrationDue: "2027-01-20", probeStatus: "repairing" },
      { id: "AL-04", label: "根测仪 AL-04", model: "Root ZX II", calibrationDue: "2027-06-30", probeStatus: "ok" },
    ],
    sessions: [
      {
        id: "S-seed-1",
        tooth: "36",
        deviceId: "AL-04",
        startedAt: iso(minutesAgo(140)),
        endedAt: iso(minutesAgo(115)),
        returnMainUnit: "ok",
        returnProbe: "ok",
        actualMinutes: 25,
      },
      {
        id: "S-seed-2",
        tooth: "36",
        deviceId: "AL-01",
        startedAt: iso(minutesAgo(35)),
        endedAt: null,
        returnMainUnit: null,
        returnProbe: null,
        actualMinutes: null,
      },
      {
        id: "S-seed-3",
        tooth: "11",
        deviceId: "AL-01",
        startedAt: iso(minutesAgo(1560)),
        endedAt: iso(minutesAgo(1530)),
        returnMainUnit: "ok",
        returnProbe: "ok",
        actualMinutes: 30,
      },
    ],
    measurements: [
      {
        id: "M-seed-1",
        tooth: "36",
        deviceId: "AL-04",
        sessionId: "S-seed-1",
        lengthMm: 19.5,
        takenAt: iso(minutesAgo(130)),
        prevLengthMm: null,
        prevDeviceId: null,
        reason: "",
        status: "confirmed",
        confirmedAt: iso(minutesAgo(130)),
      },
      {
        id: "M-seed-2",
        tooth: "36",
        deviceId: "AL-01",
        sessionId: "S-seed-2",
        lengthMm: 20.4,
        takenAt: iso(minutesAgo(20)),
        prevLengthMm: 19.5,
        prevDeviceId: "AL-04",
        reason: "首测读数漂移，换机复测",
        status: "pending-review",
        confirmedAt: null,
      },
      {
        id: "M-seed-3",
        tooth: "11",
        deviceId: "AL-01",
        sessionId: "S-seed-3",
        lengthMm: 22.0,
        takenAt: iso(minutesAgo(1555)),
        prevLengthMm: null,
        prevDeviceId: null,
        reason: "",
        status: "confirmed",
        confirmedAt: iso(minutesAgo(1555)),
      },
    ],
    stages: { "36": "测长", "11": "预备" },
  };
}
