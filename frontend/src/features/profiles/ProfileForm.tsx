import { useEffect, useState, type FormEvent } from "react";
import { createProfile, updateProfile } from "../../lib/api";
import type { Profile, ProfileConnectionTestResult, ProfileInput } from "../../lib/types";
import { ProfileTestButton } from "./ProfileTestButton";

type ProfileFormProps = {
  profile?: Profile;
  onSaved: () => void;
  onCancelEdit?: () => void;
};

const emptyForm: ProfileInput = {
  name: "",
  base_url: "",
  api_key: "",
  model: "",
  is_default: false,
};

export function ProfileForm({ profile, onSaved, onCancelEdit }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({});
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setErrors({});
    setStatus(null);

    if (!profile) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: profile.name,
      base_url: profile.base_url,
      api_key: "",
      model: profile.model,
      is_default: profile.is_default,
    });
  }, [profile]);

  function updateField<K extends keyof ProfileInput>(field: K, value: ProfileInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const nextErrors: Partial<Record<keyof ProfileInput, string>> = {};
    if (!form.name.trim()) nextErrors.name = "请输入配置名称";
    if (!form.base_url.trim()) nextErrors.base_url = "请输入接口地址";
    if (!profile && !form.api_key.trim()) nextErrors.api_key = "请输入接口密钥";
    if (!form.model.trim()) nextErrors.model = "请输入模型名称";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (profile) {
        await updateProfile(profile.id, {
          name: form.name,
          base_url: form.base_url,
          model: form.model,
          is_default: form.is_default,
          ...(form.api_key.trim() ? { api_key: form.api_key } : {}),
        });
        setStatus({ text: "✓ 配置已更新", type: "success" });
      } else {
        await createProfile(form);
        setStatus({ text: "✓ 配置已保存", type: "success" });
        setForm(emptyForm);
      }
      setErrors({});
      onSaved();
    } catch {
      setStatus({ text: "✕ 保存失败，请重试", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConnectionResult(result: ProfileConnectionTestResult) {
    const ok = result.message.includes("成功") || result.message.toLowerCase().includes("ok");
    setStatus({ text: result.message, type: ok ? "success" : "error" });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-title">
          <span className="card-title-icon">{profile ? "✏️" : "➕"}</span>
          {profile ? "编辑配置" : "新建配置"}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="profile-name">配置名称</label>
          <input
            id="profile-name"
            className="form-input"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="例如：Gemini Pro"
          />
          {errors.name && <div className="form-error">⚠ {errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="profile-base-url">接口地址</label>
          <input
            id="profile-base-url"
            className="form-input"
            placeholder="https://api.openai.com/v1"
            value={form.base_url}
            onChange={(event) => updateField("base_url", event.target.value)}
          />
          {errors.base_url && <div className="form-error">⚠ {errors.base_url}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="profile-api-key">
            接口密钥{profile && <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>(留空则不修改)</span>}
          </label>
          <div className="form-input-wrapper">
            <input
              id="profile-api-key"
              className="form-input"
              placeholder="sk-..."
              type={showApiKey ? "text" : "password"}
              value={form.api_key}
              onChange={(event) => updateField("api_key", event.target.value)}
            />
            <button
              type="button"
              className="form-input-action"
              onClick={() => setShowApiKey((v) => !v)}
              tabIndex={-1}
            >
              {showApiKey ? "🙈" : "👁"}
            </button>
          </div>
          {errors.api_key && <div className="form-error">⚠ {errors.api_key}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="profile-model">模型名称</label>
          <input
            id="profile-model"
            className="form-input"
            placeholder="gpt-4o-mini"
            value={form.model}
            onChange={(event) => updateField("model", event.target.value)}
          />
          {errors.model && <div className="form-error">⚠ {errors.model}</div>}
        </div>

        <div className="toggle-group" onClick={() => updateField("is_default", !form.is_default)} style={{ marginBottom: "20px" }}>
          <div className="toggle-switch-label">
            <div className="toggle-switch-title">设为默认配置</div>
            <div className="toggle-switch-desc">剪辑时自动选择此配置</div>
          </div>
          <div className="toggle-switch">
            <input
              id="profile-default"
              type="checkbox"
              checked={form.is_default}
              onChange={(event) => updateField("is_default", event.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="toggle-track" />
            <div className="toggle-thumb" />
          </div>
        </div>

        {status && (
          <div className={`alert alert-${status.type === "success" ? "success" : status.type === "info" ? "info" : "error"}`} style={{ marginBottom: "16px" }}>
            {status.text}
          </div>
        )}

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <><span className="spinner" /> 保存中...</> : "💾 保存配置"}
          </button>
          <ProfileTestButton
            payload={{
              base_url: form.base_url,
              api_key: form.api_key,
              model: form.model,
            }}
            disabled={!form.base_url || !form.api_key || !form.model}
            onResult={handleConnectionResult}
          />
          {profile && (
            <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
              取消编辑
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
