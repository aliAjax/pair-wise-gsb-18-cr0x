// 台账操作：锁定、测长、复核、归还、转维修/校准、进入预备，所有变更自动保存
import { useEffect, useState } from "react";
import type { Assignment, LedgerState, Measurement, ReturnCondition } from "../domain/types";
import {
  activeAssignmentOfTooth,
  checkEnterPreparation,
  checkLock,
  lastMeasurementOfTooth,
  needsReview,
} from "../domain/rules";
import { loadState, resetState, saveState } from "./storage";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export type OpResult = { ok: true } | { ok: false; reason: string };

export function useLedger() {
  const [state, setState] = useState<LedgerState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  /** 治疗前给牙位锁定一台设备 */
  function lockDevice(toothId: string, deviceId: string): OpResult {
    const check = checkLock(state, deviceId, toothId);
    if (!check.ok) return { ok: false, reason: check.reason };
    const assignment: Assignment = {
      id: uid("A"),
      toothId,
      deviceId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      returnUnit: null,
      returnProbe: null,
      usageMinutes: null,
    };
    setState((s) => ({ ...s, assignments: [...s.assignments, assignment] }));
    return { ok: true };
  }

  /** 登记测长；复测时保存上一长度、上一设备与原因，差值超 0.5mm 停在待复核 */
  function addMeasurement(toothId: string, lengthMm: number, reason: string | null): OpResult {
    const assignment = activeAssignmentOfTooth(state.assignments, toothId);
    if (!assignment) return { ok: false, reason: "该牙位尚未锁定设备，无法测长" };
    const prev = lastMeasurementOfTooth(state.measurements, toothId);
    const isRemeasure = prev !== undefined;
    if (isRemeasure && (!reason || reason.trim() === "")) {
      return { ok: false, reason: "复测必须填写原因" };
    }
    const review = needsReview(lengthMm, prev?.lengthMm ?? null);
    const now = new Date().toISOString();
    const measurement: Measurement = {
      id: uid("M"),
      toothId,
      deviceId: assignment.deviceId,
      lengthMm,
      measuredAt: now,
      kind: isRemeasure ? "remeasure" : "initial",
      previousLengthMm: prev?.lengthMm ?? null,
      previousDeviceId: prev?.deviceId ?? null,
      reason: isRemeasure ? reason : null,
      status: review ? "pending-review" : "confirmed",
      confirmedAt: review ? null : now,
    };
    setState((s) => ({ ...s, measurements: [...s.measurements, measurement] }));
    return { ok: true };
  }

  /** 待复核测长确认后生效 */
  function confirmMeasurement(measurementId: string): void {
    setState((s) => ({
      ...s,
      measurements: s.measurements.map((m) =>
        m.id === measurementId ? { ...m, status: "confirmed", confirmedAt: new Date().toISOString() } : m
      ),
    }));
  }

  /** 归还登记：主机/探头状况与实际使用时长，异常部件转维修（留待检区） */
  function returnDevice(
    toothId: string,
    unit: ReturnCondition,
    probe: ReturnCondition,
    usageMinutes: number
  ): OpResult {
    const assignment = activeAssignmentOfTooth(state.assignments, toothId);
    if (!assignment) return { ok: false, reason: "该牙位没有占用中的设备" };
    const endedAt = new Date().toISOString();
    setState((s) => ({
      ...s,
      assignments: s.assignments.map((a) =>
        a.id === assignment.id ? { ...a, endedAt, returnUnit: unit, returnProbe: probe, usageMinutes } : a
      ),
      devices: s.devices.map((d) =>
        d.id === assignment.deviceId
          ? {
              ...d,
              unitStatus: unit === "abnormal" ? "repairing" : d.unitStatus,
              probeStatus: probe === "abnormal" ? "repairing" : d.probeStatus,
            }
          : d
      ),
    }));
    return { ok: true };
  }

  /** 复核全部确认后才能进入预备 */
  function enterPreparation(toothId: string): OpResult {
    const check = checkEnterPreparation(state, toothId);
    if (!check.ok) return { ok: false, reason: check.reason };
    setState((s) => ({
      ...s,
      teeth: s.teeth.map((t) => (t.id === toothId ? { ...t, stage: "预备" } : t)),
    }));
    return { ok: true };
  }

  /** 维修完成，主机与探头恢复正常 */
  function finishRepair(deviceId: string): void {
    setState((s) => ({
      ...s,
      devices: s.devices.map((d) =>
        d.id === deviceId ? { ...d, unitStatus: "ok", probeStatus: "ok" } : d
      ),
    }));
  }

  /** 完成校准，有效期顺延 180 天 */
  function recalibrate(deviceId: string): void {
    const due = new Date();
    due.setDate(due.getDate() + 180);
    const calibrationDue = due.toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      devices: s.devices.map((d) => (d.id === deviceId ? { ...d, calibrationDue } : d)),
    }));
  }

  function reset(): void {
    setState(resetState());
  }

  return {
    state,
    lockDevice,
    addMeasurement,
    confirmMeasurement,
    returnDevice,
    enterPreparation,
    finishRepair,
    recalibrate,
    reset,
  };
}
