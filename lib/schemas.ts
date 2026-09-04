import { z } from "zod";
import { CAUSE_CODES, QUESTION_TYPE_CODES } from "./taxonomy";

export const normalizedMistakeSchema = z.object({
  client_id: z.string().min(1).max(100),
  row_number: z.number().int().positive(),
  attempted_on_raw: z.string().max(100),
  attempted_on: z.string().nullable(),
  date_inferred: z.boolean(),
  source_label: z.string().max(500),
  source_parts: z.record(z.unknown()),
  question_text: z.string().min(1).max(20_000),
  evidence_context: z.string().max(30_000),
  source_analysis: z.string().max(30_000).default(""),
  source_note: z.string().max(10_000),
  source_tags: z.array(z.string().max(100)).max(50),
  user_answer: z.string().max(2_000).nullable(),
  answer_state: z.enum(["answered", "unanswered"]),
  correct_answer: z.string().min(1).max(2_000),
  module: z.enum(["reading", "listening"]),
  question_type_hint: z.string().nullable(),
  official_question_type: z.string().nullable().optional(),
  row_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  question_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  warnings: z.array(z.string().max(500)).max(50)
});

export const analysisDraftSchema = z.object({
  client_id: z.string().min(1),
  question_type: z.enum(QUESTION_TYPE_CODES as [string, ...string[]]),
  primary_cause: z.enum(CAUSE_CODES as [string, ...string[]]),
  secondary_causes: z.array(z.enum(CAUSE_CODES as [string, ...string[]])).max(2),
  answer_comparison: z.string().min(1).max(8_000),
  evidence_span: z.string().max(10_000),
  trap_mechanism: z.string().min(1).max(5_000),
  diagnostic_question: z.string().min(1).max(2_000),
  confidence: z.number().min(0).max(1),
  provenance: z.array(z.enum(["text_evidence", "user_note", "user_confirmation", "ai_inference"])).min(1),
  vocabulary: z.array(z.object({ word: z.string().min(1).max(200), translation: z.string().min(1).max(500) })).max(100).optional(),
  user_evidence: z.string().max(10_000).optional()
});

export const analyzeRequestSchema = z.object({
  rows: z.array(normalizedMistakeSchema).min(1).max(20)
});

const confirmedAnalysisDraftSchema = analysisDraftSchema.extend({
  user_evidence: z.string().trim().min(1).max(10_000)
});

export const confirmRequestSchema = z.object({
  items: z.array(z.object({
    row: normalizedMistakeSchema,
    draft: confirmedAnalysisDraftSchema,
    source_url: z.string().url().or(z.literal("")),
    file_name: z.string().min(1).max(500),
    file_hash: z.string().regex(/^[a-f0-9]{64}$/),
    force_new_attempt: z.boolean().optional()
  })).min(1).max(50)
});

export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "client_id", "question_type", "primary_cause", "secondary_causes",
    "answer_comparison", "evidence_span", "trap_mechanism", "diagnostic_question", "confidence", "provenance"
  ],
  properties: {
    client_id: { type: "string" },
    question_type: { type: "string", enum: QUESTION_TYPE_CODES },
    primary_cause: { type: "string", enum: CAUSE_CODES },
    secondary_causes: { type: "array", maxItems: 2, items: { type: "string", enum: CAUSE_CODES } },
    answer_comparison: { type: "string", minLength: 1 },
    evidence_span: { type: "string" },
    trap_mechanism: { type: "string", minLength: 1 },
    diagnostic_question: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    provenance: {
      type: "array",
      minItems: 1,
      items: { type: "string", enum: ["text_evidence", "user_note", "user_confirmation", "ai_inference"] }
    }
  }
} as const;
