// services/PythonAPIService.ts
import axios from 'axios';

const PYTHON_API_BASE = 'http://localhost:8000';

export class PythonAPIService {
  // Employés
  static async getEmployes() {
    const response = await axios.get(`${PYTHON_API_BASE}/employes`);
    return response.data;
  }

  static async createEmploye(employe: any) {
    const response = await axios.post(`${PYTHON_API_BASE}/employes`, employe);
    return response.data;
  }

  static async updateEmploye(matricule: string, employe: any) {
    const response = await axios.put(`${PYTHON_API_BASE}/employes/${matricule}`, employe);
    return response.data;
  }

  static async deleteEmploye(matricule: string) {
    const response = await axios.delete(`${PYTHON_API_BASE}/employes/${matricule}`);
    return response.data;
  }

  // Présences
  static async getPresences(year: number, month: number) {
    const response = await axios.get(`${PYTHON_API_BASE}/presences/${year}/${month}`);
    return response.data;
  }

  static async updatePresences(year: number, month: number, presences: any) {
    const response = await axios.post(`${PYTHON_API_BASE}/presences/${year}/${month}`, presences);
    return response.data;
  }

  // Salaires
  static async getSalaires(year: number, month: number) {
    const response = await axios.get(`${PYTHON_API_BASE}/salaires/${year}/${month}`);
    return response.data;
  }

  static async updateSalaires(year: number, month: number, salaires: any) {
    const response = await axios.post(`${PYTHON_API_BASE}/salaires/${year}/${month}`, salaires);
    return response.data;
  }
}