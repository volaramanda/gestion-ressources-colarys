import sys
import os
import json
import datetime
from typing import Any, Dict, List, Union
from PyQt6.QtWidgets import QSpinBox

from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTableWidget, QTableWidgetItem, QMessageBox, QLineEdit, QScrollArea,
    QStackedWidget, QComboBox, QFileDialog, QGridLayout
)
from PyQt6.QtCore import Qt, QTimer, QDateTime, QLocale
from PyQt6.QtGui import QColor

# ---- PDF (fiche de paie)
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table as RLTable, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

EMPLOYES_FILE = "employes.json"
PRESENCES_FILE = "presences.json"
SALAIRES_FILE = "salaires.json"  # saisies manuelles (primes, social, avances, etc.)

champs = [
    "Matricule", "Nom", "Prénom", "Adresse", "N° Téléphone", "Fonction",
    "Mode de paiement", "Catégorie", "Compagne", "Salaire de base","Solde initial congé",
    "Solde de congé", "Date d'embauche", "Ancienneté", "distance du lieu de travaille",
    "droit ostie", "droit transport et repas", "Situation maritale",
    "Nombre d'enfants", "Contact d'urgence - Nom et prénom", "Relation",
    "Adresse du contact d'urgence", "Téléphone contact urgence"
]

ALLOWED_PRESENCE_VALUES = {"p", "n", "a", "c", "m", "f"}

# ---------------------- OUTILS ----------------------
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
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
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

def yes_flag(s: Any) -> int:
    if isinstance(s, (int, float)):
        return 1 if s != 0 else 0
    val = str(s).strip().lower()
    return 1 if val in {"1", "oui", "true", "vrai", "o", "y"} else 0

def parse_month(s: str) -> int:
    """Accepte '3', '03', 'mars', 'Mars'... -> 3 ; retourne 0 si invalide."""
    if not s:
        return 0
    s2 = s.strip().lower()
    # nombre direct
    try:
        m = int(s2)
        if 1 <= m <= 12:
            return m
    except Exception:
        pass
    # nom FR
    fr = QLocale(QLocale.Language.French, QLocale.Country.France)
    for m in range(1, 13):
        if s2 in {fr.monthName(m).lower(), fr.standaloneMonthName(m).lower()}:
            return m
    return 0

# ---------------------- UI: EMPLOYÉS ----------------------
class CustomLineEdit(QLineEdit):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.next_widget = None
        self.prev_widget = None
        self.enter_action = None

    def keyPressEvent(self, event):
        key = event.key()
        if key in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            if self.enter_action:
                self.enter_action()
            elif self.next_widget:
                self.next_widget.setFocus()
            else:
                super().keyPressEvent(event)
        elif key == Qt.Key.Key_Up and self.prev_widget:
            self.prev_widget.setFocus()
        elif key == Qt.Key.Key_Down and self.next_widget:
            self.next_widget.setFocus()
        else:
            super().keyPressEvent(event)

class PageEMP(QWidget):
    def __init__(self, go_home_callback, employes: List[Dict[str, str]]):
        super().__init__()
        self.employes = employes
        self.go_home_callback = go_home_callback
        self.inputs_ajouter: Dict[str, QLineEdit] = {}
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        form_layout = QVBoxLayout()

        for _, champ in enumerate(champs):
            label = QLabel(champ)
            line_edit = CustomLineEdit()
            self.inputs_ajouter[champ] = line_edit

            if champ in ("Ancienneté", "droit ostie", "droit transport et repas"):
                line_edit.setReadOnly(True)
                line_edit.setStyleSheet("background-color:#f3f4f6; color:#444;")

            form_layout.addWidget(label)
            form_layout.addWidget(line_edit)

        if "Date d'embauche" in self.inputs_ajouter:
            self.inputs_ajouter["Date d'embauche"].editingFinished.connect(
                self._auto_fill_calculated_fields
            )
            self.inputs_ajouter["Date d'embauche"].textChanged.connect(
                self._auto_fill_calculated_fields
            )

        for i, champ in enumerate(champs):
            current = self.inputs_ajouter[champ]
            if i > 0:
                current.prev_widget = self.inputs_ajouter[champs[i - 1]]
            if i < len(champs) - 1:
                current.next_widget = self.inputs_ajouter[champs[i + 1]]
            else:
                current.enter_action = self.ajouter_employe

        scroll_widget = QWidget()
        scroll_widget.setLayout(form_layout)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(scroll_widget)
        main_layout.addWidget(scroll)

        btns = QHBoxLayout()
        btn_add = QPushButton("Ajouter")
        btn_search = QPushButton("Rechercher")
        btn_delete = QPushButton("Supprimer")
        btn_list = QPushButton("Liste complète")
        btn_modify = QPushButton("Modifier")
        btn_home = QPushButton("Retour à l’accueil")

        btn_add.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        btn_search.setStyleSheet("background-color: #2196F3; color: white; font-weight: bold;")
        btn_delete.setStyleSheet("background-color: #f44336; color: white; font-weight: bold;")
        btn_list.setStyleSheet("background-color: #ff9800; color: white; font-weight: bold;")
        btn_modify.setStyleSheet("background-color: #9c27b0; color: white; font-weight: bold;")
        btn_home.setStyleSheet("background-color: #b71c1c; color: white; font-weight: bold;")

        btn_add.clicked.connect(self.ajouter_employe)
        btn_search.clicked.connect(self.rechercher_employe)
        btn_delete.clicked.connect(self.supprimer_employe)
        btn_list.clicked.connect(self.afficher_liste)
        btn_modify.clicked.connect(self._modifier_depuis_formulaire)
        btn_home.clicked.connect(self.go_home_callback)

        for w in (btn_add, btn_search, btn_delete, btn_list, btn_modify, btn_home):
            btns.addWidget(w)
        main_layout.addLayout(btns)

        self.search_input = QLineEdit()
        self.search_result = QLabel("")
        main_layout.addWidget(QLabel("Recherche par Matricule :"))
        main_layout.addWidget(self.search_input)
        main_layout.addWidget(self.search_result)
        self.search_input.returnPressed.connect(self.rechercher_employe)

        self.delete_input = QLineEdit()
        main_layout.addWidget(QLabel("Suppression par Matricule :"))
        main_layout.addWidget(self.delete_input)

        self.table = QTableWidget()
        main_layout.addWidget(self.table)

    def _auto_fill_calculated_fields(self):
        date_emb = self.inputs_ajouter.get("Date d'embauche", QLineEdit()).text().strip()
        self.inputs_ajouter["Ancienneté"].setText(calcul_anciennete(date_emb))
        droit = calcul_droit_depuis_date(date_emb)
        self.inputs_ajouter["droit ostie"].setText(str(droit))
        self.inputs_ajouter["droit transport et repas"].setText(str(droit))
        initial = parse_float(self.inputs_ajouter.get("Solde initial congé").text(), 0)
        solde = parse_float(self.inputs_ajouter.get("Solde de congé").text(), -1)
        if solde < 0:  # si le solde est vide, on copie le solde initial
                self.inputs_ajouter["Solde de congé"].setText(str(initial))


    def _build_form_data(self) -> Dict[str, str]:
        self._auto_fill_calculated_fields()
        return {champ: self.inputs_ajouter[champ].text().strip() for champ in champs}
   
    def _find_emp_index_by_matricule(self, matricule: str) -> int:
        for i, emp in enumerate(self.employes):
            if emp.get("Matricule") == matricule:
                return i
        return -1

    def ajouter_employe(self):
        data = self._build_form_data()
        champs_calc = {"Ancienneté", "droit ostie", "droit transport et repas"}
        if any((c not in champs_calc) and (data[c] == "") for c in champs):
            QMessageBox.warning(self, "Erreur", "Veuillez remplir tous les champs obligatoires.")
            return

        if any(emp.get("Matricule") == data["Matricule"] for emp in self.employes):
            QMessageBox.warning(self, "Erreur", "Matricule déjà utilisé.")
            return

        self.employes.append(data)
        QMessageBox.information(self, "Succès", "Employé ajouté.")

        for champ in champs:
            self.inputs_ajouter[champ].clear()

    def rechercher_employe(self):
        matricule = self.search_input.text().strip()
        if not matricule:
            self.search_result.setText("Veuillez entrer un matricule.")
            return
        for emp in self.employes:
            if emp.get("Matricule") == matricule:
                self.search_result.setText("\n".join(f"{k}: {v}" for k, v in emp.items()))
                for c in champs:
                    self.inputs_ajouter[c].setText(emp.get(c, ""))
                self._auto_fill_calculated_fields()
                return
        self.search_result.setText("Employé non trouvé.")

    def supprimer_employe(self):
        matricule = self.delete_input.text().strip()
        if not matricule:
            QMessageBox.warning(self, "Erreur", "Veuillez entrer un matricule à supprimer.")
            return
        for i, e in enumerate(self.employes):
            if e.get("Matricule") == matricule:
                choix = QMessageBox.question(
                    self, "Confirmation", f"Supprimer l'employé {matricule} ?",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                )
                if choix == QMessageBox.StandardButton.Yes:
                    self.employes.pop(i)
                    QMessageBox.information(self, "Succès", "Employé supprimé.")
                return
        QMessageBox.warning(self, "Erreur", "Employé non trouvé.")

    def afficher_liste(self):
        self.table.clear()
        self.table.setColumnCount(len(champs))
        self.table.setHorizontalHeaderLabels(champs)
        self.table.setRowCount(len(self.employes))
        for r, emp in enumerate(self.employes):
            for c, champ in enumerate(champs):
                self.table.setItem(r, c, QTableWidgetItem(emp.get(champ, "")))
        self.table.resizeColumnsToContents()

    def _modifier_depuis_formulaire(self):
        matricule = self.inputs_ajouter.get("Matricule", QLineEdit()).text().strip()
        if not matricule:
            QMessageBox.warning(self, "Erreur", "Veuillez entrer le matricule de l'employé à modifier.")
            return
        self.modifier_employe(matricule)

    def modifier_employe(self, matricule: str | None = None) -> bool:
        data = self._build_form_data()
        matricule_form = data.get("Matricule", "").strip()
        m = (matricule or matricule_form).strip()
        if not m:
            QMessageBox.warning(self, "Erreur", "Aucun matricule fourni pour la modification.")
            return False

        idx = self._find_emp_index_by_matricule(m)
        if idx < 0:
            QMessageBox.warning(self, "Erreur", f"Employé {m} introuvable.")
            return False

        self.employes[idx] = data
        QMessageBox.information(self, "Succès", f"Employé {m} modifié.")
        self.afficher_liste()
        return True

# ---------------------- UI: PRÉSENCES ----------------------
class PagePresence(QWidget):
    def __init__(self, go_home_callback, employes: List[Dict[str, str]], presence_data: Dict[str, str]):
        super().__init__()
        self.go_home_callback = go_home_callback
        self.employes = employes
        self.presence_data = presence_data
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.addWidget(QLabel("<h2>Gestion des présences - Calendrier</h2>"))

        nav = QHBoxLayout()
        self.btn_prev_month = QPushButton("<< Mois précédent")
        self.btn_next_month = QPushButton("Mois suivant >>")
        self.label_mois = QLabel(alignment=Qt.AlignmentFlag.AlignCenter)
        nav.addWidget(self.btn_prev_month)
        nav.addWidget(self.label_mois)
        nav.addWidget(self.btn_next_month)
        layout.addLayout(nav)

        self.btn_prev_month.setStyleSheet("background-color: yellow; font-weight: bold;")
        self.btn_next_month.setStyleSheet("background-color: #87CEEB; font-weight: bold;")

        self.btn_prev_month.clicked.connect(self.prev_month)
        self.btn_next_month.clicked.connect(self.next_month)

        self.table = QTableWidget()
        layout.addWidget(self.table)

        btns = QHBoxLayout()
        self.btn_save = QPushButton("Enregistrer présences")
        self.btn_home = QPushButton("Retour à l’accueil")

        self.btn_save.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        self.btn_home.setStyleSheet("background-color: #b71c1c; color: white; font-weight: bold;")

        btns.addWidget(self.btn_save)
        btns.addWidget(self.btn_home)
        layout.addLayout(btns)

        self.btn_save.clicked.connect(self.save_presence)
        self.btn_home.clicked.connect(self.go_home_callback)

        today = datetime.date.today()
        self.current_year = today.year
        self.current_month = today.month
        self.update_calendar()

    def _mois_label_fr(self, year: int, month: int) -> str:
        ql = QLocale(QLocale.Language.French, QLocale.Country.France)
        return f"{ql.monthName(month).capitalize()} {year}"

    def update_calendar(self):
        fd = datetime.date(self.current_year, self.current_month, 1)
        self.label_mois.setText(self._mois_label_fr(self.current_year, self.current_month))
        nm = datetime.date(self.current_year + (self.current_month // 12), (self.current_month % 12) + 1, 1)
        days_in_month = (nm - fd).days
        jours = ["L", "M", "M", "J", "V", "S", "D"]

        self.table.clear()
        headers = ["Employé"] + [
            f"{jours[(fd + datetime.timedelta(days=i)).weekday()]}\n{(fd + datetime.timedelta(days=i)).day}"
            for i in range(days_in_month)
        ] + ["Présence (p)", "Nuit (n)", "Absence (a)", "Congés (c)", "Férié (m)", "Formation (f)"]
        self.table.setColumnCount(len(headers))
        self.table.setHorizontalHeaderLabels(headers)
        self.table.setRowCount(len(self.employes) + 1)

        total_pres = total_nuit = total_abs = total_cong = total_ferie = total_form = 0

        for r, emp in enumerate(self.employes):
            self.table.setItem(r, 0, QTableWidgetItem(f"{emp.get('Matricule', '')} - {emp.get('Prénom', '')}"))
            pres = nuit = abs_ = cong = ferie = form = 0
            for d in range(days_in_month):
                key = f"{emp.get('Matricule','')}_{self.current_year}_{self.current_month}_{d+1}"
                val = self.presence_data.get(key, "").lower()
                cell = QTableWidgetItem(val)
                cell.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                if val == "p":
                    cell.setBackground(QColor("#a5d6a7"))
                    pres += 8
                elif val == "n":
                    cell.setBackground(QColor("#80deea"))
                    pres += 8
                    nuit += 8
                elif val == "a":
                    cell.setBackground(QColor("#ef9a9a"))
                    abs_ += 8
                elif val == "c":
                    cell.setBackground(QColor("#fff59d"))
                    cong += 8
                elif val == "m":
                    cell.setBackground(QColor("#ce93d8"))
                    ferie += 8
                    pres += 8
                elif val == "f":
                    cell.setBackground(QColor("#e0e0e0"))
                    form += 8
                self.table.setItem(r, d + 1, cell)
            self.table.setItem(r, days_in_month + 1, QTableWidgetItem(str(pres)))
            self.table.setItem(r, days_in_month + 2, QTableWidgetItem(str(nuit)))
            self.table.setItem(r, days_in_month + 3, QTableWidgetItem(str(abs_)))
            self.table.setItem(r, days_in_month + 4, QTableWidgetItem(str(cong)))
            self.table.setItem(r, days_in_month + 5, QTableWidgetItem(str(ferie)))
            self.table.setItem(r, days_in_month + 6, QTableWidgetItem(str(form)))

            total_pres += pres
            total_nuit += nuit
            total_abs += abs_
            total_cong += cong
            total_ferie += ferie
            total_form += form

        r = len(self.employes)
        self.table.setItem(r, 0, QTableWidgetItem("Total"))
        self.table.setItem(r, days_in_month + 1, QTableWidgetItem(str(total_pres)))
        self.table.setItem(r, days_in_month + 2, QTableWidgetItem(str(total_nuit)))
        self.table.setItem(r, days_in_month + 3, QTableWidgetItem(str(total_abs)))
        self.table.setItem(r, days_in_month + 4, QTableWidgetItem(str(total_cong)))
        self.table.setItem(r, days_in_month + 5, QTableWidgetItem(str(total_ferie)))
        self.table.setItem(r, days_in_month + 6, QTableWidgetItem(str(total_form)))

        self.table.resizeColumnsToContents()

    def prev_month(self):
        self.current_month -= 1
        if self.current_month < 1:
            self.current_month = 12
            self.current_year -= 1
        self.update_calendar()

    def next_month(self):
        self.current_month += 1
        if self.current_month > 12:
            self.current_month = 1
            self.current_year += 1
        self.update_calendar()


    def save_presence(self):
        fd = datetime.date(self.current_year, self.current_month, 1)
        nm = datetime.date(
            self.current_year + (self.current_month // 12),
            (self.current_month % 12) + 1,
            1
        )
        days_in_month = (nm - fd).days

        # Enregistrement des valeurs de la table dans presence_data
        for r, emp in enumerate(self.employes):
            matricule = emp.get("Matricule", "")
            for d in range(days_in_month):
                item = self.table.item(r, d + 1)
                if item:
                    val = item.text().lower()
                    key = f"{matricule}_{self.current_year}_{self.current_month}_{d+1}"
                    if val in ALLOWED_PRESENCE_VALUES:
                        self.presence_data[key] = val
                    else:
                        self.presence_data.pop(key, None)
                        item.setText("")

        # Mise à jour du solde de congé pour chaque employé individuellement
        for emp in self.employes:
            matricule = emp.get("Matricule", "")
            solde_initial = parse_float(emp.get("Solde initial congé", 0))

            # Compter TOUS les jours de congé 'c' enregistrés dans presence_data pour ce matricule
            total_conges = sum(
                1 for key, val in self.presence_data.items()
                if key.startswith(f"{matricule}_") and val == "c"
            )

            # Nouveau solde = solde initial - tous ses congés
            emp["Solde de congé"] = str(max(solde_initial - total_conges, 0))

        QMessageBox.information(self, "Succès", "Présences enregistrées.")

       
    def modifier_presence(self, matricule: str, updates: Dict[int, str], year: int | None = None, month: int | None = None) -> bool:
        if not matricule or not isinstance(updates, dict) or not updates:
            QMessageBox.warning(self, "Erreur", "Paramètres de modification de présence invalides.")
            return False

        y = year or self.current_year
        m = month or self.current_month

        try:
            first = datetime.date(y, m, 1)
            nextm = datetime.date(y + (m // 12), (m % 12) + 1, 1)
            dim = (nextm - first).days
        except Exception:
            QMessageBox.warning(self, "Erreur", "Mois/année invalides.")
            return False

        changed = False
        for day, val in updates.items():
            if not isinstance(day, int) or day < 1 or day > dim:
                continue
            v = val.strip().lower() if isinstance(val, str) else ""
            key = f"{matricule}_{y}_{m}_{day}"
            if v in ALLOWED_PRESENCE_VALUES:
                if self.presence_data.get(key) != v:
                    self.presence_data[key] = v
                    changed = True
            else:
                if key in self.presence_data:
                    self.presence_data.pop(key, None)
                    changed = True

        if changed:
            self.update_calendar()
        return changed

# ---------------------- UI: SALAIRE ----------------------
SALAIRE_COLS = [
    "Matricule", "Nom", "Prénom", "Compagne", "Salaire de base", "Taux horaire", "Solde de congé",
    "Heures de présence", "Heures de congé", "Heures férié majoré", "Heures nuit majoré",
    "Montant travaillé", "Majoration de nuit", "Majoration férié", "Indemnité congé", "Indemnité formation",
    "Prime de production", "Prime d’assiduité", "Prime d’ancienneté", "Prime élite", "Prime de responsabilité",
    "Indemnité repas", "Indemnité transport", "Salaire brut", "Avance sur salaire", "OSTIE", "CNaPS", "Social",
    "IGR", "Reste à payer",
    "1ère tranche (0%)", "2ème tranche (5%)", "3ème tranche (10%)", "4ème tranche (15%)", "5ème tranche (20%)",
    "Rep1", "Rep2", "Rep3", "Rep4", "Rep5", "Reptot"
]

MANUAL_COLS = {
    "Prime de production", "Prime d’assiduité", "Prime d’ancienneté", "Prime élite",
    "Prime de responsabilité", "Social", "Avance sur salaire"
}

class PageSalaire(QWidget):
    def __init__(self, go_home_callback, employes: List[Dict[str, str]], presence_data: Dict[str, str], salaires_store: Dict[str, Any]):
        super().__init__()
        self.go_home_callback = go_home_callback
        self.employes = employes
        self.presence_data = presence_data
        self.salaires_store = salaires_store
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("<h2>Calcul des salaires</h2>"))

        self.cmb_month = QComboBox()
        self.cmb_year = QComboBox()
        for m in range(1, 13):
            self.cmb_month.addItem(QLocale(QLocale.Language.French).monthName(m).capitalize(), m)
        current_year = datetime.date.today().year
        for y in range(current_year - 3, current_year + 4):
            self.cmb_year.addItem(str(y), y)
        self.cmb_month.setCurrentIndex(datetime.date.today().month - 1)
        self.cmb_year.setCurrentText(str(current_year))

        self.spin_days = QSpinBox()
        self.spin_days.setRange(0, 31)
        self.spin_days.setValue(22)

        header.addWidget(QLabel("Mois:"))
        header.addWidget(self.cmb_month)
        header.addWidget(QLabel("Année:"))
        header.addWidget(self.cmb_year)
        header.addWidget(QLabel("Jours de travail:"))
        header.addWidget(self.spin_days)

        self.btn_recalc = QPushButton("Recalculer salaires")
        self.btn_save = QPushButton("Enregistrer")
        self.btn_home = QPushButton("Retour à l’accueil")
        header.addWidget(self.btn_recalc)
        header.addWidget(self.btn_save)
        header.addWidget(self.btn_home)
        layout.addLayout(header)

        self.table = QTableWidget()
        self.table.setColumnCount(len(SALAIRE_COLS))
        self.table.setHorizontalHeaderLabels(SALAIRE_COLS)
        layout.addWidget(self.table)

        self.btn_recalc.clicked.connect(self.recalculate_all)
        self.btn_save.clicked.connect(self.save_manual_inputs)
        self.btn_home.clicked.connect(self.go_home_callback)
        self.cmb_month.currentIndexChanged.connect(self.populate_rows)
        self.cmb_year.currentIndexChanged.connect(self.populate_rows)
        self.spin_days.valueChanged.connect(self.populate_rows)

        self.populate_rows()

    def _hours_from_presence(self, matricule: str, year: int, month: int) -> Dict[str, int]:
        fd = datetime.date(year, month, 1)
        nm = datetime.date(year + (month // 12), (month % 12) + 1, 1)
        days_in_month = (nm - fd).days
        res = {"presence": 0, "conge": 0, "ferie": 0, "nuit": 0, "formation": 0, "absence": 0}
        for d in range(1, days_in_month + 1):
            key = f"{matricule}_{year}_{month}_{d}"
            val = self.presence_data.get(key, "").lower()
            if val == "p":
                res["presence"] += 8
            elif val == "n":
                res["presence"] += 8
                res["nuit"] += 8
            elif val == "a":
                res["absence"] += 8
            elif val == "c":
                res["conge"] += 8
            elif val == "m":
                res["presence"] += 8
                res["ferie"] += 8
            elif val == "f":
                res["formation"] += 8
        return res

    def _key(self, matricule: str, year: int, month: int) -> str:
        return f"{matricule}_{year}_{month}"

    def populate_rows(self):
        year = self.cmb_year.currentData()
        month = self.cmb_month.currentData()
        jours_theoriques = self.spin_days.value()
        self.table.setRowCount(len(self.employes))

        for r, emp in enumerate(self.employes):
            m = emp.get("Matricule", "")
            nom = emp.get("Nom", "")
            prenom = emp.get("Prénom", "")
            comp = emp.get("Compagne", "")
            sal_base = parse_float(emp.get("Salaire de base", 0))
            solde_conge = parse_float(emp.get("Solde de congé", 0))
            droit_tr = calcul_droit_depuis_date(emp.get("Date d'embauche", ""))
            droit_ostie = calcul_droit_depuis_date(emp.get("Date d'embauche", ""))
            anciennete_ans = anciennete_ans_depuis_date(emp.get("Date d'embauche", ""))

            hrs = self._hours_from_presence(m, year, month)
            h_presence = hrs["presence"]
            h_conge = hrs["conge"]
            h_ferie = hrs["ferie"]
            h_nuit = hrs["nuit"]
            h_form = hrs["formation"]
            absences = hrs["absence"] // 8

            jours_corriges = max(0, jours_theoriques - absences)
            taux_h = sal_base / (jours_corriges * 8) if jours_corriges > 0 else 0.0

            key = self._key(m, year, month)
            manual = self.salaires_store.get(key, {})
            prime_prod = parse_float(manual.get("Prime de production", 0))
            prime_assid = parse_float(manual.get("Prime d’assiduité", 0))
            prime_anc = parse_float(manual.get("Prime d’ancienneté", 0))
            prime_elite = parse_float(manual.get("Prime élite", 0))
            prime_resp = parse_float(manual.get("Prime de responsabilité", 0))
            social = parse_float(manual.get("Social", 15000))
            avance = parse_float(manual.get("Avance sur salaire", 0))

            montant_trav = h_presence * taux_h
            maj_nuit = h_nuit * taux_h * 0.30
            maj_ferie = h_ferie * taux_h * 1.00
            indem_conge = h_conge * taux_h
            indem_form = h_form * 10000
            jours_presence_arr = int(round(h_presence / 8))
            indem_repas = jours_presence_arr * 2500 * (1 if droit_tr else 0)
            indem_transport = jours_presence_arr * 1200 * (1 if droit_tr else 0)

            brut = (
                montant_trav + maj_nuit + maj_ferie + indem_conge + indem_form +
                prime_prod + prime_assid + prime_anc + prime_elite + prime_resp +
                indem_repas + indem_transport
            )

            ostie = 0
            cnaps = 0
            if anciennete_ans >= 1 and droit_ostie:
                ostie = brut * 0.01
                cnaps = brut * 0.01

            base = max(0.0, brut)
            tranche1 = max(0.0, min(base, 350000))
            tranche2 = max(0.0, min(base, 400000) - 350000)
            tranche3 = max(0.0, min(base, 500000) - 400000)
            tranche4 = max(0.0, min(base, 600000) - 500000)
            tranche5 = max(0.0, base - 600000)

            rep1 = tranche1 * 0.00
            rep2 = tranche2 * 0.05
            rep3 = tranche3 * 0.10
            rep4 = tranche4 * 0.15
            rep5 = tranche5 * 0.20
            reptot = rep1 + rep2 + rep3 + rep4 + rep5
            if reptot == 0:
                reptot = 2000

            # Si matricule vide -> IGR = 0, sinon IGR = reptot * droit_ostie (droit_ostie venant de la date d'embauche)
            if not m:
                igr = 0
            else:
                igr = reptot * droit_ostie

            # On peut calculer le reste ici (mais tu peux aussi le recalculer ailleurs si tu préfères)
            reste = brut - (avance + ostie + cnaps + social + igr)


            values = [
                m, nom, prenom, comp,
                round(sal_base), round(taux_h), (solde_conge),
                int(h_presence), int(h_conge), int(h_ferie), int(h_nuit),
                round(montant_trav), round(maj_nuit), round(maj_ferie), round(indem_conge), round(indem_form),
                round(prime_prod), round(prime_assid), round(prime_anc), round(prime_elite), round(prime_resp),
                round(indem_repas), round(indem_transport), round(brut), round(avance), round(ostie), round(cnaps), round(social),
                round(igr), round(reste),
                round(tranche1), round(tranche2), round(tranche3), round(tranche4), round(tranche5),
                round(rep1), round(rep2), round(rep3), round(rep4), round(rep5), round(reptot)
            ]

            for c, val in enumerate(values):
                item = QTableWidgetItem(str(val))
                if SALAIRE_COLS[c] in MANUAL_COLS:
                    item.setFlags(item.flags() | Qt.ItemFlag.ItemIsEditable)
                else:
                    item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)
                if isinstance(val, (int, float)) or str(val).lstrip("-+").replace(".", "").isdigit():
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                self.table.setItem(r, c, item)

        self.table.resizeColumnsToContents()

    def recalculate_all(self):
        self.save_manual_inputs(temp_only=True)
        self.populate_rows()

    def save_manual_inputs(self, temp_only: bool = False):
        year = self.cmb_year.currentData()
        month = self.cmb_month.currentData()
        for r, emp in enumerate(self.employes):
            m = emp.get("Matricule", "")
            key = self._key(m, year, month)
            row_manual: Dict[str, Any] = self.salaires_store.get(key, {})
            for col_name in MANUAL_COLS:
                cidx = SALAIRE_COLS.index(col_name)
                item = self.table.item(r, cidx)
                if item:
                    row_manual[col_name] = parse_float(item.text(), 0)
            self.salaires_store[key] = row_manual
        if not temp_only:
            QMessageBox.information(self, "Sauvegarde", "Saisies manuelles enregistrées.")

# ---------------------- FICHE DE PAIE (utilise données) ----------------------
class PageFicheDePaie(QWidget):
    FICHE_ROWS = [
        "salaire de base",
        "Prime de responsabilité",
        "Prime assiduité",
        "prime d'ancienneté",
        "Prime production",
        "Avance sur salaire",
        "Prime Elité",
        "indemnité de congé",
        "Indemnité IRSA",
        "cnaps 1%",
        "ostie 1%",
        "IRSA 1ere tranche",
        "IRSA 2eme tranche",
        "IRSA 3eme tranche",
        "IRSA 4eme tranche",
        "IRSA 5eme tranche",
        "IRSA à payer",
        "Majoration de nuit",
        "Majoration férié",
        "Indemnité de rep",
        "Indemnité de trans",
        "Social",
        "B1",
        "S1",
        "Salaire net à payer"
    ]

    def __init__(self, go_home_callback, employes: List[Dict[str, str]], presence_data: Dict[str, str], salaires_store: Dict[str, Any]):
        super().__init__()
        self.employes = employes
        self.presence_data = presence_data
        self.salaires_store = salaires_store

        self.setWindowTitle("Fiche de paie")
        self.resize(1000, 700)

        layout = QVBoxLayout(self)

        title = QLabel("FICHE DE PAIE")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("font-size: 22px; font-weight: bold; color: #2E8B57;")
        layout.addWidget(title)

        # zone d'infos (Année au lieu de Campagne)
        self.inputs: Dict[str, QLineEdit] = {}
        grid = QGridLayout()
        labels = [
            "Nom", "Prénom", "Matricule", "Fonction",
            "Mode de paiement", "Mois", "Catégorie",
            "Congé disponible", "compagne", "Année", "Salaire de base"
        ]
        for i, label in enumerate(labels):
            lbl = QLabel(label + ":")
            edit = QLineEdit()
            self.inputs[label] = edit
            grid.addWidget(lbl, i // 2, (i % 2) * 2)
            grid.addWidget(edit, i // 2, (i % 2) * 2 + 1)
        layout.addLayout(grid)

        # Connexions pour auto-remplissage (sans changer l'UI)
        self.inputs["Matricule"].editingFinished.connect(self._auto_fill_from_employee)
        self.inputs["Mois"].editingFinished.connect(self._auto_compute_sheet)
        self.inputs["Année"].editingFinished.connect(self._auto_compute_sheet)
        # Pendant la saisie : si l'info devient valide -> calcule
        self.inputs["Matricule"].textChanged.connect(self._maybe_autofill)
        self.inputs["Mois"].textChanged.connect(self._maybe_autofill)
        self.inputs["Année"].textChanged.connect(self._maybe_autofill)

        # tableau
        self.table = QTableWidget()
        self.table.setColumnCount(8)
        self.table.setHorizontalHeaderLabels(
            ["DÉTAIL DES RUBRIQUES", "Présent", "Bases", "TAUX", "BRUT", "BASE", "Retenues", "Reste à payer"]
        )
        self.table.setRowCount(len(self.FICHE_ROWS))
        for i, lib in enumerate(self.FICHE_ROWS):
            item = QTableWidgetItem(lib)
            item.setFlags(Qt.ItemFlag.ItemIsEnabled)
            self.table.setItem(i, 0, item)
        layout.addWidget(self.table)

        # boutons
        btns = QHBoxLayout()
        btn_export = QPushButton("Exporter en PDF")
        btn_home = QPushButton("Retour à l’accueil")
        btn_export.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold; padding: 10px;")
        btn_home.setStyleSheet("background-color: #b71c1c; color: white; font-weight: bold; padding: 10px;")
        btn_export.clicked.connect(self.export_pdf)
        btn_home.clicked.connect(go_home_callback)
        btns.addWidget(btn_export)
        btns.addWidget(btn_home)
        layout.addLayout(btns)

    # ---------- LOGIQUE (réutilise les calculs de PageSalaire) ----------
    def _hours_from_presence(self, matricule: str, year: int, month: int) -> Dict[str, int]:
        fd = datetime.date(year, month, 1)
        nm = datetime.date(year + (month // 12), (month % 12) + 1, 1)
        days_in_month = (nm - fd).days
        res = {"presence": 0, "conge": 0, "ferie": 0, "nuit": 0, "formation": 0, "absence": 0}
        for d in range(1, days_in_month + 1):
            key = f"{matricule}_{year}_{month}_{d}"
            val = self.presence_data.get(key, "").lower()
            if val == "p":
                res["presence"] += 8
            elif val == "n":
                res["presence"] += 8
                res["nuit"] += 8
            elif val == "a":
                res["absence"] += 8
            elif val == "c":
                res["conge"] += 8
            elif val == "m":
                res["presence"] += 8
                res["ferie"] += 8
            elif val == "f":
                res["formation"] += 8
        return res

    def _key(self, matricule: str, year: int, month: int) -> str:
        return f"{matricule}_{year}_{month}"

    def _find_employee(self, matricule: str) -> Dict[str, str] | None:
        for emp in self.employes:
            if emp.get("Matricule") == matricule:
                return emp
        return None

    def _maybe_autofill(self):
        try:
            # Si les 3 sont plausibles -> auto
            m = self.inputs["Matricule"].text().strip()
            mois = parse_month(self.inputs["Mois"].text())
            an = parse_int(self.inputs["Année"].text(), 0)
            if m and 1 <= mois <= 12 and an > 0:
                self._auto_fill_from_employee()
                self._auto_compute_sheet()
        except Exception as e:
            # Affiche l'erreur à l'utilisateur au lieu de laisser l'application planter
            QMessageBox.critical(self, "Erreur auto-remplissage", f"Une erreur est survenue dans _maybe_autofill:\n{e}")
            return

    def _auto_fill_from_employee(self):
        matricule = self.inputs["Matricule"].text().strip()
        if not matricule:
            return
        emp = self._find_employee(matricule)
        if not emp:
            return
        # Remplit les champs d'en-tête depuis l'employé si vides ou différents
        self.inputs["Nom"].setText(emp.get("Nom", ""))
        self.inputs["Prénom"].setText(emp.get("Prénom", ""))
        self.inputs["Fonction"].setText(emp.get("Fonction", ""))
        self.inputs["Mode de paiement"].setText(emp.get("Mode de paiement", ""))
        self.inputs["Catégorie"].setText(emp.get("Catégorie", ""))
        self.inputs["Congé disponible"].setText(emp.get("Solde de congé", ""))
        self.inputs["compagne"].setText(emp.get("Compagne", ""))
        self.inputs["Salaire de base"].setText(emp.get("Salaire de base", ""))

        # Si l'utilisateur n'a pas encore mis le mois/année, on met par défaut mois/année courants
        if not self.inputs["Mois"].text().strip():
            self.inputs["Mois"].setText(str(datetime.date.today().month))
        if not self.inputs["Année"].text().strip():
            self.inputs["Année"].setText(str(datetime.date.today().year))

    def _auto_compute_sheet(self):
        try:
            matricule = self.inputs["Matricule"].text().strip()
            mois = parse_month(self.inputs["Mois"].text())
            annee = parse_int(self.inputs["Année"].text(), 0)
            if not matricule or not (1 <= mois <= 12) or annee <= 0:
                return

            emp = self._find_employee(matricule)
            if not emp:
                QMessageBox.warning(self, "Fiche de paie", "Employé introuvable.")
                return

            # --- Données employé ---
            sal_base = parse_float(emp.get("Salaire de base", 0))
            droit_tr = calcul_droit_depuis_date(emp.get("Date d'embauche", ""))
            droit_ostie = calcul_droit_depuis_date(emp.get("Date d'embauche", ""))
            anciennete_ans = anciennete_ans_depuis_date(emp.get("Date d'embauche", ""))

            # --- Heures depuis présences ---
            hrs = self._hours_from_presence(matricule, annee, mois)
            h_presence = hrs["presence"]                     # heures totales présentes
            h_conge = hrs["conge"]
            h_ferie = hrs["ferie"]
            h_nuit = hrs["nuit"]
            h_form = hrs["formation"]
            absences = hrs["absence"] // 8

            # Jours théoriques = 22 par défaut
            jours_theoriques = 22
            jours_corriges = max(0, jours_theoriques - absences)
            taux_h = sal_base / (jours_corriges * 8) if jours_corriges > 0 else 0.0

            # --- Saisies manuelles ---
            key = self._key(matricule, annee, mois)
            manual = self.salaires_store.get(key, {})
            prime_prod = parse_float(manual.get("Prime de production", 0))
            prime_assid = parse_float(manual.get("Prime d’assiduité", 0))
            prime_anc = parse_float(manual.get("Prime d’ancienneté", 0))
            prime_elite = parse_float(manual.get("Prime élite", 0))
            prime_resp = parse_float(manual.get("Prime de responsabilité", 0))
            social = parse_float(manual.get("Social", 15000))
            avance = parse_float(manual.get("Avance sur salaire", 0))

            # --- Calculs ---
            montant_trav = h_presence * taux_h
            # taux de majoration (valeur par heure) 
            taux_maj_nuit = taux_h * 0.30
            taux_maj_ferie = taux_h * 1.00
            # montant des majorations
            maj_nuit_amount = h_nuit * taux_maj_nuit
            maj_ferie_amount = h_ferie * taux_maj_ferie
            indem_conge = h_conge * taux_h
            jours_presence_arr = int(round(h_presence / 8)) if h_presence > 0 else 0
            indem_repas = jours_presence_arr * 2500 if droit_tr else 0
            indem_transport = jours_presence_arr * 1200 if droit_tr else 0

            brut = (
                montant_trav + maj_nuit_amount + maj_ferie_amount + indem_conge +
                prime_prod + prime_assid + prime_anc + prime_elite + prime_resp +
                indem_repas + indem_transport
            )

            ostie = cnaps = 0
            if anciennete_ans >= 1 and droit_ostie:
                ostie = brut * 0.01
                cnaps = brut * 0.01

            # --- IRSA ---
            base = max(0.0, brut)
            tranche1 = max(0.0, min(base, 350000))
            tranche2 = max(0.0, min(base, 400000) - 350000)
            tranche3 = max(0.0, min(base, 500000) - 400000)
            tranche4 = max(0.0, min(base, 600000) - 500000)
            tranche5 = max(0.0, base - 600000)
            rep1 = tranche1 * 0.00
            rep2 = tranche2 * 0.05
            rep3 = tranche3 * 0.10
            rep4 = tranche4 * 0.15
            rep5 = tranche5 * 0.20
            reptot = rep1 + rep2 + rep3 + rep4 + rep5
            if reptot == 0:
                reptot = 2000

            # IGR = reptot * droit_ostie (droit_ostie vaut 1 ou 0)
            igr = reptot * droit_ostie

            # --- Fonction utilitaire pour remplir une ligne ---
            def set_row(row_index, present="", bases="", taux="", brut_amount="", retenue_amount=""):
                def setcol(c, val):
                    self.table.setItem(row_index, c, QTableWidgetItem("" if val in ("", None) else str(val)))
                setcol(1, present)
                setcol(2, bases)
                setcol(3, taux)
                setcol(4, brut_amount)
                setcol(5, bases)   # colonne "BASE" laissée pour cohérence
                setcol(6, retenue_amount)

            # --- Remplissage ---
            total_brut = 0.0
            total_retenues = 0.0

            for i, lib in enumerate(self.FICHE_ROWS):
                if lib == "salaire de base":
                    set_row(i, present=int(h_presence), bases="", taux=round(taux_h), brut_amount=round(montant_trav))
                    total_brut += montant_trav

                elif lib in ["Prime de responsabilité", "Prime assiduité", "prime d'ancienneté", "Prime production", "Prime Elité"]:
                    val = {
                        "Prime de responsabilité": prime_resp,
                        "Prime assiduité": prime_assid,
                        "prime d'ancienneté": prime_anc,
                        "Prime production": prime_prod,
                        "Prime Elité": prime_elite,
                    }[lib]
                    set_row(i, brut_amount=round(val))
                    total_brut += val

                elif lib == "Majoration de nuit":
                    set_row(i, present=int(h_nuit), bases="30%", taux=int(round(taux_maj_nuit)), brut_amount=round(maj_nuit_amount))
                    total_brut += maj_nuit_amount

                elif lib == "Majoration férié":
                    set_row(i, present=int(h_ferie), bases="100%", taux=int(round(taux_maj_ferie)), brut_amount=round(maj_ferie_amount))
                    total_brut += maj_ferie_amount

                elif lib == "indemnité de congé":
                    set_row(i, present=int(h_conge), taux=round(taux_h), brut_amount=round(indem_conge))
                    total_brut += indem_conge

                elif lib == "Indemnité IRSA":
                    set_row(i, brut_amount=round(igr))
                    total_brut += igr

                elif lib == "Indemnité de rep":
                    set_row(i, present=jours_presence_arr, taux=2500, brut_amount=round(indem_repas))
                    total_brut += indem_repas

                elif lib == "Indemnité de trans":
                    set_row(i, present=jours_presence_arr, taux=1200, brut_amount=round(indem_transport))
                    total_brut += indem_transport

                elif lib == "Social":
                    set_row(i, retenue_amount=round(social))
                    total_retenues += social

                elif lib == "cnaps 1%":
                    set_row(i, retenue_amount=round(cnaps))
                    total_retenues += cnaps

                elif lib == "ostie 1%":
                    set_row(i, retenue_amount=round(ostie))
                    total_retenues += ostie

                elif lib in ["IRSA 1ere tranche", "IRSA 2eme tranche", "IRSA 3eme tranche", "IRSA 4eme tranche", "IRSA 5eme tranche"]:
                    taux_map = {
                        "IRSA 1ere tranche": "0%",
                        "IRSA 2eme tranche": "5%",
                        "IRSA 3eme tranche": "10%",
                        "IRSA 4eme tranche": "15%",
                        "IRSA 5eme tranche": "20%",
                    }
                    base_map = {
                        "IRSA 1ere tranche": tranche1,
                        "IRSA 2eme tranche": tranche2,
                        "IRSA 3eme tranche": tranche3,
                        "IRSA 4eme tranche": tranche4,
                        "IRSA 5eme tranche": tranche5,
                    }
                    val_map = {
                        "IRSA 1ere tranche": rep1,
                        "IRSA 2eme tranche": rep2,
                        "IRSA 3eme tranche": rep3,
                        "IRSA 4eme tranche": rep4,
                        "IRSA 5eme tranche": rep5,
                    }
                    set_row(i, bases=round(base_map[lib]), taux=taux_map[lib], retenue_amount=round(val_map[lib]))
                    # ⚠️ ces valeurs ne s'ajoutent pas à total_retenues directement

                elif lib == "IRSA à payer":
                    set_row(i, retenue_amount=round(igr))
                    total_retenues += igr

                elif lib == "Avance sur salaire":
                    set_row(i, retenue_amount=round(avance))
                    total_retenues += avance

                elif lib == "B1":
                    set_row(i, brut_amount=int(round(total_brut)))

                elif lib == "S1":
                    set_row(i, retenue_amount=int(round(total_retenues)))


            # --- Calcul du Net après la boucle ---
            net = total_brut - total_retenues
            net_text = f"{int(round(net)):,}".replace(",", " ") + " Ar"
            i_net = self.FICHE_ROWS.index("Salaire net à payer")
            self.table.setItem(i_net, 7, QTableWidgetItem(net_text))

            self.table.resizeColumnsToContents()

        except Exception as e:
            QMessageBox.critical(self, "Erreur Fiche de Paie", f"Une erreur est survenue : {e}")
            return

    # ---------- EXPORT PDF ----------
    def export_pdf(self):
        # ouvrir la fenêtre de sélection
        dlg = FenetreSelectionEmployes(self.employes, self)
        if dlg.exec() != QDialog.DialogCode.Accepted:
            return

        selection = dlg.get_selection()
        if not selection:
            QMessageBox.warning(self, "Export PDF", "Aucun employé sélectionné.")
            return

        # choisir l’endroit où enregistrer
        path, _ = QFileDialog.getSaveFileName(
            self, "Enregistrer le PDF", "", "PDF Files (*.pdf)"
        )
        if not path:
            return

        styles = getSampleStyleSheet()
        style_title = styles["Heading1"]
        style_title.alignment = 1
        style_title.fontSize = 18
        style_info = styles["Normal"]
        style_info.fontSize = 10

        # --- IMPORTANT : recréer la liste elements à chaque export ---
        elements = []

        try:
            for idx, matricule in enumerate(selection):
                emp = self._find_employee(matricule)
                if not emp:
                    continue

                # remplir les champs avec les données employé
                self.inputs["Matricule"].setText(emp.get("Matricule", ""))
                self.inputs["Nom"].setText(emp.get("Nom", ""))
                self.inputs["Prénom"].setText(emp.get("Prénom", ""))
                self.inputs["Fonction"].setText(emp.get("Fonction", ""))
                self.inputs["Mode de paiement"].setText(emp.get("Mode de paiement", ""))
                self.inputs["Catégorie"].setText(emp.get("Catégorie", ""))
                self.inputs["Congé disponible"].setText(emp.get("Solde de congé", ""))
                self.inputs["compagne"].setText(emp.get("Compagne", ""))
                self.inputs["Salaire de base"].setText(emp.get("Salaire de base", ""))

                # recalcul automatique
                self._auto_compute_sheet()

                # ---- En-tête ----
                elements.append(Paragraph("COLARYS CONCEPT", style_title))
                elements.append(Spacer(1, 20))

                left_labels = ["Nom", "Prénom", "Matricule", "Fonction", "Mode de paiement", "Salaire de base"]
                right_labels = ["Mois", "Catégorie", "Congé disponible", "compagne", "Année"]

                data_info = []
                data_info = []
                max_len = max(len(left_labels), len(right_labels))
                for i in range(max_len):
                    left_text = ""
                    right_text = ""

                    if i < len(left_labels):
                        lbl = left_labels[i]
                        if lbl in self.inputs:
                            left_text = f"<b>{lbl}:</b> {self.inputs[lbl].text()}"

                    if i < len(right_labels):
                        lbl = right_labels[i]
                        if lbl in self.inputs:
                            right_text = f"<b>{lbl}:</b> {self.inputs[lbl].text()}"

                    data_info.append([Paragraph(left_text, style_info), Paragraph(right_text, style_info)])

                info_table = RLTable(data_info, colWidths=[200, 200])
                info_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(info_table)
                elements.append(Spacer(1, 15))

                # ---- Tableau principal ----
                data = []
                headers = [self.table.horizontalHeaderItem(col).text() for col in range(self.table.columnCount())]
                data.append(headers)

                for row in range(self.table.rowCount()):
                    row_data = []
                    for col in range(self.table.columnCount()):
                        item = self.table.item(row, col)
                        row_data.append(item.text() if item else "")
                    data.append(row_data)

                table = RLTable(data, repeatRows=1)
                style = TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ])
                table.setStyle(style)
                elements.append(table)
                elements.append(Spacer(1, 15))

                # ---- Signatures ----
                nom_salarie = f"{emp.get('Nom', '')} {emp.get('Prénom', '')}".strip()
                footer_data = [
                    ["EMPLOYEUR", "SALARIÉ"],
                    ["", ""],
                    ["COLLARD Mialy Rinah", nom_salarie if nom_salarie else "Nom Prénom"]
                ]
                footer = RLTable(footer_data, colWidths=[200, 200])
                footer.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 1), (-1, 2), 20),
                ]))
                elements.append(footer)

                # saut de page entre employés
                if idx < len(selection) - 1:
                    elements.append(PageBreak())

            # --- Génération du PDF ---
            pdf = SimpleDocTemplate(
                path, pagesize=A4,
                leftMargin=25, rightMargin=25,
                topMargin=25, bottomMargin=25
            )
            pdf.build(elements)

            QMessageBox.information(self, "Export PDF", f"Fiche(s) exportée(s) avec succès dans :\n{path}")

        except Exception as e:
            QMessageBox.critical(self, "Erreur Export PDF", f"Une erreur est survenue :\n{e}")

from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QLabel, QListWidget, QListWidgetItem,
    QPushButton, QHBoxLayout, QCheckBox, QMessageBox
)
from PyQt6.QtCore import Qt


class FenetreSelectionEmployes(QDialog):
    """
    Fenêtre de sélection des employés pour l'export PDF.
    Affiche Nom Prénom : Matricule avec cases à cocher,
    plus boutons Tout sélectionner / Tout désélectionner.
    """

    def __init__(self, employes: list[dict[str, str]], parent=None):
        super().__init__(parent)
        self.setWindowTitle("Sélection des employés")
        self.resize(400, 500)

        self.employes = employes
        self.selection: list[str] = []

        layout = QVBoxLayout(self)

        # titre
        label = QLabel("Veuillez sélectionner les employés à imprimer :")
        layout.addWidget(label)

        # liste avec cases à cocher
        self.liste = QListWidget()
        for emp in self.employes:
            nom = emp.get("Nom", "")
            prenom = emp.get("Prénom", "")
            matricule = emp.get("Matricule", "")
            texte = f"{nom} {prenom} : {matricule}"
            item = QListWidgetItem(texte)
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(Qt.CheckState.Unchecked)
            self.liste.addItem(item)
        layout.addWidget(self.liste)

        # boutons tout sélectionner / tout désélectionner
        btns_sel = QHBoxLayout()
        btn_tout = QPushButton("Tout sélectionner")
        btn_aucun = QPushButton("Tout désélectionner")
        btn_tout.clicked.connect(self.select_all)
        btn_aucun.clicked.connect(self.deselect_all)
        btns_sel.addWidget(btn_tout)
        btns_sel.addWidget(btn_aucun)
        layout.addLayout(btns_sel)

        # boutons valider / annuler
        btns = QHBoxLayout()
        btn_ok = QPushButton("Valider")
        btn_cancel = QPushButton("Annuler")
        btn_ok.clicked.connect(self.accept)
        btn_cancel.clicked.connect(self.reject)
        btns.addWidget(btn_ok)
        btns.addWidget(btn_cancel)
        layout.addLayout(btns)

    def select_all(self):
        for i in range(self.liste.count()):
            self.liste.item(i).setCheckState(Qt.CheckState.Checked)

    def deselect_all(self):
        for i in range(self.liste.count()):
            self.liste.item(i).setCheckState(Qt.CheckState.Unchecked)

    def get_selection(self) -> list[str]:
        """Retourne la liste des matricules sélectionnés."""
        res = []
        for i in range(self.liste.count()):
            item = self.liste.item(i)
            if item.checkState() == Qt.CheckState.Checked:
                # on récupère juste le matricule (après les ":")
                texte = item.text()
                if ":" in texte:
                    matricule = texte.split(":")[-1].strip()
                    res.append(matricule)
        return res

# ---------------------- ACCUEIL ----------------------
class PageAccueil(QWidget):
    def __init__(self, go_emp_callback, go_presence_callback, go_salaire_callback, go_fiche_callback):
        super().__init__()
        self.go_emp_callback = go_emp_callback
        self.go_presence_callback = go_presence_callback
        self.go_salaire_callback = go_salaire_callback
        self.go_fiche_callback = go_fiche_callback
        self.init_ui()
        self.set_background()
        self.start_datetime_update()

    def init_ui(self):
        layout = QVBoxLayout(self)

        self.label = QLabel("BIENVENUE CHEZ COLARYS CONCEPT")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setStyleSheet(
            """
            color: #2E8B57;
            font-size: 32px;
            font-weight: bold;
            font-family: 'Segoe UI';
            padding: 20px;
            background-color: #E0FFE0;
            border: 2px solid #2E8B57;
            border-radius: 10px;
            """
        )
        layout.addWidget(self.label)

        self.datetime_label = QLabel("")
        self.datetime_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.datetime_label.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 20px;")
        layout.addWidget(self.datetime_label)

        btn_emp = QPushButton("EMPLOYES")
        btn_presence = QPushButton("PRÉSENCE")
        btn_salaire = QPushButton("SALAIRE")
        btn_fiche = QPushButton("FICHE DE PAIE")

        btn_emp.setStyleSheet("QPushButton { background-color: #4CAF50; color: white; font-weight: bold; border-radius: 12px; padding: 15px; font-size: 18px; } QPushButton:hover { background-color: #45a049; }")
        btn_presence.setStyleSheet("QPushButton { background-color: #2196F3; color: white; font-weight: bold; border-radius: 12px; padding: 15px; font-size: 18px; } QPushButton:hover { background-color: #0b7dda; }")
        btn_salaire.setStyleSheet("QPushButton { background-color: #ff9800; color: white; font-weight: bold; border-radius: 12px; padding: 15px; font-size: 18px; } QPushButton:hover { background-color: #fb8c00; }")
        btn_fiche.setStyleSheet("QPushButton { background-color: #9C27B0; color: white; font-weight: bold; border-radius: 12px; padding: 15px; font-size: 18px; } QPushButton:hover { background-color: #7B1FA2; }")

        btn_emp.clicked.connect(self.go_emp_callback)
        btn_presence.clicked.connect(self.go_presence_callback)
        btn_salaire.clicked.connect(self.go_salaire_callback)
        btn_fiche.clicked.connect(self.go_fiche_callback)

        layout.addWidget(btn_emp)
        layout.addWidget(btn_presence)
        layout.addWidget(btn_salaire)
        layout.addWidget(btn_fiche)

    def set_background(self):
        self.setStyleSheet(
            """
            QWidget {
                background-image: url('go.jpg');
                background-repeat: no-repeat;
                background-position: center;
                background-size: cover;
            }
            """
        )

    def start_datetime_update(self):
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_datetime)
        self.timer.start(1000)
        self.update_datetime()

    def update_datetime(self):
        dt = QDateTime.currentDateTime()
        locale = QLocale(QLocale.Language.French, QLocale.Country.France)

        jour_sem = locale.dayName(dt.date().dayOfWeek())
        jour = dt.toString("dd")
        mois = locale.monthName(dt.date().month())
        annee = dt.toString("yyyy")
        heure = dt.toString("HH")
        minute = dt.toString("mm")
        seconde = dt.toString("ss")

        texte = f"{jour_sem} {jour} {mois} {annee} / {heure}h {minute}min {seconde}s"
        self.datetime_label.setText(texte)

# ---------------------- MAIN ----------------------
class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.employes: List[Dict[str, str]] = self.load_data(EMPLOYES_FILE, default=[])
        self.update_conges_automatique()
        
        # Vérification augmentation mensuelle automatique
        meta_file = "conges_meta.json"
        today = datetime.date.today()
        last_month = 0
        last_year = 0

        if os.path.exists(meta_file):
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    last_month = meta.get("last_month", 0)
                    last_year = meta.get("last_year", 0)
            except Exception:
                pass

        if last_year != today.year or last_month != today.month:
            for emp in self.employes:
                old_solde = parse_float(emp.get("Solde de congé", 0))
                emp["Solde de congé"] = str(old_solde + 2.5)
            try:
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump({"last_month": today.month, "last_year": today.year}, f)
            except Exception:
                pass



        self.presences: Dict[str, str] = self.load_data(PRESENCES_FILE, default={})
        self.salaires: Dict[str, Any] = self.load_data(SALAIRES_FILE, default={})

        self.stack = QStackedWidget()
        self.page_accueil = PageAccueil(
            go_emp_callback=lambda: self.stack.setCurrentWidget(self.page_emp),
            go_presence_callback=lambda: self.stack.setCurrentWidget(self.page_presence),
            go_salaire_callback=lambda: self.stack.setCurrentWidget(self.page_salaire),
            go_fiche_callback=lambda: self.stack.setCurrentWidget(self.page_fiche)
        )
        self.page_emp = PageEMP(self.go_home, self.employes)
        self.page_presence = PagePresence(self.go_home, self.employes, self.presences)
        self.page_salaire = PageSalaire(self.go_home, self.employes, self.presences, self.salaires)
        self.page_fiche = PageFicheDePaie(self.go_home, self.employes, self.presences, self.salaires)

        self.stack.addWidget(self.page_accueil)
        self.stack.addWidget(self.page_emp)
        self.stack.addWidget(self.page_presence)
        self.stack.addWidget(self.page_salaire)
        self.stack.addWidget(self.page_fiche)

        main_layout = QVBoxLayout(self)
        main_layout.addWidget(self.stack)

        self.setWindowTitle("Gestion Employés, Présences & Salaires")
        self.resize(1200, 800)

        self.auto_save_timer = QTimer(self)
        self.auto_save_timer.timeout.connect(self.auto_save)
        self.auto_save_timer.start(2 * 60 * 1000)
        
    def update_conges_automatique(self):
        """Met à jour le solde de congé pour chaque employé selon les mois écoulés depuis last_update."""
        today = datetime.date.today()
        for emp in self.employes:
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


    def load_data(self, filename: str, default: Union[List[Any], Dict[str, Any]]):
        if os.path.exists(filename):
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(default, list) and isinstance(data, list):
                        return data
                    if isinstance(default, dict) and isinstance(data, dict):
                        return data
            except (json.JSONDecodeError, OSError):
                pass
        try:
            os.makedirs(os.path.dirname(filename) or ".", exist_ok=True)
        except Exception:
            pass
        return default

    def save_data(self, filename: str, data: Union[List[Any], Dict[str, Any]]):
        try:
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except OSError as e:
            QMessageBox.critical(self, "Erreur de sauvegarde", f"Impossible d'écrire {filename}: {e}")

    def go_home(self):
        if hasattr(self, "page_salaire"):
            self.page_salaire.save_manual_inputs(temp_only=True)
        self.stack.setCurrentWidget(self.page_accueil)

    def closeEvent(self, event):
        self.save_data(EMPLOYES_FILE, self.employes)
        self.save_data(PRESENCES_FILE, self.presences)
        self.save_data(SALAIRES_FILE, self.salaires)
        event.accept()

    def auto_save(self):
        self.save_data(EMPLOYES_FILE, self.employes)
        self.save_data(PRESENCES_FILE, self.presences)
        self.save_data(SALAIRES_FILE, self.salaires)
        print("Sauvegarde automatique effectuée.")

    

    

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
    input("Appuyez sur Entrée pour fermer...")

