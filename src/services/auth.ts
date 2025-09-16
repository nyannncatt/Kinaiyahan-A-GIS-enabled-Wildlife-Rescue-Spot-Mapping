import { supabase } from "./supabase";

export async function sendPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`
  });
  if (error) throw error;
  return data;
}