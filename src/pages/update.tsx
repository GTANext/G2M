import type { useAppUpdate } from "@/hooks/useAppUpdate"
import { Page } from "@/features/update/Page"

function UpdatePage({
  appUpdate,
}: {
  appUpdate: ReturnType<typeof useAppUpdate>
}) {
  return <Page appUpdate={appUpdate} />
}

export { UpdatePage }
