import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks";
import { type ClaudeInstallation, type ClaudeSettings } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

import { ClaudeVersionSelector } from "../ClaudeVersionSelector";

interface GeneralSettingsSectionProps {
  settings: ClaudeSettings | null;
  currentBinaryPath: string | null;
  selectedInstallation: ClaudeInstallation | null;
  binaryPathChanged: boolean;
  updateSetting: (key: string, value: unknown) => void;
  onClaudeInstallationSelect: (installation: ClaudeInstallation) => void;
}

export const GeneralSettingsSection: React.FC<GeneralSettingsSectionProps> = ({
  settings,
  currentBinaryPath,
  binaryPathChanged,
  updateSetting,
  onClaudeInstallationSelect,
}) => {
  const { t } = useI18n();
  const { theme, setTheme, customColors, setCustomColors } = useTheme();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">{t.settings.generalSettings}</h3>

      <div className="space-y-4">
        {/* Theme Selector */}
        <div className="space-y-2">
          <Label htmlFor="theme">{t.settings.theme}</Label>
          <Select value={theme} onValueChange={(value) => setTheme(value as any)}>
            <SelectTrigger id="theme" className="w-full">
              <SelectValue placeholder={t.settings.selectTheme} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t.settings.themeDark}</SelectItem>
              <SelectItem value="gray">{t.settings.themeGray}</SelectItem>
              <SelectItem value="light">{t.settings.themeLight}</SelectItem>
              <SelectItem value="custom">{t.settings.themeCustom}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t.settings.themeDesc}</p>
        </div>

        {/* Custom Color Editor */}
        {theme === 'custom' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h4 className="text-sm font-medium">{t.settings.customThemeColors}</h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Background Color */}
              <div className="space-y-2">
                <Label htmlFor="color-background" className="text-xs">{t.settings.colorBackground}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-background"
                    type="text"
                    value={customColors.background}
                    onChange={(e) => setCustomColors({ background: e.target.value })}
                    placeholder="oklch(0.12 0.01 240)"
                    className="font-mono text-xs"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: customColors.background }} />
                </div>
              </div>

              {/* Foreground Color */}
              <div className="space-y-2">
                <Label htmlFor="color-foreground" className="text-xs">{t.settings.colorForeground}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-foreground"
                    type="text"
                    value={customColors.foreground}
                    onChange={(e) => setCustomColors({ foreground: e.target.value })}
                    placeholder="oklch(0.98 0.01 240)"
                    className="font-mono text-xs"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: customColors.foreground }} />
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="color-primary" className="text-xs">{t.settings.colorPrimary}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-primary"
                    type="text"
                    value={customColors.primary}
                    onChange={(e) => setCustomColors({ primary: e.target.value })}
                    placeholder="oklch(0.98 0.01 240)"
                    className="font-mono text-xs"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: customColors.primary }} />
                </div>
              </div>

              {/* Card Color */}
              <div className="space-y-2">
                <Label htmlFor="color-card" className="text-xs">{t.settings.colorCard}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-card"
                    type="text"
                    value={customColors.card}
                    onChange={(e) => setCustomColors({ card: e.target.value })}
                    placeholder="oklch(0.14 0.01 240)"
                    className="font-mono text-xs"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: customColors.card }} />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="color-accent" className="text-xs">{t.settings.colorAccent}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-accent"
                    type="text"
                    value={customColors.accent}
                    onChange={(e) => setCustomColors({ accent: e.target.value })}
                    placeholder="oklch(0.16 0.01 240)"
                    className="font-mono text-xs"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: customColors.accent }} />
                </div>
              </div>

              {/* Destructive Color */}
              <div className="space-y-2">
                <Label htmlFor="color-destructive" className="text-xs">{t.settings.colorDestructive}</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-destructive"
                    type="text"
                    value={customColors.destructive}
                    onChange={(e) => setCustomColors({ destructive: e.target.value })}
                    placeholder="oklch(0.6 0.2 25)"
                    className="font-mono text-xs"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: customColors.destructive }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t.settings.cssColorValuesDesc}</p>
          </div>
        )}

        {/* Include Co-authored By */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="coauthored">{t.settings.includeCoAuthoredBy}</Label>
            <p className="text-xs text-muted-foreground">{t.settings.includeCoAuthoredByDesc}</p>
          </div>
          <Switch
            id="coauthored"
            checked={settings?.includeCoAuthoredBy !== false}
            onCheckedChange={(checked) => updateSetting("includeCoAuthoredBy", checked)}
          />
        </div>

        {/* Verbose Output */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="verbose">{t.settings.verboseOutput}</Label>
            <p className="text-xs text-muted-foreground">{t.settings.verboseOutputDesc}</p>
          </div>
          <Switch
            id="verbose"
            checked={settings?.verbose === true}
            onCheckedChange={(checked) => updateSetting("verbose", checked)}
          />
        </div>

        {/* Cleanup Period */}
        <div className="space-y-2">
          <Label htmlFor="cleanup">{t.settings.chatRetention}</Label>
          <Input
            id="cleanup"
            type="number"
            min="1"
            placeholder="30"
            value={settings?.cleanupPeriodDays?.toString() || ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              updateSetting("cleanupPeriodDays", value);
            }}
          />
          <p className="text-xs text-muted-foreground">{t.settings.chatRetentionDesc}</p>
        </div>

        {/* Claude Binary Path Selector */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">{t.settings.claudeInstallation}</Label>
            <p className="text-xs text-muted-foreground mb-4">{t.settings.claudeInstallationDesc}</p>
          </div>
          <ClaudeVersionSelector
            selectedPath={currentBinaryPath}
            onSelect={onClaudeInstallationSelect}
          />
          {currentBinaryPath && !binaryPathChanged && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {t.settings.claudeInstallation || "Claude installation selected"}
            </p>
          )}
          {binaryPathChanged && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{t.settings.binaryPathChanged}</p>
          )}
        </div>
      </div>
    </div>
  );
};
