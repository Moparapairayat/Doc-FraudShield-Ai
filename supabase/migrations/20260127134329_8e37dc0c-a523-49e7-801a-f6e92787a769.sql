-- Enable realtime for documents table to support status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;