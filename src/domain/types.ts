export type ProbeStatus = "ok" | "repairing";
export type ReturnCondition = "ok" | "abnormal";
export type MeasurementStatus = "confirmed" | "pending-review";
export type ToothStage = "测长" | "预备";

/** 根测仪设备档案 */
export interface Device {
  id: string;
  label: string;
  model: string;
  /** 校准到期日，YYYY-MM-DD */
  calibrationDue: string;
  probeStatus: ProbeStatus;
}

/** 设备当前所在区域（由档案 + 占用情况推导） */
export type DeviceZone =
  | "available"
  | "in-use"
  | "quarantine-expired"
  | "quarantine-repair";

/** 一次占用：某台设备被某个牙位锁定到归还的全过程 */
export interface Session {
  id: string;
  tooth: string;
  deviceId: string;
  startedAt: string;
  endedAt: string | null;
  returnMainUnit: ReturnCondition | null;
  returnProbe: ReturnCondition | null;
  actualMinutes: number | null;
}

/** 一次测长：换设备复测时会带上上一长度、上一设备和原因 */
export interface Measurement {
  id: string;
  tooth: string;
  deviceId: string;
  sessionId: string;
  lengthMm: number;
  takenAt: string;
  prevLengthMm: number | null;
  prevDeviceId: string | null;
  reason: string;
  status: MeasurementStatus;
  confirmedAt: string | null;
}

export interface LedgerState {
  devices: Device[];
  sessions: Session[];
  measurements: Measurement[];
  stages: Record<string, ToothStage>;
}
