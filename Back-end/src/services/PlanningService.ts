// PlanningService.ts
import * as XLSX from 'xlsx';
import { Planning, UnifiedPlanningFilters, PlanningStats, UploadResponse } from '../entities/Planning';

export class PlanningService {
  private static baseUrl: string = 'http://localhost:3000/api/plannings';

  // PlanningService.ts
static async getPlannings(filters: Partial<UnifiedPlanningFilters> = {}): Promise<Planning[]> {
  try {
    const completeFilters: UnifiedPlanningFilters = {
      searchQuery: '',
      selectedFilter: 'all',
      selectedYear: 'all',
      selectedMonth: 'all',
      selectedWeek: 'all',
      ...filters,
    };

    const query = new URLSearchParams();
    if (completeFilters.searchQuery) query.append('searchQuery', completeFilters.searchQuery);
    if (completeFilters.selectedFilter && completeFilters.selectedFilter !== 'all') 
      query.append('selectedFilter', completeFilters.selectedFilter);
    if (completeFilters.selectedYear && completeFilters.selectedYear !== 'all') 
      query.append('selectedYear', completeFilters.selectedYear);
    if (completeFilters.selectedMonth && completeFilters.selectedMonth !== 'all') 
      query.append('selectedMonth', completeFilters.selectedMonth);
    if (completeFilters.selectedWeek && completeFilters.selectedWeek !== 'all') 
      query.append('selectedWeek', completeFilters.selectedWeek);

    console.log('Envoi requête getPlannings avec params:', query.toString());

    const response = await fetch(`${this.baseUrl}?${query.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    return responseData.map((agent: any) => ({
      ...agent,
      days: agent.days || [],
    }));
  } catch (error: any) {
    console.error('Erreur getPlannings:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des plannings');
  }
}

  static async uploadPlanning(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      console.log('Uploading to: /api/plannings/upload');
      
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      return {
        file,
        count: result.count,
        weeks: result.weeks,
        message: result.message,
        data: result.data
      };
    } catch (error: any) {
      console.error('Erreur uploadPlanning:', error);
      throw new Error(error.message || 'Erreur lors de l\'upload du planning');
    }
  }

  static async uploadSheetPlanning(file: File, semaine?: string): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (semaine) formData.append('semaine', semaine);

      const response = await fetch(`${this.baseUrl}/upload-sheet`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Erreur uploadSheetPlanning:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage);
    }
  }

  static async uploadPlanningWithSpecificFormat(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload-specific-format`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Erreur uploadPlanningWithSpecificFormat:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage);
    }
  }

  static async uploadMultiWeekPlanning(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload-multi-week`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Erreur uploadMultiWeekPlanning:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage);
    }
  }

  static async deletePlanning(semaine?: string): Promise<{ message: string; count: number }> {
    try {
      const params = new URLSearchParams();
      if (semaine && semaine !== 'all') {
        params.append('semaine', semaine);
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      console.log('Requête DELETE:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Erreur deletePlanning:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage);
    }
  }

  // PlanningService.ts
static async getAvailableYears(): Promise<string[]> {
  try {
    const response = await fetch(`${this.baseUrl}/years`);
    
    if (!response.ok) {
      console.warn('Endpoint /years non disponible, retour données par défaut');
      return [new Date().getFullYear().toString()];
    }
    
    return await response.json();
  } catch (error: any) {
    console.warn('Erreur getAvailableYears, données par défaut:', error);
    return [new Date().getFullYear().toString()];
  }
}

  static async getAvailableMonths(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/months`);
      if (!response.ok) {
        console.warn('Endpoint /months non disponible, retour données par défaut');
        return Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
      }
      return await response.json();
    } catch (error: unknown) {
      console.warn('Erreur getAvailableMonths, données par défaut:', error);
      return Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    }
  }

  static async getAvailableWeeks(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/weeks`);
      if (!response.ok) {
        console.warn('Endpoint /weeks non disponible, tentative de récupération via une autre méthode');
        
        // Fallback: récupérer les semaines à partir des plannings
        const plannings = await this.getPlannings({
          searchQuery: '',
          selectedFilter: 'all',
          selectedYear: 'all',
          selectedMonth: 'all',
          selectedWeek: 'all',
        });
        const weeks = [...new Set(plannings.map(p => p.semaine))].sort();
        return weeks;
      }
      return await response.json();
    } catch (error: unknown) {
      console.warn('Erreur getAvailableWeeks, tentative de fallback:', error);
      
      // Fallback: récupérer les semaines à partir des plannings
      try {
        const plannings = await this.getPlannings({
          searchQuery: '',
          selectedFilter: 'all',
          selectedYear: 'all',
          selectedMonth: 'all',
          selectedWeek: 'all',
        });
        const weeks = [...new Set(plannings.map(p => p.semaine))].sort();
        return weeks;
      } catch (fallbackError) {
        console.error('Fallback également en erreur:', fallbackError);
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 52 }, (_, i) =>
          `${currentYear}-W${(i + 1).toString().padStart(2, '0')}`
        );
      }
    }
  }

  static async getAvailableAgents(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`);
      if (!response.ok) {
        console.warn('Endpoint /agents non disponible, retour liste vide');
        return [];
      }
      return await response.json();
    } catch (error: unknown) {
      console.warn('Erreur getAvailableAgents, liste vide:', error);
      return [];
    }
  }

  // PlanningService.ts
static async getStats(filters: Partial<UnifiedPlanningFilters> = {}): Promise<PlanningStats> {
  try {
    const completeFilters: UnifiedPlanningFilters = {
      searchQuery: '',
      selectedFilter: 'all',
      selectedYear: 'all',
      selectedMonth: 'all',
      selectedWeek: 'all',
      ...filters,
    };

    const query = new URLSearchParams();
    if (completeFilters.searchQuery) query.append('searchQuery', completeFilters.searchQuery);
    if (completeFilters.selectedFilter && completeFilters.selectedFilter !== 'all') 
      query.append('selectedFilter', completeFilters.selectedFilter);
    if (completeFilters.selectedYear && completeFilters.selectedYear !== 'all') 
      query.append('selectedYear', completeFilters.selectedYear);
    if (completeFilters.selectedMonth && completeFilters.selectedMonth !== 'all') 
      query.append('selectedMonth', completeFilters.selectedMonth);
    if (completeFilters.selectedWeek && completeFilters.selectedWeek !== 'all') 
      query.append('selectedWeek', completeFilters.selectedWeek);

    const response = await fetch(`${this.baseUrl}/stats?${query.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erreur getStats:', error);
    return {
      totalAgents: 0,
      totalHours: 0,
      avgHours: 0,
      present: 0,
      absent: 0,
      dayShift: 0,
      nightShift: 0,
      shiftCounts: {},
    };
  }
}

  static async searchWeeks(criteria: { year?: string; month?: string; partialWeek?: string }): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      if (criteria.year) params.append('selectedYear', criteria.year);
      if (criteria.month) params.append('selectedMonth', criteria.month);
      if (criteria.partialWeek) params.append('partialWeek', criteria.partialWeek);

      const response = await fetch(`${this.baseUrl}/search-weeks?${params.toString()}`);
      if (!response.ok) {
        console.warn('Endpoint /search-weeks non disponible');
        return [];
      }
      return await response.json();
    } catch (error: unknown) {
      console.warn('Erreur searchWeeks:', error);
      return [];
    }
  }

  static async getWeeksByMonthAndYear(month: string, year: string): Promise<string[]> {
    try {
      const params = new URLSearchParams({ month, year });
      const response = await fetch(`${this.baseUrl}/weeks-by-month-year?${params.toString()}`);
      if (!response.ok) {
        console.warn('Endpoint /weeks-by-month-year non disponible');
        return [];
      }
      return await response.json();
    } catch (error: unknown) {
      console.warn('Erreur getWeeksByMonthAndYear:', error);
      return [];
    }
  }

  
}