// 种子资料：设备台账与牙位病例（日期相对今天生成，保证演示时总有过期/临期设备）
import type { Device, LedgerState, Tooth } from "../domain/types";

function datePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const seedDevices: Device[] = [
  { id: "AL-01", name: "根测仪 AL-01", model: "Root ZX II", calibrationDue: datePlus(150), unitStatus: "ok", probeStatus: "ok" },
  { id: "AL-02", name: "根测仪 AL-02", model: "ProPex Pixi", calibrationDue: datePlus(-12), unitStatus: "ok", probeStatus: "ok" },
  { id: "AL-03", name: "根测仪 AL-03", model: "Root ZX mini", calibrationDue: datePlus(60), unitStatus: "ok", probeStatus: "repairing" },
  { id: "AL-04", name: "根测仪 AL-04", model: "iPex II", calibrationDue: datePlus(25), unitStatus: "ok", probeStatus: "ok" },
];

export const seedTeeth: Tooth[] = [
  { id: "#36", patient: "王秀兰", diagnosis: "慢性根尖周炎", stage: "测长" },
  { id: "#11", patient: "李国强", diagnosis: "外伤后变色", stage: "测长" },
  { id: "#46", patient: "陈明", diagnosis: "急性牙髓炎", stage: "开髓" },
  { id: "#26", patient: "赵敏", diagnosis: "慢性牙髓炎", stage: "开髓" },
];

/** 初始台账：含一条已完成的占用与测长，演示按牙位追溯 */
export function seedState(): LedgerState {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(10, 5, 0, 0);
  const measured = new Date(start.getTime() + 12 * 60000);
  const end = new Date(start.getTime() + 38 * 60000);

  return {
    devices: seedDevices,
    teeth: seedTeeth,
    assignments: [
      {
        id: "A-seed-1",
        toothId: "#11",
        deviceId: "AL-01",
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        returnUnit: "ok",
        returnProbe: "ok",
        usageMinutes: 38,
      },
    ],
    measurements: [
      {
        id: "M-seed-1",
        toothId: "#11",
        deviceId: "AL-01",
        lengthMm: 22.5,
        measuredAt: measured.toISOString(),
        kind: "initial",
        previousLengthMm: null,
        previousDeviceId: null,
        reason: null,
        status: "confirmed",
        confirmedAt: measured.toISOString(),
      },
    ],
  };
}
