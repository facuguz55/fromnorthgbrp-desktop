import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface MonthState {
  month: number;
  year: number;
}

function getCurrentMonthAR(): MonthState {
  const AR_OFFSET = -3 * 60 * 60 * 1000;
  const d = new Date(Date.now() + AR_OFFSET);
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

interface MonthContextValue {
  selectedMonth: MonthState;
  setSelectedMonth: (m: MonthState) => void;
}

const MonthContext = createContext<MonthContextValue>({
  selectedMonth: getCurrentMonthAR(),
  setSelectedMonth: () => {},
});

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<MonthState>(getCurrentMonthAR);
  return (
    <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
