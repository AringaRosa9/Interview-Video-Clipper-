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
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});
    setStatus("");

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
    setStatus("");
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
        setStatus("配置已更新");
      } else {
        await createProfile(form);
        setStatus("配置已保存");
        setForm(emptyForm);
      }

      setErrors({});
      onSaved();
    } catch {
      setStatus("保存失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConnectionResult(result: ProfileConnectionTestResult) {
    setStatus(result.message);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{profile ? "编辑配置" : "新建配置"}</h2>

      <div>
        <label htmlFor="profile-name">配置名称</label>
        <input
          id="profile-name"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        {errors.name ? <div>{errors.name}</div> : null}
      </div>

      <div>
        <label htmlFor="profile-base-url">接口地址</label>
        <input
          id="profile-base-url"
          placeholder="例如：https://api.openai.com/v1"
          value={form.base_url}
          onChange={(event) => updateField("base_url", event.target.value)}
        />
        {errors.base_url ? <div>{errors.base_url}</div> : null}
      </div>

      <div>
        <label htmlFor="profile-api-key">接口密钥</label>
        <input
          id="profile-api-key"
          placeholder="请输入接口密钥"
          type="password"
          value={form.api_key}
          onChange={(event) => updateField("api_key", event.target.value)}
        />
        {errors.api_key ? <div>{errors.api_key}</div> : null}
      </div>

      <div>
        <label htmlFor="profile-model">模型名称</label>
        <input
          id="profile-model"
          placeholder="例如：gpt-4.1-mini"
          value={form.model}
          onChange={(event) => updateField("model", event.target.value)}
        />
        {errors.model ? <div>{errors.model}</div> : null}
      </div>

      <div>
        <label htmlFor="profile-default">设为默认配置</label>
        <input
          id="profile-default"
          type="checkbox"
          checked={form.is_default}
          onChange={(event) => updateField("is_default", event.target.checked)}
        />
      </div>

      <div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存配置"}
        </button>
        {profile ? (
          <button type="button" onClick={onCancelEdit}>
            取消编辑
          </button>
        ) : null}
        <ProfileTestButton
          payload={{
            base_url: form.base_url,
            api_key: form.api_key,
            model: form.model,
          }}
          disabled={!form.base_url || !form.api_key || !form.model}
          onResult={handleConnectionResult}
        />
      </div>

      {status ? <p>{status}</p> : null}
    </form>
  );
}
