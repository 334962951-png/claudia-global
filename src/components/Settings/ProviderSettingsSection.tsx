import React, { useState, useEffect } from "react";

import { api, type LLMProviderOption, type LLMProviderConfig, type LiteLLMStatus } from "@/lib/api";

interface ProviderSettingsSectionProps {
  setToast: (v: { message: string; type: "success" | "error" } | null) => void;
  onChange: (hasChanges: boolean, _getSettings: () => unknown, save: () => Promise<void>) => void;
}

export const ProviderSettingsSection: React.FC<ProviderSettingsSectionProps> = ({
  setToast,
  onChange,
}) => {
  return (
    <ProviderSettingsInner
      setToast={setToast}
      onChange={onChange}
    />
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

interface ProviderSettingsInnerProps {
  setToast: (v: { message: string; type: "success" | "error" } | null) => void;
  onChange: (hasChanges: boolean, _getSettings: () => unknown, save: () => Promise<void>) => void;
}

const ProviderSettingsInner: React.FC<ProviderSettingsInnerProps> = ({ setToast, onChange }) => {
  const [providers, setProviders] = useState<LLMProviderOption[]>([]);
  const [currentConfig, setCurrentConfig] = useState<LLMProviderConfig | null>(null);
  const [litellmStatus, setLitellmStatus] = useState<LiteLLMStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedProviderId, setSelectedProviderId] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [litellmPort, setLitellmPort] = useState("8000");
  const [showApiKey, setShowApiKey] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [provList, config, llStatus] = await Promise.all([
        api.getProviders(),
        api.getProviderConfig(),
        api.getLiteLLMStatus(),
      ]);
      setProviders(provList);
      setCurrentConfig(config);
      setLitellmStatus(llStatus);
      setSelectedProviderId(config.id || "anthropic");
      setBaseUrl(config.base_url || "");
    } catch (e) {
      console.error("Failed to load provider config:", e);
      setToast({ message: "Failed to load provider configuration", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Register save callback
  useEffect(() => {
    const save = async () => {
      await handleSave();
    };
    onChange(false, () => ({}), save);
  }, [selectedProviderId, apiKey, baseUrl]);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  const handleSave = async () => {
    if (!apiKey && selectedProviderId !== "anthropic") {
      setToast({ message: "API Key is required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.saveProviderConfig(
        selectedProviderId,
        apiKey,
        baseUrl || undefined
      );
      setToast({ message: "Provider saved successfully", type: "success" });
      await loadData();
    } catch (e) {
      setToast({ message: `Failed to save: ${e}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleStartLiteLLM = async () => {
    if (!apiKey) {
      setToast({ message: "API Key required to start LiteLLM", type: "error" });
      return;
    }
    setTesting(true);
    try {
      await api.startLiteLLM(apiKey, parseInt(litellmPort) || 8000);
      setToast({ message: `LiteLLM started on port ${litellmPort}`, type: "success" });
      const status = await api.getLiteLLMStatus();
      setLitellmStatus(status);
    } catch (e) {
      setToast({ message: `Failed to start LiteLLM: ${e}`, type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const handleStopLiteLLM = async () => {
    try {
      await api.stopLiteLLM();
      setToast({ message: "LiteLLM stopped", type: "success" });
      const status = await api.getLiteLLMStatus();
      setLitellmStatus(status);
    } catch (e) {
      setToast({ message: `Failed to stop LiteLLM: ${e}`, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      {currentConfig && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-zinc-300">
              Current: <strong>{currentConfig.name}</strong>
              {litellmStatus?.running && (
                <span className="ml-2 text-green-400">· LiteLLM running on :{litellmStatus.port}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-3">
          Select Provider
        </label>
        <div className="grid grid-cols-2 gap-2">
          {providers.map(provider => (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProviderId(provider.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                selectedProviderId === provider.id
                  ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              }`}
            >
              <span className="text-xl">{provider.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100 truncate">{provider.name}</div>
                <div className="text-xs text-zinc-500">{provider.protocol}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      {selectedProvider && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1.5">
              {selectedProvider.api_key_label}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={selectedProviderId === "anthropic" ? "sk-ant-..." : "sk-..."}
                className="w-full h-10 px-3 pr-10 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            {selectedProvider.base_url_hint && (
              <p className="text-xs text-zinc-500 mt-1">
                Default: {selectedProvider.base_url_hint}
              </p>
            )}
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1.5">
              Base URL <span className="text-zinc-500 font-normal">(optional, for proxy/custom)</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder={selectedProvider.base_url_hint || "https://..."}
              className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* LiteLLM Controls */}
      {selectedProviderId === "anthropic" && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">LiteLLM Proxy</span>
            {litellmStatus?.running && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Running :{litellmStatus.port}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Enable LiteLLM to route Claude Code requests through a local proxy supporting 100+ models.
            Start it after saving your API Key above.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={litellmPort}
              onChange={e => setLitellmPort(e.target.value)}
              placeholder="8000"
              className="w-24 h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
            />
            {!litellmStatus?.running ? (
              <button
                type="button"
                onClick={handleStartLiteLLM}
                disabled={testing}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {testing ? "Starting..." : "Start LiteLLM"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopLiteLLM}
                className="h-9 px-4 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Provider"}
        </button>
      </div>
    </div>
  );
};
