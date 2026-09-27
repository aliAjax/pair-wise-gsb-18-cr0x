// 牙位台账：每个牙位的占用状态、最近测长与待复核提醒
import type { LedgerState, Tooth } from "../domain/types";
import {
  activeAssignmentOfTooth,
  lastMeasurementOfTooth,
  pendingReviewOfTooth,
} from "../domain/rules";
import { fmtDateTime, fmtLength } from "./format";

interface ToothBoardProps {
  state: LedgerState;
  onLock: (toothId: string) => void;
  onMeasure: (toothId: string) => void;
  onReturn: (toothId: string) => void;
  onConfirm: (measurementId: string) => void;
  onEnterPrep: (toothId: string) => void;
}

function ToothCard({ tooth, state, onLock, onMeasure, onReturn, onConfirm, onEnterPrep }: ToothBoardProps & { tooth: Tooth }) {
  const assignment = activeAssignmentOfTooth(state.assignments, tooth.id);
  const lockedDevice = assignment ? state.devices.find((d) => d.id === assignment.deviceId) : undefined;
  const last = lastMeasurementOfTooth(state.measurements, tooth.id);
  const pending = pendingReviewOfTooth(state.measurements, tooth.id);
  const measureCount = state.measurements.filter((m) => m.toothId === tooth.id).length;

  return (
    <article className="tooth-card">
      <div className="tooth-head">
        <div>
          <strong className="tooth-id">{tooth.id}</strong>
          <span className="tooth-patient">{tooth.patient} · {tooth.diagnosis}</span>
        </div>
        <span className={`stage-chip stage-${tooth.stage}`}>{tooth.stage}</span>
      </div>

      <div className="tooth-body">
        {assignment && lockedDevice ? (
          <p className="tooth-line">
            已锁定 <strong>{lockedDevice.name}</strong>（{fmtDateTime(assignment.startedAt)} 起）
          </p>
        ) : (
          <p className="tooth-line muted">未锁定设备</p>
        )}
        {last ? (
          <p className="tooth-line">
            最近测长 <strong>{fmtLength(last.lengthMm)}</strong>（{last.deviceId} · {fmtDateTime(last.measuredAt)}）
            {last.status === "pending-review" && <span className="tag tag-warn">待复核</span>}
          </p>
        ) : (
          <p className="tooth-line muted">暂无测长记录</p>
        )}
        <p className="tooth-line muted">累计测长 {measureCount} 次</p>
      </div>

      {pending.map((m) => (
        <div key={m.id} className="review-banner">
          <span>
            复测 {fmtLength(m.lengthMm)} 与上次 {m.previousLengthMm !== null ? fmtLength(m.previousLengthMm) : "-"} 相差超过
            0.5mm，已停在待复核
          </span>
          <button className="warn-action" onClick={() => onConfirm(m.id)}>确认复核</button>
        </div>
      ))}

      <div className="tooth-actions">
        <button onClick={() => onLock(tooth.id)} disabled={!!assignment}>锁定设备</button>
        <button onClick={() => onMeasure(tooth.id)} disabled={!assignment}>登记测长</button>
        <button onClick={() => onReturn(tooth.id)} disabled={!assignment}>归还设备</button>
        {tooth.stage !== "预备" && tooth.stage !== "封药" && tooth.stage !== "充填" && (
          <button className="primary-action" onClick={() => onEnterPrep(tooth.id)}>进入预备</button>
        )}
      </div>
    </article>
  );
}

function ToothBoard(props: ToothBoardProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>按牙位追溯</p>
          <h2>牙位台账</h2>
        </div>
      </div>
      <div className="tooth-grid">
        {props.state.teeth.map((tooth) => (
          <ToothCard key={tooth.id} tooth={tooth} {...props} />
        ))}
      </div>
    </section>
  );
}

export default ToothBoard;
