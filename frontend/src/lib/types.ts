export type Profile = {
  id: number;
  name: string;
  base_url: string;
  model: string;
  is_default: boolean;
  created_at: string;
};

export type ProfileInput = {
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_default: boolean;
};

export type ProfileUpdateInput = Partial<ProfileInput>;

export type ProfileConnectionTestPayload = {
  base_url: string;
  api_key: string;
  model: string;
};

export type ProfileConnectionTestResult = {
  status: "ok" | "error";
  message: string;
};

export type Job = {
  id: number;
  video_url: string;
  candidate_name: string;
  profile_id: number;
  target_duration_seconds: number;
  status: string;
  workspace_path: string;
  failure_message: string | null;
  created_at: string;
};

export type JobInput = {
  video_url: string;
  candidate_name: string;
  profile_id: number;
  target_duration_seconds: number;
};

export type HighlightItem = {
  start: number;
  end: number;
  star_label: string;
  summary: string;
  reason: string;
  score: number;
};

export type JobHighlights = {
  job_id: number;
  status: string;
  items: HighlightItem[];
};

export type JobReviewInput = {
  approved_highlight_ids: number[];
};

export type JobReviewResult = {
  job_id: number;
  status: string;
  approved_highlight_ids: number[];
};

export type JobExportResult = {
  job_id: number;
  status: string;
  output_file: string;
};
