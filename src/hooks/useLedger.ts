import { useEffect, useState } from "react";
import type { LedgerState } from "../domain/types";
import { loadLedger, saveLedger } from "../storage/ledgerStore";

/** 台账状态：每次变更后自动落盘，重开页面可恢复 */
export function useLedger() {
  const [ledger, setLedger] = useState<LedgerState>(() => loadLedger());

  useEffect(() => {
    saveLedger(ledger);
  }, [ledger]);

  return [ledger, setLedger] as const;
}
