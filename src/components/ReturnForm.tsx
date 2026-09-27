// 归还登记表单：主机/探头状况与实际使用时长，异常部件将转维修
import { useState } from "react";
import type { LedgerState, ReturnCondition, Tooth } from "../domain/types";
import { activeAssignmentOfTooth } from "../domain/rules";
import Modal from "./Modal";
import { fmtDateTime, minutesSince } from "./format";

interface ReturnFormProps {
  state: LedgerState;
  tooth: Tooth;
  onSubmit: (unit: ReturnCondition, probe: ReturnCondition, usageMinutes: number) => void;
  onClose: () => void;
}

function ConditionSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ReturnCondition;
  onChange: (v: ReturnCondition) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as ReturnCondition)}>
        <option value="ok">正常</option>
        <option value="abnormal">异常（转维修）</option>
      </select>
    </label>
  );
}

function ReturnForm({ state, tooth, onSubmit, onClose }: ReturnFormProps) {
  const assignment = activeAssignmentOfTooth(state.assignments, tooth.id);
  const device = assignment ? state.devices.find((d) => d.id === assignment.deviceId) : undefined;

  const [unit, setUnit] = useState<ReturnCondition>("ok");
  const [probe, setProbe] = useState<ReturnCondition>("ok");
  const [minutesText, setMinutesText] = useState(
    assignment ? String(minutesSince(assignment.startedAt)) : "0"
  );
  const [error, setError] = useState<string | null>(null);

  if (!assignment || !device) {
    return (
      <Modal title={`归还设备 · 牙位 ${tooth.id}`} onClose={onClose}>
        <div className="form-body">
          <p className="empty-line">该牙位没有占用中的设备</p>
          <div className="form-actions">
            <button onClick={onClose}>关闭</button>
          </div>
        </div>
      </Modal>
    );
  }

  const minutes = Number.parseInt(minutesText, 10);
  const hasAbnormal = unit === "abnormal" || probe === "abnormal";

  function handleSubmit() {
    if (!Number.isFinite(minutes) || minutes < 0) {
      setError("请填写有效的实际使用时长（分钟）");
      return;
    }
    onSubmit(unit, probe, minutes);
  }

  return (
    <Modal title={`归还设备 · 牙位 ${tooth.id}（${tooth.patient}）`} onClose={onClose}>
      <div className="form-body">
        <p className="form-hint">
          归还 <strong>{device.name}</strong>（{device.model}），{fmtDateTime(assignment.startedAt)} 起占用
        </p>
        <ConditionSelect label="主机状态" value={unit} onChange={setUnit} />
        <ConditionSelect label="探头状态" value={probe} onChange={setProbe} />
        <label>
          <span>实际使用时长（分钟）</span>
          <input
            type="number"
            min="0"
            step="1"
            value={minutesText}
            onChange={(e) => {
              setMinutesText(e.target.value);
              setError(null);
            }}
          />
        </label>
        {hasAbnormal && (
          <p className="review-tip">登记异常后，该设备将转入维修并留在待检区，校准/维修完成前不可锁定。</p>
        )}
        {error && <p className="error-tip">{error}</p>}
        <div className="form-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary-action" onClick={handleSubmit}>确认归还</button>
        </div>
      </div>
    </Modal>
  );
}

export default ReturnForm;
