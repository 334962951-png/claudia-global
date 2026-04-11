import React from "react";

import { HooksEditor } from "@/components/HooksEditor";
import { useI18n } from "@/lib/i18n";

interface HooksSettingsSectionProps {
  activeSection: string;
  onChange: (hasChanges: boolean, getHooks: () => unknown) => void;
}

export const HooksSettingsSection: React.FC<HooksSettingsSectionProps> = ({
  activeSection,
  onChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t.settings.userHooks}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t.settings.userHooksDesc}
        </p>
      </div>

      <HooksEditor
        key={activeSection}
        scope="user"
        className="border-0"
        hideActions={true}
        onChange={onChange}
      />
    </div>
  );
};
