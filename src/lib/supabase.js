import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)



//create an mobile application using flutter (dart). i need this same website as a mobile application. this exact website with all functionalities - Use the same theme, same database, and same backend logic. 