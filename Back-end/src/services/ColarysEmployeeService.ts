import fs from 'fs';
import path from 'path';

export class ColarysEmployeeService {
  private dataPath: string;

  constructor() {
    this.dataPath = this.findDataPath();
    console.log('🔧 Dossier des données Colarys:', this.dataPath);
    this.initializeDataFiles();
  }

  private findDataPath(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'colarys'),
      path.join(process.cwd(), '..', 'colarys'),
      path.join(process.cwd(), '..', '..', 'colarys'),
      path.join('C:', 'Users', 'RAMANDA', 'Desktop', 'Theme Gestion des Resources et production de colarys concept', 'colarys'),
      process.env.COLARYS_DATA_PATH || ''
    ].filter(p => p && fs.existsSync(p));

    return possiblePaths[0] || path.join(process.cwd(), 'colarys-data');
  }

  private initializeDataFiles() {
    const requiredFiles = {
      'employes.json': [],
      'presences.json': {},
      'salaires.json': {}
    };

    for (const [filename, defaultData] of Object.entries(requiredFiles)) {
      const filePath = path.join(this.dataPath, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`📝 Création de ${filename}...`);
        this.writeJSONFile(filename, defaultData);
      }
    }
  }

  // 🔥 MÉTHODES UTILITAIRES
  private parseFloat(s: any, defaultVal: number = 0.0): number {
    try {
      if (s === null || s === undefined) return defaultVal;
      if (typeof s === 'number') return s;
      const str = String(s).replace(/\s/g, '').replace(',', '.');
      return parseFloat(str) || defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private parseInt(s: any, defaultVal: number = 0): number {
    try {
      if (s === null || s === undefined) return defaultVal;
      if (typeof s === 'number') return Math.floor(s);
      const str = String(s).replace(/[^\d-]/g, '');
      return parseInt(str, 10) || defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private parseDateEmbauche(s: string): Date | null {
    if (!s) return null;
    const trimmed = s.trim();
    
    const formats = [
      { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, parts: [2, 1, 0] },
      { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parts: [0, 1, 2] }
    ];

    for (const format of formats) {
      const match = trimmed.match(format.regex);
      if (match) {
        const day = parseInt(match[format.parts[2] + 1]);
        const month = parseInt(match[format.parts[1] + 1]);
        const year = parseInt(match[format.parts[0] + 1]);
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 1900) {
          return new Date(year, month - 1, day);
        }
      }
    }
    return null;
  }

  private calculAnciennete(dateEmbaucheStr: string): string {
    const dateEmbauche = this.parseDateEmbauche(dateEmbaucheStr);
    if (!dateEmbauche) return "";
    
    const today = new Date();
    let years = today.getFullYear() - dateEmbauche.getFullYear();
    let months = today.getMonth() - dateEmbauche.getMonth();
    
    if (today.getDate() < dateEmbauche.getDate()) {
      months--;
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return `${years} ans ${months} mois`;
  }

  private calculDroitDepuisDate(dateEmbaucheStr: string): number {
    const dateEmbauche = this.parseDateEmbauche(dateEmbaucheStr);
    if (!dateEmbauche) return 0;
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dateEmbauche.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 365 ? 1 : 0;
  }

  private readJSONFile<T>(filename: string, defaultData: T): T {
    const filePath = path.join(this.dataPath, filename);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`❌ Erreur lecture ${filename}:`, error);
    }
    return defaultData;
  }

  private writeJSONFile<T>(filename: string, data: T): boolean {
    const filePath = path.join(this.dataPath, filename);
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`❌ Erreur écriture ${filename}:`, error);
      return false;
    }
  }

  // 🔥 CORRECTION: Calcul amélioré des jours ouvrables avec rotation mensuelle
  private calculerJoursOuvrables(year: number, month: number): number {
    try {
      const joursDansMois = new Date(year, month, 0).getDate();
      let joursOuvrables = 0;
      
      for (let jour = 1; jour <= joursDansMois; jour++) {
        const date = new Date(year, month - 1, jour);
        const jourSemaine = date.getDay();
        
        // Compter seulement les jours de semaine (lundi à vendredi)
        if (jourSemaine >= 1 && jourSemaine <= 5) {
          joursOuvrables++;
        }
      }
      
      console.log(`📅 Mois ${month}/${year}: ${joursOuvrables} jours ouvrables sur ${joursDansMois} jours`);
      return Math.max(joursOuvrables, 1);
      
    } catch (error) {
      console.error('❌ Erreur calcul jours ouvrables:', error);
      // 🔥 CORRECTION: Retourne une valeur réaliste basée sur le mois
      return this.getJoursOuvrablesParDefaut(month);
    }
  }

  // 🔥 NOUVELLE MÉTHODE: Jours ouvrables par défaut selon le mois
  private getJoursOuvrablesParDefaut(month: number): number {
    const joursParMois: {[key: number]: number} = {
      1: 22, 2: 20, 3: 23, 4: 21, 5: 22, 6: 22,
      7: 21, 8: 23, 9: 21, 10: 22, 11: 22, 12: 20
    };
    return joursParMois[month] || 22;
  }

  // 🔥 MÉTHODE POUR CALCULER LES HEURES COMME PYTHON
private calculHeuresPresence(matricule: string, year: number, month: number, presences: any) {
  const result = { 
    presence: 0, 
    conge: 0, 
    ferie: 0, 
    nuit: 0, 
    formation: 0, 
    absence: 0,
    joursFormation: 0,
    joursOff: 0, // 🔥 NOUVEAU: compteur de jours OFF
    heuresTravailleesReelles: 0
  };
  
  const joursDansMois = new Date(year, month, 0).getDate();
  
  for (let jour = 1; jour <= joursDansMois; jour++) {
    const key = `${matricule}_${year}_${month}_${jour}`;
    const statut = presences[key]?.toLowerCase();
    
    const heuresPlanifiees = this.getHeuresPlanifiees(matricule, year, month, jour) || 8;
    
    switch (statut) {
      case 'p': // Présence normale
        result.presence += heuresPlanifiees;
        result.heuresTravailleesReelles += heuresPlanifiees;
        break;
      case 'n': // Nuit
        result.presence += heuresPlanifiees;
        result.nuit += heuresPlanifiees;
        result.heuresTravailleesReelles += heuresPlanifiees;
        break;
      case 'a': // Absence
        result.absence += heuresPlanifiees;
        break;
      case 'c': // Congé
        result.conge += heuresPlanifiees;
        break;
      case 'm': // Férié
        result.presence += heuresPlanifiees;
        result.ferie += heuresPlanifiees;
        result.heuresTravailleesReelles += heuresPlanifiees;
        break;
      case 'f': // Formation
        result.formation += heuresPlanifiees;
        result.joursFormation += 1;
        break;
      case 'o': // 🔥 NOUVEAU: Jour OFF (repos)
        result.joursOff += 1;
        // Ne compte pas dans les heures travaillées
        break;
    }
  }
  
  return result;
}

  // 🔥 NOUVELLE MÉTHODE: Récupérer les heures planifiées depuis le planning de l'agent
  private getHeuresPlanifiees(matricule: string, year: number, month: number, day: number): number {
    try {
      // Implémentez ici la logique pour récupérer les heures planifiées
      // depuis votre système de planning
      // Pour l'instant, retourne 8h par défaut
      return 8;
    } catch (error) {
      console.error(`❌ Erreur récupération planning ${matricule}:`, error);
      return 8; // Valeur par défaut sécurisée
    }
  }

  // 🔥 CALCUL ANCIENNETÉ EN ANNÉES
  private calculAncienneteAns(dateEmbaucheStr: string): number {
    const dateEmbauche = this.parseDateEmbauche(dateEmbaucheStr);
    if (!dateEmbauche) return 0;
    
    const today = new Date();
    let years = today.getFullYear() - dateEmbauche.getFullYear();
    const months = today.getMonth() - dateEmbauche.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < dateEmbauche.getDate())) {
      years--;
    }
    
    return years;
  }

  // ==================== GESTION EMPLOYÉS ====================
  async getAllEmployees(): Promise<any[]> {
    return this.readJSONFile<any[]>('employes.json', []);
  }

  async getEmployeeByMatricule(matricule: string): Promise<any | null> {
    const employees = await this.getAllEmployees();
    return employees.find(emp => emp.Matricule === matricule) || null;
  }

  async createEmployee(employeeData: any): Promise<{ success: boolean; message: string; matricule?: string }> {
    try {
      const employees = await this.getAllEmployees();
      
      if (employees.find(emp => emp.Matricule === employeeData.Matricule)) {
        return { success: false, message: 'Un employé avec ce matricule existe déjà' };
      }

      const dateEmbauche = employeeData["Date d'embauche"];
      const anciennete = this.calculAnciennete(dateEmbauche);
      const droit = this.calculDroitDepuisDate(dateEmbauche);
      const soldeInitial = this.parseFloat(employeeData["Solde initial congé"], 0);
      const soldeConge = this.parseFloat(employeeData["Solde de congé"], -1);

      const nouvelEmploye = {
        ...employeeData,
        Ancienneté: anciennete,
        "droit ostie": droit.toString(),
        "droit transport et repas": droit.toString(),
        "Solde de congé": soldeConge < 0 ? soldeInitial.toString() : employeeData["Solde de congé"]
      };

      employees.push(nouvelEmploye);
      
      const success = this.writeJSONFile('employes.json', employees);
      return success ? 
        { success: true, message: 'Employé créé avec succès', matricule: employeeData.Matricule } :
        { success: false, message: 'Erreur lors de la sauvegarde' };
        
    } catch (error) {
      console.error('Erreur création employé:', error);
      return { success: false, message: 'Erreur lors de la création' };
    }
  }

  async updateEmployee(matricule: string, employeeData: any): Promise<{ success: boolean; message: string }> {
    try {
      const employees = await this.getAllEmployees();
      const index = employees.findIndex(emp => emp.Matricule === matricule);
      
      if (index === -1) {
        return { success: false, message: 'Employé non trouvé' };
      }

      if (employeeData["Date d'embauche"]) {
        const anciennete = this.calculAnciennete(employeeData["Date d'embauche"]);
        const droit = this.calculDroitDepuisDate(employeeData["Date d'embauche"]);
        
        employeeData.Ancienneté = anciennete;
        employeeData["droit ostie"] = droit.toString();
        employeeData["droit transport et repas"] = droit.toString();
      }

      employees[index] = { ...employees[index], ...employeeData };
      
      const success = this.writeJSONFile('employes.json', employees);
      return success ? 
        { success: true, message: 'Employé modifié avec succès' } :
        { success: false, message: 'Erreur lors de la sauvegarde' };
        
    } catch (error) {
      console.error('Erreur modification employé:', error);
      return { success: false, message: 'Erreur lors de la modification' };
    }
  }

  async deleteEmployee(matricule: string): Promise<{ success: boolean; message: string }> {
    try {
      const employees = await this.getAllEmployees();
      const filteredEmployees = employees.filter(emp => emp.Matricule !== matricule);
      
      if (filteredEmployees.length === employees.length) {
        return { success: false, message: 'Employé non trouvé' };
      }

      const success = this.writeJSONFile('employes.json', filteredEmployees);
      return success ? 
        { success: true, message: 'Employé supprimé avec succès' } :
        { success: false, message: 'Erreur lors de la suppression' };
        
    } catch (error) {
      console.error('Erreur suppression employé:', error);
      return { success: false, message: 'Erreur lors de la suppression' };
    }
  }

  // ==================== GESTION PRÉSENCES ====================
  async getPresences(): Promise<any> {
    return this.readJSONFile<any>('presences.json', {});
  }
private readonly ALLOWED_PRESENCE_VALUES = new Set(["p", "n", "a", "c", "m", "f", "o"]);
async updatePresence(matricule: string, year: number, month: number, day: number, type: string): Promise<{ success: boolean; message: string }> {
  try {
    const presences = await this.getPresences();
    const key = `${matricule}_${year}_${month}_${day}`;
    
    // 🔥 AJOUT: 'o' pour les jours OFF
    const ALLOWED_PRESENCE_VALUES = new Set(["p", "n", "a", "c", "m", "f", "o"]);
    if (!ALLOWED_PRESENCE_VALUES.has(type) && type !== '') {
      return { success: false, message: 'Type de présence invalide' };
    }

    if (type === '') {
      delete presences[key];
    } else {
      presences[key] = type;
    }

    // Mise à jour du solde de congé si c'est un congé (mais pas pour 'o')
    if (type === 'c') {
      await this.updateSoldeConge(matricule, -1);
    }

    const success = this.writeJSONFile('presences.json', presences);
    return success ? 
      { success: true, message: 'Présence mise à jour avec succès' } :
      { success: false, message: 'Erreur lors de la sauvegarde' };
      
  } catch (error) {
    console.error('Erreur mise à jour présence:', error);
    return { success: false, message: 'Erreur lors de la mise à jour' };
  }
}

  async getMonthlyPresences(year: number, month: number) {
    const presences = await this.getPresences();
    const employees = await this.getAllEmployees();
    
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    return {
      year,
      month,
      daysInMonth,
      presences,
      employees
    };
  }

  // ==================== GESTION SALAIRES ====================
  async getSalaires(): Promise<any> {
    return this.readJSONFile<any>('salaires.json', {});
  }

  async updateSalaire(matricule: string, year: number, month: number, salaireData: any): Promise<{ success: boolean; message: string }> {
    try {
      const salaires = await this.getSalaires();
      const key = `${matricule}_${year}_${month}`;
      
      salaires[key] = { ...salaires[key], ...salaireData };
      
      const success = this.writeJSONFile('salaires.json', salaires);
      return success ? 
        { success: true, message: 'Salaire mis à jour avec succès' } :
        { success: false, message: 'Erreur lors de la sauvegarde' };
        
    } catch (error) {
      console.error('Erreur mise à jour salaire:', error);
      return { success: false, message: 'Erreur lors de la mise à jour' };
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  private async updateSoldeConge(matricule: string, variation: number): Promise<void> {
    const employees = await this.getAllEmployees();
    const index = employees.findIndex(emp => emp.Matricule === matricule);
    
    if (index !== -1) {
      const soldeActuel = this.parseFloat(employees[index]["Solde de congé"]);
      employees[index]["Solde de congé"] = Math.max(0, soldeActuel + variation).toString();
      this.writeJSONFile('employes.json', employees);
    }
  }

  // 🔥 MISE À JOUR CONGÉS AUTOMATIQUE
  async updateCongesAutomatique() {
    const employees = await this.getAllEmployees();
    const today = new Date();
    
    for (const emp of employees) {
      const soldeCourant = this.parseFloat(emp["Solde de congé"] || emp["Solde initial congé"], 0);
      const lastUpdate = emp.last_update;
      
      let monthsPassed = 0;
      if (lastUpdate) {
        const lastDate = new Date(lastUpdate + '-01');
        monthsPassed = (today.getFullYear() - lastDate.getFullYear()) * 12 + 
                      (today.getMonth() - lastDate.getMonth());
      } else {
        monthsPassed = 3;
      }

      if (monthsPassed > 0) {
        emp["Solde de congé"] = (soldeCourant + 2.5 * monthsPassed).toFixed(1);
      }
      
      emp.last_update = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    this.writeJSONFile('employes.json', employees);
  }

  // 🔥 CORRECTION MÉTHODE calculateSalaires - SALAIRE FIXE AVEC DÉDUCTION D'ABSENCE UNIQUEMENT
  async calculateSalaires(year: number, month: number, joursTheoriques?: number): Promise<any[]> {
    try {
      console.log(`🧮 Calcul des salaires pour ${month}/${year}, jours théoriques: ${joursTheoriques !== undefined ? joursTheoriques : 'auto'}`);
      
      const employees = await this.getAllEmployees();
      const presences = await this.getPresences();
      const salaireData = await this.getSalaires();
      
      // 🔥 CORRECTION: Calcul automatique REALISTE des jours théoriques
      let joursTravail = joursTheoriques;
      if (joursTravail === undefined || joursTravail === null || joursTravail <= 0) {
        joursTravail = this.calculerJoursOuvrables(year, month);
        console.log(`📅 Jours ouvrables calculés automatiquement: ${joursTravail} jours`);
      }
      
      console.log(`📊 Données chargées: ${employees.length} employés, ${Object.keys(presences).length} présences, ${joursTravail} jours travaillés`);
      
      const salairesCalcules = [];

      for (const employee of employees) {
        try {
          if (!employee.Matricule) {
            console.warn('❌ Employé sans matricule ignoré:', employee);
            continue;
          }

          const matricule = employee.Matricule;
          const salBase = this.parseFloat(employee['Salaire de base']) || 0;
          const droitTR = this.calculDroitDepuisDate(employee["Date d'embauche"]);
          const droitOSTIE = this.calculDroitDepuisDate(employee["Date d'embauche"]);
          const ancienneteAns = this.calculAncienneteAns(employee["Date d'embauche"]);

          // 🔥 CORRECTION: Calcul des heures
          const heures = this.calculHeuresPresence(matricule, year, month, presences);
          const h_presence = heures.presence;
          const h_conge = heures.conge;
          const h_ferie = heures.ferie;
          const h_nuit = heures.nuit;
          const joursFormation = heures.joursFormation;
          const heuresTravailleesReelles = heures.heuresTravailleesReelles;
          const absences = heures.absence / 8;

          // 🔥 CORRECTION: Calcul du taux horaire (uniquement pour les déductions et majorations)
          const heuresTheoriquesMois = joursTravail * 8;
          const tauxH = heuresTheoriquesMois > 0 ? salBase / heuresTheoriquesMois : 0;

          // Données manuelles
          const key = `${matricule}_${year}_${month}`;
          const manual = salaireData[key] || {};
          const primeProd = this.parseFloat(manual["Prime de production"]) || 0;
          const primeAssid = this.parseFloat(manual["Prime d'assiduité"]) || 0;
          const primeAnc = this.parseFloat(manual["Prime d'ancienneté"]) || 0;
          const primeElite = this.parseFloat(manual["Prime élite"]) || 0;
          const primeResp = this.parseFloat(manual["Prime de responsabilité"]) || 0;
          const social = this.parseFloat(manual["Social"]) || 15000;
          const avance = this.parseFloat(manual["Avance sur salaire"]) || 0;

          // 🔥 CORRECTION: NOUVELLE LOGIQUE - SALAIRE FIXE AVEC DÉDUCTION D'ABSENCE UNIQUEMENT
          const montantAbsenceDeduit = heures.absence * tauxH;
          const montantTravaille = Math.max(0, salBase - montantAbsenceDeduit); // Salaire base fixe moins les absences

          // Les majorations et indemnités restent calculées normalement
          const majNuit = h_nuit * tauxH * 0.30;
          const majFerie = h_ferie * tauxH * 1.00;
          const indemConge = h_conge * tauxH;
          const indemFormation = joursFormation * 10000;

          const joursPresenceArr = Math.round(heuresTravailleesReelles / 8);
          const indemRepas = joursPresenceArr * 2500 * (droitTR ? 1 : 0);
          const indemTransport = joursPresenceArr * 1200 * (droitTR ? 1 : 0);

          // Salaire brut
          const brut = montantTravaille + majNuit + majFerie + indemConge + indemFormation +
                     primeProd + primeAssid + primeAnc + primeElite + primeResp +
                     indemRepas + indemTransport;

          // OSTIE et CNAPS
          let ostie = 0, cnaps = 0;
          if (ancienneteAns >= 1 && droitOSTIE) {
            ostie = brut * 0.01;
            cnaps = brut * 0.01;
          }

          // 🔥 CALCUL IRSA
          const base = Math.max(0, brut);
          const tranche1 = Math.max(0, Math.min(base, 350000));
          const tranche2 = Math.max(0, Math.min(base, 400000) - 350000);
          const tranche3 = Math.max(0, Math.min(base, 500000) - 400000);
          const tranche4 = Math.max(0, Math.min(base, 600000) - 500000);
          const tranche5 = Math.max(0, base - 600000);

          const rep1 = tranche1 * 0.00;
          const rep2 = tranche2 * 0.05;
          const rep3 = tranche3 * 0.10;
          const rep4 = tranche4 * 0.15;
          const rep5 = tranche5 * 0.20;
          let repTotal = rep1 + rep2 + rep3 + rep4 + rep5;
          if (repTotal === 0) repTotal = 2000;

          const igr = matricule ? repTotal * droitOSTIE : 0;
          const resteAPayer = brut - (avance + ostie + cnaps + social + igr);

          salairesCalcules.push({
            Matricule: matricule,
            Nom: employee.Nom || '',
            Prénom: employee.Prénom || '',
            Compagne: employee.Compagne || '',
            
            // Salaire et taux
            'Salaire de base': Math.round(salBase),
            'Taux horaire': Math.round(tauxH),
            'Solde de congé': this.parseFloat(employee['Solde de congé']),
            
            // Heures (affichées mais ne comptent pas dans le calcul du salaire de base)
            'Heures de présence': parseInt(h_presence.toString()),
            'Heures travaillées réelles': parseInt(heuresTravailleesReelles.toString()),
            'Heures de congé': parseInt(h_conge.toString()),
            'Heures férié majoré': parseInt(h_ferie.toString()),
            'Heures nuit majoré': parseInt(h_nuit.toString()),
            
            // 🔥 NOUVEAU: Colonnes pour la déduction d'absence
            'Jours absence': absences,
            'Montant absence déduit': Math.round(montantAbsenceDeduit),
            
            // Montants calculés
            'Montant travaillé': Math.round(montantTravaille),
            'Majoration de nuit': Math.round(majNuit),
            'Majoration férié': Math.round(majFerie),
            'Indemnité congé': Math.round(indemConge),
            'Indemnité formation': Math.round(indemFormation),
            
            // Primes
            'Prime de production': Math.round(primeProd),
            'Prime d\'assiduité': Math.round(primeAssid),
            'Prime d\'ancienneté': Math.round(primeAnc),
            'Prime élite': Math.round(primeElite),
            'Prime de responsabilité': Math.round(primeResp),
            
            // Indemnités
            'Indemnité repas': Math.round(indemRepas),
            'Indemnité transport': Math.round(indemTransport),
            
            // Total brut
            'Salaire brut': Math.round(brut),
            
            // Déductions
            'Avance sur salaire': Math.round(avance),
            'OSTIE': Math.round(ostie),
            'CNaPS': Math.round(cnaps),
            'Social': Math.round(social),
            'IGR': Math.round(igr),
            
            // Reste à payer
            'Reste à payer': Math.round(resteAPayer),
            
            // Informations sur les jours
            'Jours théoriques': joursTravail,
            'Jours formation': joursFormation,
            'Heures théoriques mois': heuresTheoriquesMois,
            'Pourcentage présence': heuresTheoriquesMois > 0 ? 
              Math.round((heuresTravailleesReelles / heuresTheoriquesMois) * 100) : 0
          });

        } catch (error) {
          console.error(`❌ Erreur calcul salaire pour ${employee.Matricule}:`, error);
        }
      }

      console.log(`✅ Calcul terminé: ${salairesCalcules.length} salaires calculés avec ${joursTravail} jours`);
      return salairesCalcules;

    } catch (error) {
      console.error('💥 Erreur globale calcul salaires:', error);
      throw error;
    }
  }
}

export const colarysEmployeeService = new ColarysEmployeeService();