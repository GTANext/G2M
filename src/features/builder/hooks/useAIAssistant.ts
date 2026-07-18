import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { readTextFile } from "@tauri-apps/plugin-fs"

import { useAppPreferences } from "@/components/app/preferencesProvider"
import { requestHttp, resolveHttpMessage } from "@/lib/api"
import { inferTargetFolderFromPath, type ModImportFileEntry } from "@/lib/g2m"
import type { BuilderForm } from "@/features/builder/types"
import { AVAILABLE_PREREQUISITES } from "@/features/builder/types"

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type ChatRequest = {
  model: string
  messages: ChatMessage[]
  options?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
  }
}

type ChatResponse = {
  success: boolean
  code: number
  message: string
  data?: {
    choices: Array<{
      message: ChatMessage
    }>
  }
}

export function useAIAssistant({
  files,
  sourceDir,
  setMappings,
  setForm,
}: {
  files: ModImportFileEntry[]
  sourceDir: string
  setMappings: React.Dispatch<React.SetStateAction<ModImportFileEntry[]>>
  setForm: React.Dispatch<React.SetStateAction<BuilderForm>>
}) {
  const { t } = useTranslation()
  const { aiApiKey, aiModelId, aiProviderType, aiCustomProtocol, aiCustomBaseUrl, aiTimeout } = useAppPreferences()
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  const handleAiAutoMap = async () => {
    if (aiProviderType === "custom" && !aiCustomBaseUrl) {
      toast.error(t("builderPage.aiBaseUrlMissing"))
      return
    }

    if (aiProviderType === "custom" && !aiApiKey) {
      toast.error(t("builderPage.aiApiKeyMissing"))
      return
    }

    if (files.length === 0) {
      toast.warning(t("builderPage.noFilesToMap"))
      return
    }

    setIsAiProcessing(true)
    const toastId = toast.loading(t("builderPage.aiProcessing"))

    try {
      const filePaths = files.map((f) => f.relativePath)
      
      // 提取可能的说明文件内容
      const readmeFiles = files.filter(f => {
        const name = (f.relativePath.split("/").pop() || "").toLowerCase()
        return name.includes("readme") || name.includes("说明") || name.includes("看我") || name.endsWith(".md") || name.endsWith(".txt")
      })
      
      let readmeContents = ""
      if (readmeFiles.length > 0 && sourceDir) {
        try {
          const contents = await Promise.all(
            readmeFiles.slice(0, 3).map(async (f) => {
              const fullPath = sourceDir.endsWith("/") || sourceDir.endsWith("\\") 
                ? `${sourceDir}${f.relativePath}`
                : `${sourceDir}/${f.relativePath}`;
              const text = await readTextFile(fullPath);
              return `--- ${f.relativePath} ---\n${text.slice(0, 2000)}`;
            })
          );
          readmeContents = `\n\n请注意，模组中包含以下说明文件内容(已截断):\n${contents.join("\n\n")}\n如果您了解这些常规模组或能根据上述说明文件内容推测出作者、版本、前置要求和外部链接等信息，请一并返回。`
        } catch (e) {
          console.warn("读取说明文件失败", e);
          const readmeNames = readmeFiles.map(f => f.relativePath).join(", ")
          readmeContents = `\n请注意，模组中包含以下可能的说明文件: ${readmeNames}。如果您了解这些常规模组或能根据文件名推测出作者、版本等信息，请一并返回。`
        }
      }
      
      const systemPrompt = `你是一个游戏模组(Mod)构建专家，精通 GTA 系列游戏的模组文件结构。
请为以下模组文件分配正确的游戏安装相对路径(targetPath)。
规则：
1. .dff, .txd 等模型贴图文件通常放入 modloader/自定义文件夹名/ 下
2. .cs 等 CLEO 脚本通常放入 cleo/ 下
3. .asi 等插件通常放入 plugins/ 或 scripts/ 下
4. .md, .txt 等说明文件通常无需安装，可以将 targetPath 设为空字符串 ""
5. 尝试根据文件名或说明文件内容推测模组的元数据（如 Mod名称、描述、作者、版本、前置依赖、链接）。
6. 可用的内置前置依赖项 (prerequisites) 包括: ${AVAILABLE_PREREQUISITES.map(p => p.key).join(", ")}
7. 如果发现其他非内置的前置要求，放入 customPrerequisites 中。
8. 如果发现相关的链接（例如 GitHub 或其他发布页面），放入 links 中，类型可以为 "external" 或 "github"。
9. 返回的结果必须是严格的 JSON 格式，结构如下：
{
  "mappings": [
    { "relativePath": "原路径", "targetPath": "目标路径" }
  ],
  "metadata": {
    "title": "推测的模组名称(如果没有则为空)",
    "description": "推测的模组描述(如果没有则为空)",
    "author": "推测的作者(如果没有则为空)",
    "version": "推测的版本号(如果没有则为空)",
    "prerequisites": ["cleo", "modloader"],
    "customPrerequisites": [
      { "name": "其他前置", "url": "前置链接(可选)" }
    ],
    "links": [
      { "kind": "external", "label": "原贴地址", "url": "https://..." }
    ]
  }
}
不要输出任何其他内容。`

      const userPrompt = `需要映射的文件列表：\n${JSON.stringify(filePaths, null, 2)}${readmeContents}`

      // 构建请求和解析
      let assistantMessage = "";

      if (aiProviderType === "miomoe") {
        const payload: ChatRequest = {
          model: aiModelId || "deepseek-ai/deepseek-v4-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          options: {
            temperature: 0.1,
          }
        }

        const miomoeData = await requestHttp<ChatResponse>("https://api.miomoe.cn/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          timeout: aiTimeout || 300000
        })

        if (!miomoeData || typeof miomoeData !== "object") {
          throw new Error("API 请求失败，返回格式异常")
        }

        if (miomoeData.success === false) {
          throw new Error(resolveHttpMessage(miomoeData, "API 请求失败"))
        }

        if (!miomoeData.data) {
          throw new Error(resolveHttpMessage(miomoeData, "API 请求失败：无数据返回"))
        }

        assistantMessage = miomoeData.data.choices?.[0]?.message?.content || ""
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }
        
        let endpoint = ""
        let customPayload: any = {}

        if (aiCustomProtocol === "openai") {
          endpoint = aiCustomBaseUrl.endsWith('/') ? `${aiCustomBaseUrl}chat/completions` : `${aiCustomBaseUrl}/chat/completions`
          headers["Authorization"] = `Bearer ${aiApiKey}`
          customPayload = {
            model: aiModelId || "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
          }
        } else if (aiCustomProtocol === "ollama") {
          endpoint = aiCustomBaseUrl.endsWith('/') ? `${aiCustomBaseUrl}api/chat` : `${aiCustomBaseUrl}/api/chat`
          // Ollama does not require auth usually, but if provided we can add it
          if (aiApiKey) headers["Authorization"] = `Bearer ${aiApiKey}`
          customPayload = {
            model: aiModelId || "llama3",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            stream: false,
            options: {
              temperature: 0.1
            }
          }
        } else if (aiCustomProtocol === "anthropic") {
          endpoint = aiCustomBaseUrl.endsWith('/') ? `${aiCustomBaseUrl}v1/messages` : `${aiCustomBaseUrl}/v1/messages`
          headers["x-api-key"] = aiApiKey
          headers["anthropic-version"] = "2023-06-01"
          customPayload = {
            model: aiModelId || "claude-3-opus-20240229",
            system: systemPrompt,
            messages: [
              { role: "user", content: userPrompt }
            ],
            max_tokens: 2048,
            temperature: 0.1
          }
        } else if (aiCustomProtocol === "gemini") {
          endpoint = aiCustomBaseUrl.endsWith('/') 
            ? `${aiCustomBaseUrl}v1beta/models/${aiModelId || "gemini-1.5-pro"}:generateContent?key=${aiApiKey}`
            : `${aiCustomBaseUrl}/v1beta/models/${aiModelId || "gemini-1.5-pro"}:generateContent?key=${aiApiKey}`
          customPayload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              { role: "user", parts: [{ text: userPrompt }] }
            ],
            generationConfig: {
              temperature: 0.1
            }
          }
        }

        const rawData = await requestHttp<any>(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(customPayload),
          timeout: aiTimeout || 300000
        })

        if (rawData && rawData.error) {
          throw new Error(resolveHttpMessage(rawData, "API 请求失败"))
        }

        if (aiCustomProtocol === "openai") {
          assistantMessage = rawData.choices?.[0]?.message?.content || ""
        } else if (aiCustomProtocol === "ollama") {
          assistantMessage = rawData.message?.content || ""
        } else if (aiCustomProtocol === "anthropic") {
          assistantMessage = rawData.content?.[0]?.text || ""
        } else if (aiCustomProtocol === "gemini") {
          assistantMessage = rawData.candidates?.[0]?.content?.parts?.[0]?.text || ""
        }
      }
      
      // 提取 JSON
      // console.log("AI 原始返回数据:", assistantMessage)

      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("AI 返回的数据格式无法解析")
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        mappings: Array<{ relativePath: string; targetPath: string }>
        metadata?: {
          title?: string
          description?: string
          author?: string
          version?: string
          prerequisites?: string[]
          customPrerequisites?: Array<{ name: string; url?: string }>
          links?: Array<{ kind: "external" | "github" | "gtamodx"; label: string; url: string }>
        }
      }

      if (parsed.mappings && Array.isArray(parsed.mappings)) {
        setMappings((current) => 
          current.map((file) => {
            const mapping = parsed.mappings.find((m) => m.relativePath === file.relativePath)
            if (mapping && typeof mapping.targetPath === "string") {
              return {
                ...file,
                targetPath: mapping.targetPath,
                targetFolder: inferTargetFolderFromPath(mapping.targetPath),
                skipInstall: !mapping.targetPath.trim()
              }
            }
            return file
          })
        )
        
        // 尝试填入元数据
        if (parsed.metadata) {
          setForm((prev) => {
            const next = { ...prev }
            if (parsed.metadata!.title) next.name = parsed.metadata!.title
            if (parsed.metadata!.description) next.description = parsed.metadata!.description
            if (parsed.metadata!.author) next.author = parsed.metadata!.author
            if (parsed.metadata!.version) next.version = parsed.metadata!.version
            
            if (parsed.metadata!.prerequisites && Array.isArray(parsed.metadata!.prerequisites)) {
              // 确保只添加可用的内置前置，并且去重
              const validPrereqs = parsed.metadata!.prerequisites.map(p => {
                const found = AVAILABLE_PREREQUISITES.find(ap => ap.key.toLowerCase() === p.toLowerCase() || ap.label.toLowerCase() === p.toLowerCase())
                return found ? found.key : null
              }).filter(Boolean) as string[]
              next.prerequisites = Array.from(new Set([...next.prerequisites, ...validPrereqs]))
            }
            
            if (parsed.metadata!.customPrerequisites && Array.isArray(parsed.metadata!.customPrerequisites)) {
              const newCustoms = parsed.metadata!.customPrerequisites.map(cp => ({
                id: `custom-${Math.random().toString(36).slice(2, 10)}`,
                name: cp.name || "",
                url: cp.url || ""
              })).filter(cp => cp.name)
              next.customPrerequisites = [...next.customPrerequisites, ...newCustoms]
            }

            if (parsed.metadata!.links && Array.isArray(parsed.metadata!.links)) {
              const newLinks = parsed.metadata!.links.map(l => ({
                id: `link-${Math.random().toString(36).slice(2, 10)}`,
                kind: l.kind || "external",
                label: l.label || "",
                url: l.url || ""
              })).filter(l => l.url)
              
              // 简单合并链接
              const mergedLinks = [...next.links]
              for (const nl of newLinks) {
                if (nl.kind === "github" || nl.kind === "gtamodx") {
                  const exist = mergedLinks.find(ml => ml.kind === nl.kind)
                  if (exist) {
                    exist.url = nl.url
                    if (nl.label) exist.label = nl.label
                  } else {
                    mergedLinks.push(nl)
                  }
                } else {
                  mergedLinks.push(nl)
                }
              }
              next.links = mergedLinks
            }

            return next
          })
        }
        
        toast.success(t("builderPage.aiMappingSuccess"), { id: toastId })
      } else {
        throw new Error("AI 返回的 JSON 缺少 mappings 字段")
      }

    } catch (error) {
      console.error(error)
      let errorMessage = error instanceof Error ? error.message : "未知错误"
      
      // 处理由于超时或网络原因抛出的错误
      if (errorMessage.toLowerCase().includes("timeout")) {
        errorMessage = t("builderPage.aiRequestTimeout", "AI 请求超时，请检查网络或重试")
      } else if (errorMessage.toLowerCase().includes("fetch")) {
        errorMessage = t("builderPage.aiNetworkError", "网络连接失败，请检查是否被拦截")
      }

      toast.error(t("builderPage.aiMappingFailed"), {
        id: toastId,
        description: errorMessage
      })
    } finally {
      setIsAiProcessing(false)
    }
  }

  return {
    isAiProcessing,
    handleAiAutoMap
  }
}