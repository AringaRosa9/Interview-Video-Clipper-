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
