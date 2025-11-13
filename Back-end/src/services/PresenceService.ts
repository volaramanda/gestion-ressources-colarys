// backend/src/services/PresenceService.ts
import { Repository, Between, Like } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Presence } from '../entities/Presence';
import { DetailPresence } from '../entities/DetailPresence';
import { Agent } from '../entities/Agent';
import { v4 as uuidv4 } from 'uuid';

interface HistoriqueFilters {
  dateDebut?: string;
  dateFin?: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  annee?: string;
  mois?: string;
  campagne?: string;
  shift?: string;
}

export class PresenceService {
  private presenceRepository: Repository<Presence>;
  private agentRepository: Repository<Agent>;
  private detailPresenceRepository: Repository<DetailPresence>;

  constructor() {
    this.presenceRepository = AppDataSource.getRepository(Presence);
    this.agentRepository = AppDataSource.getRepository(Agent);
    this.detailPresenceRepository = AppDataSource.getRepository(DetailPresence);
  }

  // Les autres méthodes restent inchangées...
  async pointageEntree(data: {
    matricule?: string;
    nom: string;
    prenom: string;
    campagne: string;
    shift: string;
    signatureEntree: string;
    heureEntreeManuelle?: string;
  }) {
    console.log('pointageEntree dans PresenceService:', data);

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validation des champs obligatoires
      if (!data.nom || !data.prenom) {
        throw new Error("Le nom et le prénom sont obligatoires");
      }

      let agent: Agent;
      let matriculeValue = data.matricule?.trim() || '';

      // Gestion de l'agent
      if (matriculeValue) {
        // Recherche d'un agent existant
        const existingAgent = await queryRunner.manager.findOne(Agent, {
          where: { matricule: matriculeValue }
        });

        if (existingAgent) {
          agent = existingAgent;
          console.log('Agent existant trouvé:', agent);
        } else {
          // Création d'un nouvel agent avec matricule
          agent = new Agent();
          agent.matricule = matriculeValue;
          agent.nom = data.nom;
          agent.prenom = data.prenom;
          agent.campagne = data.campagne || "Standard";
          agent.dateCreation = new Date();

          agent = await queryRunner.manager.save(agent);
          console.log('Nouvel agent créé avec matricule:', agent);
        }
      } else {
        // Création d'un nouvel agent sans matricule
        const generatedMatricule = `AG-${uuidv4().slice(0, 8).toUpperCase()}`;
        console.log('Matricule généré:', generatedMatricule);

        agent = new Agent();
        agent.matricule = generatedMatricule;
        agent.nom = data.nom;
        agent.prenom = data.prenom;
        agent.campagne = data.campagne || "Standard";
        agent.dateCreation = new Date();

        agent = await queryRunner.manager.save(agent);
        console.log('Nouvel agent créé sans matricule fourni:', agent);
      }

      // Vérification de présence existante
      const today = new Date().toISOString().split('T')[0];
      const existingPresence = await queryRunner.manager.findOne(Presence, {
        where: {
          agent: { id: agent.id },
          date: today,
        },
        relations: ['details'],
      });

      // CORRECTION : Permettre le pointage seulement si aucune présence n'existe OU si la présence existe mais a déjà une sortie
      if (existingPresence) {
        if (!existingPresence.heureSortie) {
          // Une présence existe déjà sans heure de sortie - l'agent ne peut pas pointer une nouvelle entrée
          throw new Error("Une présence pour aujourd'hui existe déjà. Veuillez pointer la sortie d'abord.");
        } else {
          // L'agent a déjà une présence complète (entrée + sortie) aujourd'hui
          throw new Error("Vous avez déjà pointé l'entrée et la sortie aujourd'hui.");
        }
      }

      // Calcul de l'heure d'entrée
      const heureEntree = data.heureEntreeManuelle || new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Création de la présence
      const presence = new Presence();
      presence.agent = agent;
      presence.date = today;
      presence.heureEntree = heureEntree;
      presence.shift = data.shift || "JOUR";
      presence.createdAt = new Date();

      // Création des détails
      const details = new DetailPresence();
      details.signatureEntree = data.signatureEntree;
      details.presence = presence;

      // Sauvegarde dans l'ordre correct
      const savedPresence = await queryRunner.manager.save(presence);
      details.presence = savedPresence;
      await queryRunner.manager.save(details);

      await queryRunner.commitTransaction();

      // Récupération complète de la présence créée
      const completePresence = await this.presenceRepository.findOne({
        where: { id: savedPresence.id },
        relations: ['agent', 'details'],
      });

      return { presence: completePresence };

    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      console.error('Erreur lors du pointage d\'entrée:', error);

      let errorMessage = 'Erreur inconnue lors du pointage d\'entrée';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      throw new Error(errorMessage);
    } finally {
      await queryRunner.release();
    }
  }

  async pointageSortie(matricule: string, signatureSortie: string, heureSortieManuelle?: string) {
    console.log('pointageSortie dans PresenceService:', { matricule, signatureSortie, heureSortieManuelle });

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const today = new Date().toISOString().split('T')[0];
      const presence = await queryRunner.manager.findOne(Presence, {
        where: {
          agent: { matricule },
          date: today
        },
        relations: ['agent', 'details'],
      });

      if (!presence) {
        throw new Error("Aucune présence trouvée pour aujourd'hui");
      }

      if (presence.heureSortie) {
        throw new Error("Pointage de sortie déjà effectué");
      }

      // Calcul de l'heure de sortie
      const heureSortie = heureSortieManuelle
        ? this.validerFormatHeure(heureSortieManuelle)
        : new Date().toTimeString().split(' ')[0];

      // Mise à jour de la présence
      presence.heureSortie = heureSortie;
      presence.heuresTravaillees = this.calculerHeuresTravaillees(presence.heureEntree, heureSortie);

      // Mise à jour des détails
      if (presence.details) {
        presence.details.signatureSortie = signatureSortie;
        await queryRunner.manager.save(DetailPresence, presence.details);
      } else {
        const detailPresence = new DetailPresence();
        detailPresence.signatureSortie = signatureSortie;
        detailPresence.presence = presence;
        await queryRunner.manager.save(detailPresence);
        presence.details = detailPresence;
      }

      // Sauvegarde finale
      await queryRunner.manager.save(Presence, presence);
      await queryRunner.commitTransaction();

      // Récupération complète
      const completePresence = await this.presenceRepository.findOne({
        where: { id: presence.id },
        relations: ['agent', 'details'],
      });

      return { success: true, presence: completePresence };

    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      console.error('Erreur dans pointageSortie:', error);

      let errorMessage = 'Erreur inconnue lors du pointage de sortie';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      throw new Error(errorMessage);
    } finally {
      await queryRunner.release();
    }
  }

  private validerFormatHeure(heure: string): string {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regex.test(heure)) {
      throw new Error('Format d\'heure invalide. Utilisez HH:MM');
    }
    return heure + ':00';
  }

  private calculerHeuresTravaillees(heureEntree: string, heureSortie: string): number {
    const [heuresEntree, minutesEntree] = heureEntree.split(':').map(Number);
    const [heuresSortie, minutesSortie] = heureSortie.split(':').map(Number);

    const entree = new Date();
    entree.setHours(heuresEntree, minutesEntree, 0);

    const sortie = new Date();
    sortie.setHours(heuresSortie, minutesSortie, 0);

    if (sortie < entree) {
      sortie.setDate(sortie.getDate() + 1);
    }

    const diffMs = sortie.getTime() - entree.getTime();
    return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  }


  async getPresenceAujourdhuiByMatricule(matricule: string) {
    console.log('getPresenceAujourdhuiByMatricule dans PresenceService:', matricule);

    try {
      const today = new Date().toISOString().split('T')[0];
      const presence = await this.presenceRepository.findOne({
        where: {
          agent: { matricule },
          date: today
        },
        relations: ['agent', 'details'],
      });

      return { success: true, data: presence };
    } catch (error: unknown) {
      console.error('Erreur dans getPresenceAujourdhuiByMatricule:', error);

      let errorMessage = 'Erreur inconnue lors de la recherche de présence';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return { success: false, error: errorMessage };
    }
  }

  // Dans PresenceService.ts
  async getPresenceAujourdhuiByNomPrenom(nom: string, prenom: string) {
    console.log('getPresenceAujourdhuiByNomPrenom dans PresenceService:', { nom, prenom });

    try {
      const today = new Date().toISOString().split('T')[0];

      const presence = await this.presenceRepository.findOne({
        where: {
          agent: { nom, prenom },
          date: today
        },
        relations: ['agent', 'details'],
      });

      return { success: true, data: presence };
    } catch (error: unknown) {
      // CORRECTION : Gestion appropriée du type unknown
      console.error('Erreur dans getPresenceAujourdhuiByNomPrenom:', error);

      let errorMessage = 'Erreur inconnue lors de la recherche de présence';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return { success: false, error: errorMessage };
    }
  }

  // CORRECTION : Déplacer getLastDayOfMonth avant son utilisation
  private getLastDayOfMonth(annee: string, mois?: string): string {
    const year = parseInt(annee);
    const month = mois ? parseInt(mois) : 12;
    const lastDay = new Date(year, month, 0).getDate();
    return `${annee}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  }

  async getHistoriquePresences(filters: HistoriqueFilters): Promise<{ data: Presence[]; totalHeures: number; totalPresences: number }> {
    console.log('getHistoriquePresences avec filtres:', filters);

    try {
      const queryBuilder = this.presenceRepository.createQueryBuilder('presence')
        .leftJoinAndSelect('presence.agent', 'agent')
        .leftJoinAndSelect('presence.details', 'details');

      // Construction de la condition WHERE
      const whereConditions: any[] = [];
      const parameters: any = {};

      // Filtre par période (dateDebut/dateFin OU année/mois)
      if (filters.dateDebut && filters.dateFin) {
        whereConditions.push('presence.date BETWEEN :dateDebut AND :dateFin');
        parameters.dateDebut = filters.dateDebut;
        parameters.dateFin = filters.dateFin;
      } else if (filters.annee) {
        const startDate = `${filters.annee}-${filters.mois || '01'}-01`;
        const endDate = this.getLastDayOfMonth(filters.annee, filters.mois);
        whereConditions.push('presence.date BETWEEN :startDate AND :endDate');
        parameters.startDate = startDate;
        parameters.endDate = endDate;
      } else {
        throw new Error('Période non spécifiée');
      }

      // CORRECTION : Recherche par matricule
      if (filters.matricule) {
        whereConditions.push('agent.matricule = :matricule');
        parameters.matricule = filters.matricule;
      }

      // CORRECTION : Recherche par nom (avec LIKE pour plus de flexibilité)
      if (filters.nom) {
        whereConditions.push('agent.nom ILIKE :nom');
        parameters.nom = `%${filters.nom}%`;
      }

      // CORRECTION : Recherche par prénom (avec LIKE pour plus de flexibilité)
      if (filters.prenom) {
        whereConditions.push('agent.prenom ILIKE :prenom');
        parameters.prenom = `%${filters.prenom}%`;
      }

      if (filters.campagne) {
        whereConditions.push('agent.campagne = :campagne');
        parameters.campagne = filters.campagne;
      }

      if (filters.shift) {
        whereConditions.push('presence.shift = :shift');
        parameters.shift = filters.shift;
      }

      // CORRECTION : Appel temporaire pour le débogage
      if (filters.nom) {
        await this.debugAgentsByNom(filters.nom);
      }

      // CORRECTION : Log des conditions pour le débogage
      console.log('Conditions de recherche:', whereConditions);
      console.log('Paramètres:', parameters);

      // Appliquer toutes les conditions
      if (whereConditions.length > 0) {
        queryBuilder.where(whereConditions.join(' AND '), parameters);
      }

      // CORRECTION : Ajouter un ordre par défaut
      queryBuilder.orderBy('presence.date', 'DESC')
        .addOrderBy('agent.nom', 'ASC')
        .addOrderBy('agent.prenom', 'ASC');

      const presences = await queryBuilder.getMany();

      console.log(`✅ ${presences.length} présence(s) trouvée(s) avec les filtres appliqués`);

      // S'assurer que toutes les données sont bien formatées
      const presencesAvecTypesCorrects = presences.map(presence => ({
        ...presence,
        heuresTravaillees: presence.heuresTravaillees != null ? Number(presence.heuresTravaillees) : null
      }));

      // Calculer le total des heures travaillées
      const totalHeures = presencesAvecTypesCorrects.reduce((sum, presence) => {
        return sum + (presence.heuresTravaillees != null ? presence.heuresTravaillees : 0);
      }, 0);

      return {
        data: presencesAvecTypesCorrects,
        totalHeures,
        totalPresences: presencesAvecTypesCorrects.length,
      };
    } catch (error: unknown) {
      console.error('Erreur dans getHistoriquePresences:', error);

      let errorMessage = 'Erreur inconnue lors de la récupération de l\'historique';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      throw new Error(errorMessage);
    }
  }


  async debugAgentsByNom(nom: string): Promise<Agent[]> {
    try {
      const agents = await this.agentRepository.find({
        where: {
          nom: Like(`%${nom}%`)
        }
      });
      console.log(`🔍 Agents trouvés avec le nom "${nom}":`, agents);
      return agents;
    } catch (error) {
      console.error('Erreur lors du débogage des agents:', error);
      return [];
    }
  }


  async verifierDonnees() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const count = await this.presenceRepository.count({
        where: { date: today }
      });

      console.log(`Nombre de présences aujourd'hui (${today}): ${count}`);

      const allPresences = await this.presenceRepository.find({
        relations: ['agent', 'details'],
        take: 5
      });

      console.log('Dernières présences:', allPresences);

      return count;
    } catch (error: unknown) {
      console.error('Erreur de vérification:', error);
    }
  }
  // backend/src/services/PresenceService.ts - Modifications pour le PDF avec signatures
  // backend/src/services/PresenceService.ts - Version avec texte centré

  async generatePDF(presences: Presence[], totalHeures: number, totalPresences: number): Promise<Buffer> {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

      if (!presences) {
        throw new Error('Aucune donnée de présence à exporter');
      }

      doc.lineWidth(0.5);

      // En-tête
      doc.fontSize(16).text('Rapport des Présences - Colarys Concept', 30, 30);
      doc.fontSize(10);

      // Informations de période
      doc.text(`Calculé le: ${new Date().toLocaleDateString('fr-FR')}`, 30, 60);
      doc.text(`Total des présences: ${totalPresences}`, 30, 75);
      doc.text(`Total des heures travaillées: ${totalHeures}h`, 30, 90);

      // Définitions des colonnes AVEC SIGNATURES
      const columns = [
        { start: 30, width: 60, align: 'center' as const }, // Date
        { start: 90, width: 70, align: 'center' as const }, // Matricule
        { start: 160, width: 120, align: 'center' as const }, // Nom
        { start: 280, width: 50, align: 'center' as const }, // Entrée
        { start: 330, width: 50, align: 'center' as const }, // Sortie
        { start: 380, width: 50, align: 'center' as const }, // Heures
        { start: 430, width: 40, align: 'center' as const }, // Shift
        { start: 470, width: 60, align: 'center' as const }, // Campagne
        { start: 530, width: 50, align: 'center' as const }, // Signature Entrée
        { start: 580, width: 50, align: 'center' as const }  // Signature Sortie
      ];

      const verticalPositions = columns.map(col => col.start).concat(columns[columns.length - 1].start + columns[columns.length - 1].width);

      let y = 120;
      const rowHeight = 25; // Hauteur de ligne augmentée pour mieux centrer
      const fontSize = 8;

      // Fonction utilitaire pour centrer le texte verticalement dans une cellule
      const drawCenteredText = (text: string, x: number, y: number, width: number, height: number, align: 'left' | 'center' | 'right' = 'center') => {
        doc.fontSize(fontSize);

        // Calculer la hauteur du texte
        const textHeight = doc.heightOfString(text, {
          width: width - 4, // Marge interne
          align: align
        });

        // Calculer la position Y centrée
        const centeredY = y + (height - textHeight) / 2;

        // Dessiner le texte centré
        doc.text(text, x + 2, centeredY, {
          width: width - 4,
          align: align,
          lineGap: 1
        });
      };

      // Fonction pour dessiner l'en-tête
      const drawHeader = () => {
        const headerY = y;
        const headerHeight = 25; // Augmenté pour mieux centrer

        // Bordure supérieure
        doc.moveTo(verticalPositions[0], headerY).lineTo(verticalPositions[verticalPositions.length - 1], headerY).stroke();

        // Lignes verticales
        verticalPositions.forEach(pos => {
          doc.moveTo(pos, headerY).lineTo(pos, headerY + headerHeight).stroke();
        });

        // Texte en-tête CENTRÉ
        doc.fontSize(7).font('Helvetica-Bold');

        // Calculer la position Y centrée pour l'en-tête
        const headerTextY = headerY + (headerHeight - 7) / 2; // 7 = taille police en-tête

        doc.text('Date', columns[0].start, headerTextY, { width: columns[0].width, align: 'center' });
        doc.text('Matricule', columns[1].start, headerTextY, { width: columns[1].width, align: 'center' });
        doc.text('Nom', columns[2].start, headerTextY, { width: columns[2].width, align: 'center' });
        doc.text('Entrée', columns[3].start, headerTextY, { width: columns[3].width, align: 'center' });
        doc.text('Sortie', columns[4].start, headerTextY, { width: columns[4].width, align: 'center' });
        doc.text('Heures', columns[5].start, headerTextY, { width: columns[5].width, align: 'center' });
        doc.text('Shift', columns[6].start, headerTextY, { width: columns[6].width, align: 'center' });
        doc.text('Campagne', columns[7].start, headerTextY, { width: columns[7].width, align: 'center' });
        doc.text('Sig. Entrée', columns[8].start, headerTextY, { width: columns[8].width, align: 'center' });
        doc.text('Sig. Sortie', columns[9].start, headerTextY, { width: columns[9].width, align: 'center' });

        // Bordure inférieure
        doc.moveTo(verticalPositions[0], headerY + headerHeight).lineTo(verticalPositions[verticalPositions.length - 1], headerY + headerHeight).stroke();

        y += headerHeight;
      };

      // Dessiner l'en-tête initial
      drawHeader();
      doc.font('Helvetica');

      // Lignes des données
      for (const presence of presences) {
        // Vérifier si besoin d'une nouvelle page
        if (y > 500) {
          doc.addPage();
          y = 30;
          drawHeader();
          doc.font('Helvetica');
        }

        const rowStartY = y;

        // Formatage des données
        const dateFormatee = new Date(presence.date).toLocaleDateString('fr-FR');
        const heuresTravaillees = presence.heuresTravaillees ?
          `${Number(presence.heuresTravaillees).toFixed(2)}h` : '-';
        const nomComplet = `${presence.agent.nom} ${presence.agent.prenom}`;

        // Dessiner les bordures verticales
        verticalPositions.forEach(pos => {
          doc.moveTo(pos, rowStartY).lineTo(pos, rowStartY + rowHeight).stroke();
        });

        // Écrire les données TEXTE CENTRÉ
        doc.fontSize(fontSize);

        // Date - CENTRÉ
        drawCenteredText(dateFormatee, columns[0].start, rowStartY, columns[0].width, rowHeight, 'center');

        // Matricule - CENTRÉ
        drawCenteredText(presence.agent.matricule || 'N/D', columns[1].start, rowStartY, columns[1].width, rowHeight, 'center');

        // Nom complet - CENTRÉ (avec gestion du texte long)
        const nomCompletTronque = doc.heightOfString(nomComplet, { width: columns[2].width - 4 }) > rowHeight ?
          presence.agent.nom + ' ' + presence.agent.prenom.substring(0, 1) + '.' :
          nomComplet;
        drawCenteredText(nomCompletTronque, columns[2].start, rowStartY, columns[2].width, rowHeight, 'center');

        // Heure entrée - CENTRÉ
        drawCenteredText(presence.heureEntree, columns[3].start, rowStartY, columns[3].width, rowHeight, 'center');

        // Heure sortie - CENTRÉ
        drawCenteredText(presence.heureSortie || '-', columns[4].start, rowStartY, columns[4].width, rowHeight, 'center');

        // Heures travaillées - CENTRÉ
        drawCenteredText(heuresTravaillees, columns[5].start, rowStartY, columns[5].width, rowHeight, 'center');

        // Shift - CENTRÉ
        drawCenteredText(presence.shift, columns[6].start, rowStartY, columns[6].width, rowHeight, 'center');

        // Campagne - CENTRÉ
        drawCenteredText(presence.agent.campagne, columns[7].start, rowStartY, columns[7].width, rowHeight, 'center');

        // Gestion des signatures - CENTRÉES
        const signatureHeight = 20;
        const signatureY = rowStartY + (rowHeight - signatureHeight) / 2;

        try {
          // Signature entrée - CENTRÉE
          if (presence.details?.signatureEntree) {
            console.log('📝 Signature entrée trouvée pour:', nomComplet);
            doc.image(presence.details.signatureEntree,
              columns[8].start + (columns[8].width - 40) / 2, // Centrage horizontal
              signatureY,
              {
                width: 40, // Largeur fixe pour centrage
                height: signatureHeight,
                fit: [40, signatureHeight],
                align: 'center',
                valign: 'center'
              }
            );
          } else {
            drawCenteredText('-', columns[8].start, rowStartY, columns[8].width, rowHeight, 'center');
          }
        } catch (error) {
          console.error('❌ Erreur signature entrée:', error);
          drawCenteredText('Erreur', columns[8].start, rowStartY, columns[8].width, rowHeight, 'center');
        }

        // Signature sortie - CENTRÉE
        try {
          if (presence.details?.signatureSortie) {
            console.log('📝 Signature sortie trouvée pour:', nomComplet);
            doc.image(presence.details.signatureSortie,
              columns[9].start + (columns[9].width - 40) / 2, // Centrage horizontal
              signatureY,
              {
                width: 40, // Largeur fixe pour centrage
                height: signatureHeight,
                fit: [40, signatureHeight],
                align: 'center',
                valign: 'center'
              }
            );
          } else {
            drawCenteredText('-', columns[9].start, rowStartY, columns[9].width, rowHeight, 'center');
          }
        } catch (error) {
          console.error('❌ Erreur signature sortie:', error);
          drawCenteredText('Erreur', columns[9].start, rowStartY, columns[9].width, rowHeight, 'center');
        }

        // Dessiner la bordure inférieure
        doc.moveTo(verticalPositions[0], rowStartY + rowHeight).lineTo(verticalPositions[verticalPositions.length - 1], rowStartY + rowHeight).stroke();

        y += rowHeight;
      }

      // Pied de page avec total
      if (y > 500 - 20) {
        doc.addPage();
        y = 30;
      }
      y += 10;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`TOTAL GÉNÉRAL: ${totalHeures} heures travaillées`, 30, y);

      return new Promise((resolve, reject) => {
        try {
          const chunks: Buffer[] = [];
          doc.on('data', (chunk: Buffer) => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);
          doc.end();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error: unknown) {
      console.error('Erreur dans generatePDF:', error);

      let errorMessage = 'Erreur inconnue lors de la génération du PDF';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      throw new Error(errorMessage);
    }
  }
}