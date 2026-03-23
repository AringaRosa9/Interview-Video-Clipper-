import { useState } from "react";
import { testProfileConnection } from "../../lib/api";
import type { ProfileConnectionTestPayload, ProfileConnectionTestResult } from "../../lib/types";

type ProfileTestButtonProps = {
  payload: ProfileConnectionTestPayload;
  disabled?: boolean;
  onResult?: (result: ProfileConnectionTestResult) => void;
};

export function ProfileTestButton({
  payload,
  disabled = false,
  onResult,
}: ProfileTestButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      const result = await testProfileConnection(payload);
      onResult?.(result);
    } catch {
      onResult?.({ status: "error", message: "连接失败，请检查配置" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleClick}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? (
        <>
          <span className="spinner" />
          测试中...
        </>
      ) : (
        <>🔌 测试连接</>
      )}
    </button>
  );
}
