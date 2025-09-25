-- Create storage policies for both audio and images folders
-- First check if bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'whatsapp-media';

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media public access" ON storage.objects;  
DROP POLICY IF EXISTS "Anyone can view whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload whatsapp media" ON storage.objects;

-- Create comprehensive policies for the whatsapp-media bucket
CREATE POLICY "Public read access for whatsapp-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated users can upload to whatsapp-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update whatsapp-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete whatsapp-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');