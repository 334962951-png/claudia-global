import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AudioNotificationConfig,
  type AudioNotificationMode,
  audioNotificationManager,
} from "@/lib/audioNotification";
import type { ClaudeSettings } from "@/lib/api";
import { FONT_SCALE_OPTIONS, type FontScale } from "@/lib/fontScale";
import { useI18n } from "@/lib/i18n";
import { logger } from "@/lib/logger";

interface AdvancedSettingsSectionProps {
  settings: ClaudeSettings | null;
  updateSetting: (key: string, value: unknown) => void;
  audioConfig: AudioNotificationConfig;
  setAudioConfig: React.Dispatch<React.SetStateAction<AudioNotificationConfig>>;
  setAudioConfigChanged: (v: boolean) => void;
  fontScale: FontScale;
  setFontScale: (v: FontScale) => void;
  customMultiplierInput: string;
  setCustomMultiplierInput: (v: string) => void;
  setFontScaleChanged: (v: boolean) => void;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  settings,
  updateSetting,
  audioConfig,
  setAudioConfig,
  setAudioConfigChanged,
  fontScale,
  setFontScale,
  customMultiplierInput,
  setCustomMultiplierInput,
  setFontScaleChanged,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t.settings.advancedSettings}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t.settings.advancedSettingsDesc}</p>
      </div>

      {/* API Key Helper */}
      <div className="space-y-2">
        <Label htmlFor="apiKeyHelper">{t.settings.apiKeyHelper}</Label>
        <Input
          id="apiKeyHelper"
          placeholder="/path/to/generate_api_key.sh"
          value={settings?.apiKeyHelper?.toString() || ""}
          onChange={(e) => updateSetting("apiKeyHelper", e.target.value || undefined)}
        />
        <p className="text-xs text-muted-foreground">{t.settings.apiKeyHelperDesc}</p>
      </div>

      {/* Font Scale */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">{t.settings.fontScale}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t.settings.fontScaleDesc}</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="fontScale" className="text-sm">{t.settings.fontScale}</Label>
            <div className="space-y-2 mt-2">
              {Object.entries(FONT_SCALE_OPTIONS).map(([key, config]) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`font-${key}`}
                    name="fontScale"
                    value={key}
                    checked={fontScale === key}
                    onChange={(e) => {
                      const newScale = e.target.value as FontScale;
                      setFontScale(newScale);
                      setFontScaleChanged(true);
                    }}
                    className="w-4 h-4 text-primary bg-background border-border focus:ring-ring focus:ring-2"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`font-${key}`} className="text-sm font-medium">
                      {t.settings[`fontScale${key.charAt(0).toUpperCase() + key.slice(1).replace('-', '')}` as keyof typeof t.settings]}
                      {key !== 'custom' && ` (${config.multiplier}x)`}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t.settings[`fontScale${key.charAt(0).toUpperCase() + key.slice(1).replace('-', '')}Desc` as keyof typeof t.settings]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom multiplier input */}
            {fontScale === 'custom' && (
              <div className="mt-4 p-4 border rounded-md bg-muted/50">
                <Label htmlFor="customMultiplier" className="text-sm font-medium">
                  {t.settings.customMultiplier}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.settings.customMultiplierDesc}
                </p>
                <div className="flex items-center space-x-2">
                  <Input
                    id="customMultiplier"
                    type="number"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={customMultiplierInput}
                    onChange={(e) => {
                      setCustomMultiplierInput(e.target.value);
                      setFontScaleChanged(true);
                    }}
                    placeholder={t.settings.customMultiplierPlaceholder}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settings.customMultiplierRange}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Notifications */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">{t.settings.audioNotifications}</Label>
          <p className="text-xs text-muted-foreground mt-1">
            {t.settings.audioNotificationsDesc}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="audioMode" className="text-sm">{t.settings.audioNotificationMode}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t.settings.audioNotificationModeDesc}</p>
            <div className="space-y-2">
              {[
                { value: "off", label: t.settings.audioModeOff, desc: t.settings.audioModeOffDesc },
                { value: "on_message", label: t.settings.audioModeOnMessage, desc: t.settings.audioModeOnMessageDesc },
                { value: "on_queue", label: t.settings.audioModeOnQueue, desc: t.settings.audioModeOnQueueDesc },
              ].map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id={`audio-${option.value}`}
                    name="audioMode"
                    value={option.value}
                    checked={audioConfig.mode === option.value}
                    onChange={(e) => {
                      setAudioConfig({ mode: e.target.value as AudioNotificationMode });
                      setAudioConfigChanged(true);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`audio-${option.value}`} className="text-sm font-medium">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Label className="text-sm">{t.settings.testAudio}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t.settings.testAudioDesc}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await audioNotificationManager.testNotification();
                } catch (error) {
                  logger.error("Failed to test audio notification:", error);
                }
              }}
              className="gap-2"
            >
              {t.settings.playTestSound}
            </Button>
          </div>
        </div>
      </div>

      {/* Raw JSON Editor */}
      <div className="space-y-2">
        <Label>{t.settings.rawSettings}</Label>
        <div className="p-3 rounded-md bg-muted font-mono text-xs overflow-x-auto whitespace-pre-wrap">
          <pre>{JSON.stringify(settings, null, 2)}</pre>
        </div>
        <p className="text-xs text-muted-foreground">{t.settings.rawSettingsDesc}</p>
      </div>
    </div>
  );
};
