
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.techlinx.se';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbXJqeHJwcnRneGR1a2pnaHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwNDcwMDMsImV4cCI6MjAwNTYyMzAwM30.pPucXCs70z1QnNnjJT6QbZ55B_rGX0sHetmGj0g2rKU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
