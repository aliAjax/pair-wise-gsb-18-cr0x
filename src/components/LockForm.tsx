// 锁定设备表单：仅可选择在库可用设备，待检区设备列出禁用原因
import { useState } from "react";
import type { LedgerState, Tooth } from "../domain/types";
import { deviceArea, quarantineReasons } from "../domain/rules";
import Modal from "./Modal";

interface LockFormProps {
  state: LedgerState;
  tooth: Tooth;
  onSubmit: (deviceId: string) => void;
  onClose: () => void;
}

function LockForm({ state, tooth, onSubmit, onClose }: LockFormProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const available = state.devices.filter((d) => deviceArea(state, d) === "available");
  const blocked = state.devices.filter((d) => deviceArea(state, d) !== "available");

  return (
    <Modal title={`锁定设备 · 牙位 ${tooth.id}（${tooth.patient}）`} onClose={onClose}>
      <div className="form-body">
        <p className="form-hint">治疗前为该牙位锁定一台根测仪，同一台设备同一时段只能服务一个牙位。</p>
        {available.length === 0 && <p className="empty-line">当前没有在库可用设备</p>}
        <div className="option-list">
          {available.map((d) => (
            <label key={d.id} className={`option-card ${selected === d.id ? "option-active" : ""}`}>
              <input
                type="radio"
                name="device"
                checked={selected === d.id}
                onChange={() => setSelected(d.id)}
              />
              <span>
                <strong>{d.name}</strong>
                <em>{d.model} · 校准至 {d.calibrationDue}</em>
              </span>
            </label>
          ))}
        </div>
        {blocked.length > 0 && (
          <div className="blocked-list">
            <p className="form-hint">以下设备不可选：</p>
            {blocked.map((d) => {
              const reasons = quarantineReasons(d);
              const occupying = state.assignments.find((a) => a.deviceId === d.id && a.endedAt === null);
              return (
                <p key={d.id} className="blocked-line">
                  {d.name} — {reasons.length > 0 ? `${reasons.join("、")}（待检区）` : `正被牙位 ${occupying?.toothId} 占用`}
                </p>
              );
            })}
          </div>
        )}
        <div className="form-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary-action" disabled={!selected} onClick={() => selected && onSubmit(selected)}>
            确认锁定
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default LockForm;
