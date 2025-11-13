// backend/src/entities/Planning.ts
export interface UploadResponse {
  file?: File; // Optionnel
  count: number;
  weeks: string[];
  message: string;
  data: Planning[];
}

export interface DaySchedule {
  fullDate: string;
  name: string;
  date: string;
  shift: string;
  hours: number;
  day: string;
  remarques: string | null;
}

export interface Planning {
  agent_name: string;
  semaine: string;
  year: string;
  month: string[];
  days: DaySchedule[];
  total_heures: number;
  remarques: string | null;
  lundi: string;
  mardi: string;
  mercredi: string;
  jeudi: string;
  vendredi: string;
  samedi: string;
  dimanche: string;
  agent_order?: number;
}

export interface UnifiedPlanningFilters {
  searchQuery?: string;
  selectedFilter?: string;
  selectedYear?: string;
  selectedMonth?: string;
  selectedWeek?: string;
  search?: string;
  year?: string;
  month?: string;
  semaine?: string;
   shiftType?: string;
    partialWeek?: string;
}

export interface PlanningStats {
  totalAgents: number;
  totalHours: number;
  avgHours: number;
  present: number;
  absent: number;
  dayShift: number;
  nightShift: number;
  shiftCounts: { [key: string]: number };
}

export const SHIFT_HOURS_MAP: { [key: string]: number } = {
  OFF: 0,
  JOUR: 8,
  NUIT: 10,
  MAT5: 8,
  MAT9: 8,
  CONGE: 0,
  FORMATION: 0,
  '-': 0,
};