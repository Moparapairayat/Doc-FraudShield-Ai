import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Must include every custom header the browser sends (Supabase adds x-supabase-client-platform)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  // Required for CORS preflight to succeed
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnalysisRequest {
  documentId: string;
  fileUrl: string;
  fileType: string;
  filename: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    const { documentId, fileType, filename } = await req.json() as AnalysisRequest;

    console.log("Processing document:", documentId, "for user:", userId);

    // Verify document ownership
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !doc) {
      console.error("Document not found:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update document status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    console.log("Downloading file from storage:", doc.file_path);

    // Download the file for analysis
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return new Response(
        JSON.stringify({ error: "Failed to download document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("File downloaded, size:", fileData.size);

    // Convert to base64 - using ArrayBuffer for better handling
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid memory issues
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);

    console.log("Base64 conversion complete, length:", base64.length);

    const mimeType = fileType || "image/jpeg";

    // Call Lovable AI for advanced document analysis
    const analysisPrompt = `You are an elite document forensics analyst with expertise in detecting sophisticated fraud patterns. Perform a comprehensive, multi-layered forensic analysis of this document.

CRITICAL RULES:
1. You MUST NOT declare any document as "Fake" or "Genuine"
2. You can ONLY provide a Fraud Risk Score (0-100) and evidence-based warning flags
3. All results are advisory, not official verification
4. Be thorough and detect even subtle manipulation indicators

═══════════════════════════════════════════════════════════════
                    ADVANCED FORENSIC ANALYSIS
═══════════════════════════════════════════════════════════════

1. ERROR LEVEL ANALYSIS (ELA) INDICATORS:
   - Look for areas with different compression levels indicating edits
   - Identify regions that appear to have been re-saved multiple times
   - Detect pasted elements with different JPEG quality levels
   - Flag any areas with suspicious noise patterns
   - Identify "ghost" text or overwritten content

2. COPY-MOVE & CLONING DETECTION:
   - Scan for duplicated stamps, seals, or signatures
   - Identify repeated texture patterns that shouldn't exist
   - Detect mirrored or rotated duplicate elements
   - Flag multiple uses of same QR code/barcode elements
   - Look for rubber stamp patterns used multiple times

3. VISUAL FORENSICS - GRANULAR ANALYSIS:
   - Localized blur inconsistencies (edited regions often blurred to hide edges)
   - Sharpness variations between text layers
   - Lighting direction inconsistencies on 3D elements (embossed seals)
   - Shadow analysis for pasted elements
   - Edge artifacts around potentially spliced elements
   - Color temperature variations between document sections
   - Noise pattern analysis (different sources have different noise profiles)

4. TYPOGRAPHY & LAYOUT FORENSICS:
   - Font family mismatches within similar text blocks
   - Kerning and letter-spacing inconsistencies
   - Baseline alignment deviations
   - Text anti-aliasing variations
   - Character stroke width inconsistencies
   - Text resolution differences
   - Print quality variations between sections

5. DOCUMENT STRUCTURE ANALYSIS:
   - Paper texture consistency across the document
   - Watermark authenticity indicators
   - Security feature presence and quality
   - Hologram/foil indicators (if applicable)
   - Microprinting quality assessment
   - Border and frame alignment
   - Grid alignment for tabular data

6. METADATA & EXIF INDICATORS:
   - Software signatures visible in image (editing software artifacts)
   - Color profile inconsistencies
   - Resolution and DPI consistency
   - Timestamp plausibility
   - Compression artifact patterns

7. CONSISTENCY & LOGIC CHECKS:
   - Date format consistency throughout
   - Date logic errors (issue after expiry, future dates)
   - Name/ID number format validation
   - Institution name spelling consistency
   - Serial number format validation
   - Amount/number formatting patterns
   - Cross-reference field validation (if multiple fields should match)

8. SIGNATURE & SEAL ANALYSIS:
   - Signature stroke analysis (natural vs. digital)
   - Ink consistency and color
   - Pressure variation patterns
   - Seal/stamp clarity and positioning
   - Overlapping element order (seal over text vs. text over seal)

9. FIELD EXTRACTION (Extract if present):
   - name, full_name
   - id_number, registration_number, serial_number
   - issue_date, expiry_date
   - institution, organization, issuing_authority
   - amount, currency
   - address, location
   - date_of_birth
   - nationality

10. PROVIDE REGION COORDINATES for suspicious areas:
    - For each fraud flag, attempt to provide approximate bounding box
    - Format: {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100} as percentages

Respond with ONLY valid JSON:
{
  "overall_risk_score": <number 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "document_type": "<specific document type detected>",
  "ocr_text": "<full extracted text from document, preserve layout>",
  "metadata_analysis": {
    "detected_software_artifacts": ["<any editing software indicators>"],
    "compression_quality_estimate": <number 0-100>,
    "resolution_consistency": "<consistent|inconsistent|unknown>",
    "estimated_age": "<recent|moderate|old|unknown>"
  },
  "fraud_flags": [
    {
      "flag_type": "<ela_analysis|copy_move_detection|visual_forensics|typography_forensics|document_structure|metadata_analysis|consistency_check|signature_seal_analysis>",
      "name": "<concise issue name>",
      "description": "<detailed technical explanation with specific evidence>",
      "severity": "<low|medium|high|critical>",
      "confidence": <number 0-100>,
      "evidence_reference": "<exact location/element in document>",
      "page_number": 1,
      "region_coords": {"x": <0-100>, "y": <0-100>, "width": <0-100>, "height": <0-100>}
    }
  ],
  "extracted_fields": [
    {"field_name": "<name>", "field_value": "<value>", "confidence": <number 0-100>}
  ],
  "passed_checks": ["<list of forensic checks that passed with brief reason>"],
  "analysis_summary": "<2-3 sentence professional summary of findings>"
}

SCORING GUIDELINES:
- 0-20: Excellent - No fraud indicators, document appears authentic
- 21-40: Low Risk - Minor anomalies, likely authentic
- 41-60: Medium Risk - Notable concerns requiring verification
- 61-80: High Risk - Multiple fraud indicators detected
- 81-100: Critical Risk - Strong evidence of manipulation`;

    console.log("Calling AI gateway...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    console.log("AI response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few minutes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    console.log("AI response received, parsing...");

    if (!content) {
      console.error("No content in AI response");
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return new Response(
        JSON.stringify({ error: "No analysis content received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      // Create a default analysis if parsing fails
      analysis = {
        overall_risk_score: 50,
        risk_level: "medium",
        document_type: "Unknown Document",
        ocr_text: content,
        fraud_flags: [],
        extracted_fields: [],
        passed_checks: ["Analysis completed with limited results"]
      };
    }

    console.log("Storing scan result...");

    // Store scan result
    const { data: scanResult, error: scanError } = await supabase
      .from("scan_results")
      .insert({
        document_id: documentId,
        overall_risk_score: analysis.overall_risk_score || 50,
        risk_level: analysis.risk_level || "medium",
        raw_ocr_text: analysis.ocr_text || "",
        document_type: analysis.document_type || "Unknown Document",
      })
      .select()
      .single();

    if (scanError) {
      console.error("Failed to store scan result:", scanError);
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return new Response(
        JSON.stringify({ error: "Failed to store scan result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store fraud flags
    if (analysis.fraud_flags && analysis.fraud_flags.length > 0) {
      const flagsToInsert = analysis.fraud_flags.map((flag: any) => ({
        scan_result_id: scanResult.id,
        flag_type: flag.flag_type || "visual_forensics",
        name: flag.name || "Unknown Issue",
        description: flag.description || "",
        severity: flag.severity || "low",
        confidence: flag.confidence || 50,
        evidence_reference: flag.evidence_reference || null,
        page_number: flag.page_number || null,
      }));

      await supabase.from("fraud_flags").insert(flagsToInsert);
    }

    // Store extracted fields
    if (analysis.extracted_fields && analysis.extracted_fields.length > 0) {
      const fieldsToInsert = analysis.extracted_fields
        .filter((field: any) => field.field_value)
        .map((field: any) => ({
          scan_result_id: scanResult.id,
          field_name: field.field_name,
          field_value: field.field_value,
          confidence: field.confidence || 80,
        }));

      if (fieldsToInsert.length > 0) {
        await supabase.from("extracted_fields").insert(fieldsToInsert);
      }
    }

    // Update document status to completed
    await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", documentId);

    // Create notification for high-risk documents
    if (analysis.risk_level === "high" || analysis.overall_risk_score >= 60) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "high_risk",
        title: "High Risk Document Detected",
        message: `Your document "${filename}" has been flagged with a risk score of ${analysis.overall_risk_score}. Please review the analysis results.`,
        entity_type: "scan_result",
        entity_id: scanResult.id,
      });
    } else {
      // Create notification for completed analysis
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "analysis_complete",
        title: "Analysis Complete",
        message: `Analysis of "${filename}" completed with a risk score of ${analysis.overall_risk_score}.`,
        entity_type: "scan_result",
        entity_id: scanResult.id,
      });
    }

    console.log("Analysis complete, returning result");

    return new Response(
      JSON.stringify({
        success: true,
        scanResultId: scanResult.id,
        analysis: {
          overall_risk_score: analysis.overall_risk_score,
          risk_level: analysis.risk_level,
          document_type: analysis.document_type,
          fraud_flags_count: analysis.fraud_flags?.length || 0,
          passed_checks: analysis.passed_checks || [],
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Analysis failed. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
