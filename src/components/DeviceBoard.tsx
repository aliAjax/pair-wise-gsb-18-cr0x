import type { LedgerState } from "../domain/types";
import { deviceZone, todayStr, ZONE_LABEL } from "../domain/rules";

interface Props {
  ledger: LedgerState;
  onRepairDone: (deviceId: string) => void;
  onRecalibrate: (deviceId: string) => void;
}

/** 设备看板：每台根测仪的区域、校准到期与探头状态 */
export function DeviceBoard({ ledger, onRepairDone, onRecalibrate }: Props) {
  const today = todayStr();
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>设备看板</p>
          <h2>根测仪状态与待检区</h2>
        </div>
      </div>
      <div className="device-grid">
        {ledger.devices.map((device) => {
          const zone = deviceZone(device, ledger.sessions, today);
          const holder = ledger.sessions.find((s) => s.deviceId === device.id && s.endedAt === null);
          return (
            <article key={device.id} className="device-card">
              <div className="device-head">
                <h3>{device.label}</h3>
                <span className={`badge badge-${zone}`}>{ZONE_LABEL[zone]}</span>
              </div>
              <p className="device-meta">{device.model}</p>
              <dl className="device-facts">
                <div>
                  <dt>校准到期</dt>
                  <dd>{device.calibrationDue}</dd>
                </div>
                <div>
                  <dt>探头</dt>
                  <dd>{device.probeStatus === "ok" ? "正常" : "维修中"}</dd>
                </div>
                {holder && (
                  <div>
                    <dt>当前牙位</dt>
                    <dd>#{holder.tooth}</dd>
                  </div>
                )}
              </dl>
              {zone === "quarantine-repair" && (
                <button onClick={() => onRepairDone(device.id)}>维修完成，转回可用</button>
              )}
              {zone === "quarantine-expired" && (
                <button onClick={() => onRecalibrate(device.id)}>登记校准（有效期 +1 年）</button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
