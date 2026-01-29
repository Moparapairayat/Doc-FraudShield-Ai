import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction =
  | "document.upload"
  | "document.analyze"
  | "document.delete"
  | "document.verify"
  | "document.reject"
  | "report.export"
  | "settings.update"
  | "auth.login"
  | "auth.logout";

interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Json;
}

export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Cannot create audit log: no authenticated user");
      return;
    }

    const { error } = await supabase.from("audit_logs").insert([{
      user_id: user.id,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      metadata: entry.metadata || null,
    }]);

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

export const logDocumentUpload = (documentId: string, filename: string) =>
  createAuditLog({
    action: "document.upload",
    entityType: "document",
    entityId: documentId,
    metadata: { filename } as Json,
  });

export const logDocumentAnalyze = (documentId: string, riskScore: number) =>
  createAuditLog({
    action: "document.analyze",
    entityType: "document",
    entityId: documentId,
    metadata: { riskScore } as Json,
  });

export const logDocumentDelete = (documentId: string) =>
  createAuditLog({
    action: "document.delete",
    entityType: "document",
    entityId: documentId,
  });

export const logDocumentVerify = (documentId: string, status: string, notes?: string) =>
  createAuditLog({
    action: status === "verified" ? "document.verify" : "document.reject",
    entityType: "document",
    entityId: documentId,
    metadata: { status, notes } as Json,
  });

export const logReportExport = (scanResultId: string, format: string) =>
  createAuditLog({
    action: "report.export",
    entityType: "scan_result",
    entityId: scanResultId,
    metadata: { format } as Json,
  });

export const logSettingsUpdate = (settings: Json) =>
  createAuditLog({
    action: "settings.update",
    entityType: "settings",
    metadata: settings,
  });
