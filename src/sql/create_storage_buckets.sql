
-- Create app-assets bucket if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create directory structure for app assets
-- Note: This is just a comment as Supabase storage doesn't require explicit directory creation
-- Directories structure:
--   - app-assets/
--     - logos/
--     - avatars/
--     - misc/
