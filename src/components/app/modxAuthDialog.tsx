import { openUrl } from "@tauri-apps/plugin-opener"
import {
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  LogIn,
  LogOut,
  MessageCircleMore,
  User,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useModxAuth } from "@/components/app/modxAuthProvider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

function ModxAuthDialog() {
  const { t } = useTranslation()
  const {
    authState,
    closeLoginDialog,
    isAuthenticated,
    isHydrated,
    isLoginDialogOpen,
    isPending,
    login,
    logout,
    openLoginDialog,
  } = useModxAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [statusText, setStatusText] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = useMemo(() => {
    const user = authState?.user
    if (!user) {
      return t("auth.guest")
    }

    return user.name ?? user.nickname ?? user.username ?? user.email ?? t("auth.userFallback")
  }, [authState?.user, t])

  const avatarText = useMemo(() => {
    const source = displayName.trim()
    if (!source || source === t("auth.guest")) {
      return "U"
    }

    return source.slice(0, 1).toUpperCase()
  }, [displayName, t])

  const avatarUrl = useMemo(() => {
    if (typeof authState?.user?.avatarUrl === "string" && authState.user.avatarUrl.trim()) {
      return authState.user.avatarUrl.trim()
    }

    if (typeof authState?.user?.avatar === "string" && authState.user.avatar.trim()) {
      return authState.user.avatar.trim()
    }

    return null
  }, [authState?.user?.avatar, authState?.user?.avatarUrl])

  const roleText = useMemo(() => {
    const role = authState?.user?.role
    if (role === "ADMIN") {
      return t("auth.roleAdmin")
    }

    if (role === "USER") {
      return t("auth.roleUser")
    }

    return role ?? t("auth.notAvailable")
  }, [authState?.user?.role, t])

  const wechatText = authState?.user?.isWechatBound ? t("auth.wechatBound") : t("auth.wechatUnbound")
  const menuSubtitle = useMemo(() => {
    if (authState?.user?.email) {
      return authState.user.email
    }

    return t("auth.loggedIn")
  }, [authState?.user?.email, t])

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusText(t("auth.loggingIn"))

    try {
      const nextState = await login(email.trim(), password)
      setStatusText(t("auth.loginSuccess"))
      toast.success(t("auth.loginSuccess"))
      setPassword("")
      closeLoginDialog()

      if (nextState.user?.email) {
        setEmail(nextState.user.email)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatusText(message)
      toast.error(message)
    }
  }

  async function handleLogout() {
    setStatusText(t("auth.loggingOut"))

    try {
      await logout()
      setStatusText(t("auth.logoutSuccess"))
      toast.success(t("auth.logoutSuccess"))
      setMenuOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatusText(message)
      toast.error(message)
    }
  }

  return (
    <>
      {isAuthenticated ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={t("auth.openAccount")}
              className="group flex h-9 items-center gap-2 rounded-[14px] border border-black/6 bg-white/86 px-1.5 pr-2.5 text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] backdrop-blur-xl transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:ring-white/[0.04] dark:hover:bg-white/[0.09]"
            >
              <span className="relative flex size-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  avatarText
                )}
              </span>
              <ChevronDown className="size-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-180 dark:text-slate-500" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-[19rem] rounded-[22px] border border-black/6 bg-white/96 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-2xl dark:border-white/10 dark:bg-[rgba(15,23,42,0.96)] dark:ring-white/[0.04]"
          >
            <div className="rounded-[18px] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    avatarText
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {menuSubtitle}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-black/6 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
                  {roleText}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/15 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                  <MessageCircleMore className="size-3.5" />
                  {wechatText}
                </span>
              </div>
            </div>

            <div className="grid gap-2 pt-2">
              <button
                type="button"
                className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                onClick={() => void openUrl("https://www.gtamodx.com/")}
              >
                <span className="flex size-9 items-center justify-center rounded-2xl bg-black/[0.05] text-slate-700 dark:bg-white/[0.08] dark:text-slate-100">
                  <ExternalLink className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("auth.openWebsite")}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    gtamodx.com
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-500/[0.08]"
                onClick={() => void handleLogout()}
              >
                <span className="flex size-9 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
                  {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t("auth.submitLogout")}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {t("auth.loggedOut")}
                  </p>
                </div>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative size-9 cursor-pointer rounded-[14px] border border-black/6 bg-white/82 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] backdrop-blur-xl hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/[0.04] dark:hover:bg-white/[0.09] dark:hover:text-white"
          title={t("auth.openLogin")}
          onClick={openLoginDialog}
        >
          <User className="size-4" />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
        </Button>
      )}

      <Dialog open={isLoginDialogOpen} onOpenChange={(nextOpen) => (nextOpen ? openLoginDialog() : closeLoginDialog())}>
        <DialogContent className="max-w-[24rem] overflow-hidden rounded-[24px] border border-black/6 bg-white/96 p-0 shadow-[0_18px_60px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-[rgba(15,23,42,0.96)] dark:ring-white/[0.04]">
          <div className="px-6 pb-4 pt-6">
            <DialogHeader className="gap-2 text-left">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                GTAMODX
              </span>
              <DialogTitle className="text-[1.35rem] tracking-tight text-slate-900 dark:text-slate-100">
                {t("auth.dialogTitle")}
              </DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("auth.dialogDescription")}
              </p>
            </DialogHeader>
          </div>

          <div className="border-t border-black/5 px-6 py-5 dark:border-white/10">
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="modx-email">
                  {t("auth.email")}
                </label>
                <Input
                  id="modx-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isPending}
                  className="h-11 rounded-2xl border-black/8 bg-white/90 px-4 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="modx-password">
                  {t("auth.password")}
                </label>
                <Input
                  id="modx-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  disabled={isPending}
                  className="h-11 rounded-2xl border-black/8 bg-white/90 px-4 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>

              <div className="grid gap-2 pt-1">
                <Button
                  type="submit"
                  className="h-11 w-full cursor-pointer rounded-2xl bg-slate-900 text-white shadow-none hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  disabled={isPending || !isHydrated}
                >
                  {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  {t("auth.submitLogin")}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full cursor-pointer rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
                  onClick={() => void openUrl("https://gtamodx.com/register")}
                >
                  {t("auth.registerButton")}
                </Button>
              </div>

              {statusText ? (
                <p className="rounded-2xl border border-black/5 bg-black/[0.02] px-3 py-2 text-xs leading-6 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                  {statusText}
                </p>
              ) : null}
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { ModxAuthDialog }
