from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import datetime
import os
from typing import Any, Dict, List, Union

# Chemins des fichiers
DATA_DIR = "data"
EMPLOYES_FILE = os.path.join(DATA_DIR, "employes.json")
PRESENCES_FILE = os.path.join(DATA_DIR, "presences.json")
SALAIRES_FILE = os.path.join(DATA_DIR, "salaires.json")
CONGES_META_FILE = os.path.join(DATA_DIR, "conges_meta.json")

# S'assurer que le dossier data existe
os.makedirs(DATA_DIR, exist_ok=True)

app = FastAPI(
    title="Colarys Concept API",
    description="API de gestion des employés, présences et salaires",
    version="1.0.0"
)

# CORS pour permettre les requêtes depuis votre frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "https://grp-colarys-concept.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------- FONCTIONS UTILITAIRES ----------------------
def parse_float(s: Any, default: float = 0.0) -> float:
    try:
        if s is None:
            return default
        if isinstance(s, (int, float)):
            return float(s)
        s = str(s).replace(" ", "").replace("\u202f", "").replace(",", ".")
        return float(s)
    except Exception:
        return default

def parse_int(s: Any, default: int = 0) -> int:
    try:
        if s is None:
            return default
        if isinstance(s, (int, float)):
            return int(s)
        digits = "".join(ch for ch in str(s) if ch.isdigit() or ch == "-")
        return int(digits) if digits not in ("", "-") else default
    except Exception:
        return default

def _parse_date_embauche(s: str):
    if not s:
        return None
    s = s.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except Exception:
            pass
    return None

def calcul_anciennete(date_embauche_str: str) -> str:
    d = _parse_date_embauche(date_embauche_str)
    if not d:
        return ""
    today = datetime.date.today()
    years = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    months = (today.month - d.month) % 12
    return f"{years} ans {months} mois"

def calcul_droit_depuis_date(date_embauche_str: str) -> int:
    d = _parse_date_embauche(date_embauche_str)
    if not d:
        return 0
    return 1 if (datetime.date.today() - d).days > 365 else 0

def anciennete_ans_depuis_date(date_embauche_str: str) -> int:
    d = _parse_date_embauche(date_embauche_str or "")
    if not d:
        return 0
    today = datetime.date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))

def load_data(filename: str, default: Any):
    """Charge les données depuis un fichier JSON"""
    try:
        if os.path.exists(filename):
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"❌ Erreur lecture {filename}: {e}")
    return default

def save_data(filename: str, data: Any):
    """Sauvegarde les données dans un fichier JSON"""
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ Erreur écriture {filename}: {e}")
        return False

def update_conges_automatique(employes: List[Dict[str, str]]):
    """Met à jour automatiquement les soldes de congé"""
    today = datetime.date.today()
    
    for emp in employes:
        solde_courant = parse_float(emp.get("Solde de congé", emp.get("Solde initial congé", 0)))
        last_update = emp.get("last_update")
        
        if last_update:
            try:
                last_date = datetime.datetime.strptime(last_update, "%Y-%m").date()
            except Exception:
                last_date = today.replace(day=1)
        else:
            last_date = today.replace(day=1)

        months_passed = (today.year - last_date.year) * 12 + (today.month - last_date.month)

        if months_passed > 0:
            solde_courant += 2.5 * months_passed

        emp["Solde de congé"] = str(round(solde_courant, 2))
        emp["last_update"] = today.strftime("%Y-%m")
    
    return employes

# ---------------------- ENDPOINTS EMPLOYÉS ----------------------
@app.get("/")
async def root():
    return {
        "message": "Colarys Concept API", 
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "employes": "/employes",
            "presences": "/presences/{year}/{month}",
            "salaires": "/salaires/{year}/{month}",
            "statistiques": "/statistiques"
        }
    }

@app.get("/employes", response_model=List[Dict[str, str]])
async def get_employes():
    """Récupérer tous les employés"""
    employes = load_data(EMPLOYES_FILE, [])
    return employes

@app.get("/employes/{matricule}")
async def get_employe(matricule: str):
    """Récupérer un employé par matricule"""
    employes = load_data(EMPLOYES_FILE, [])
    for emp in employes:
        if emp.get("Matricule") == matricule:
            return emp
    raise HTTPException(status_code=404, detail="Employé non trouvé")

@app.post("/employes")
async def create_employe(employe: Dict[str, str]):
    """Créer un nouvel employé"""
    employes = load_data(EMPLOYES_FILE, [])
    
    # Vérifier si le matricule existe déjà
    if any(emp.get("Matricule") == employe.get("Matricule") for emp in employes):
        raise HTTPException(status_code=400, detail="Matricule déjà utilisé")
    
    # Calculer les champs automatiques
    date_emb = employe.get("Date d'embauche", "")
    employe["Ancienneté"] = calcul_anciennete(date_emb)
    droit = calcul_droit_depuis_date(date_emb)
    employe["droit ostie"] = str(droit)
    employe["droit transport et repas"] = str(droit)
    
    # Gestion solde congé
    solde_initial = parse_float(employe.get("Solde initial congé", 0))
    solde_actuel = parse_float(employe.get("Solde de congé", -1))
    if solde_actuel < 0:
        employe["Solde de congé"] = str(solde_initial)
    
    employes.append(employe)
    
    if save_data(EMPLOYES_FILE, employes):
        return {"message": "Employé créé avec succès", "matricule": employe["Matricule"]}
    else:
        raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde")

@app.put("/employes/{matricule}")
async def update_employe(matricule: str, employe: Dict[str, str]):
    """Modifier un employé"""
    employes = load_data(EMPLOYES_FILE, [])
    
    for i, emp in enumerate(employes):
        if emp.get("Matricule") == matricule:
            # Recalculer les champs automatiques
            date_emb = employe.get("Date d'embauche", "")
            employe["Ancienneté"] = calcul_anciennete(date_emb)
            droit = calcul_droit_depuis_date(date_emb)
            employe["droit ostie"] = str(droit)
            employe["droit transport et repas"] = str(droit)
            
            employes[i] = employe
            
            if save_data(EMPLOYES_FILE, employes):
                return {"message": "Employé modifié avec succès"}
            else:
                raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde")
    
    raise HTTPException(status_code=404, detail="Employé non trouvé")

@app.delete("/employes/{matricule}")
async def delete_employe(matricule: str):
    """Supprimer un employé"""
    employes = load_data(EMPLOYES_FILE, [])
    initial_count = len(employes)
    employes = [emp for emp in employes if emp.get("Matricule") != matricule]
    
    if len(employes) < initial_count:
        if save_data(EMPLOYES_FILE, employes):
            return {"message": "Employé supprimé avec succès"}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde")
    else:
        raise HTTPException(status_code=404, detail="Employé non trouvé")

# ---------------------- ENDPOINTS PRÉSENCES ----------------------
@app.get("/presences/{year}/{month}")
async def get_presences_month(year: int, month: int):
    """Récupérer les présences pour un mois donné"""
    presences = load_data(PRESENCES_FILE, {})
    employes = load_data(EMPLOYES_FILE, [])
    
    # Filtrer les présences pour le mois demandé
    month_presences = {}
    for key, value in presences.items():
        if f"_{year}_{month}_" in key:
            month_presences[key] = value
    
    return {
        "year": year,
        "month": month,
        "presences": month_presences,
        "employes": employes
    }

@app.post("/presences/{year}/{month}")
async def update_presences(year: int, month: int, presences: Dict[str, str]):
    """Mettre à jour les présences pour un mois"""
    all_presences = load_data(PRESENCES_FILE, {})
    
    # Mettre à jour seulement les présences du mois
    for key, value in presences.items():
        if f"_{year}_{month}_" in key:
            if value.strip():  # Si la valeur n'est pas vide
                all_presences[key] = value
            elif key in all_presences:
                del all_presences[key]  # Supprimer si vide
    
    if save_data(PRESENCES_FILE, all_presences):
        # Mettre à jour les soldes de congé
        employes = load_data(EMPLOYES_FILE, [])
        for emp in employes:
            matricule = emp.get("Matricule", "")
            solde_initial = parse_float(emp.get("Solde initial congé", 0))
            
            # Compter les jours de congé
            total_conges = sum(
                1 for key, val in all_presences.items()
                if key.startswith(f"{matricule}_") and val == "c"
            )
            
            # Nouveau solde = solde initial - tous ses congés
            emp["Solde de congé"] = str(max(solde_initial - total_conges, 0))
        
        save_data(EMPLOYES_FILE, employes)
        
        return {"message": "Présences mises à jour avec succès"}
    else:
        raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde")

# ---------------------- ENDPOINTS SALAIRES ----------------------
@app.get("/salaires/{year}/{month}")
async def get_salaires_month(year: int, month: int):
    """Récupérer les données de salaire pour un mois"""
    salaires = load_data(SALAIRES_FILE, {})
    employes = load_data(EMPLOYES_FILE, [])
    presences = load_data(PRESENCES_FILE, {})
    
    # Filtrer les salaires pour le mois demandé
    month_salaires = {}
    for key, value in salaires.items():
        if f"_{year}_{month}" in key:
            month_salaires[key] = value
    
    return {
        "year": year,
        "month": month,
        "salaires": month_salaires,
        "employes": employes,
        "presences": presences
    }

@app.post("/salaires/{year}/{month}")
async def update_salaires(year: int, month: int, salaires_data: Dict[str, Any]):
    """Mettre à jour les données de salaire"""
    all_salaires = load_data(SALAIRES_FILE, {})
    
    # Mettre à jour les salaires pour le mois
    for key, value in salaires_data.items():
        all_salaires[key] = value
    
    if save_data(SALAIRES_FILE, all_salaires):
        return {"message": "Salaires mis à jour avec succès"}
    else:
        raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde")

# ---------------------- STATISTIQUES ----------------------
@app.get("/statistiques")
async def get_statistiques():
    """Récupérer des statistiques globales"""
    employes = load_data(EMPLOYES_FILE, [])
    presences = load_data(PRESENCES_FILE, {})
    
    total_employes = len(employes)
    employes_actifs = [e for e in employes if calcul_droit_depuis_date(e.get("Date d'embauche", "")) == 1]
    
    # Calculer le total des salaires de base
    total_salaires = sum(parse_float(emp.get("Salaire de base", 0)) for emp in employes)
    
    return {
        "total_employes": total_employes,
        "employes_actifs": len(employes_actifs),
        "total_presences": len(presences),
        "total_masse_salariale": total_salaires,
        "salaire_moyen": total_salaires / total_employes if total_employes > 0 else 0
    }

# ---------------------- SANTÉ DE L'API ----------------------
@app.get("/health")
async def health_check():
    """Vérifier la santé de l'API"""
    employes = load_data(EMPLOYES_FILE, [])
    presences = load_data(PRESENCES_FILE, {})
    salaires = load_data(SALAIRES_FILE, {})
    
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "data": {
            "employes_count": len(employes),
            "presences_count": len(presences),
            "salaires_count": len(salaires)
        }
    }

# ---------------------- DÉMARRAGE ----------------------
if __name__ == "__main__":
    import uvicorn
    print("🚀 Démarrage de l'API Colarys Concept...")
    print("📍 Écoute sur: http://0.0.0.0:8000")
    print("📚 Documentation: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)