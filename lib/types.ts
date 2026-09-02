export type IELTSModule = "reading" | "listening";
export type AnswerState = "answered" | "unanswered";

export interface VocabularyEntry {
  word: string;
  translation: string;
}

export interface SourceParts {
  book?: string;
  test?: number;
  section_kind?: "passage" | "part" | "section";
  section?: number;
  question_start?: number;
  question_end?: number;
}

export interface NormalizedMistake {
  client_id: string;
  row_number: number;
  attempted_on_raw: string;
  attempted_on: string | null;
  date_inferred: boolean;
  source_label: string;
  source_parts: SourceParts;
  question_text: string;
  evidence_context: string;
  source_analysis: string;
  source_note: string;
  source_tags: string[];
  user_answer: string | null;
  answer_state: AnswerState;
  correct_answer: string;
  module: IELTSModule;
  question_type_hint: string | null;
  row_fingerprint: string;
  question_fingerprint: string;
  warnings: string[];
}

export interface ImportReport {
  file_name: string;
  file_hash: string;
  inferred_module: IELTSModule | null;
  sheet_name: string;
  total_rows: number;
  valid_rows: number;
  empty_rows: number;
  inferred_dates: number;
  duplicate_rows: number;
  warnings: string[];
  blocking_errors: string[];
  extra_columns: string[];
  rows: NormalizedMistake[];
}

export interface AnalysisDraft {
  client_id: string;
  question_type: string;
  primary_cause: string;
  secondary_causes: string[];
  answer_comparison: string;
  evidence_span: string;
  trap_mechanism: string;
  diagnostic_question: string;
  confidence: number;
  provenance: Array<"text_evidence" | "user_note" | "user_confirmation" | "ai_inference">;
  vocabulary?: VocabularyEntry[];
  status?: "draft" | "manual_required";
  error?: string;
}

export interface PendingAnalysis {
  row: NormalizedMistake;
  draft: AnalysisDraft;
  source_url: string;
  file_name: string;
  file_hash: string;
  force_new_attempt?: boolean;
}

export interface MistakeRecord {
  id: string;
  attempt_id: string;
  client_id: string;
  row_fingerprint?: string;
  module: IELTSModule;
  source_label: string;
  question_text: string;
  evidence_context: string;
  source_analysis: string;
  user_answer: string | null;
  correct_answer: string;
  attempted_on: string | null;
  source_note: string;
  source_tags: string[];
  source_url: string | null;
  question_type: string;
  primary_cause: string;
  secondary_causes: string[];
  answer_comparison: string;
  evidence_span: string;
  trap_mechanism: string;
  diagnostic_question: string;
  confidence: number;
  provenance: Array<"text_evidence" | "user_note" | "user_confirmation" | "ai_inference">;
  vocabulary?: VocabularyEntry[];
  confirmed_at: string;
}

export interface InsightData {
  total_attempts: number;
  by_module: Array<{ label: string; count: number }>;
  by_question_type: Array<{ label: string; count: number }>;
  by_cause: Array<{ label: string; count: number }>;
  trend: Array<{ label: string; count: number }>;
  matrix: Array<{ question_type: string; cause: string; count: number }>;
}

export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
  name: string | null;
}
