-- Create a public bucket for product/brand/pallet images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (salesmen) to upload images
CREATE POLICY "Salesmen can upload images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (SELECT is_salesman())
  );

-- Allow authenticated salesmen to update/overwrite their uploads
CREATE POLICY "Salesmen can update images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND (SELECT is_salesman())
  );

-- Allow authenticated salesmen to delete images
CREATE POLICY "Salesmen can delete images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND (SELECT is_salesman())
  );

-- Public read access for all images
CREATE POLICY "Public read access for images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'images');
