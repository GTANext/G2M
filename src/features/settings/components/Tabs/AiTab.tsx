import { Hammer, Layers3, MonitorCog, RefreshCcw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { G2MSubtlePanel } from "@/components/g2m/surface"
import { Input } from "@/components/ui/input"
import { TabsContent } from "@/components/ui/tabs"
import { ChoiceCard } from "@/features/settings/components/Cards"
import { CategoryHeader, SectionShell } from "@/features/settings/components/Layout"
import { useSummary } from "@/features/settings/hooks/useSummary"

export function AiTab() {
  const { t } = useTranslation()
  const {
    aiApiKey,
    aiCustomBaseUrl,
    aiCustomProtocol,
    aiModelId,
    aiProviderType,
    aiTimeout,
    setAiApiKey,
    setAiCustomBaseUrl,
    setAiCustomProtocol,
    setAiModelId,
    setAiProviderType,
    setAiTimeout,
  } = useSummary()

  return (
    <TabsContent value="ai" className="mt-0">
      <SectionShell
        title={t("settings.aiSettings")}
        description={t("settings.aiSettingsDescription")}
        badge={aiModelId}
        icon={<RefreshCcw className="size-5" />}
      >
        <div className="space-y-6">
          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("settings.aiProviderType")}
              description={t("settings.aiProviderTypeDescription")}
              icon={<MonitorCog className="size-5" />}
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChoiceCard
                active={aiProviderType === "miomoe"}
                title={t("settings.aiProviderBuiltIn")}
                description={t("settings.aiProviderBuiltInDesc")}
                icon={<Layers3 className="size-5" />}
                onClick={() => setAiProviderType("miomoe")}
              />
              <ChoiceCard
                active={aiProviderType === "custom"}
                title={t("settings.aiProviderCustom")}
                description={t("settings.aiProviderCustomDesc")}
                icon={<Hammer className="size-5" />}
                onClick={() => setAiProviderType("custom")}
              />
            </div>
          </G2MSubtlePanel>

          {aiProviderType === "custom" && (
            <>
              <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
                <CategoryHeader
                  title={t("settings.aiCustomProtocol")}
                  description={t("settings.aiCustomProtocolDescription")}
                  icon={<MonitorCog className="size-5" />}
                />
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <ChoiceCard
                    active={aiCustomProtocol === "openai"}
                    title="OpenAI"
                    description="OpenAI, DeepSeek 等标准兼容接口"
                    icon={<Layers3 className="size-5" />}
                    onClick={() => setAiCustomProtocol("openai")}
                  />
                  <ChoiceCard
                    active={aiCustomProtocol === "ollama"}
                    title="Ollama"
                    description="Ollama 本地大模型接口"
                    icon={<Layers3 className="size-5" />}
                    onClick={() => setAiCustomProtocol("ollama")}
                  />
                  <ChoiceCard
                    active={aiCustomProtocol === "anthropic"}
                    title="Anthropic"
                    description="Claude 系列模型兼容接口"
                    icon={<Layers3 className="size-5" />}
                    onClick={() => setAiCustomProtocol("anthropic")}
                  />
                  <ChoiceCard
                    active={aiCustomProtocol === "gemini"}
                    title="Gemini"
                    description="Google Gemini 系列兼容接口"
                    icon={<Layers3 className="size-5" />}
                    onClick={() => setAiCustomProtocol("gemini")}
                  />
                </div>
              </G2MSubtlePanel>

              <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
                <CategoryHeader
                  title={t("settings.aiCustomBaseUrl")}
                  description={t("settings.aiCustomBaseUrlDescription")}
                  icon={<RefreshCcw className="size-5" />}
                />
                <div className="mt-5">
                  <Input
                    placeholder="https://api.openai.com/v1"
                    value={aiCustomBaseUrl}
                    onChange={(e) => setAiCustomBaseUrl(e.target.value)}
                    className="h-12 rounded-xl bg-background/50 backdrop-blur"
                  />
                </div>
              </G2MSubtlePanel>
              
              <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
                <CategoryHeader
                  title={t("settings.aiApiKey")}
                  description={t("settings.aiApiKeyDescription")}
                  icon={<Hammer className="size-5" />}
                />
                <div className="mt-5">
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="h-12 rounded-xl bg-background/50 backdrop-blur"
                  />
                </div>
              </G2MSubtlePanel>
            </>
          )}

          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("settings.aiModelId")}
              description={aiProviderType === "miomoe" 
                ? t("settings.aiModelIdDescription")
                : t("settings.aiModelIdCustomDesc")}
              icon={<Layers3 className="size-5" />}
            />
            
            {aiProviderType === "miomoe" ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {[
                  { id: "deepseek-ai/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
                  { id: "deepseek-ai/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
                  { id: "agnes-2.0-flash", name: "Agnes 2.0 Flash" },
                  { id: "google/gemma-4-31b-it", name: "Google Gemma 4 31B IT" },
                ].map((model) => (
                  <ChoiceCard
                    key={model.id}
                    active={aiModelId === model.id}
                    title={model.name}
                    description={model.id}
                    icon={<Layers3 className="size-5" />}
                    onClick={() => setAiModelId(model.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <Input
                  placeholder={
                    aiCustomProtocol === "anthropic" 
                      ? "claude-3-5-sonnet-20241022" 
                      : aiCustomProtocol === "gemini" 
                        ? "gemini-1.5-pro" 
                        : "gpt-4o, deepseek-chat"
                  }
                  value={aiModelId}
                  onChange={(e) => setAiModelId(e.target.value)}
                  className="h-12 rounded-xl bg-background/50 backdrop-blur"
                />
                
                {/* 提供一些常用模型的快捷选择，方便用户一键填入 */}
                <div className="flex flex-wrap gap-2">
                  {aiCustomProtocol === "openai" && [
                    "gpt-4o", "gpt-4o-mini", "deepseek-chat", "deepseek-reasoner"
                  ].map(id => (
                    <button
                      key={id}
                      onClick={() => setAiModelId(id)}
                      className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      {id}
                    </button>
                  ))}
                  
                  {aiCustomProtocol === "anthropic" && [
                    "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"
                  ].map(id => (
                    <button
                      key={id}
                      onClick={() => setAiModelId(id)}
                      className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      {id}
                    </button>
                  ))}

                  {aiCustomProtocol === "gemini" && [
                    "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"
                  ].map(id => (
                    <button
                      key={id}
                      onClick={() => setAiModelId(id)}
                      className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      {id}
                    </button>
                  ))}
                  
                  {aiCustomProtocol === "ollama" && [
                    "llama3.1", "qwen2.5", "mistral"
                  ].map(id => (
                    <button
                      key={id}
                      onClick={() => setAiModelId(id)}
                      className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </G2MSubtlePanel>

          <G2MSubtlePanel className="rounded-[28px] border border-white/75 bg-white/65 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
            <CategoryHeader
              title={t("settings.aiTimeout")}
              description={t("settings.aiTimeoutDescription")}
              icon={<RefreshCcw className="size-5" />}
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              {[
                { label: t("settings.aiTimeout1m"), value: 60000 },
                { label: t("settings.aiTimeout3m"), value: 180000 },
                { label: t("settings.aiTimeout5m"), value: 300000 },
                { label: t("settings.aiTimeout10m"), value: 600000 },
              ].map((option) => (
                <ChoiceCard
                  key={option.value}
                  active={aiTimeout === option.value}
                  title={option.label}
                  description={`${option.value / 1000}s`}
                  icon={<RefreshCcw className="size-5" />}
                  onClick={() => setAiTimeout(option.value)}
                />
              ))}
            </div>
          </G2MSubtlePanel>
        </div>
      </SectionShell>
    </TabsContent>
  )
}
