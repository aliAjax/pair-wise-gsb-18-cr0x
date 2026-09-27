// 页面组装：指标看板 + 设备台账 + 牙位台账 + 历史追溯
import { useEffect, useState } from "react";
import "./styles.css";
import { useLedger } from "./store/useLedger";
import { deviceArea, type DeviceArea } from "./domain/rules";
import DeviceBoard from "./components/DeviceBoard";
import ToothBoard from "./components/ToothBoard";
import HistoryLog from "./components/HistoryLog";
import LockForm from "./components/LockForm";
import MeasureForm from "./components/MeasureForm";
import ReturnForm from "./components/ReturnForm";

type ModalState = { kind: "lock" | "measure" | "return"; toothId: string } | null;

function App() {
  const {
    state,
    lockDevice,
    addMeasurement,
    confirmMeasurement,
    returnDevice,
    enterPreparation,
    finishRepair,
    recalibrate,
    reset,
  } = useLedger();

  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const countByArea = (area: DeviceArea) => state.devices.filter((d) => deviceArea(state, d) === area).length;
  const pendingReviewCount = state.measurements.filter((m) => m.status === "pending-review").length;

  const metrics: Array<{ label: string; value: number; cls: string }> = [
    { label: "使用中设备", value: countByArea("in-use"), cls: "status-ok" },
    { label: "在库可用", value: countByArea("available"), cls: "status-ok" },
    { label: "待检区", value: countByArea("quarantine"), cls: "status-watch" },
    { label: "待复核测长", value: pendingReviewCount, cls: "status-danger" },
  ];

  const modalTooth = modal ? state.teeth.find((t) => t.id === modal.toothId) : undefined;

  function handleLock(deviceId: string) {
    if (!modal) return;
    const result = lockDevice(modal.toothId, deviceId);
    if (result.ok) {
      setModal(null);
      setToast(`已为牙位 ${modal.toothId} 锁定 ${deviceId}`);
    } else {
      setToast(result.reason);
    }
  }

  function handleMeasure(lengthMm: number, reason: string | null) {
    if (!modal) return;
    const result = addMeasurement(modal.toothId, lengthMm, reason);
    if (result.ok) {
      setModal(null);
      setToast(`牙位 ${modal.toothId} 测长 ${lengthMm.toFixed(1)}mm 已保存`);
    } else {
      setToast(result.reason);
    }
  }

  function handleReturn(unit: "ok" | "abnormal", probe: "ok" | "abnormal", minutes: number) {
    if (!modal) return;
    const result = returnDevice(modal.toothId, unit, probe, minutes);
    if (result.ok) {
      setModal(null);
      setToast(
        unit === "abnormal" || probe === "abnormal"
          ? `牙位 ${modal.toothId} 设备已归还，异常部件已转维修（待检区）`
          : `牙位 ${modal.toothId} 设备已归还`
      );
    } else {
      setToast(result.reason);
    }
  }

  function handleEnterPrep(toothId: string) {
    const result = enterPreparation(toothId);
    setToast(result.ok ? `牙位 ${toothId} 已进入预备` : result.reason);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-04 · 牙体牙髓科</p>
          <h1>根测仪与工作长度台账</h1>
          <p className="subtitle">
            治疗前按牙位锁定电子根测仪，同一台设备同一时段只能服务一个牙位；校准过期或维修中的设备留在待检区。
            换设备复测保留上一长度、设备与原因，新旧读数相差超过 0.5mm 先停在待复核，确认后才能进入预备。
          </p>
        </div>
        <div className="stack-card">
          <span>台账规则</span>
          <strong>一牙位一机 · 待检区禁借 · 0.5mm 复核线 · 归还登记主机/探头/时长</strong>
          <button onClick={() => window.confirm("确定清空台账并恢复初始数据？") && reset()}>重置台账</button>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((m) => (
          <article key={m.label} className="metric-card">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <i className={m.cls} />
          </article>
        ))}
      </section>

      <div className="board-grid">
        <DeviceBoard state={state} onFinishRepair={finishRepair} onRecalibrate={recalibrate} />
        <ToothBoard
          state={state}
          onLock={(toothId) => setModal({ kind: "lock", toothId })}
          onMeasure={(toothId) => setModal({ kind: "measure", toothId })}
          onReturn={(toothId) => setModal({ kind: "return", toothId })}
          onConfirm={confirmMeasurement}
          onEnterPrep={handleEnterPrep}
        />
      </div>

      <HistoryLog state={state} />

      {modal?.kind === "lock" && modalTooth && (
        <LockForm state={state} tooth={modalTooth} onSubmit={handleLock} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "measure" && modalTooth && (
        <MeasureForm state={state} tooth={modalTooth} onSubmit={handleMeasure} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "return" && modalTooth && (
        <ReturnForm state={state} tooth={modalTooth} onSubmit={handleReturn} onClose={() => setModal(null)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
