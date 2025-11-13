import { DataSource } from "typeorm";
import dotenv from "dotenv";

import { User } from "../entities/User";
import { Agent } from "../entities/Agent";
import { HistoAgents } from "../entities/HistoAgents";
import { Role } from "../entities/Role";
import { Presence } from "../entities/Presence";
import { DetailPresence } from "../entities/DetailPresence";
import { Trashpresence } from "../entities/Trashpresence";
import { AgentColarys } from "../entities/AgentColarys";


dotenv.config();

const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingEnvVars);
  throw new Error('Configuration de base de données incomplète');
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  entities: [
    User, 
    HistoAgents, 
    Agent, 
    Role, 
    Presence, 
    DetailPresence, 
    Trashpresence,
    AgentColarys

  ],
  synchronize: process.env.NODE_ENV !== 'production', // DANGEREUX en production
  logging: process.env.NODE_ENV === 'development',
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
  // Configuration SSL pour Supabase
  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false
    }
  }
});

export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }
    return AppDataSource;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};



// import { DataSource } from "typeorm";
// import dotenv from "dotenv";

// import { User } from "../entities/User";
// import { Agent } from "../entities/Agent";
// import { HistoAgents } from "../entities/HistoAgents";
// import { Plateforme } from "../entities/Plateforme";
// import { Role } from "../entities/Role";
// import { Presence } from "../entities/Presence";
// import { DetailPresence } from "../entities/DetailPresence";
// import { Trashpresence } from "../entities/Trashpresence";
// import { AgentColarys } from "../entities/AgentColarys";


// dotenv.config();

// const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE'];
// const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// if (missingEnvVars.length > 0) {
//   console.error('❌ Variables d\'environnement manquantes:', missingEnvVars);
//   throw new Error('Configuration de base de données incomplète');
// }

// export const AppDataSource = new DataSource({
//   type: "postgres",
//   host: process.env.POSTGRES_HOST,
//   port: parseInt(process.env.POSTGRES_PORT || "5432"),
//   username: process.env.POSTGRES_USER,
//   password: process.env.POSTGRES_PASSWORD,
//   database: process.env.POSTGRES_DATABASE,
//   entities: [
//     User, 
//     HistoAgents, 
//     Agent, 
//     Plateforme, 
//     Role, 
//     Presence, 
//     DetailPresence, 
//     Trashpresence,
//     AgentColarys
//   ],
//   synchronize: process.env.NODE_ENV !== 'production',
//   logging: process.env.NODE_ENV === 'development',
//   migrations: ["src/migrations/*.ts"],
//   subscribers: [],
  
// });

// export const initializeDatabase = async (): Promise<DataSource> => {
//   try {
//     if (!AppDataSource.isInitialized) {
//       await AppDataSource.initialize();
//       console.log('✅ Database connection established');
//     }
//     return AppDataSource;
//   } catch (error) {
//     console.error('❌ Database connection failed:', error);
//     throw error;
//   }
// };


// import { DataSource } from "typeorm";
// import dotenv from "dotenv";

// import { User } from "../entities/User";
// import { Agent } from "../entities/Agent";
// import { HistoAgents } from "../entities/HistoAgents";
// import { Plateforme } from "../entities/Plateforme";
// import { Role } from "../entities/Role";
// import { Presence } from "../entities/Presence";
// import { DetailPresence } from "../entities/DetailPresence";
// import { Trashpresence } from "../entities/Trashpresence";
// import { Planning } from '../entities/Planning';

// dotenv.config();

// // Vérification des variables requises
// const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE'];
// const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// if (missingEnvVars.length > 0) {
//   console.error('❌ Variables d\'environnement manquantes:', missingEnvVars);
//   throw new Error('Configuration de base de données incomplète');
// }

// export const AppDataSource = new DataSource({
//   type: "postgres",
//   host: process.env.POSTGRES_HOST,
//   port: parseInt(process.env.POSTGRES_PORT || "6543"), // Port Supabase
//   username: process.env.POSTGRES_USER,
//   password: process.env.POSTGRES_PASSWORD,
//   database: process.env.POSTGRES_DATABASE,
//   entities: [
//     User, 
//     HistoAgents, 
//     Agent, 
//     Plateforme, 
//     Role, 
//     Presence, 
//     DetailPresence, 
//     Trashpresence
//   ],
  
//   synchronize: process.env.NODE_ENV !== 'production', // Désactivé en production
//   ssl: true, // SSL obligatoire pour Supabase
//   extra: {
//     ssl: {
//       rejectUnauthorized: false
//     }
//   },
//   logging: process.env.NODE_ENV === 'development',
//   migrations: ["src/migrations/*.ts"],
//   subscribers: [],
// });

// // Fonction d'initialisation
// export const initializeDatabase = async (): Promise<DataSource> => {
//   try {
//     if (!AppDataSource.isInitialized) {
//       await AppDataSource.initialize();
//       console.log('✅ Database connection established');
//     }
//     return AppDataSource;
//   } catch (error) {
//     console.error('❌ Database connection failed:', error);
//     throw error;
//   }

  
// };
