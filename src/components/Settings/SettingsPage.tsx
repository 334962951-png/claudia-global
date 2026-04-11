import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/errorHandler";
import {
  type EnvironmentVariable as DbEnvironmentVariable,
  type EnvironmentVariableGroup,
  type ClaudeSettings,
  type ClaudeInstallation,
  api,
} from "@/lib/api";
import {
  type AudioNotificationConfig,
  audioNotificationManager,
  loadAudioConfigFromLocalStorage,
  saveAudioConfigToLocalStorage,
  loadAudioConfigFromSettings,
} from "@/lib/audioNotification";
import { fontScaleManager, type FontScale } from "@/lib/fontScale";
import { handleError } from "@/lib/errorHandler";
import { analytics } from "@/lib/analytics";

import { GeneralSettingsSection } from "./GeneralSettings";
import { PermissionsSettingsSection } from "./PermissionsSettings";
import { EnvironmentSettingsSection } from "./EnvironmentSettings";
import { AdvancedSettingsSection } from "./AdvancedSettings";
import { HooksSettingsSection } from "./HooksSettingsSection";
import { CommandsSettingsSection } from "./CommandsSettingsSection";
import { StorageSettingsSection } from "./StorageSettingsSection";
import { ProxySettingsSection } from "./ProxySettingsSection";
import { AnalyticsSettingsSection } from "./AnalyticsSettings";

export type SettingsSection =
  | "general"
  | "permissions"
  | "environment"
  | "advanced"
  | "hooks"
  | "commands"
  | "storage"
  | "proxy"
  | "analytics";

interface SettingsPageProps {
  onBack: () => void;
  className?: string;
}

interface PermissionRule {
  id: string;
  value: string;
}

const NAV_ITEMS: { id: SettingsSection; labelKey: string; icon?: string }[] = [
  { id: "general", labelKey: "t.settings.general" },
  { id: "permissions", labelKey: "t.settings.permissions" },
  { id: "environment", labelKey: "t.settings.environment" },
  { id: "advanced", labelKey: "t.settings.advanced" },
  { id: "hooks", labelKey: "t.settings.hooks" },
  { id: "commands", labelKey: "t.settings.commands" },
  { id: "storage", labelKey: "t.settings.storage" },
  { id: "proxy", labelKey: "t.proxy.title" },
  { id: "analytics", labelKey: "t.analytics.title" },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, className }) => {
  const { t } = useI18n();

  // Core settings state
  const [settings, setSettings] = useState<ClaudeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [currentBinaryPath, setCurrentBinaryPath] = useState<string | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<ClaudeInstallation | null>(null);
  const [binaryPathChanged, setBinaryPathChanged] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Permission rules state
  const [allowRules, setAllowRules] = useState<PermissionRule[]>([]);
  const [denyRules, setDenyRules] = useState<PermissionRule[]>([]);

  // Environment variables state
  const [envVars, setEnvVars] = useState<DbEnvironmentVariable[]>([]);
  const [envGroups, setEnvGroups] = useState<EnvironmentVariableGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [showAddGroup, setShowAddGroup] = useState<boolean>(false);

  // Hooks state
  const [userHooksChanged, setUserHooksChanged] = useState(false);

  // Audio + font scale state
  const [audioConfig, setAudioConfig] = useState<AudioNotificationConfig>({ mode: "off" });
  const [audioConfigChanged, setAudioConfigChanged] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>(fontScaleManager.getCurrentScale());
  const [customMultiplierInput, setCustomMultiplierInput] = useState<string>(fontScaleManager.getCustomMultiplier().toString());
  const [fontScaleChanged, setFontScaleChanged] = useState(false);

  // Proxy state
  const [proxySettingsChanged, setProxySettingsChanged] = useState(false);
  const saveProxySettings = useRef<(() => Promise<void>) | null>(null);

  // Analytics state
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsConsented, setAnalyticsConsented] = useState(false);
  const [showAnalyticsConsent, setShowAnalyticsConsent] = useState(false);

  const getUserHooks = useRef<(() => unknown) | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadClaudeBinaryPath();
    loadAnalyticsSettings();
  }, []);

  const loadAnalyticsSettings = async () => {
    try {
      const settings = analytics.getSettings();
      if (settings) {
        setAnalyticsEnabled(settings.enabled);
        setAnalyticsConsented(settings.hasConsented);
      }
    } catch {}
  };

  const loadClaudeBinaryPath = async () => {
    try {
      const path = await api.getClaudeBinaryPath();
      setCurrentBinaryPath(path);
    } catch (err) {
      await handleApiError(err as Error, { operation: "loadClaudeBinaryPath", component: "SettingsPage" });
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSettings = await api.getClaudeSettings();

      if (!loadedSettings || typeof loadedSettings !== "object") {
        logger.warn("Loaded settings is not an object:", loadedSettings);
        setSettings({});
        return;
      }

      setSettings(loadedSettings);

      // Parse permissions
      if (loadedSettings.permissions && typeof loadedSettings.permissions === "object") {
        const permissions = loadedSettings.permissions as { allow?: string[]; deny?: string[] };
        if (Array.isArray(permissions.allow)) {
          setAllowRules(permissions.allow.map((rule: string, index: number) => ({
            id: `allow-${index}`,
            value: rule,
          })));
        }
        if (Array.isArray(permissions.deny)) {
          setDenyRules(permissions.deny.map((rule: string, index: number) => ({
            id: `deny-${index}`,
            value: rule,
          })));
        }
      }

      // Load environment variables
      try {
        const dbEnvVars = await api.getEnvironmentVariables();
        if (loadedSettings.env && typeof loadedSettings.env === "object" && !Array.isArray(loadedSettings.env)) {
          const envToMigrate = Object.entries(loadedSettings.env as Record<string, unknown>).map(([key, value]) => ({
            key,
            value: String(value ?? ""),
            enabled: true,
            sort_order: 0,
            group_id: undefined,
          }));
          if (envToMigrate.length > 0) {
            const existingKeys = new Set(dbEnvVars.map(v => v.key));
            const newVars = envToMigrate.filter(v => !existingKeys.has(v.key));
            const allVars = [...dbEnvVars, ...newVars];
            const normalizedVars = allVars.map(envVar => ({
              ...envVar,
              enabled: envVar.enabled ?? true,
              group_id: envVar.group_id ?? undefined,
              sort_order: envVar.sort_order ?? 0,
            }));
            await api.saveEnvironmentVariables(normalizedVars);
            setEnvVars(normalizedVars);
          } else {
            setEnvVars(dbEnvVars.map(v => ({ ...v, enabled: v.enabled ?? true, group_id: v.group_id ?? undefined, sort_order: v.sort_order ?? 0 })));
          }
        } else {
          setEnvVars(dbEnvVars.map(v => ({ ...v, enabled: v.enabled ?? true, group_id: v.group_id ?? undefined, sort_order: v.sort_order ?? 0 })));
        }
        const groups = await api.getEnvironmentVariableGroups();
        setEnvGroups(groups);
      } catch {}

      // Audio config
      try {
        const legacyConfig = loadAudioConfigFromSettings(loadedSettings);
        if (legacyConfig.mode !== "off") saveAudioConfigToLocalStorage(legacyConfig);
        const cfg = loadAudioConfigFromLocalStorage();
        setAudioConfig(cfg);
        audioNotificationManager.setConfig(cfg);
      } catch {
        setAudioConfig({ mode: "off" });
        audioNotificationManager.setConfig({ mode: "off" });
      }

      // Font scale
      setFontScale(fontScaleManager.getCurrentScale());
      setCustomMultiplierInput(fontScaleManager.getCustomMultiplier().toString());
    } catch (err) {
      await handleError("Failed to load settings:", { context: err });
      setError(t.settings.failedToSaveSettings);
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [t.settings.failedToSaveSettings]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setToast(null);

      const updatedSettings: ClaudeSettings = {
        ...settings,
        permissions: {
          allow: allowRules.map(rule => rule.value).filter(v => v && String(v).trim()),
          deny: denyRules.map(rule => rule.value).filter(v => v && String(v).trim()),
        },
      };

      // Save env vars
      try {
        const filteredEnvVars = envVars.filter(({ key, value }) => key && String(key).trim() && value && String(value).trim());
        const keyGroupMap = new Map<string, Set<number | undefined>>();
        const duplicates: string[] = [];
        filteredEnvVars.forEach((envVar) => {
          const key = envVar.key.trim();
          const groupId = envVar.group_id;
          if (!keyGroupMap.has(key)) keyGroupMap.set(key, new Set());
          const groupsForKey = keyGroupMap.get(key)!;
          if (groupsForKey.has(groupId)) {
            duplicates.push(`"${key}" in group ${groupId || 'ungrouped'}`);
          } else {
            groupsForKey.add(groupId);
          }
        });
        if (duplicates.length > 0) {
          setToast({ message: `Duplicate keys: ${duplicates.join(', ')}`, type: "error" });
          throw new Error(`Duplicate environment variable keys found: ${duplicates.join(', ')}`);
        }
        const deduplicatedVars = new Map<string, DbEnvironmentVariable>();
        filteredEnvVars.forEach((envVar) => {
          const uniqueKey = `${envVar.group_id || 0}-${envVar.key.trim()}`;
          deduplicatedVars.set(uniqueKey, envVar);
        });
        await api.saveEnvironmentVariables(Array.from(deduplicatedVars.values()));
      } catch {}

      // Audio config
      if (audioConfigChanged) {
        try {
          saveAudioConfigToLocalStorage(audioConfig);
          audioNotificationManager.setConfig(audioConfig);
          setAudioConfigChanged(false);
        } catch {}
      }

      // Font scale
      if (fontScaleChanged) {
        if (fontScale === 'custom') {
          const customValue = parseFloat(customMultiplierInput);
          if (!isNaN(customValue) && customValue >= 0.5 && customValue <= 3.0) {
            fontScaleManager.setScale(fontScale, customValue);
          } else {
            fontScaleManager.setScale(fontScale);
          }
        } else {
          fontScaleManager.setScale(fontScale);
        }
        setFontScaleChanged(false);
      }

      await api.saveClaudeSettings(updatedSettings);
      setSettings(updatedSettings);

      // Binary path
      if (binaryPathChanged && selectedInstallation) {
        await api.setClaudeBinaryPath(selectedInstallation.path);
        try {
          await api.refreshClaudeBinaryPath();
          setCurrentBinaryPath(selectedInstallation.path);
          window.dispatchEvent(new CustomEvent("claude-version-changed"));
        } catch {
          setCurrentBinaryPath(selectedInstallation.path);
          window.dispatchEvent(new CustomEvent("claude-version-changed"));
        }
        setBinaryPathChanged(false);
      }

      // Hooks
      if (userHooksChanged && getUserHooks.current) {
        const hooks = getUserHooks.current();
        await api.updateHooksConfig("user", hooks as Record<string, unknown>);
        setUserHooksChanged(false);
      }

      // Proxy
      if (proxySettingsChanged && saveProxySettings.current) {
        await saveProxySettings.current();
        setProxySettingsChanged(false);
      }

      setToast({ message: t.settings.settingsSavedSuccessfully ?? "Settings saved successfully", type: "success" });
    } catch (err) {
      await handleError("Failed to save settings:", { context: err });
      setError("Failed to save settings.");
      setToast({ message: t.settings.failedToSaveSettings ?? "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Permission rules
  const addPermissionRule = (type: "allow" | "deny") => {
    const newRule: PermissionRule = { id: `${type}-${Date.now()}`, value: "" };
    if (type === "allow") setAllowRules((prev) => [...prev, newRule]);
    else setDenyRules((prev) => [...prev, newRule]);
  };

  const updatePermissionRule = (type: "allow" | "deny", id: string, value: string) => {
    if (type === "allow") setAllowRules((prev) => prev.map((r) => r.id === id ? { ...r, value } : r));
    else setDenyRules((prev) => prev.map((r) => r.id === id ? { ...r, value } : r));
  };

  const removePermissionRule = (type: "allow" | "deny", id: string) => {
    if (type === "allow") setAllowRules((prev) => prev.filter((r) => r.id !== id));
    else setDenyRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Environment variables
  const addEnvVar = (groupId?: number) => {
    setEnvVars((prev) => [...prev, { key: "", value: "", enabled: true, group_id: groupId, sort_order: 0 }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const addEnvGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const newGroup = await api.createEnvironmentVariableGroup(newGroupName.trim(), undefined, envGroups.length);
      setEnvGroups([...envGroups, newGroup]);
      setNewGroupName("");
      setShowAddGroup(false);
    } catch {
      setToast({ message: "Failed to create group", type: "error" });
    }
  };

  const deleteEnvGroup = async (groupId: number) => {
    try {
      await api.deleteEnvironmentVariableGroup(groupId);
      setEnvGroups((prev) => prev.filter((g) => g.id !== groupId));
      setEnvVars((prev) => prev.map((v) => v.group_id === groupId ? { ...v, group_id: undefined } : v));
    } catch {
      setToast({ message: "Failed to delete group", type: "error" });
    }
  };

  const toggleGroupEnabled = async (groupId: number, enabled: boolean) => {
    try {
      const group = envGroups.find(g => g.id === groupId);
      if (!group) return;
      if (enabled) {
        const currentGroupVars = envVars.filter(v => v.group_id === groupId);
        const currentGroupKeys = new Set(currentGroupVars.map(v => v.key.trim()).filter(key => key));
        const conflictingGroups = envGroups.filter(g => g.id !== groupId && g.enabled && envVars.some(v => v.group_id === g.id && currentGroupKeys.has(v.key.trim())));
        const ungroupedVars = envVars.filter(v => !v.group_id);
        const hasUngroupedConflict = ungroupedVars.some(v => currentGroupKeys.has(v.key.trim()));
        for (const conflictGroup of conflictingGroups) {
          await api.updateEnvironmentVariableGroup(conflictGroup.id!, conflictGroup.name, conflictGroup.description, false, conflictGroup.sort_order);
        }
        if (hasUngroupedConflict) {
          const updatedVars = envVars.map(v => (!v.group_id && currentGroupKeys.has(v.key.trim())) ? { ...v, enabled: false } : v);
          setEnvVars(updatedVars);
          await api.saveEnvironmentVariables(updatedVars);
        }
        setEnvGroups(groups => groups.map(g => {
          if (g.id === groupId) return { ...g, enabled: true };
          if (conflictingGroups.some(cg => cg.id === g.id)) return { ...g, enabled: false };
          return g;
        }));
      }
      const updatedGroup = await api.updateEnvironmentVariableGroup(groupId, group.name, group.description, enabled, group.sort_order);
      if (!enabled) setEnvGroups(groups => groups.map(g => g.id === groupId ? updatedGroup : g));
    } catch {
      setToast({ message: "Failed to update group", type: "error" });
    }
  };

  const updateEnvVar = async (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    if (field === "enabled" && value === true) {
      const envVar = envVars[index];
      if (!envVar.group_id && envVar.key.trim()) {
        // Enable ungrouped var - disable conflicting groups
        try {
          const conflictingGroups = envGroups.filter(g => g.enabled && envVars.some(v => v.group_id === g.id && v.key.trim() === envVar.key.trim()));
          for (const conflictGroup of conflictingGroups) {
            await api.updateEnvironmentVariableGroup(conflictGroup.id!, conflictGroup.name, conflictGroup.description, false, conflictGroup.sort_order);
          }
          if (conflictingGroups.length > 0) {
            setEnvGroups(groups => groups.map(g => conflictingGroups.some(cg => cg.id === g.id) ? { ...g, enabled: false } : g));
          }
        } catch {}
      }
    }
    const updatedVars = envVars.map((v, i) => i === index ? { ...v, [field]: value } : v);
    setEnvVars(updatedVars);
    try {
      await api.saveEnvironmentVariables(updatedVars);
    } catch {
      setToast({ message: "Failed to save env var", type: "error" });
    }
  };

  const isDuplicateKey = (currentIndex: number, key: string, groupId?: number) => {
    if (!key.trim()) return false;
    return envVars.some((v, i) => i !== currentIndex && v.key.trim() === key.trim() && v.group_id === groupId);
  };

  const toggleUngroupedEnabled = async (enabled: boolean) => {
    try {
      const ungroupedVars = envVars.filter(v => !v.group_id);
      if (enabled) {
        const ungroupedKeys = new Set(ungroupedVars.map(v => v.key.trim()).filter(key => key));
        const conflictingGroups = envGroups.filter(g => g.enabled && envVars.some(v => v.group_id === g.id && ungroupedKeys.has(v.key.trim())));
        for (const conflictGroup of conflictingGroups) {
          await api.updateEnvironmentVariableGroup(conflictGroup.id!, conflictGroup.name, conflictGroup.description, false, conflictGroup.sort_order);
        }
        if (conflictingGroups.length > 0) {
          setEnvGroups(groups => groups.map(g => conflictingGroups.some(cg => cg.id === g.id) ? { ...g, enabled: false } : g));
        }
        const updatedVars = envVars.map(v => (!v.group_id) ? { ...v, enabled: true } : v);
        setEnvVars(updatedVars);
        await api.saveEnvironmentVariables(updatedVars);
      } else {
        const updatedVars = envVars.map(v => (!v.group_id) ? { ...v, enabled: false } : v);
        setEnvVars(updatedVars);
        await api.saveEnvironmentVariables(updatedVars);
      }
    } catch {
      setToast({ message: "Failed to update ungrouped variables", type: "error" });
    }
  };

  const handleClaudeInstallationSelect = (installation: ClaudeInstallation) => {
    setSelectedInstallation(installation);
    setBinaryPathChanged(installation.path !== currentBinaryPath);
  };

  // Navigation label resolver
  const getNavLabel = (item: typeof NAV_ITEMS[0]) => {
    if (item.labelKey === "t.proxy.title") return t.proxy.title;
    if (item.labelKey === "t.analytics.title") return t.analytics.title;
    if (item.labelKey === "t.settings.general") return t.settings.general;
    if (item.labelKey === "t.settings.permissions") return t.settings.permissions;
    if (item.labelKey === "t.settings.environment") return t.settings.environment;
    if (item.labelKey === "t.settings.advanced") return t.settings.advanced;
    if (item.labelKey === "t.settings.hooks") return t.settings.hooks;
    if (item.labelKey === "t.settings.commands") return t.settings.commands;
    if (item.labelKey === "t.settings.storage") return t.settings.storage;
    return item.id;
  };

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <GeneralSettingsSection
            settings={settings}
            currentBinaryPath={currentBinaryPath}
            selectedInstallation={selectedInstallation}
            binaryPathChanged={binaryPathChanged}
            updateSetting={updateSetting}
            onClaudeInstallationSelect={handleClaudeInstallationSelect}
          />
        );
      case "permissions":
        return (
          <PermissionsSettingsSection
            allowRules={allowRules}
            denyRules={denyRules}
            addPermissionRule={addPermissionRule}
            updatePermissionRule={updatePermissionRule}
            removePermissionRule={removePermissionRule}
          />
        );
      case "environment":
        return (
          <EnvironmentSettingsSection
            envVars={envVars}
            envGroups={envGroups}
            newGroupName={newGroupName}
            showAddGroup={showAddGroup}
            setNewGroupName={setNewGroupName}
            setShowAddGroup={setShowAddGroup}
            addEnvVar={addEnvVar}
            removeEnvVar={removeEnvVar}
            addEnvGroup={addEnvGroup}
            deleteEnvGroup={deleteEnvGroup}
            toggleGroupEnabled={toggleGroupEnabled}
            updateEnvVar={updateEnvVar}
            isDuplicateKey={isDuplicateKey}
            toggleUngroupedEnabled={toggleUngroupedEnabled}
          />
        );
      case "advanced":
        return (
          <AdvancedSettingsSection
            settings={settings}
            updateSetting={updateSetting}
            audioConfig={audioConfig}
            setAudioConfig={setAudioConfig}
            setAudioConfigChanged={setAudioConfigChanged}
            fontScale={fontScale}
            setFontScale={setFontScale}
            customMultiplierInput={customMultiplierInput}
            setCustomMultiplierInput={setCustomMultiplierInput}
            setFontScaleChanged={setFontScaleChanged}
          />
        );
      case "hooks":
        return (
          <HooksSettingsSection
            activeSection={activeSection}
            onChange={(hasChanges, getHooks) => {
              setUserHooksChanged(hasChanges);
              getUserHooks.current = getHooks;
            }}
          />
        );
      case "commands":
        return <CommandsSettingsSection />;
      case "storage":
        return <StorageSettingsSection />;
      case "proxy":
        return (
          <ProxySettingsSection
            setToast={setToast}
            onChange={(hasChanges, _getSettings, save) => {
              setProxySettingsChanged(hasChanges);
              saveProxySettings.current = save;
            }}
          />
        );
      case "analytics":
        return (
          <AnalyticsSettingsSection
            analyticsEnabled={analyticsEnabled}
            analyticsConsented={analyticsConsented}
            setAnalyticsEnabled={setAnalyticsEnabled}
            setAnalyticsConsented={setAnalyticsConsented}
            showAnalyticsConsent={showAnalyticsConsent}
            setShowAnalyticsConsent={setShowAnalyticsConsent}
            setToast={setToast}
            loadAnalyticsSettings={loadAnalyticsSettings}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background text-foreground ${className ?? ""}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{t.settings.title}</h2>
            <p className="text-xs text-muted-foreground">{t.settings.subtitle}</p>
          </div>
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving || loading}
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.settings.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t.settings.saveSettings}
            </>
          )}
        </Button>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-sm text-destructive flex items-center gap-2"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-column layout */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar nav */}
          <nav className="w-56 shrink-0 border-r border-white/10 bg-zinc-900 overflow-y-auto py-4 px-2">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors duration-150
                      ${isSelected
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      }
                    `}
                  >
                    {getNavLabel(item)}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right content */}
          <main className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}

      {/* Toast */}
      <ToastContainer>
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </ToastContainer>
    </div>
  );
};
