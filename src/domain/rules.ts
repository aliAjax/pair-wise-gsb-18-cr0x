import type {
  Device,
  DeviceZone,
  LedgerState,
  Measurement,
  MeasurementStatus,
  ReturnCondition,
  Session,
} from "./types";

/** 新旧读数差值超过该值（mm）时，测长先停在待复核 */
export const REVIEW_THRESHOLD_MM = 0.5;

export const ZONE_LABEL: Record<DeviceZone, string> = {
  available: "可用",
  "in-use": "使用中",
  "quarantine-expired": "待检区 · 校准过期",
  "quarantine-repair": "待检区 · 探头维修中",
};

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isCalibrationExpired(device: Device, today: string): boolean {
  return device.calibrationDue < today;
}

export function activeSessionForDevice(sessions: Session[], deviceId: string): Session | null {
  return sessions.find((s) => s.deviceId === deviceId && s.endedAt === null) ?? null;
}

export function activeSessionForTooth(sessions: Session[], tooth: string): Session | null {
  return sessions.find((s) => s.tooth === tooth && s.endedAt === null) ?? null;
}

/** 设备区域：维修中 / 校准过期 → 待检区；有未归还占用 → 使用中；否则可用 */
export function deviceZone(device: Device, sessions: Session[], today: string): DeviceZone {
  if (device.probeStatus === "repairing") return "quarantine-repair";
  if (isCalibrationExpired(device, today)) return "quarantine-expired";
  if (activeSessionForDevice(sessions, device.id)) return "in-use";
  return "available";
}

/** 锁定前校验，返回 null 表示可以锁定，否则返回原因 */
export function lockCheck(state: LedgerState, tooth: string, deviceId: string, today: string): string | null {
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) return "设备不存在";
  if (activeSessionForTooth(state.sessions, tooth)) return `牙位 #${tooth} 已有在用设备，请先归还`;
  const zone = deviceZone(device, state.sessions, today);
  if (zone === "in-use") {
    const holder = activeSessionForDevice(state.sessions, deviceId);
    return `该设备正被牙位 #${holder?.tooth ?? "?"} 占用，同一时段不能锁给两个牙位`;
  }
  if (zone === "quarantine-expired") return "校准已过期，设备只能留在待检区";
  if (zone === "quarantine-repair") return "探头维修中，设备只能留在待检区";
  return null;
}

/** 治疗前为牙位锁定一台设备 */
export function lockDevice(
  state: LedgerState,
  tooth: string,
  deviceId: string,
  now: Date
): { state: LedgerState; error: string | null } {
  const error = lockCheck(state, tooth, deviceId, todayStr(now));
  if (error) return { state, error };
  const session: Session = {
    id: uid("S"),
    tooth,
    deviceId,
    startedAt: now.toISOString(),
    endedAt: null,
    returnMainUnit: null,
    returnProbe: null,
    actualMinutes: null,
  };
  return {
    state: {
      ...state,
      sessions: [...state.sessions, session],
      stages: { ...state.stages, [tooth]: "测长" },
    },
    error: null,
  };
}

export function latestMeasurement(state: LedgerState, tooth: string): Measurement | null {
  const list = state.measurements.filter((m) => m.tooth === tooth);
  return list.length > 0 ? list[list.length - 1] : null;
}

/** 与上一读数比较，差值超过 0.5mm 停在待复核 */
export function evaluateStatus(prevLengthMm: number | null, lengthMm: number): MeasurementStatus {
  if (prevLengthMm === null) return "confirmed";
  return Math.abs(lengthMm - prevLengthMm) > REVIEW_THRESHOLD_MM ? "pending-review" : "confirmed";
}

export interface MeasurementInput {
  tooth: string;
  deviceId: string;
  lengthMm: number;
  reason: string;
}

/** 记录一次测长；换设备复测时必须填写原因，并保存上一长度与设备 */
export function addMeasurement(
  state: LedgerState,
  input: MeasurementInput,
  now: Date
): { state: LedgerState; error: string | null; measurement: Measurement | null } {
  const session = activeSessionForTooth(state.sessions, input.tooth);
  if (!session) return { state, error: "该牙位当前没有锁定设备，请先锁定", measurement: null };
  if (session.deviceId !== input.deviceId) {
    return { state, error: "测长设备与该牙位锁定的设备不一致", measurement: null };
  }
  if (!(input.lengthMm > 0 && input.lengthMm < 40)) {
    return { state, error: "工作长度需在 0–40mm 之间", measurement: null };
  }
  const prev = latestMeasurement(state, input.tooth);
  const deviceChanged = prev !== null && prev.deviceId !== input.deviceId;
  if (deviceChanged && !input.reason.trim()) {
    return { state, error: "换设备复测必须填写原因", measurement: null };
  }
  const status = evaluateStatus(prev?.lengthMm ?? null, input.lengthMm);
  const measurement: Measurement = {
    id: uid("M"),
    tooth: input.tooth,
    deviceId: input.deviceId,
    sessionId: session.id,
    lengthMm: input.lengthMm,
    takenAt: now.toISOString(),
    prevLengthMm: prev?.lengthMm ?? null,
    prevDeviceId: prev?.deviceId ?? null,
    reason: input.reason.trim(),
    status,
    confirmedAt: status === "confirmed" ? now.toISOString() : null,
  };
  return { state: { ...state, measurements: [...state.measurements, measurement] }, error: null, measurement };
}

/** 复核确认后，测长才生效，牙位才能进入预备 */
export function confirmMeasurement(state: LedgerState, measurementId: string, now: Date): LedgerState {
  return {
    ...state,
    measurements: state.measurements.map((m) =>
      m.id === measurementId ? { ...m, status: "confirmed", confirmedAt: now.toISOString() } : m
    ),
  };
}

/** 进入预备前校验，返回 null 表示可以进入 */
export function preparationCheck(state: LedgerState, tooth: string): string | null {
  const latest = latestMeasurement(state, tooth);
  if (!latest) return "尚无测长记录，不能进入预备";
  if (latest.status !== "confirmed") {
    return `最新读数与上一值相差超过 ${REVIEW_THRESHOLD_MM}mm，待复核确认后才能进入预备`;
  }
  return null;
}

export function enterPreparation(
  state: LedgerState,
  tooth: string
): { state: LedgerState; error: string | null } {
  const error = preparationCheck(state, tooth);
  if (error) return { state, error };
  return { state: { ...state, stages: { ...state.stages, [tooth]: "预备" } }, error: null };
}

export interface ReturnInfo {
  mainUnit: ReturnCondition;
  probe: ReturnCondition;
  actualMinutes: number;
}

/** 归还登记：主机 / 探头状态 + 实际使用时长；任一项异常则设备转维修 */
export function returnSession(
  state: LedgerState,
  sessionId: string,
  info: ReturnInfo,
  now: Date
): { state: LedgerState; error: string | null } {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session || session.endedAt !== null) return { state, error: "占用记录不存在或已归还" };
  if (!(info.actualMinutes >= 0)) return { state, error: "请填写实际使用时长" };
  const sessions = state.sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          endedAt: now.toISOString(),
          returnMainUnit: info.mainUnit,
          returnProbe: info.probe,
          actualMinutes: info.actualMinutes,
        }
      : s
  );
  const abnormal = info.mainUnit === "abnormal" || info.probe === "abnormal";
  const devices = abnormal
    ? state.devices.map((d) => (d.id === session.deviceId ? { ...d, probeStatus: "repairing" } : d))
    : state.devices;
  return { state: { ...state, sessions, devices }, error: null };
}

/** 维修完成，设备从待检区转回 */
export function completeRepair(state: LedgerState, deviceId: string): LedgerState {
  return {
    ...state,
    devices: state.devices.map((d) => (d.id === deviceId ? { ...d, probeStatus: "ok" } : d)),
  };
}

/** 登记新的校准到期日 */
export function renewCalibration(state: LedgerState, deviceId: string, newDue: string): LedgerState {
  return {
    ...state,
    devices: state.devices.map((d) => (d.id === deviceId ? { ...d, calibrationDue: newDue } : d)),
  };
}
