export interface Agent {
  id?: number;
  prenom: string;
  nom: string;
  email: string;
  tel1: string;
  role?: Role;
  plateforme?: Plateforme;
}

export interface Role {
  id: number;
  nom: string;
}

export interface Plateforme {
  id: number;
  nom: string;
}

export interface PlanningEntry {
  id?: number;
  agent: Agent;
  date: Date;
  shiftType: string;
  heuresTravail: number;
  remarques: string;
}

export interface SearchCriteria {
  type?: string;
  date?: Date;
  semaine?: string;
  shiftType?: string;
  plateforme?: number;
  role?: number;
}