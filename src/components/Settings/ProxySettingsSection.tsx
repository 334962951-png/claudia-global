import React from "react";

import { ProxySettings as ProxySettingsInner } from "@/components/ProxySettings";

interface ProxySettingsSectionProps {
  setToast: (v: { message: string; type: "success" | "error" } | null) => void;
  onChange: (hasChanges: boolean, _getSettings: () => unknown, save: () => Promise<void>) => void;
}

export const ProxySettingsSection: React.FC<ProxySettingsSectionProps> = ({
  setToast,
  onChange,
}) => {
  return (
    <ProxySettingsInner
      setToast={setToast}
      onChange={onChange}
    />
  );
};
