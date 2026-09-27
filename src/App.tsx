import { useState } from "react";
import "./styles.css";
import { useLedger } from "./hooks/useLedger";
import {
  addMeasurement,
  completeRepair,
  confirmMeasurement,
  deviceZone,
  enterPreparation,
  lockDevice,
  renewCalibration,
  returnSession,
  todayStr,
} from "./domain/rules";
import type { LedgerState, ReturnCondition } from "./domain/types";
import { resetLedger } from "./storage/ledgerStore";
import { DeviceBoard } from "./components/DeviceBoard";
import { LockPanel } from "./components/LockPanel";
import { ActiveSessions } from "./components/ActiveSessions";
import { ReviewList } from "./components/ReviewList";
import { ToothTrace } from "./components/ToothTrace";

const project = {
  id: "hxwl-04",
  port: 5104,
  title: "牙科根管治疗",
  subtitle: "根测仪与工作长度台账：治疗前按牙位锁定设备，换机复测留痕，超差读数复核后再预备",
};

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: number; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [ledger, setLedger] = useLedger();
  const [notice, setNotice] = useState("");
  const today = todayStr();

  const zones = ledger.devices.map((d) => deviceZone(d, ledger.sessions, today));
  const metrics = [
    { label: "可用设备", value: zones.filter((z) => z === "available").length },
    { label: "使用中", value: zones.filter((z) => z === "in-use").length },
    { label: "待检区", value: zones.filter((z) => z.startsWith("quarantine")).length },
    { label: "待复核测长", value: ledger.measurements.filter((m) => m.status === "pending-review").length },
  ];

  const apply = (result: { state: LedgerState; error: string | null }, okMessage: string): string | null => {
    if (result.error) {
      setNotice(result.error);
      return result.error;
    }
    setLedger(result.state);
    setNotice(okMessage);
    return null;
  };

  const handleLock = (tooth: string, deviceId: string) =>
    apply(lockDevice(ledger, tooth, deviceId, new Date()), `已为牙位 #${tooth} 锁定 ${deviceId}`);

  const handleMeasure = (tooth: string, deviceId: string, lengthMm: number, reason: string) => {
    const result = addMeasurement(ledger, { tooth, deviceId, lengthMm, reason }, new Date());
    if (result.error) {
      setNotice(result.error);
      return result.error;
    }
    setLedger(result.state);
    setNotice(
      result.measurement?.status === "pending-review"
        ? "新读数与上一值相差超过 0.5mm，已停在待复核，确认后才能进入预备"
        : `已保存测长 ${lengthMm.toFixed(1)}mm`
    );
    return null;
  };

  const handleConfirm = (measurementId: string) => {
    setLedger(confirmMeasurement(ledger, measurementId, new Date()));
    setNotice("已确认复核，该牙位可进入预备");
  };

  const handleReturn = (sessionId: string, mainUnit: ReturnCondition, probe: ReturnCondition, minutes: number) => {
    const abnormal = mainUnit === "abnormal" || probe === "abnormal";
    return apply(
      returnSession(ledger, sessionId, { mainUnit, probe, actualMinutes: minutes }, new Date()),
      abnormal ? "已归还登记；设备异常，已转入维修（待检区）" : "已归还登记"
    );
  };

  const handleEnterPreparation = (tooth: string) =>
    apply(enterPreparation(ledger, tooth), `牙位 #${tooth} 已进入预备`);

  const handleRepairDone = (deviceId: string) => {
    setLedger(completeRepair(ledger, deviceId));
    setNotice(`${deviceId} 维修完成，已转回可用`);
  };

  const handleRecalibrate = (deviceId: string) => {
    const due = new Date();
    due.setFullYear(due.getFullYear() + 1);
    const newDue = todayStr(due);
    setLedger(renewCalibration(ledger, deviceId, newDue));
    setNotice(`${deviceId} 已登记校准，有效期至 ${newDue}`);
  };

  const handleReset = () => {
    setLedger(resetLedger());
    setNotice("已重置为示例数据");
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · port {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>React + Vite + TypeScript + CSS</strong>
          <button onClick={handleReset}>重置示例数据</button>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} index={index} />
        ))}
      </section>

      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}>知道了</button>
        </div>
      )}

      <div className="board-layout">
        <DeviceBoard ledger={ledger} onRepairDone={handleRepairDone} onRecalibrate={handleRecalibrate} />
        <LockPanel ledger={ledger} onLock={handleLock} />
      </div>

      <ActiveSessions
        ledger={ledger}
        onMeasure={handleMeasure}
        onReturn={handleReturn}
        onEnterPreparation={handleEnterPreparation}
      />

      <ReviewList ledger={ledger} onConfirm={handleConfirm} />

      <ToothTrace ledger={ledger} />
    </main>
  );
}

export default App;
