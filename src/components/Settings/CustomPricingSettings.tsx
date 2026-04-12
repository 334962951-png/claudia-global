import { DollarSign, Plus, Trash2, Download, Upload, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUILT_IN_PROVIDERS,
  PricingProvider,
  ModelPricing,
} from "@/config/pricing";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const SETTINGS_KEY = "custom_pricing_providers";

const DEFAULT_MODEL_PRICING: ModelPricing = {
  inputPrice: 0,
  outputPrice: 0,
  cacheWritePrice: 0,
  cacheReadPrice: 0,
};

const ProviderCard: React.FC<{
  provider: PricingProvider;
  isBuiltIn: boolean;
  onEdit?: (p: PricingProvider) => void;
  onDelete?: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}> = ({ provider, isBuiltIn, onEdit, onDelete, expanded, onToggle }) => {
  const { t } = useI18n();
  const modelCount = Object.keys(provider.models).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{provider.name}</span>
            <Badge variant={isBuiltIn ? "secondary" : "default"} className="text-xs shrink-0">
              {isBuiltIn ? t.pricing.builtIn : t.pricing.custom}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {modelCount} {t.pricing.models} · ID: {provider.id}
          </p>
        </div>
        {!isBuiltIn && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(provider);
              }}
            >
              {t.common.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(provider.id);
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium py-1">{t.pricing.modelId}</th>
                <th className="text-right font-medium py-1">{t.pricing.input}/M</th>
                <th className="text-right font-medium py-1">{t.pricing.output}/M</th>
                <th className="text-right font-medium py-1">{t.pricing.cacheWrite}/M</th>
                <th className="text-right font-medium py-1">{t.pricing.cacheRead}/M</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(provider.models).map(([modelId, price]) => (
                <tr key={modelId} className="border-t border-muted/50">
                  <td className="py-1 font-mono text-xs max-w-[200px] truncate" title={modelId}>
                    {modelId}
                  </td>
                  <td className="py-1 text-right">${price.inputPrice.toFixed(2)}</td>
                  <td className="py-1 text-right">${price.outputPrice.toFixed(2)}</td>
                  <td className="py-1 text-right">${price.cacheWritePrice.toFixed(2)}</td>
                  <td className="py-1 text-right">${price.cacheReadPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ModelEditor: React.FC<{
  models: Record<string, ModelPricing>;
  onChange: (models: Record<string, ModelPricing>) => void;
}> = ({ models, onChange }) => {
  const { t } = useI18n();
  const [newModelId, setNewModelId] = useState("");
  const [newPrice, setNewPrice] = useState<ModelPricing>({ ...DEFAULT_MODEL_PRICING });

  const removeModel = (id: string) => {
    const next = { ...models };
    delete next[id];
    onChange(next);
  };

  const addModel = () => {
    if (!newModelId.trim()) return;
    onChange({ ...models, [newModelId.trim()]: { ...newPrice } });
    setNewModelId("");
    setNewPrice({ ...DEFAULT_MODEL_PRICING });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{t.pricing.models}</div>

      {/* Existing models */}
      {Object.entries(models).map(([id, price]) => (
        <div key={id} className="flex gap-2 items-center text-sm">
          <span className="font-mono flex-1 truncate text-xs" title={id}>
            {id}
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="w-20 h-7 text-xs"
            value={price.inputPrice}
            onChange={(e) =>
              onChange({ ...models, [id]: { ...price, inputPrice: parseFloat(e.target.value) || 0 } })
            }
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            className="w-20 h-7 text-xs"
            value={price.outputPrice}
            onChange={(e) =>
              onChange({ ...models, [id]: { ...price, outputPrice: parseFloat(e.target.value) || 0 } })
            }
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            className="w-20 h-7 text-xs"
            value={price.cacheWritePrice}
            onChange={(e) =>
              onChange({ ...models, [id]: { ...price, cacheWritePrice: parseFloat(e.target.value) || 0 } })
            }
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            className="w-20 h-7 text-xs"
            value={price.cacheReadPrice}
            onChange={(e) =>
              onChange({ ...models, [id]: { ...price, cacheReadPrice: parseFloat(e.target.value) || 0 } })
            }
          />
          <Button size="sm" variant="ghost" onClick={() => removeModel(id)} className="shrink-0">
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}

      {/* Add new model */}
      <div className="flex gap-2 items-center text-sm">
        <Input
          placeholder="model-id (e.g. custom/my-model)"
          className="flex-1 h-7 text-xs font-mono"
          value={newModelId}
          onChange={(e) => setNewModelId(e.target.value)}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="$0.00"
          className="w-20 h-7 text-xs"
          value={newPrice.inputPrice || ""}
          onChange={(e) => setNewPrice((p) => ({ ...p, inputPrice: parseFloat(e.target.value) || 0 }))}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="$0.00"
          className="w-20 h-7 text-xs"
          value={newPrice.outputPrice || ""}
          onChange={(e) => setNewPrice((p) => ({ ...p, outputPrice: parseFloat(e.target.value) || 0 }))}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="$0.00"
          className="w-20 h-7 text-xs"
          value={newPrice.cacheWritePrice || ""}
          onChange={(e) => setNewPrice((p) => ({ ...p, cacheWritePrice: parseFloat(e.target.value) || 0 }))}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="$0.00"
          className="w-20 h-7 text-xs"
          value={newPrice.cacheReadPrice || ""}
          onChange={(e) => setNewPrice((p) => ({ ...p, cacheReadPrice: parseFloat(e.target.value) || 0 }))}
        />
        <Button size="sm" variant="outline" onClick={addModel} className="shrink-0" disabled={!newModelId.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const ProviderEditor: React.FC<{
  initial?: PricingProvider;
  onSave: (p: PricingProvider) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [id, setId] = useState(initial?.id ?? `custom-${Date.now()}`);
  const [models, setModels] = useState<Record<string, ModelPricing>>(initial?.models ?? {});

  const handleSave = () => {
    if (!name.trim() || !id.trim()) return;
    onSave({ id: id.trim(), name: name.trim(), isCustom: true, models });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {initial ? t.pricing.editProvider : t.pricing.addProvider}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{t.pricing.providerName}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Provider"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">ID</Label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="my-provider"
              className="mt-1 font-mono text-xs"
              disabled={!!initial}
            />
          </div>
        </div>

        <ModelEditor models={models} onChange={setModels} />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || !id.trim()}
          >
            {t.common.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface CustomPricingSettingsProps {
  setToast: (v: { message: string; type: "success" | "error" } | null) => void;
}

export const CustomPricingSettings: React.FC<CustomPricingSettingsProps> = ({ setToast }) => {
  const { t } = useI18n();
  const [customProviders, setCustomProviders] = useState<PricingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<PricingProvider | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await api.getSetting(SETTINGS_KEY);
      if (raw) {
        setCustomProviders(JSON.parse(raw) as PricingProvider[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (providers: PricingProvider[]) => {
    try {
      await api.saveSetting(SETTINGS_KEY, JSON.stringify(providers));
      setCustomProviders(providers);
      setToast({ message: t.pricing.saved, type: "success" });
    } catch {
      setToast({ message: t.pricing.saveFailed, type: "error" });
    }
  };

  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleDelete = async (id: string) => {
    await save(customProviders.filter((p) => p.id !== id));
  };

  const handleSaveEdit = async (p: PricingProvider) => {
    const exists = customProviders.find((cp) => cp.id === p.id);
    if (exists) {
      await save(customProviders.map((cp) => (cp.id === p.id ? p : cp)));
    } else {
      await save([...customProviders, p]);
    }
    setEditingProvider(null);
    setShowAddForm(false);
  };

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text) as PricingProvider[];
      if (!Array.isArray(parsed)) throw new Error("not array");
      await save([...customProviders, ...parsed.filter((p) => !customProviders.find((c) => c.id === p.id))]);
      setToast({ message: t.pricing.imported, type: "success" });
    } catch {
      setToast({ message: t.pricing.importFailed, type: "error" });
    }
  };

  const handleExport = () => {
    const text = JSON.stringify(customProviders, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
    setToast({ message: t.pricing.copiedToClipboard, type: "success" });
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">{t.common.loading}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold">{t.pricing.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t.pricing.description}</p>
      </div>

      {/* Built-in Providers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t.pricing.builtInProviders}</h4>
        </div>
        <div className="space-y-1">
          {BUILT_IN_PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              isBuiltIn={true}
              expanded={!!expanded[p.id]}
              onToggle={() => toggleExpand(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Custom Providers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t.pricing.customProviders}</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleImport}>
              <Upload className="h-3 w-3 mr-1" />
              {t.pricing.import}
            </Button>
            {customProviders.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-3 w-3 mr-1" />
                {t.pricing.export}
              </Button>
            )}
            <Button size="sm" variant="default" onClick={() => { setShowAddForm(true); setEditingProvider(null); }}>
              <Plus className="h-3 w-3 mr-1" />
              {t.pricing.addProvider}
            </Button>
          </div>
        </div>

        {editingProvider ? (
          <ProviderEditor
            key={editingProvider.id}
            initial={editingProvider}
            onSave={handleSaveEdit}
            onCancel={() => setEditingProvider(null)}
          />
        ) : showAddForm ? (
          <ProviderEditor
            onSave={handleSaveEdit}
            onCancel={() => setShowAddForm(false)}
          />
        ) : customProviders.length === 0 ? (
          <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{t.pricing.noCustomProviders}</p>
            <p className="text-xs mt-1">{t.pricing.addProviderHint}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {customProviders.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                isBuiltIn={false}
                expanded={!!expanded[p.id]}
                onToggle={() => toggleExpand(p.id)}
                onEdit={(prov) => setEditingProvider(prov)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
