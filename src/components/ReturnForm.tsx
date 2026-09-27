import { useState } from "react";
import type { ReturnCondition, Session } from "../domain/types";

interface Props {
  session: Session;
  onSubmit: (mainUnit: ReturnCondition, probe: ReturnCondition, minutes: number) => string | null;
  onCancel: () => void;
}

/** 归还登记：主机 / 探头状态 + 实际使用时长，异常设备将转维修 */
export function ReturnForm({ session, onSubmit, onCancel }: Props) {
  const suggested = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
  const [mainUnit, setMainUnit] = useState<ReturnCondition>("ok");
  const [probe, setProbe] = useState<ReturnCondition>("ok");
  const [minutes, setMinutes] = useState(String(suggested));
  const [error, setError] = useState("");

  const submit = () => {
    const value = Number(minutes);
    if (minutes === "" || Number.isNaN(value) || value < 0) {
      setError("请填写实际使用时长（分钟）");
      return;
    }
    setError(onSubmit(mainUnit, probe, Math.round(value)) ?? "");
  };

  return (
    <div className="inline-form">
      <p className="hint">归还登记：主机或探头任一项异常，设备将转入维修并留在待检区。</p>
      <div className="form-grid three">
        <label>
          <span>主机状态</span>
          <select value={mainUnit} onChange={(e) => setMainUnit(e.target.value as ReturnCondition)}>
            <option value="ok">正常</option>
            <option value="abnormal">异常</option>
          </select>
        </label>
        <label>
          <span>探头状态</span>
          <select value={probe} onChange={(e) => setProbe(e.target.value as ReturnCondition)}>
            <option value="ok">正常</option>
            <option value="abnormal">异常</option>
          </select>
        </label>
        <label>
          <span>实际使用时长（分钟）</span>
          <input type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="inline-actions">
        <button className="primary-action" onClick={submit}>
          确认归还
        </button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
