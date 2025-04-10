
-- Create application-logo bucket if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create directory structure for application assets
-- Note: This is just a comment as Supabase storage doesn't require explicit directory creation
-- Directories structure:
--   - application-logo/
--     - logos/
