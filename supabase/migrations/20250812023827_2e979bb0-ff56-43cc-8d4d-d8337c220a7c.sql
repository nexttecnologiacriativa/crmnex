-- Enable RLS on storage.objects if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can upload files'
  ) THEN
    CREATE POLICY "Anyone can upload files" ON storage.objects FOR INSERT WITH CHECK (true);
  END IF;
END
$$;

-- Create storage bucket for WhatsApp media if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for whatsapp-media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for whatsapp-media'
  ) THEN
    CREATE POLICY "Public read access for whatsapp-media" ON storage.objects 
    FOR SELECT USING (bucket_id = 'whatsapp-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload to whatsapp-media'
  ) THEN
    CREATE POLICY "Authenticated users can upload to whatsapp-media" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');
  END IF;
END
$$;