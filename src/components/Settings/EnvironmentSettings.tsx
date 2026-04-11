import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type EnvironmentVariable as DbEnvironmentVariable, type EnvironmentVariableGroup } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface EnvironmentSettingsSectionProps {
  envVars: DbEnvironmentVariable[];
  envGroups: EnvironmentVariableGroup[];
  newGroupName: string;
  showAddGroup: boolean;
  setNewGroupName: (v: string) => void;
  setShowAddGroup: (v: boolean) => void;
  addEnvVar: (groupId?: number) => void;
  removeEnvVar: (index: number) => void;
  addEnvGroup: () => Promise<void>;
  deleteEnvGroup: (groupId: number) => Promise<void>;
  toggleGroupEnabled: (groupId: number, enabled: boolean) => Promise<void>;
  updateEnvVar: (index: number, field: "key" | "value" | "enabled", value: string | boolean) => void;
  isDuplicateKey: (currentIndex: number, key: string, groupId?: number) => boolean;
  toggleUngroupedEnabled: (enabled: boolean) => Promise<void>;
}

export const EnvironmentSettingsSection: React.FC<EnvironmentSettingsSectionProps> = ({
  envVars,
  envGroups,
  newGroupName,
  showAddGroup,
  setNewGroupName,
  setShowAddGroup,
  addEnvVar,
  removeEnvVar,
  addEnvGroup,
  deleteEnvGroup,
  toggleGroupEnabled,
  updateEnvVar,
  isDuplicateKey,
  toggleUngroupedEnabled,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.settings.environmentVariables}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.environmentVariablesDesc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddGroup(!showAddGroup)} className="gap-2">
            <Plus className="h-3 w-3" />
            {t.settings.addGroup}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addEnvVar()} className="gap-2">
            <Plus className="h-3 w-3" />
            {t.settings.addVariable}
          </Button>
        </div>
      </div>

      {/* Add Group Form */}
      {showAddGroup && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
        >
          <Input
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addEnvGroup();
              if (e.key === 'Escape') setShowAddGroup(false);
            }}
          />
          <Button variant="default" size="sm" onClick={addEnvGroup}>
            Create
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAddGroup(false)}>
            Cancel
          </Button>
        </motion.div>
      )}

      {/* Environment Variable Groups */}
      <div className="space-y-4">
        {/* Render grouped variables */}
        {envGroups.map((group) => {
          const groupVars = envVars.filter(v => v.group_id === group.id);
          return (
            <div key={group.id} className="border rounded-lg">
              <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={group.enabled}
                    onCheckedChange={(enabled) => toggleGroupEnabled(group.id!, enabled)}
                    variant="high-contrast"
                    className="flex-shrink-0"
                  />
                  <h4 className="font-medium">{group.name}</h4>
                  {group.description && (
                    <span className="text-sm text-muted-foreground">- {group.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => addEnvVar(group.id)} className="gap-1">
                    <Plus className="h-3 w-3" />
                    {t.settings.addVariable}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEnvGroup(group.id!)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="p-3 space-y-3">
                {groupVars.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">{t.settings.noVariablesInGroup}</p>
                ) : (
                  groupVars.map((envVar) => {
                    const globalIndex = envVars.findIndex(v => v === envVar);
                    return (
                      <motion.div
                        key={`env-${globalIndex}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 relative">
                          <Input
                            placeholder="KEY"
                            value={envVar.key}
                            onChange={(e) => updateEnvVar(globalIndex, "key", e.target.value)}
                            className={cn(
                              "font-mono text-sm",
                              isDuplicateKey(globalIndex, envVar.key, envVar.group_id) &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500",
                              (!envVar.enabled || !group.enabled) && "opacity-60"
                            )}
                            disabled={!envVar.enabled}
                          />
                          {isDuplicateKey(globalIndex, envVar.key, envVar.group_id) && (
                            <div className="absolute -bottom-5 left-0 text-xs text-red-500">
                              Duplicate key in this group
                            </div>
                          )}
                        </div>
                        <span className="text-muted-foreground">=</span>
                        <Input
                          placeholder="value"
                          value={envVar.value}
                          onChange={(e) => updateEnvVar(globalIndex, "value", e.target.value)}
                          className={cn(
                            "flex-1 font-mono text-sm",
                            (!envVar.enabled || !group.enabled) && "opacity-60"
                          )}
                          disabled={!envVar.enabled}
                        />
                        <Switch
                          checked={envVar.enabled}
                          onCheckedChange={(enabled) => updateEnvVar(globalIndex, "enabled", enabled)}
                          variant="high-contrast"
                          className={cn("flex-shrink-0", !group.enabled && "opacity-60")}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEnvVar(globalIndex)}
                          className="h-8 w-8 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* Ungrouped variables */}
        {(() => {
          const ungroupedVars = envVars.filter(v => !v.group_id);
          if (ungroupedVars.length === 0) return null;
          const ungroupedEnabled = ungroupedVars.some(v => v.enabled);

          return (
            <div className="border rounded-lg">
              <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ungroupedEnabled}
                    onCheckedChange={(enabled) => toggleUngroupedEnabled(enabled)}
                    variant="high-contrast"
                    className="flex-shrink-0"
                  />
                  <h4 className="font-medium">{t.settings.ungroupedVariables}</h4>
                </div>
                <Button variant="outline" size="sm" onClick={() => addEnvVar()} className="gap-1">
                  <Plus className="h-3 w-3" />
                  {t.settings.addVariable}
                </Button>
              </div>
              <div className="p-3 space-y-3">
                {ungroupedVars.map((envVar) => {
                  const globalIndex = envVars.findIndex(v => v === envVar);
                  return (
                    <motion.div
                      key={`env-ungrouped-${globalIndex}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1 relative">
                        <Input
                          placeholder="KEY"
                          value={envVar.key}
                          onChange={(e) => updateEnvVar(globalIndex, "key", e.target.value)}
                          className={cn(
                            "font-mono text-sm",
                            isDuplicateKey(globalIndex, envVar.key, envVar.group_id) &&
                            "border-red-500 focus:border-red-500 focus:ring-red-500",
                            (!envVar.enabled || !ungroupedEnabled) && "opacity-60"
                          )}
                          disabled={!envVar.enabled}
                        />
                        {isDuplicateKey(globalIndex, envVar.key, envVar.group_id) && (
                          <div className="absolute -bottom-5 left-0 text-xs text-red-500">
                            {t.settings.duplicateKeyInUngroupedVariables}
                          </div>
                        )}
                      </div>
                      <span className="text-muted-foreground">=</span>
                      <Input
                        placeholder="value"
                        value={envVar.value}
                        onChange={(e) => updateEnvVar(globalIndex, "value", e.target.value)}
                        className={cn(
                          "flex-1 font-mono text-sm",
                          (!envVar.enabled || !ungroupedEnabled) && "opacity-60"
                        )}
                        disabled={!envVar.enabled}
                      />
                      <Switch
                        checked={envVar.enabled}
                        onCheckedChange={(enabled) => updateEnvVar(globalIndex, "enabled", enabled)}
                        variant="high-contrast"
                        className={cn("flex-shrink-0", !ungroupedEnabled && "opacity-60")}
                        disabled={!ungroupedEnabled}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEnvVar(globalIndex)}
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="pt-2 space-y-2">
        <p className="text-xs text-muted-foreground"><strong>{t.settings.commonVariables}</strong></p>
        <ul className="text-xs text-muted-foreground space-y-1 ml-4">
          <li>• <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">CLAUDE_CODE_ENABLE_TELEMETRY</code> - {t.settings.enableDisableTelemetry}</li>
          <li>• <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">ANTHROPIC_MODEL</code> - {t.settings.customModelName}</li>
          <li>• <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">DISABLE_COST_WARNINGS</code> - {t.settings.disableCostWarnings}</li>
        </ul>
      </div>
    </div>
  );
};
