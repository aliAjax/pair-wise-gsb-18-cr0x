// 领域资料类型：设备、牙位、占用、测长

/** 部件状态：正常 / 维修中 */
export type PartStatus = "ok" | "repairing";

/** 归还时登记的部件状况：正常 / 异常 */
export type ReturnCondition = "ok" | "abnormal";

/** 电子根测仪（主机 + 探头） */
export interface Device {
  id: string;
  name: string;
  model: string;
  /** 校准到期日 YYYY-MM-DD */
  calibrationDue: string;
  /** 主机状态 */
  unitStatus: PartStatus;
  /** 探头状态 */
  probeStatus: PartStatus;
}

export type ToothStage = "开髓" | "测长" | "预备" | "封药" | "充填";

/** 牙位病例 */
export interface Tooth {
  id: string;
  patient: string;
  diagnosis: string;
  stage: ToothStage;
}

/** 设备占用记录（借出 → 归还） */
export interface Assignment {
  id: string;
  toothId: string;
  deviceId: string;
  startedAt: string;
  endedAt: string | null;
  /** 归还登记：主机状况 */
  returnUnit: ReturnCondition | null;
  /** 归还登记：探头状况 */
  returnProbe: ReturnCondition | null;
  /** 归还登记：实际使用时长（分钟） */
  usageMinutes: number | null;
}

export type MeasurementKind = "initial" | "remeasure";
export type MeasurementStatus = "pending-review" | "confirmed";

/** 工作长度测量记录 */
export interface Measurement {
  id: string;
  toothId: string;
  deviceId: string;
  lengthMm: number;
  measuredAt: string;
  kind: MeasurementKind;
  /** 复测时保存：上一次长度 */
  previousLengthMm: number | null;
  /** 复测时保存：上一次使用的设备 */
  previousDeviceId: string | null;
  /** 复测原因 */
  reason: string | null;
  status: MeasurementStatus;
  confirmedAt: string | null;
}

/** 台账整体状态 */
export interface LedgerState {
  devices: Device[];
  teeth: Tooth[];
  assignments: Assignment[];
  measurements: Measurement[];
}
