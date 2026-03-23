import type { Profile } from "../../lib/types";

type ProfileListProps = {
  profiles: Profile[];
  selectedProfileId?: number;
  onSelect: (profile: Profile) => void;
};

export function ProfileList({ profiles, selectedProfileId, onSelect }: ProfileListProps) {
  if (profiles.length === 0) {
    return <p>还没有保存的配置。</p>;
  }

  return (
    <section aria-label="已保存配置">
      <h2>已保存配置</h2>
      <ul>
        {profiles.map((profile) => (
          <li key={profile.id}>
            <button type="button" onClick={() => onSelect(profile)}>
              {profile.name}
            </button>
            {selectedProfileId === profile.id ? <span> 当前编辑</span> : null}
            {profile.is_default ? <span> 默认</span> : null}
            <div>{profile.base_url}</div>
            <div>{profile.model}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
