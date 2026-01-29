-- Create review_status enum
CREATE TYPE public.review_status AS ENUM ('pending', 'verified', 'rejected');

-- Add verification columns to documents table
ALTER TABLE public.documents 
ADD COLUMN review_status review_status DEFAULT 'pending',
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN verified_by UUID,
ADD COLUMN reviewer_notes TEXT;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" 
ON public.notifications FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create document_notes table
CREATE TABLE public.document_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on document_notes
ALTER TABLE public.document_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_notes
CREATE POLICY "Users can view notes on own documents" 
ON public.document_notes FOR SELECT 
USING (is_document_owner(document_id));

CREATE POLICY "Users can insert notes on own documents" 
ON public.document_notes FOR INSERT 
WITH CHECK (is_document_owner(document_id) AND user_id = auth.uid());

CREATE POLICY "Users can update own notes" 
ON public.document_notes FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes" 
ON public.document_notes FOR DELETE 
USING (user_id = auth.uid());

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit_logs (users can view own logs)
CREATE POLICY "Users can view own audit logs" 
ON public.audit_logs FOR SELECT 
USING (user_id = auth.uid());

-- Service role can insert audit logs (via edge function)
CREATE POLICY "Service can insert audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

-- Create full-text search index on scan_results
CREATE INDEX idx_scan_results_ocr_text ON public.scan_results 
USING gin(to_tsvector('english', COALESCE(raw_ocr_text, '')));

-- Create index on notifications for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Create index on audit_logs for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);