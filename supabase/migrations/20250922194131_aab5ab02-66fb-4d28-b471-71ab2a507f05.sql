-- Create storage bucket for whatsapp media if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for whatsapp media
CREATE POLICY "Allow authenticated users to upload whatsapp media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public access to whatsapp media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'whatsapp-media');