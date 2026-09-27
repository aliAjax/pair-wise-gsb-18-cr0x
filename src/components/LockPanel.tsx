import { useState } from "react";
import { TEETH } from "../data/seed";
import { activeSessionForTooth, deviceZone, todayStr, ZONE_LABEL } from "../domain/rules";
import type { LedgerState } from "../domain/types";

interface Props {
  ledger: LedgerState;
  onLock: (tooth: string, deviceId: string) => string | null;
}

/** 治疗前锁定：一个牙位一台设备，待检区与在用设备不可选 */
export function LockPanel({ ledger, onLock }: Props) {
  const [tooth, setTooth] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const today = todayStr();

  const submit = () => {
    if (!tooth || !deviceId) {
      setError("请选择牙位和设备");
      return;
    }
    const err = onLock(tooth, deviceId);
    setError(err ?? "");
    if (!err) {
      setTooth("");
      setDeviceId("");
    }
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>治疗前锁定</p>
          <h2>为牙位锁定一台根测仪</h2>
        </div>
      </div>
      <div className="form-grid">
        <label>
          <span>牙位</span>
          <select value={tooth} onChange={(e) => setTooth(e.target.value)}>
            <option value="">选择牙位</option>
            {TEETH.map((t) => {
              const busy = activeSessionForTooth(ledger.sessions, t);
              return (
                <option key={t} value={t} disabled={!!busy}>
                  #{t}
                  {busy ? "（已有在用设备）" : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          <span>根测仪</span>
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">选择设备</option>
            {ledger.devices.map((d) => {
              const zone = deviceZone(d, ledger.sessions, today);
              return (
                <option key={d.id} value={d.id} disabled={zone !== "available"}>
                  {d.label} · {ZONE_LABEL[zone]}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="primary-action" onClick={submit}>
        锁定设备
      </button>
    </section>
  );
}
