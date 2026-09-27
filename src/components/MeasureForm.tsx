// 登记测长表单：复测须填原因，新旧读数差超 0.5mm 实时提示将停在待复核
import { useState } from "react";
import type { LedgerState, Tooth } from "../domain/types";
import {
  activeAssignmentOfTooth,
  lastMeasurementOfTooth,
  needsReview,
  REVIEW_THRESHOLD_MM,
} from "../domain/rules";
import Modal from "./Modal";
import { fmtLength } from "./format";

interface MeasureFormProps {
  state: LedgerState;
  tooth: Tooth;
  onSubmit: (lengthMm: number, reason: string | null) => void;
  onClose: () => void;
}

const REMEASURE_REASONS = ["换设备复测", "读数不稳定", "根管再通后复测", "患者体位变动", "其他"];

function MeasureForm({ state, tooth, onSubmit, onClose }: MeasureFormProps) {
  const assignment = activeAssignmentOfTooth(state.assignments, tooth.id);
  const prev = lastMeasurementOfTooth(state.measurements, tooth.id);
  const isRemeasure = prev !== undefined;

  const [lengthText, setLengthText] = useState("");
  const [reason, setReason] = useState(isRemeasure ? REMEASURE_REASONS[0] : "");
  const [error, setError] = useState<string | null>(null);

  const length = Number.parseFloat(lengthText);
  const lengthValid = Number.isFinite(length) && length >= 5 && length <= 35;
  const willReview = lengthValid && needsReview(length, prev?.lengthMm ?? null);

  function handleSubmit() {
    if (!lengthValid) {
      setError("请输入 5.0–35.0 之间的读数（mm）");
      return;
    }
    if (isRemeasure && reason.trim() === "") {
      setError("复测必须填写原因");
      return;
    }
    onSubmit(Math.round(length * 10) / 10, isRemeasure ? reason : null);
  }

  return (
    <Modal title={`登记测长 · 牙位 ${tooth.id}（${tooth.patient}）`} onClose={onClose}>
      <div className="form-body">
        <p className="form-hint">
          当前设备：<strong>{assignment?.deviceId ?? "未锁定"}</strong>
          {isRemeasure ? " · 本次为复测" : " · 本次为首测"}
        </p>
        {isRemeasure && prev && (
          <div className="prev-box">
            <p>
              上次读数 <strong>{fmtLength(prev.lengthMm)}</strong>（{prev.deviceId}）
            </p>
            <label>
              <span>复测原因</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REMEASURE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label>
          <span>本次读数（mm）</span>
          <input
            type="number"
            step="0.1"
            min="5"
            max="35"
            placeholder="例如 19.5"
            value={lengthText}
            onChange={(e) => {
              setLengthText(e.target.value);
              setError(null);
            }}
            autoFocus
          />
        </label>
        {willReview && prev && (
          <p className="review-tip">
            与上次 {fmtLength(prev.lengthMm)} 相差 {Math.abs(length - prev.lengthMm).toFixed(1)}mm，超过{" "}
            {REVIEW_THRESHOLD_MM}mm，保存后将停在待复核，确认后才能进入预备。
          </p>
        )}
        {error && <p className="error-tip">{error}</p>}
        <div className="form-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary-action" onClick={handleSubmit}>保存读数</button>
        </div>
      </div>
    </Modal>
  );
}

export default MeasureForm;
