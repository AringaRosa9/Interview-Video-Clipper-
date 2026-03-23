import { describe, expect, test } from "vitest";
import { reduceClippingWizardState } from "./useClippingWizard";

describe("reduceClippingWizardState", () => {
  test("stores the setup fields from step 1 and step 2", () => {
    const state = reduceClippingWizardState(undefined, {
      type: "setupSaved",
      payload: {
        videoUrl: "https://cdn.example.com/interview.mp4",
        candidateName: "候选人 A",
        notes: "后端工程师岗位",
        profileId: 12,
        targetDurationSeconds: 45,
        candidateSpeakerPriority: true,
        tokenSavingMode: true,
      },
    });

    expect(state.videoUrl).toBe("https://cdn.example.com/interview.mp4");
    expect(state.candidateName).toBe("候选人 A");
    expect(state.notes).toBe("后端工程师岗位");
    expect(state.profileId).toBe(12);
    expect(state.targetDurationSeconds).toBe(45);
    expect(state.candidateSpeakerPriority).toBe(true);
    expect(state.tokenSavingMode).toBe(true);
    expect(state.step).toBe("loading");
  });
});
