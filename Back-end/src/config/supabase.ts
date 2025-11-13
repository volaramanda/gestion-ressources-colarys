// config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Clé de service pour les opérations admin

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('SUPABASE_URL:', supabaseUrl || 'non défini');
  console.error('SUPABASE_KEY:', supabaseKey ? 'présent (longueur: ' + supabaseKey.length + ')' : 'manquant');
  throw new Error('Configuration Supabase incomplète. Vérifiez vos variables d\'environnement.');
}

console.log('✅ Configuration Supabase chargée - URL:', supabaseUrl);

// Client principal avec la clé publique
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'gestion-planning-app'
    }
  }
});

// Client admin avec la clé de service (si disponible)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true
      }
    })
  : null;

// Fonction de test de connexion améliorée
export async function testConnection(): Promise<boolean> {
  try {
    // Test plus simple et plus fiable
    const { data, error } = await supabase
      .from('plannings')
      .select('id')
      .limit(1)
      .maybeSingle(); // Utilise maybeSingle pour éviter les erreurs si la table n'existe pas

    if (error) {
      // Si la table n'existe pas, essayez une requête plus basique
      if (error.code === '42P01') { // Table doesn't exist
        console.log('⚠️ Table plannings non trouvée, test avec une requête système');
        const { error: sysError } = await supabase.rpc('version');
        if (sysError) {
          console.error('❌ Erreur connexion Supabase:', error.message);
          return false;
        }
        console.log('✅ Connexion Supabase réussie (via RPC)');
        return true;
      }
      
      console.error('❌ Erreur connexion Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    return false;
  }
}

// Fonction pour vérifier la santé de la base de données
export async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    const { error } = await supabase.from('plannings').select('count').limit(1);
    const responseTime = Date.now() - startTime;
    
    return {
      connected: !error,
      responseTime: responseTime,
      error: error?.message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Gestion des erreurs Supabase
export function handleSupabaseError(error: any): string {
  if (!error) return 'Erreur inconnue';
  
  if (error.code) {
    switch (error.code) {
      case '23505': return 'Doublon détecté';
      case '23503': return 'Violation de clé étrangère';
      case '23502': return 'Valeur nulle non autorisée';
      case '42P01': return 'Table non trouvée';
      case '42703': return 'Colonne non trouvée';
      default: return `Erreur database: ${error.code} - ${error.message}`;
    }
  }
  
  return error.message || 'Erreur inconnue';
}

// Export des URLs pour le débogage (seulement en développement)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Mode développement - Supabase config:');
  console.log('URL:', supabaseUrl);
  console.log('Key présent:', !!supabaseKey);
  console.log('Service Key présent:', !!supabaseServiceKey);
}