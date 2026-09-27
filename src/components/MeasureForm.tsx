import { useState } from "react";
import type { LedgerState, Session } from "../domain/types";
import { latestMeasurement, REVIEW_THRESHOLD_MM } from "../domain/rules";

interface Props {
  ledger: LedgerState;
  session: Session;
  onSubmit: (lengthMm: number, reason: string) => string | null;
  onCancel: () => void;
}

/** 测长录入：显示上一长度与设备，换机复测必填原因，超差提示将停在待复核 */
export function MeasureForm({ ledger, session, onSubmit, onCancel }: Props) {
  const prev = latestMeasurement(ledger, session.tooth);
  const [length, setLength] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const deviceChanged = prev !== null && prev.deviceId !== session.deviceId;
  const value = Number(length);
  const diff = prev !== null && length !== "" && !Number.isNaN(value) ? Math.abs(value - prev.lengthMm) : null;

  const submit = () => {
    if (length === "" || Number.isNaN(value)) {
      setError("请输入有效长度");
      return;
    }
    setError(onSubmit(value, reason) ?? "");
  };

  return (
    <div className="inline-form">
      {prev && (
        <p className="hint">
          上一测长 {prev.lengthMm.toFixed(1)}mm（{prev.deviceId}）
          {deviceChanged && "，本次为换设备复测，需填写原因"}
          {diff !== null && diff > REVIEW_THRESHOLD_MM &&
            `，当前差值 ${diff.toFixed(1)}mm 超过 ${REVIEW_THRESHOLD_MM}mm，保存后将停在待复核`}
        </p>
      )}
      <div className="form-grid">
        <label>
          <span>工作长度（mm）</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="40"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="如 19.5"
          />
        </label>
        <label>
          <span>复测原因{deviceChanged ? "（必填）" : "（选填）"}</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：首测读数漂移，换机复测"
          />
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="inline-actions">
        <button className="primary-action" onClick={submit}>
          保存测长
        </button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
