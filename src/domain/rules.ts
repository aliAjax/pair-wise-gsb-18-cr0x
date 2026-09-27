// 业务判断：校准、待检区、占用冲突、0.5mm 复核阈值、进入预备条件
import type { Assignment, Device, LedgerState, Measurement } from "./types";

/** 新旧读数差超过该值（毫米）即停在待复核 */
export const REVIEW_THRESHOLD_MM = 0.5;

export function isCalibrationExpired(device: Device, now: Date = new Date()): boolean {
  const due = new Date(device.calibrationDue + "T23:59:59");
  return due.getTime() < now.getTime();
}

/** 设备必须留在待检区的原因列表（为空表示可正常使用） */
export function quarantineReasons(device: Device, now: Date = new Date()): string[] {
  const reasons: string[] = [];
  if (isCalibrationExpired(device, now)) reasons.push("校准已过期");
  if (device.unitStatus === "repairing") reasons.push("主机维修中");
  if (device.probeStatus === "repairing") reasons.push("探头维修中");
  return reasons;
}

export function isQuarantined(device: Device, now: Date = new Date()): boolean {
  return quarantineReasons(device, now).length > 0;
}

export function activeAssignmentOfDevice(assignments: Assignment[], deviceId: string): Assignment | undefined {
  return assignments.find((a) => a.deviceId === deviceId && a.endedAt === null);
}

export function activeAssignmentOfTooth(assignments: Assignment[], toothId: string): Assignment | undefined {
  return assignments.find((a) => a.toothId === toothId && a.endedAt === null);
}

/** 同一台设备在 [start, end) 时段内是否已被占用（end 为 null 表示进行中） */
export function hasTimeConflict(
  assignments: Assignment[],
  deviceId: string,
  start: string,
  end: string | null
): boolean {
  const s = new Date(start).getTime();
  const e = end === null ? Number.POSITIVE_INFINITY : new Date(end).getTime();
  return assignments
    .filter((a) => a.deviceId === deviceId)
    .some((a) => {
      const as = new Date(a.startedAt).getTime();
      const ae = a.endedAt === null ? Number.POSITIVE_INFINITY : new Date(a.endedAt).getTime();
      return as < e && s < ae;
    });
}

export type CheckResult = { ok: true } | { ok: false; reason: string };

/** 治疗前锁定设备校验：待检区禁用、同时段不可被两个牙位占用、一牙位一机 */
export function checkLock(state: LedgerState, deviceId: string, toothId: string, now: Date = new Date()): CheckResult {
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) return { ok: false, reason: "设备不存在" };
  const reasons = quarantineReasons(device, now);
  if (reasons.length > 0) return { ok: false, reason: `${reasons.join("、")}，只能留在待检区` };
  const occupying = activeAssignmentOfDevice(state.assignments, deviceId);
  if (occupying) return { ok: false, reason: `该设备正被牙位 ${occupying.toothId} 占用` };
  if (activeAssignmentOfTooth(state.assignments, toothId)) {
    return { ok: false, reason: "该牙位已锁定其他设备，请先归还" };
  }
  if (hasTimeConflict(state.assignments, deviceId, now.toISOString(), null)) {
    return { ok: false, reason: "同一时段存在占用冲突" };
  }
  return { ok: true };
}

export function lastMeasurementOfTooth(measurements: Measurement[], toothId: string): Measurement | undefined {
  return measurements
    .filter((m) => m.toothId === toothId)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
}

/** 新读数与旧值相差超过 0.5mm 需要复核 */
export function needsReview(lengthMm: number, previousLengthMm: number | null): boolean {
  if (previousLengthMm === null) return false;
  return Math.abs(lengthMm - previousLengthMm) > REVIEW_THRESHOLD_MM;
}

export function pendingReviewOfTooth(measurements: Measurement[], toothId: string): Measurement[] {
  return measurements.filter((m) => m.toothId === toothId && m.status === "pending-review");
}

/** 进入预备的条件：有测长记录、无待复核、设备已归还 */
export function checkEnterPreparation(state: LedgerState, toothId: string): CheckResult {
  const toothMeasurements = state.measurements.filter((m) => m.toothId === toothId);
  if (toothMeasurements.length === 0) return { ok: false, reason: "尚无测长记录，不能进入预备" };
  const pending = pendingReviewOfTooth(state.measurements, toothId);
  if (pending.length > 0) {
    return { ok: false, reason: `有 ${pending.length} 条测长停在待复核，确认后才能进入预备` };
  }
  if (activeAssignmentOfTooth(state.assignments, toothId)) {
    return { ok: false, reason: "设备尚未归还，请先登记归还" };
  }
  return { ok: true };
}

export type DeviceArea = "in-use" | "quarantine" | "available";

/** 设备当前所在区域：使用中 / 待检区 / 在库可用 */
export function deviceArea(state: LedgerState, device: Device, now: Date = new Date()): DeviceArea {
  if (isQuarantined(device, now)) return "quarantine";
  if (activeAssignmentOfDevice(state.assignments, device.id)) return "in-use";
  return "available";
}
