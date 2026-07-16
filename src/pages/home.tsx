import type { UseG2mWorkspaceResult } from "@/hooks/useG2MWorkspace"
import { Page } from "@/features/home/Page"

function HomePage({ workspace }: { workspace: UseG2mWorkspaceResult }) {
  return <Page workspace={workspace} />
}

export { HomePage }
