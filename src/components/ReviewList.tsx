import type { LedgerState } from "../domain/types";
import { REVIEW_THRESHOLD_MM } from "../domain/rules";
import { fmtDateTime } from "./format";

interface Props {
  ledger: LedgerState;
  onConfirm: (measurementId: string) => void;
}

/** 待复核：新旧读数差值超过 0.5mm 的测长，确认后牙位才能进入预备 */
export function ReviewList({ ledger, onConfirm }: Props) {
  const pending = ledger.measurements.filter((m) => m.status === "pending-review");
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>待复核</p>
          <h2>读数差异超过 {REVIEW_THRESHOLD_MM}mm</h2>
        </div>
      </div>
      {pending.length === 0 && <p className="empty">没有待复核的测长记录。</p>}
      <div className="record-list">
        {pending.map((m) => (
          <article key={m.id} className="record-card with-action">
            <div className="record-index">#{m.tooth}</div>
            <div>
              <h3>
                {m.lengthMm.toFixed(1)}mm · {m.deviceId} <span className="badge badge-pending">待复核</span>
              </h3>
              <p>
                上一值 {m.prevLengthMm !== null ? `${m.prevLengthMm.toFixed(1)}mm` : "—"}（{m.prevDeviceId ?? "—"}）
                {m.prevLengthMm !== null && `，差值 ${Math.abs(m.lengthMm - m.prevLengthMm).toFixed(1)}mm`}
                {m.reason && ` · 原因：${m.reason}`} · {fmtDateTime(m.takenAt)}
              </p>
            </div>
            <button className="primary-action" onClick={() => onConfirm(m.id)}>
              确认复核
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
