import { AlertTriangle, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"

type UpdateNoticeProps = {
  currentVersion: string
  remoteVersion: string
}

function UpdateNotice({ currentVersion, remoteVersion }: UpdateNoticeProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <Alert className="cursor-pointer border-amber-200/80 bg-amber-50/85 text-amber-950 shadow-[0_16px_40px_rgba(180,83,9,0.12)] ring-1 ring-amber-100/70 transition-colors hover:bg-amber-50 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-50 dark:ring-amber-400/10 dark:hover:bg-amber-500/14">
      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" />
      <AlertTitle>{t("update.noticeTitle")}</AlertTitle>
      <AlertDescription>
        {t("update.noticeDescription", {
          currentVersion,
          remoteVersion,
        })}
      </AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer rounded-full px-3 text-amber-900 hover:bg-amber-100/80 hover:text-amber-950 dark:text-amber-50 dark:hover:bg-amber-400/10 dark:hover:text-white"
          onClick={() => navigate("/update")}
        >
          {t("update.openPage")}
          <ChevronRight className="size-4" />
        </Button>
      </AlertAction>
    </Alert>
  )
}

export { UpdateNotice }
