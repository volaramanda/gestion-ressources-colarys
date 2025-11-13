// backend/src/controllers/PlanningController.ts
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { Planning, UploadResponse, UnifiedPlanningFilters, DaySchedule, SHIFT_HOURS_MAP,  PlanningStats } from '../entities/Planning';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class PlanningController {
  private static getISOWeek(date: Date): number {
    if (isNaN(date.getTime())) return 1;
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private static extractWeekNumber(weekInfo: string): string {
  try {
    // Vérifier que la chaîne contient bien un format de date
    const dateMatch = weekInfo.match(/(\d{2}\/\d{2}\/\d{2})/);
    if (!dateMatch) {
      console.error('Format de date invalide dans weekInfo:', weekInfo);
      throw new Error('Format de date invalide');
    }
    
    const [day, month, shortYear] = dateMatch[1].split('/').map(Number);
    const year = shortYear >= 50 ? 1900 + shortYear : 2000 + shortYear;
    const startDate = new Date(year, month - 1, day);
    
    if (isNaN(startDate.getTime())) {
      console.error('Date invalide:', dateMatch[1]);
      throw new Error('Date invalide');
    }
    
    const monday = new Date(startDate);
    monday.setDate(startDate.getDate() - (startDate.getDay() || 7) + 1);
    const weekNum = this.getISOWeek(monday);
    const result = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    
    console.log(`Semaine calculée: ${result} pour ${weekInfo}`);
    return result;
  } catch (error) {
    console.error('Erreur extractWeekNumber:', error, 'weekInfo:', weekInfo);
    throw new Error('Impossible d\'extraire le numéro de semaine');
  }
}

  private static extractYearFromWeek(weekInfo: string): string {
    try {
      const yearMatch = weekInfo.match(/(\d{2}\/\d{2}\/\d{2})/);
      if (yearMatch) {
        const shortYear = parseInt(yearMatch[1].split('/')[2]);
        return (shortYear >= 50 ? 1900 + shortYear : 2000 + shortYear).toString();
      }
      return new Date().getFullYear().toString();
    } catch (error) {
      console.error('Erreur extractYearFromWeek:', error, 'weekInfo:', weekInfo);
      return new Date().getFullYear().toString();
    }
  }

 // PlanningController.ts
// private static calculateDate(week: string, dayIndex: number, year: string): Date {
//   try {
//     const [, weekNum] = week.split('-W');
//     const weekNumber = parseInt(weekNum);
//     const yearNumber = parseInt(year);
    
//     // Calcul plus robuste de la date basé sur la semaine ISO
//     const januaryFirst = new Date(yearNumber, 0, 1);
//     const firstDayOfYear = januaryFirst.getDay();
//     const firstMonday = firstDayOfYear <= 4 ?
//       januaryFirst.getDate() - firstDayOfYear + 1 :
//       januaryFirst.getDate() + 8 - firstDayOfYear;
    
//     const targetDate = new Date(yearNumber, 0, firstMonday);
//     targetDate.setDate(targetDate.getDate() + (weekNumber - 1) * 7 + dayIndex);
    
//     return targetDate;
//   } catch (error) {
//     console.error('Erreur calculateDate:', error);
//     return new Date(); // Fallback à la date actuelle
//   }
// }

private static calculateDate(week: string, dayIndex: number, year: string): Date {
  try {
    const [, weekNum] = week.split('-W');
    const weekNumber = parseInt(weekNum);
    const yearNumber = parseInt(year);
    
    // Use ISO week date calculation
    const simple = new Date(yearNumber, 0, 1 + (weekNumber - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = new Date(simple);
    
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    
    // Add day offset (0 = Monday, 6 = Sunday)
    ISOweekStart.setDate(ISOweekStart.getDate() + dayIndex);
    
    return ISOweekStart;
  } catch (error) {
    console.error('Erreur calculateDate:', error);
    return new Date(); // Fallback to current date
  }
}

  static parseMultiMonthExcel(file: Express.Multer.File): UploadResponse {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const plannings: Planning[] = [];
  const weeks: string[] = [];
  const daysOfWeek = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

  workbook.SheetNames.forEach(sheetName => {
    if (!sheetName || ['Octobre', 'Novembre', 'Decembre'].includes(sheetName)) {
      console.log(`Ignorer feuille: ${sheetName}`);
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headerRow = rawData.find(row => row[0] === 'PRENOMS') || [];
    const hasManrdiTypo = headerRow[2] === 'MANRDI';

    let currentWeek = '';
    let currentYear = '2025';
    let agentOrder = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];

      // Vérifier si la ligne contient des informations de semaine
      if (row[0] && typeof row[0] === 'string' && row[0].includes('Semaine du')) {
        const weekInfo = row[0];
        try {
          currentWeek = this.extractWeekNumber(weekInfo);
          currentYear = this.extractYearFromWeek(weekInfo);
          if (!weeks.includes(currentWeek)) {
            weeks.push(currentWeek);
          }
          agentOrder = 0;
          console.log(`Feuille: ${sheetName}, Semaine extraite: ${currentWeek}, Année: ${currentYear}`);
        } catch (error) {
        // Conversion de l'erreur en chaîne pour l'affichage
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Erreur lors de l'extraction de la semaine: ${errorMessage}`);
        // Continuer avec la semaine précédente ou une valeur par défaut
        currentWeek = currentWeek || `${new Date().getFullYear()}-W01`;
      }
        continue;
      }

      // Ignorer les en-têtes et lignes vides
      if (!row[0] || row[0] === 'PRENOMS' || row[0] === 'EMPLOI DU TEMPS' || typeof row[0] !== 'string') {
        continue;
      }

      // Traiter les lignes d'agents
      const agentName = row[0].trim();
      
      // Ignorer les noms d'agents qui pourraient être interprétés comme des semaines
      if (agentName && agentName !== '' && !agentName.includes('Semaine du')) {
        const days: DaySchedule[] = daysOfWeek.map((day, index) => {
          const columnIndex = hasManrdiTypo && day === 'MARDI' ? index + 1 : index + 1;
          const shiftRaw = (row[columnIndex] as string | undefined) || 'OFF';
          const shift = shiftRaw.toUpperCase().replace(/\s+/g, '');
          
          // Calcul de la date avec gestion d'erreur
          let date: Date;
          try {
            date = this.calculateDate(currentWeek, index, currentYear);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
          } catch (error) {
            console.error(`Date invalide pour la semaine ${currentWeek}, jour ${index}:`, error);
            // Date de fallback - utilise la date actuelle
            date = new Date();
          }

          return {
            fullDate: date.toISOString().split('T')[0],
            name: day.substring(0, 3),
            date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            shift,
            hours: SHIFT_HOURS_MAP[shift] || 0,
            day,
            remarques: row[8] || null,
          };
        }).filter(Boolean) as DaySchedule[];

        const monthsInWeek = [...new Set(days.map(d => d.fullDate.substring(5, 7)))].filter(m => m);
        const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

        plannings.push({
          agent_name: agentName,
          semaine: currentWeek || `${currentYear}-W01`,
          year: currentYear,
          month: monthsInWeek.length > 0 ? monthsInWeek : [sheetName.toLowerCase()],
          days,
          total_heures: totalHours,
          remarques: row[8] || null,
          lundi: days[0]?.shift || 'OFF',
          mardi: days[1]?.shift || 'OFF',
          mercredi: days[2]?.shift || 'OFF',
          jeudi: days[3]?.shift || 'OFF',
          vendredi: days[4]?.shift || 'OFF',
          samedi: days[5]?.shift || 'OFF',
          dimanche: days[6]?.shift || 'OFF',
        });
      }
    }
  });

  return {
    count: plannings.length,
    weeks,
    message: 'Fichier Excel multi-mois parsé avec succès',
    data: plannings,
  };
}

static async uploadPlanning(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    console.log('Fichier reçu:', req.file.originalname);

    const result = PlanningController.parseMultiMonthExcel(req.file);

    // Log des données parsées
    console.log('Données parsées:', {
      count: result.count,
      weeks: result.weeks,
      sample: result.data.length > 0 ? result.data[0] : 'Aucune donnée'
    });

    // Utilisation de upsert pour gérer les doublons
    const { error } = await supabase
      .from('plannings')
      .upsert(result.data, {
        onConflict: 'agent_name,semaine',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Erreur Supabase:', error);
      throw error;
    }

    res.status(200).json({
      message: result.message,
      count: result.count,
      weeks: result.weeks,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Erreur dans uploadPlanning:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur lors de l\'upload du planning',
      details: error.details || 'Aucun détail supplémentaire'
    });
  }
}

  // PlanningController.ts
// Dans PlanningController.ts - méthode getPlannings
static async getPlannings(req: Request, res: Response) {
  try {
    const { searchQuery, selectedFilter, selectedYear, selectedMonth, selectedWeek } = req.query as UnifiedPlanningFilters;
    console.log('Filtres reçus dans getPlannings:', { searchQuery, selectedFilter, selectedYear, selectedMonth, selectedWeek });

    let query = supabase.from('plannings').select('*');

    // Ne pas appliquer les filtres avec la valeur "all"
    if (searchQuery && searchQuery !== 'all') {
      query = query.ilike('agent_name', `%${searchQuery}%`);
    }
    if (selectedYear && selectedYear !== 'all') {
      query = query.eq('year', selectedYear);
    }
    if (selectedMonth && selectedMonth !== 'all') {
      query = query.contains('month', [selectedMonth]);
    }
    if (selectedWeek && selectedWeek !== 'all') {
      query = query.eq('semaine', selectedWeek);
    }
    if (selectedFilter && selectedFilter !== 'all') {
      query = query.or(`lundi.ilike.%${selectedFilter}%,mardi.ilike.%${selectedFilter}%,mercredi.ilike.%${selectedFilter}%,jeudi.ilike.%${selectedFilter}%,vendredi.ilike.%${selectedFilter}%,samedi.ilike.%${selectedFilter}%,dimanche.ilike.%${selectedFilter}%`);
    }

    query = query.order('semaine', { ascending: true });

    const { data, error, count } = await query;
    if (error) throw error;

    console.log('Résultats filtrés Supabase:', { count, sample: data?.[0] });
    res.json(data || []);
  } catch (error: any) {
    console.error('Erreur getPlannings:', error);
    res.status(500).json([]);
  }
}

// PlanningController.ts
// Dans PlanningController.ts
static async getAvailableYears(_req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('plannings')
      .select('year')
      .order('year');
      
    if (error) throw error;
    
    // Extraire les années uniques
    const years = [...new Set(data?.map(item => item.year).filter(Boolean))];
    
    console.log('Années disponibles:', years);
    res.json(years);
  } catch (error: any) {
    console.error('Erreur getAvailableYears:', error);
    res.json([new Date().getFullYear().toString()]);
  }
}

static async getAvailableMonths(_req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('plannings')
      .select('month');
    if (error) throw error;
    const allMonths = data?.flatMap(item => item.month || []) || [];
    const uniqueMonths = [...new Set(allMonths)].sort();
    res.json(uniqueMonths);
  } catch (error: any) {
    console.error('Erreur getAvailableMonths:', error);
    res.json(Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')));
  }
}

static async getAvailableWeeks(_req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('plannings')
      .select('semaine')
      .order('semaine');
    if (error) throw error;
    const weeks = [...new Set(data?.map(item => item.semaine))];
    res.json(weeks);
  } catch (error: any) {
    console.error('Erreur getAvailableWeeks:', error);
    res.json([]);
  }
}

static async getAvailableAgents(_req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('plannings')
      .select('agent_name')
      .order('agent_name');
    if (error) throw error;
    const agents = [...new Set(data?.map(item => item.agent_name))];
    res.json(agents);
  } catch (error: any) {
    console.error('Erreur getAvailableAgents:', error);
    res.json([]);
  }
}
// PlanningController.ts - méthode getStats
static async getStats(req: Request, res: Response) {
  try {
    const { searchQuery, selectedFilter, selectedYear, selectedMonth, selectedWeek } = req.query as UnifiedPlanningFilters;
    console.log('Filtres reçus dans getStats:', { searchQuery, selectedFilter, selectedYear, selectedMonth, selectedWeek });

    let query = supabase.from('plannings').select('agent_name, days, total_heures');

    if (searchQuery) {
      query = query.ilike('agent_name', `%${searchQuery}%`);
    }
    if (selectedYear && selectedYear !== 'all') {
      query = query.eq('year', selectedYear);
    }
    if (selectedMonth && selectedMonth !== 'all') {
      query = query.contains('month', [selectedMonth]);
    }
    if (selectedWeek && selectedWeek !== 'all') {
      query = query.eq('semaine', selectedWeek);
    }
    if (selectedFilter && selectedFilter !== 'all') {
      query = query.or(`lundi.ilike.%${selectedFilter}%,mardi.ilike.%${selectedFilter}%,mercredi.ilike.%${selectedFilter}%,jeudi.ilike.%${selectedFilter}%,vendredi.ilike.%${selectedFilter}%,samedi.ilike.%${selectedFilter}%,dimanche.ilike.%${selectedFilter}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Nouvelle logique : compter les agents uniques
    const uniqueAgents = new Set<string>();
    let totalHours = 0;
    let presentCount = 0;
    let absentCount = 0;
    let dayShiftCount = 0;
    let nightShiftCount = 0;
    const shiftCounts: { [key: string]: number } = {};

    // Premier passage : compter les agents uniques et les heures totales
    data?.forEach((p: any) => {
      uniqueAgents.add(p.agent_name);
      totalHours += p.total_heures || 0;
    });

    // Deuxième passage : calculer les autres statistiques
    data?.forEach((p: any) => {
      // Vérifier si l'agent a au moins un jour de travail
      const hasWorkDay = p.days?.some((d: DaySchedule) => 
        d.shift !== 'OFF' && d.shift !== 'CONGE' && d.shift !== '-' && d.shift !== 'FORMATION'
      );

      if (hasWorkDay) {
        presentCount++;
      } else {
        absentCount++;
      }

      // Compter les shifts
      p.days?.forEach((d: DaySchedule) => {
        // Shifts de jour
        if (['JOUR', 'MAT5', 'MAT8', 'MAT9'].includes(d.shift)) {
          dayShiftCount++;
        }
        // Shifts de nuit
        if (d.shift === 'NUIT') {
          nightShiftCount++;
        }
        
        // Compter tous les types de shifts
        shiftCounts[d.shift] = (shiftCounts[d.shift] || 0) + 1;
      });
    });

    const totalUniqueAgents = uniqueAgents.size;
    const avgHours = totalUniqueAgents > 0 ? totalHours / totalUniqueAgents : 0;

    const stats: PlanningStats = {
      totalAgents: totalUniqueAgents,
      totalHours,
      avgHours,
      present: presentCount,
      absent: absentCount,
      dayShift: dayShiftCount,
      nightShift: nightShiftCount,
      shiftCounts,
    };

    console.log('Stats calculées (agents uniques):', stats);
    res.json(stats);
  } catch (error: any) {
    console.error('Erreur getStats:', error);
    res.status(500).json({
      totalAgents: 0,
      totalHours: 0,
      avgHours: 0,
      present: 0,
      absent: 0,
      dayShift: 0,
      nightShift: 0,
      shiftCounts: {},
    });
  }
}

  static async deleteAllPlannings(_req: Request, res: Response) {
    try {
      const { error, count } = await supabase.from('plannings').delete({ count: 'exact' });
      if (error) throw error;
      res.status(200).json({
        message: `Tous les plannings ont été supprimés avec succès (${count} lignes supprimées)`,
        count: count || 0,
      });
    } catch (error: any) {
      console.error('Erreur dans deleteAllPlannings:', error);
      res.status(500).json({
        error: error.message || 'Erreur lors de la suppression des plannings',
      });
    }
  }
  
}