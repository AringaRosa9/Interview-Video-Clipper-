import type {
  Job,
  JobInput,
  Profile,
  ProfileConnectionTestPayload,
  ProfileConnectionTestResult,
  ProfileInput,
  ProfileUpdateInput,
} from "./types";

const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listProfiles(): Promise<Profile[]> {
  return request<Profile[]>("/profiles");
}

export function createProfile(payload: ProfileInput): Promise<Profile> {
  return request<Profile>("/profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProfile(profileId: number, payload: ProfileUpdateInput): Promise<Profile> {
  return request<Profile>(`/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function testProfileConnection(
  payload: ProfileConnectionTestPayload,
): Promise<ProfileConnectionTestResult> {
  return request<ProfileConnectionTestResult>("/profiles/test-connection", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createJob(payload: JobInput): Promise<Job> {
  return request<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getJob(jobId: number): Promise<Job> {
  return request<Job>(`/jobs/${jobId}`);
}
