#!/usr/bin/env python3
"""
Script de démarrage de l'API Python Colarys Concept
Usage:
    python start_api.py          # Démarre l'API uniquement
    python start_api.py --desktop  # Démarre l'app desktop uniquement  
    python start_api.py --both    # Démarre l'API et le desktop
    python start_api.py --help    # Affiche l'aide
"""

import sys
import subprocess
import os
import argparse
from threading import Thread
import time

def print_banner():
    """Affiche une bannière stylisée"""
    banner = """
    ╔══════════════════════════════════════════╗
    ║           COLARYS CONCEPT API            ║
    ║         Gestion des Employés v1.0        ║
    ╚══════════════════════════════════════════╝
    """
    print(banner)

def check_dependencies():
    """Vérifie que les dépendances sont installées"""
    try:
        import fastapi
        import uvicorn
        print("✅ Dépendances FastAPI trouvées")
        return True
    except ImportError as e:
        print(f"❌ Dépendances manquantes: {e}")
        print("💡 Installez les dépendances avec: pip install -r requirements.txt")
        return False

def start_api():
    """Démarre l'API FastAPI"""
    print("🚀 Démarrage de l'API FastAPI...")
    print("📍 URL: http://localhost:8000")
    print("📚 Documentation: http://localhost:8000/docs")
    print("❤️  Santé: http://localhost:8000/health")
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Vérifier que le dossier data existe
    if not os.path.exists("data"):
        print("📁 Création du dossier data...")
        os.makedirs("data")
    
    # Copier les fichiers JSON existants vers data/ si nécessaire
    for json_file in ["employes.json", "presences.json", "salaires.json", "conges_meta.json"]:
        if os.path.exists(json_file) and not os.path.exists(f"data/{json_file}"):
            print(f"📄 Copie de {json_file} vers data/...")
            import shutil
            shutil.copy2(json_file, f"data/{json_file}")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "api:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors du démarrage de l'API: {e}")
    except KeyboardInterrupt:
        print("\n🛑 Arrêt de l'API...")

def start_desktop():
    """Démarre l'application desktop"""
    print("🖥️  Démarrage de l'application desktop...")
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Vérifier que col.py existe
    if not os.path.exists("col.py"):
        print("❌ Fichier col.py non trouvé!")
        return
    
    try:
        subprocess.run([sys.executable, "col.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors du démarrage de l'app desktop: {e}")
    except KeyboardInterrupt:
        print("\n🛑 Arrêt de l'application desktop...")

def main():
    """Fonction principale"""
    parser = argparse.ArgumentParser(description="Démarre l'API Colarys Concept")
    parser.add_argument(
        '--desktop', 
        action='store_true',
        help='Démarre uniquement l\'application desktop'
    )
    parser.add_argument(
        '--both',
        action='store_true', 
        help='Démarre l\'API et l\'application desktop'
    )
    
    args = parser.parse_args()
    
    print_banner()
    
    if not check_dependencies():
        sys.exit(1)
    
    if args.desktop:
        # Mode desktop uniquement
        start_desktop()
    elif args.both:
        # Mode les deux
        print("🔧 Mode: API + Desktop")
        
        # Démarrer l'API dans un thread séparé
        api_thread = Thread(target=start_api)
        api_thread.daemon = True
        api_thread.start()
        
        # Attendre un peu que l'API démarre
        print("⏳ Démarrage de l'API en arrière-plan...")
        time.sleep(3)
        
        # Démarrer le desktop dans le thread principal
        start_desktop()
    else:
        # Mode API uniquement (par défaut)
        print("🔧 Mode: API uniquement")
        start_api()

if __name__ == "__main__":
    main()