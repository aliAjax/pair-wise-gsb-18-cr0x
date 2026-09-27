import { useState } from "react";
import type { LedgerState, ReturnCondition } from "../domain/types";
import { latestMeasurement, preparationCheck } from "../domain/rules";
import { fmtTime } from "./format";
import { MeasureForm } from "./MeasureForm";
import { ReturnForm } from "./ReturnForm";

interface Props {
  ledger: LedgerState;
  onMeasure: (tooth: string, deviceId: string, lengthMm: number, reason: string) => string | null;
  onReturn: (sessionId: string, mainUnit: ReturnCondition, probe: ReturnCondition, minutes: number) => string | null;
  onEnterPreparation: (tooth: string) => string | null;
}

/** 在用占用：当前锁定中的牙位与设备，以及测长 / 归还 / 进入预备操作 */
export function ActiveSessions({ ledger, onMeasure, onReturn, onEnterPreparation }: Props) {
  const [mode, setMode] = useState<{ sessionId: string; kind: "measure" | "return" } | null>(null);
  const [error, setError] = useState("");
  const active = ledger.sessions.filter((s) => s.endedAt === null);

  const toggle = (sessionId: string, kind: "measure" | "return") => {
    setError("");
    setMode((prev) => (prev?.sessionId === sessionId && prev.kind === kind ? null : { sessionId, kind }));
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>在用占用</p>
          <h2>当前锁定与测长</h2>
        </div>
      </div>
      {active.length === 0 && <p className="empty">当前没有在用设备，请先在上方锁定。</p>}
      <div className="record-list">
        {active.map((session) => {
          const device = ledger.devices.find((d) => d.id === session.deviceId);
          const latest = latestMeasurement(ledger, session.tooth);
          const stage = ledger.stages[session.tooth] ?? "测长";
          const prepBlock = preparationCheck(ledger, session.tooth);
          const expanded = mode?.sessionId === session.id ? mode.kind : null;
          return (
            <article key={session.id} className="session-card">
              <div className="session-head">
                <div>
                  <h3>
                    #{session.tooth} · {device?.label ?? session.deviceId}
                  </h3>
                  <p>
                    锁定于 {fmtTime(session.startedAt)} · 阶段：{stage}
                    {latest &&
                      ` · 最新测长 ${latest.lengthMm.toFixed(1)}mm（${
                        latest.status === "confirmed" ? "已确认" : "待复核"
                      }）`}
                  </p>
                </div>
                <div className="session-actions">
                  <button onClick={() => toggle(session.id, "measure")}>记录测长</button>
                  <button onClick={() => toggle(session.id, "return")}>归还设备</button>
                  <button
                    className="primary-action"
                    disabled={stage === "预备" || prepBlock !== null}
                    title={prepBlock ?? ""}
                    onClick={() => setError(onEnterPreparation(session.tooth) ?? "")}
                  >
                    {stage === "预备" ? "已进入预备" : "进入预备"}
                  </button>
                </div>
              </div>
              {expanded === "measure" && (
                <MeasureForm
                  ledger={ledger}
                  session={session}
                  onCancel={() => setMode(null)}
                  onSubmit={(len, reason) => {
                    const err = onMeasure(session.tooth, session.deviceId, len, reason);
                    if (!err) setMode(null);
                    return err;
                  }}
                />
              )}
              {expanded === "return" && (
                <ReturnForm
                  session={session}
                  onCancel={() => setMode(null)}
                  onSubmit={(mainUnit, probe, minutes) => {
                    const err = onReturn(session.id, mainUnit, probe, minutes);
                    if (!err) setMode(null);
                    return err;
                  }}
                />
              )}
            </article>
          );
        })}
      </div>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
