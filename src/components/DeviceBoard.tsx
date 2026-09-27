// 设备台账：按区域分组展示，待检区设备给出原因与处理入口
import type { Device, LedgerState } from "../domain/types";
import { activeAssignmentOfDevice, deviceArea, isCalibrationExpired, quarantineReasons, type DeviceArea } from "../domain/rules";
import { daysUntil } from "./format";

interface DeviceBoardProps {
  state: LedgerState;
  onFinishRepair: (deviceId: string) => void;
  onRecalibrate: (deviceId: string) => void;
}

const AREA_META: Record<DeviceArea, { title: string; hint: string }> = {
  "in-use": { title: "使用中", hint: "已被牙位锁定，治疗结束后归还" },
  available: { title: "在库可用", hint: "校准有效、部件正常，可锁定" },
  quarantine: { title: "待检区", hint: "校准过期或维修中，禁止锁定" },
};

function CalibrationLine({ device }: { device: Device }) {
  const days = daysUntil(device.calibrationDue);
  if (isCalibrationExpired(device)) {
    return <span className="tag tag-danger">校准 {device.calibrationDue} · 已过期 {-days} 天</span>;
  }
  const cls = days <= 30 ? "tag tag-warn" : "tag";
  return <span className={cls}>校准 {device.calibrationDue} · 剩余 {days} 天</span>;
}

function DeviceCard({ state, device, onFinishRepair, onRecalibrate }: DeviceBoardProps & { device: Device }) {
  const area = deviceArea(state, device);
  const occupying = activeAssignmentOfDevice(state.assignments, device.id);
  const reasons = quarantineReasons(device);

  return (
    <article className={`device-card area-${area}`}>
      <div className="device-head">
        <strong>{device.name}</strong>
        <span className="device-model">{device.model}</span>
      </div>
      <div className="tag-row">
        <CalibrationLine device={device} />
        <span className={device.unitStatus === "ok" ? "tag" : "tag tag-danger"}>
          主机{device.unitStatus === "ok" ? "正常" : "维修中"}
        </span>
        <span className={device.probeStatus === "ok" ? "tag" : "tag tag-danger"}>
          探头{device.probeStatus === "ok" ? "正常" : "维修中"}
        </span>
      </div>
      {area === "in-use" && occupying && (
        <p className="device-note">占用中：牙位 {occupying.toothId}</p>
      )}
      {area === "quarantine" && (
        <>
          <p className="device-note danger-text">{reasons.join("、")}，仅可留在待检区</p>
          <div className="device-actions">
            {(device.unitStatus === "repairing" || device.probeStatus === "repairing") && (
              <button onClick={() => onFinishRepair(device.id)}>维修完成</button>
            )}
            {isCalibrationExpired(device) && (
              <button onClick={() => onRecalibrate(device.id)}>完成校准（+180天）</button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function DeviceBoard({ state, onFinishRepair, onRecalibrate }: DeviceBoardProps) {
  const areas: DeviceArea[] = ["in-use", "available", "quarantine"];
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>电子根测仪</p>
          <h2>设备台账</h2>
        </div>
      </div>
      {areas.map((area) => {
        const devices = state.devices.filter((d) => deviceArea(state, d) === area);
        return (
          <div key={area} className={`device-area area-block-${area}`}>
            <div className="area-title">
              <h3>{AREA_META[area].title}</h3>
              <span>{devices.length} 台 · {AREA_META[area].hint}</span>
            </div>
            {devices.length === 0 ? (
              <p className="empty-line">暂无设备</p>
            ) : (
              <div className="device-grid">
                {devices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    state={state}
                    device={device}
                    onFinishRepair={onFinishRepair}
                    onRecalibrate={onRecalibrate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default DeviceBoard;
