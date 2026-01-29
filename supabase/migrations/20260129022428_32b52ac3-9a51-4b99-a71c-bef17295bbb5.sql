-- Fix the permissive audit_logs insert policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert own audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (user_id = auth.uid());