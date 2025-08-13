-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('uploads', 'uploads', false),
    ('signatures', 'signatures', false),
    ('completed-forms', 'completed-forms', false);

-- Storage policies for uploads bucket
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'uploads' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own uploads" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'uploads' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own uploads" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'uploads' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Storage policies for signatures bucket
CREATE POLICY "Users can upload their own signatures" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'signatures' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own signatures" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'signatures' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own signatures" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'signatures' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Storage policies for completed-forms bucket
CREATE POLICY "Users can upload their completed forms" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'completed-forms' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their completed forms" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'completed-forms' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their completed forms" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'completed-forms' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );