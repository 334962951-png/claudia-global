import { BarChart3, Shield, Trash } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTrackEvent } from "@/hooks";
import { analytics } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

import { AnalyticsConsent } from "../AnalyticsConsent";

interface AnalyticsSettingsProps {
  analyticsEnabled: boolean;
  analyticsConsented: boolean;
  setAnalyticsEnabled: (v: boolean) => void;
  setAnalyticsConsented: (v: boolean) => void;
  showAnalyticsConsent: boolean;
  setShowAnalyticsConsent: (v: boolean) => void;
  setToast: (v: { message: string; type: "success" | "error" } | null) => void;
  loadAnalyticsSettings: () => Promise<void>;
}

export const AnalyticsSettingsSection: React.FC<AnalyticsSettingsProps> = ({
  analyticsEnabled,
  analyticsConsented,
  setAnalyticsEnabled,
  setAnalyticsConsented,
  showAnalyticsConsent,
  setShowAnalyticsConsent,
  setToast,
  loadAnalyticsSettings,
}) => {
  const { t } = useI18n();
  const trackEvent = useTrackEvent();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold">{t.analytics.analyticsSettings}</h3>
        </div>

        <div className="space-y-6">
          {/* Analytics Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="analytics-enabled" className="text-base">{t.analytics.enableAnalytics}</Label>
              <p className="text-sm text-muted-foreground">
                {t.analytics.helpImprove}
              </p>
            </div>
            <Switch
              id="analytics-enabled"
              checked={analyticsEnabled}
              variant="high-contrast"
              onCheckedChange={async (checked) => {
                if (checked && !analyticsConsented) {
                  setShowAnalyticsConsent(true);
                } else if (checked) {
                  await analytics.enable();
                  setAnalyticsEnabled(true);
                  trackEvent.settingsChanged('analytics_enabled', true);
                  setToast({ message: t.analytics.analyticsEnabled, type: "success" });
                } else {
                  await analytics.disable();
                  setAnalyticsEnabled(false);
                  trackEvent.settingsChanged('analytics_enabled', false);
                  setToast({ message: t.analytics.analyticsDisabled, type: "success" });
                }
              }}
            />
          </div>

          {/* Privacy Info */}
          <div className="rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-100 dark:bg-blue-900/30 p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-700 dark:text-blue-300 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900 dark:text-blue-50">{t.analytics.privacyProtected}</p>
                <ul className="text-sm text-blue-800 dark:text-blue-100 space-y-1">
                  <li>• {t.analytics.noPersonalInfo}</li>
                  <li>• {t.analytics.noFileContents}</li>
                  <li>• {t.analytics.anonymousIds}</li>
                  <li>• {t.analytics.optOutAnytime}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Collection Info */}
          {analyticsEnabled && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-foreground">{t.analytics.whatWeCollect}</h4>
                <ul className="text-sm text-foreground/80 space-y-1">
                  <li>• {t.analytics.featureUsage}</li>
                  <li>• {t.analytics.performanceMetrics}</li>
                  <li>• {t.analytics.errorReports}</li>
                  <li>• {t.analytics.usagePatterns}</li>
                </ul>
              </div>

              {/* Delete Data Button */}
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await analytics.deleteAllData();
                    setAnalyticsEnabled(false);
                    setAnalyticsConsented(false);
                    setToast({ message: t.analytics.allDataDeleted, type: "success" });
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {t.analytics.deleteAllData}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Consent Dialog */}
      <AnalyticsConsent
        open={showAnalyticsConsent}
        onOpenChange={setShowAnalyticsConsent}
        onComplete={async () => {
          await loadAnalyticsSettings();
          setShowAnalyticsConsent(false);
        }}
      />
    </div>
  );
};
