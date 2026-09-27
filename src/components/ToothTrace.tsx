import { useState } from "react";
import type { LedgerState, Measurement, Session } from "../domain/types";
import { TEETH } from "../data/seed";
import { fmtDateTime, fmtTime } from "./format";

interface Props {
  ledger: LedgerState;
}

type TraceEvent =
  | { kind: "session"; time: string; session: Session }
  | { kind: "measure"; time: string; measurement: Measurement };

/** 按牙位追踪：每次占用（含归还登记）与每次测长的时间线 */
export function ToothTrace({ ledger }: Props) {
  const teeth = Array.from(new Set([...TEETH, ...ledger.sessions.map((s) => s.tooth)]));
  const [tooth, setTooth] = useState(teeth[0] ?? "");

  const events: TraceEvent[] = [
    ...ledger.sessions
      .filter((s) => s.tooth === tooth)
      .map((s) => ({ kind: "session" as const, time: s.startedAt, session: s })),
    ...ledger.measurements
      .filter((m) => m.tooth === tooth)
      .map((m) => ({ kind: "measure" as const, time: m.takenAt, measurement: m })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>按牙位追踪</p>
          <h2>占用与测长台账</h2>
        </div>
      </div>
      <label className="trace-select">
        <span>牙位</span>
        <select value={tooth} onChange={(e) => setTooth(e.target.value)}>
          {teeth.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>
      </label>
      {events.length === 0 && <p className="empty">该牙位暂无占用或测长记录。</p>}
      <ul className="timeline">
        {events.map((event) =>
          event.kind === "session" ? (
            <li key={`s-${event.session.id}`} className="timeline-item">
              <h4>
                占用 {event.session.deviceId}
                {event.session.endedAt === null && <span className="badge badge-in-use">在用</span>}
              </h4>
              <p>
                {fmtDateTime(event.session.startedAt)} →{" "}
                {event.session.endedAt ? fmtTime(event.session.endedAt) : "至今"}
                {event.session.endedAt &&
                  ` · 主机${event.session.returnMainUnit === "ok" ? "正常" : "异常"} · 探头${
                    event.session.returnProbe === "ok" ? "正常" : "异常"
                  } · 实际使用 ${event.session.actualMinutes ?? "—"} 分钟`}
              </p>
            </li>
          ) : (
            <li key={`m-${event.measurement.id}`} className="timeline-item measure">
              <h4>
                测长 {event.measurement.lengthMm.toFixed(1)}mm · {event.measurement.deviceId}{" "}
                <span className={`badge badge-${event.measurement.status === "confirmed" ? "confirmed" : "pending"}`}>
                  {event.measurement.status === "confirmed" ? "已确认" : "待复核"}
                </span>
              </h4>
              <p>
                {fmtDateTime(event.measurement.takenAt)}
                {event.measurement.prevLengthMm !== null &&
                  ` · 上一值 ${event.measurement.prevLengthMm.toFixed(1)}mm（${event.measurement.prevDeviceId}）`}
                {event.measurement.reason && ` · 原因：${event.measurement.reason}`}
              </p>
            </li>
          )
        )}
      </ul>
    </section>
  );
}
