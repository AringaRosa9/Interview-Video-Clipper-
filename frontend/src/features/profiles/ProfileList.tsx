import type { Profile } from "../../lib/types";

type ProfileListProps = {
  profiles: Profile[];
  selectedProfileId?: number;
  onSelect: (profile: Profile) => void;
};

export function ProfileList({ profiles, selectedProfileId, onSelect }: ProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔑</div>
        <div className="empty-state-title">还没有保存的配置</div>
        <div className="empty-state-desc">在左侧新建一个 API Key 配置</div>
      </div>
    );
  }

  return (
    <section aria-label="已保存配置">
      <div className="section-header">
        <div className="section-title">已保存配置</div>
        <span className="status-tag status-tag-cyan">{profiles.length} 个</span>
      </div>
      <div className="profile-grid">
        {profiles.map((profile) => {
          const isEditing = selectedProfileId === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              className={`profile-card${isEditing ? " active-edit" : ""}`}
              onClick={() => onSelect(profile)}
              style={{ textAlign: "left", width: "100%", cursor: "pointer", background: "transparent", border: undefined }}
            >
              <div className="profile-card-icon">🤖</div>
              <div className="profile-card-info">
                <div className="profile-card-name">
                  {profile.name}
                  {profile.is_default && <span className="badge badge-default">默认</span>}
                  {isEditing && <span className="badge badge-editing">编辑中</span>}
                </div>
                <div className="profile-card-meta">
                  {profile.model} · {profile.base_url}
                </div>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>›</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
