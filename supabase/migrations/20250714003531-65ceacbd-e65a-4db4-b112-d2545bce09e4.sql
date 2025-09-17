-- Create bucket for WhatsApp images
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-images', 'whatsapp-images', true);

-- Create policies for WhatsApp images bucket
CREATE POLICY "WhatsApp images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'whatsapp-images');

CREATE POLICY "Service can upload WhatsApp images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'whatsapp-images');

CREATE POLICY "Service can update WhatsApp images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'whatsapp-images');