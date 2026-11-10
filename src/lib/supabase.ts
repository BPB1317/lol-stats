import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
// Clé publique : la nouvelle clé « publishable » (sb_publishable_…) en priorité, l'ancienne clé anon en repli
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string

export const supabase = createClient(supabaseUrl, supabaseKey)
