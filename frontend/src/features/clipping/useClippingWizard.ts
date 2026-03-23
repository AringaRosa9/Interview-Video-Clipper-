import { useReducer } from "react";

export type ClippingWizardStep = "video-link" | "analysis-setup" | "loading" | "review";
const REVIEWABLE_JOB_STATUSES = new Set(["review_ready", "reviewed", "exported"]);

export type ClippingWizardState = {
  step: ClippingWizardStep;
  videoUrl: string;
  candidateName: string;
  notes: string;
  profileId: number | null;
  targetDurationSeconds: number;
  candidateSpeakerPriority: boolean;
  tokenSavingMode: boolean;
  jobId: number | null;
  jobStatus: string;
  submitError: string;
};

export type ClippingWizardAction =
  | {
      type: "videoDetailsSaved";
      payload: {
        videoUrl: string;
        candidateName: string;
        notes: string;
      };
    }
  | {
      type: "setupSaved";
      payload: {
        videoUrl: string;
        candidateName: string;
        notes: string;
        profileId: number;
        targetDurationSeconds: number;
        candidateSpeakerPriority: boolean;
        tokenSavingMode: boolean;
      };
    }
  | {
      type: "jobCreated";
      payload: {
        jobId: number;
        jobStatus: string;
      };
    }
  | {
      type: "jobFailed";
      payload: {
        message: string;
      };
    }
  | {
      type: "jobStatusUpdated";
      payload: {
        jobStatus: string;
      };
    }
  | { type: "backToVideoLink" }
  | { type: "backToAnalysisSetup" };

export const initialClippingWizardState: ClippingWizardState = {
  step: "video-link",
  videoUrl: "",
  candidateName: "",
  notes: "",
  profileId: null,
  targetDurationSeconds: 45,
  candidateSpeakerPriority: true,
  tokenSavingMode: true,
  jobId: null,
  jobStatus: "",
  submitError: "",
};

export function reduceClippingWizardState(
  state: ClippingWizardState = initialClippingWizardState,
  action: ClippingWizardAction,
): ClippingWizardState {
  switch (action.type) {
    case "videoDetailsSaved":
      return {
        ...state,
        ...action.payload,
        step: "analysis-setup",
        submitError: "",
      };
    case "setupSaved":
      return {
        ...state,
        ...action.payload,
        step: "loading",
        submitError: "",
      };
    case "jobCreated":
      return {
        ...state,
        jobId: action.payload.jobId,
        jobStatus: action.payload.jobStatus,
        step: REVIEWABLE_JOB_STATUSES.has(action.payload.jobStatus) ? "review" : "loading",
        submitError: "",
      };
    case "jobStatusUpdated":
      return {
        ...state,
        jobStatus: action.payload.jobStatus,
        step: REVIEWABLE_JOB_STATUSES.has(action.payload.jobStatus) ? "review" : "loading",
      };
    case "jobFailed":
      return {
        ...state,
        step: "analysis-setup",
        submitError: action.payload.message,
      };
    case "backToVideoLink":
      return {
        ...state,
        step: "video-link",
        submitError: "",
      };
    case "backToAnalysisSetup":
      return {
        ...state,
        step: "analysis-setup",
        submitError: "",
      };
    default:
      return state;
  }
}

export function useClippingWizard() {
  return useReducer(reduceClippingWizardState, initialClippingWizardState);
}
