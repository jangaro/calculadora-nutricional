// Configuración del proyecto de Supabase para NutriCalc
// REEMPLAZA ESTOS VALORES con los de tu proyecto en supabase.com (Settings -> API)
const SUPABASE_URL = "TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";

// Inicializar el cliente global de Supabase si la biblioteca está cargada
let supabaseClient = null;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase SDK no está cargado. Asegúrate de incluir el script CDN antes de este archivo.");
}
