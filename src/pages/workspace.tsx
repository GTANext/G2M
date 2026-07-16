import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { Page } from "@/features/workspace/Page"

function GameWorkspacePage({ workspace }: { workspace: UseG2mWorkspaceResult }) {
  return <Page workspace={workspace} />
}

export { GameWorkspacePage }
