/**
 * src/config/supabase.js
 *
 * Configuración del cliente de Supabase
 *
 * Incluye:
 * - Persistencia de sesión en localStorage
 * - Auto-refresh de tokens
 * - Detección de sesión en URL
 * - Headers personalizados
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno de Supabase. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir la sesión en localStorage
    persistSession: true,

    // Auto-refresh del token antes de que expire
    autoRefreshToken: true,

    // Detectar sesión en la URL (útil para magic links)
    detectSessionInUrl: true,

    // Usar localStorage explícitamente
    storage: window.localStorage,

    // Nombre personalizado para la key en localStorage
    storageKey: "vales-auth-token",

    // Debug en desarrollo (solo aparece en consola)
    debug: import.meta.env.DEV,
  },
  global: {
    headers: {
      "x-client-info": "web-verification-vales@1.0.0",
    },
  },
});

// Listener para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Supabase Auth] Event: ${event}`, {
      hasSession: !!session,
      userId: session?.user?.id,
      expiresAt: session?.expires_at
        ? new Date(session.expires_at * 1000).toLocaleString()
        : "N/A",
    });
  });
}
