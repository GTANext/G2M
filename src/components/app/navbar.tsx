import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AppWindowMac,
  FileCode2,
  House,
  Maximize2,
  Minimize2,
  MoonStar,
  Settings2,
  Square,
  SunMedium,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { ModxAuthDialog } from "@/components/app/modxAuthDialog";
import { useAppPreferences } from "@/components/app/preferencesProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavbarProps = {
  subtitle?: string;
  title: string;
};

function Navbar({ subtitle, title }: NavbarProps) {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { titleBarStyle } = useAppPreferences();

  useEffect(() => {
    void (async () => {
      setIsMaximized(await appWindow.isMaximized());
    })();
  }, [appWindow]);

  async function handleToggleMaximize() {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  }

  function handleDragStart(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    void appWindow.startDragging();
  }

  function handleTitleBarDoubleClick() {
    void handleToggleMaximize();
  }

  function handleCycleTheme() {
    const nextTheme = resolvedThemeMode === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  const resolvedThemeMode = resolvedTheme === "dark" ? "dark" : "light";
  const themeMeta =
    resolvedThemeMode === "dark"
      ? {
          icon: MoonStar,
          title: t("navbar.darkTitle"),
        }
      : {
          icon: SunMedium,
          title: t("navbar.lightTitle"),
        };

  const ThemeIcon = themeMeta.icon;
  const isMacStyle = titleBarStyle === "mac";
  const isHomeRoute = location.pathname === "/";
  const isBuilderRoute = location.pathname === "/builder";
  const isSettingsRoute = location.pathname === "/settings";
  return (
    <header className="sticky top-0 z-50 px-4 pt-4 lg:px-6">
      <div className="mx-auto max-w-[1700px]">
        <div
          className={cn(
            "flex h-16 items-center justify-between rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.78))] px-3 shadow-[0_18px_70px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] backdrop-blur-xl select-none dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.68))] dark:shadow-[0_18px_70px_rgba(0,0,0,0.38)] dark:ring-white/[0.03]",
            isMacStyle && "relative h-[58px] rounded-[20px] px-4",
          )}
        >
          {isMacStyle && (
            <div className="flex items-center gap-2 pr-3">
              <WindowTrafficLight
                tone="close"
                title={t("navbar.closeWindow")}
                onClick={() => void appWindow.close()}
                icon={<X className="size-3" strokeWidth={2.4} />}
              />
              <WindowTrafficLight
                tone="minimize"
                title={t("navbar.minimizeWindow")}
                onClick={() => void appWindow.minimize()}
                icon={<Minimize2 className="size-3" strokeWidth={2.4} />}
              />
              <WindowTrafficLight
                tone="maximize"
                title={
                  isMaximized
                    ? t("navbar.restoreWindow")
                    : t("navbar.maximizeWindow")
                }
                onClick={() => void handleToggleMaximize()}
                icon={
                  isMaximized ? (
                    <Square className="size-2.5" strokeWidth={2.4} />
                  ) : (
                    <AppWindowMac className="size-3" strokeWidth={2.4} />
                  )
                }
              />
            </div>
          )}

          {isMacStyle ? (
            <div
              data-tauri-drag-region
              className="absolute left-1/2 top-1/2 flex w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center px-20 text-center"
              onMouseDown={handleDragStart}
              onDoubleClick={handleTitleBarDoubleClick}
            >
              <div className="flex min-w-0 items-center justify-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl text-white">
                  <img src="/images/logo.svg" alt="G2M" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {subtitle ?? t("routes.workspaceSubtitle")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              data-tauri-drag-region
              className="flex min-w-0 flex-1 cursor-move items-center gap-3 px-3"
              onMouseDown={handleDragStart}
              onDoubleClick={handleTitleBarDoubleClick}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white">
                <img src="/images/logo.svg" alt="G2M" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {subtitle ?? t("routes.workspaceSubtitle")}
                </p>
              </div>
            </div>
          )}

          <div
            className={cn(
              "relative z-10 flex items-center gap-2 pl-3",
              isMacStyle && "pl-4",
            )}
          >
            <div className="hidden items-center gap-1 rounded-full border border-black/5 bg-white/62 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04] md:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "cursor-pointer rounded-full px-3 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isHomeRoute &&
                    "bg-white text-slate-900 shadow-sm dark:bg-white/[0.1] dark:text-slate-100",
                  isMacStyle && "h-9 px-3",
                )}
              >
                <NavLink to="/" title={t("navbar.openHome")}>
                  <House className="size-4" />
                  <span>{t("navbar.home")}</span>
                </NavLink>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "cursor-pointer rounded-full px-3 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isBuilderRoute &&
                    "bg-white text-slate-900 shadow-sm dark:bg-white/[0.1] dark:text-slate-100",
                  isMacStyle && "h-9 px-3",
                )}
              >
                <NavLink to="/builder" title={t("navbar.openBuilder")}>
                  <FileCode2 className="size-4" />
                  <span>{t("navbar.builder")}</span>
                </NavLink>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "cursor-pointer rounded-full px-3 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isSettingsRoute &&
                    "bg-white text-slate-900 shadow-sm dark:bg-white/[0.1] dark:text-slate-100",
                  isMacStyle && "h-9 px-3",
                )}
              >
                <NavLink to="/settings" title={t("navbar.openSettings")}>
                  <Settings2 className="size-4" />
                  <span>{t("navbar.settings")}</span>
                </NavLink>
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white/62 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]">
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "cursor-pointer rounded-full text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isMacStyle && "size-9",
                )}
                onClick={handleCycleTheme}
                title={themeMeta.title}
              >
                <ThemeIcon className="size-4" />
              </Button>
              <ModxAuthDialog />
            </div>

            {!isMacStyle && (
              <div className="ml-1 flex items-center gap-1">
                <WindowActionButton
                  title={t("navbar.minimizeWindow")}
                  onClick={() => void appWindow.minimize()}
                >
                  <Minimize2 className="size-4" />
                </WindowActionButton>
                <WindowActionButton
                  title={
                    isMaximized
                      ? t("navbar.restoreWindow")
                      : t("navbar.maximizeWindow")
                  }
                  onClick={() => void handleToggleMaximize()}
                >
                  {isMaximized ? (
                    <Square className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </WindowActionButton>
                <WindowActionButton
                  tone="danger"
                  title={t("navbar.closeWindow")}
                  onClick={() => void appWindow.close()}
                >
                  <X className="size-4" />
                </WindowActionButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function WindowTrafficLight({
  icon,
  onClick,
  title,
  tone,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  tone: "close" | "minimize" | "maximize";
}) {
  const toneClassName =
    tone === "close"
      ? "bg-[#ff5f57] ring-[#e0443e]/30"
      : tone === "minimize"
        ? "bg-[#febc2e] ring-[#d7a025]/30"
        : "bg-[#28c840] ring-[#20a834]/30";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`group flex size-3.5 cursor-pointer items-center justify-center rounded-full ring-1 transition-transform hover:scale-105 ${toneClassName}`}
    >
      <span className="text-black/55 opacity-0 transition-opacity group-hover:opacity-100">
        {icon}
      </span>
    </button>
  );
}

function WindowActionButton({
  children,
  onClick,
  title,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "cursor-pointer rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
        tone === "danger" &&
          "hover:bg-red-500 hover:text-white dark:hover:bg-red-500",
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export { Navbar };
