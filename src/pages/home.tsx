import { Gamepad2, HardDriveDownload, Plus } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { G2MGameCoverCard } from "@/components/g2m/gameCoverCard"
import { G2MPanel, G2MPill, G2MSubtlePanel } from "@/components/g2m/surface"
import { Button } from "@/components/ui/button"
import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"

type WorkspaceState = UseG2mWorkspaceResult

function HomePage({ workspace }: { workspace: WorkspaceState }) {
  const navigate = useNavigate()

  useEffect(() => {
    workspace.goHome()
  }, [workspace])

  function openGameRoute(gameId: string) {
    navigate(`/game/${gameId}`)
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-6">
      <G2MPanel>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <G2MPill className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              GTAMODX Manager
            </G2MPill>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              下载、安装、管理，就这么简单。
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              首页负责展示你已添加的游戏。点击游戏卡片进入工作区，再进行 Mod
              导入、启用、禁用、冲突查看和目录配置。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="cursor-pointer rounded-xl px-4"
              onClick={workspace.startAddGame}
            >
              <Plus className="size-4" />
              添加游戏
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => void workspace.openGamesDownloadPage()}
            >
              <HardDriveDownload className="size-4" />
              下载游戏
            </Button>
          </div>
        </div>
      </G2MPanel>

      {!workspace.hasConfiguredGames ? (
        <EmptyHero workspace={workspace} />
      ) : (
        <ConfiguredGamesGrid workspace={workspace} onOpenGame={openGameRoute} />
      )}
    </div>
  )
}

function EmptyHero({ workspace }: { workspace: WorkspaceState }) {
  return (
    <G2MPanel>
      <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-10">
        <div className="flex flex-col justify-center">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg dark:bg-slate-100 dark:text-slate-950">
            <Gamepad2 className="size-7" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            还没有添加任何游戏
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            先添加 GTA SA、VC 或 III 的本地目录。完成后首页会显示游戏卡片，
            点击卡片即可进入工作区管理对应游戏的 Mod。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="cursor-pointer rounded-xl px-4"
              onClick={workspace.startAddGame}
            >
              <Plus className="size-4" />
              添加游戏
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer rounded-xl border-border/70 bg-background/70 px-4 backdrop-blur hover:bg-muted/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => void workspace.openGamesDownloadPage()}
            >
              <HardDriveDownload className="size-4" />
              下载游戏
            </Button>
          </div>
        </div>

        <G2MSubtlePanel>
          <div className="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">识别规则</p>
            <div className="mt-4 space-y-3">
              <DetectionRule gameType="GTA San Andreas" exeName="gta_sa.exe / gta-sa.exe" />
              <DetectionRule gameType="GTA Vice City" exeName="gta-vc.exe / gta_vc.exe" />
              <DetectionRule gameType="GTA III" exeName="gta3.exe" />
            </div>
          </div>
        </G2MSubtlePanel>
      </div>
    </G2MPanel>
  )
}

function ConfiguredGamesGrid({
  workspace,
  onOpenGame,
}: {
  workspace: WorkspaceState
  onOpenGame: (gameId: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">已添加的游戏</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            点击任意游戏卡片进入工作区开始管理对应游戏的 Mod。
          </p>
        </div>
        <G2MPill className="bg-background/80 text-slate-500 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
          {workspace.configuredGames.length} 个已添加
        </G2MPill>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.configuredGames.map((game) => (
          <G2MGameCoverCard
            key={game.id}
            game={game}
            onClick={() => onOpenGame(game.id)}
          />
        ))}
      </div>
    </div>
  )
}

function DetectionRule({
  gameType,
  exeName,
}: {
  gameType: string
  exeName: string
}) {
  return (
    <div className="rounded-2xl bg-background px-4 py-3 ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{gameType}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exeName}</p>
    </div>
  )
}

export { HomePage }
