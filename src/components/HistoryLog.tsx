// 历史流水：合并占用与测长事件，按牙位筛选追溯
import { useState } from "react";
import type { LedgerState } from "../domain/types";
import { fmtDateTime, fmtLength } from "./format";

interface HistoryLogProps {
  state: LedgerState;
}

interface HistoryEvent {
  id: string;
  toothId: string;
  time: string;
  kind: "lock" | "return" | "measure";
  title: string;
  detail: string;
  badge?: { text: string; cls: string };
}

function buildEvents(state: LedgerState): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  for (const a of state.assignments) {
    events.push({
      id: `${a.id}-lock`,
      toothId: a.toothId,
      time: a.startedAt,
      kind: "lock",
      title: `锁定 ${a.deviceId}`,
      detail: `${fmtDateTime(a.startedAt)} 起占用`,
    });
    if (a.endedAt) {
      const parts = [
        `主机${a.returnUnit === "abnormal" ? "异常" : "正常"}`,
        `探头${a.returnProbe === "abnormal" ? "异常" : "正常"}`,
        `实际使用 ${a.usageMinutes ?? "-"} 分钟`,
      ];
      events.push({
        id: `${a.id}-return`,
        toothId: a.toothId,
        time: a.endedAt,
        kind: "return",
        title: `归还 ${a.deviceId}`,
        detail: parts.join(" · "),
        badge:
          a.returnUnit === "abnormal" || a.returnProbe === "abnormal"
            ? { text: "已转维修", cls: "tag-danger" }
            : undefined,
      });
    }
  }

  for (const m of state.measurements) {
    const detailParts =
      m.kind === "remeasure"
        ? [
            `复测原因：${m.reason ?? "-"}`,
            `上次 ${m.previousLengthMm !== null ? fmtLength(m.previousLengthMm) : "-"}（${m.previousDeviceId ?? "-"}）`,
          ]
        : ["首测"];
    events.push({
      id: m.id,
      toothId: m.toothId,
      time: m.measuredAt,
      kind: "measure",
      title: `测长 ${fmtLength(m.lengthMm)} · ${m.deviceId}`,
      detail: detailParts.join(" · "),
      badge:
        m.status === "pending-review"
          ? { text: "待复核", cls: "tag-warn" }
          : { text: "已确认", cls: "tag-ok" },
    });
  }

  return events.sort((a, b) => b.time.localeCompare(a.time));
}

const KIND_LABEL = { lock: "占用", return: "归还", measure: "测长" } as const;

function HistoryLog({ state }: HistoryLogProps) {
  const [filter, setFilter] = useState<string>("all");
  const events = buildEvents(state).filter((e) => filter === "all" || e.toothId === filter);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>占用与测长流水</p>
          <h2>历史追溯</h2>
        </div>
        <div className="chips">
          <button className={filter === "all" ? "chip-active" : ""} onClick={() => setFilter("all")}>
            全部
          </button>
          {state.teeth.map((t) => (
            <button
              key={t.id}
              className={filter === t.id ? "chip-active" : ""}
              onClick={() => setFilter(t.id)}
            >
              {t.id}
            </button>
          ))}
        </div>
      </div>
      {events.length === 0 ? (
        <p className="empty-line">暂无记录</p>
      ) : (
        <div className="history-list">
          {events.map((e) => (
            <article key={e.id} className={`history-item kind-${e.kind}`}>
              <span className="history-kind">{KIND_LABEL[e.kind]}</span>
              <div className="history-main">
                <p>
                  <strong>{e.toothId}</strong> · {e.title}
                  {e.badge && <span className={`tag ${e.badge.cls}`}>{e.badge.text}</span>}
                </p>
                <p className="history-detail">{e.detail}</p>
              </div>
              <time>{fmtDateTime(e.time)}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default HistoryLog;
