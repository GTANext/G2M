import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AppWindowMac,
  FileCode2,
  House,
  Minimize2,
  MoonStar,
  Settings2,
  Square,
  SunMedium,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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

const navbarControlGroupClass =
  "flex h-11 items-center rounded-[18px] border border-black/5 bg-white/62 p-1 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/[0.04]";

function Navbar({ subtitle, title }: NavbarProps) {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const themeApplyFrameRef = useRef<number | null>(null);
  const themeCleanupTimerRef = useRef<number | null>(null);
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { titleBarStyle } = useAppPreferences();

  useEffect(() => {
    void (async () => {
      setIsMaximized(await appWindow.isMaximized());
    })();
  }, [appWindow]);

  useEffect(() => {
    return () => {
      const root = document.documentElement;

      if (themeApplyFrameRef.current !== null) {
        window.cancelAnimationFrame(themeApplyFrameRef.current);
      }

      if (themeCleanupTimerRef.current !== null) {
        window.clearTimeout(themeCleanupTimerRef.current);
      }

      root.classList.remove("theme-transitioning");
      delete root.dataset.themeTransition;
    };
  }, []);

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
    if (isThemeAnimating) {
      return;
    }

    const root = document.documentElement;
    const nextTheme = resolvedThemeMode === "dark" ? "light" : "dark";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    root.dataset.themeTransition = nextTheme;
    root.classList.add("theme-transitioning");
    setIsThemeAnimating(true);

    if (themeApplyFrameRef.current !== null) {
      window.cancelAnimationFrame(themeApplyFrameRef.current);
    }

    if (themeCleanupTimerRef.current !== null) {
      window.clearTimeout(themeCleanupTimerRef.current);
    }

    themeApplyFrameRef.current = window.requestAnimationFrame(() => {
      themeApplyFrameRef.current = window.requestAnimationFrame(() => {
        setTheme(nextTheme);
        themeApplyFrameRef.current = null;
      });
    });

    themeCleanupTimerRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
      delete root.dataset.themeTransition;
      setIsThemeAnimating(false);
      themeCleanupTimerRef.current = null;
    }, 240);
  }

  const resolvedThemeMode = resolvedTheme === "dark" ? "dark" : "light";
  const themeMeta =
    resolvedThemeMode === "dark"
      ? {
          title: t("navbar.darkTitle"),
        }
      : {
          title: t("navbar.lightTitle"),
        };
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
            <div className={cn(navbarControlGroupClass, "hidden gap-1 md:flex")}>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 cursor-pointer rounded-[14px] px-3 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isHomeRoute &&
                    "bg-white text-slate-900 shadow-sm dark:bg-white/[0.1] dark:text-slate-100",
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
                  "h-9 cursor-pointer rounded-[14px] px-3 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isBuilderRoute &&
                    "bg-white text-slate-900 shadow-sm dark:bg-white/[0.1] dark:text-slate-100",
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
                  "h-9 cursor-pointer rounded-[14px] px-3 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                  isSettingsRoute &&
                    "bg-white text-slate-900 shadow-sm dark:bg-white/[0.1] dark:text-slate-100",
                )}
              >
                <NavLink to="/settings" title={t("navbar.openSettings")}>
                  <Settings2 className="size-4" />
                  <span>{t("navbar.settings")}</span>
                </NavLink>
              </Button>
            </div>

            <div className={cn(navbarControlGroupClass, "gap-2")}>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "size-9 cursor-pointer rounded-[14px] text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100",
                )}
                onClick={handleCycleTheme}
                title={themeMeta.title}
                aria-label={themeMeta.title}
              >
                <span
                  className={cn(
                    "theme-toggle-glyph relative inline-flex size-4 items-center justify-center",
                    isThemeAnimating && "theme-toggle-glyph-active",
                  )}
                >
                  <SunMedium
                    className={cn(
                      "absolute inset-0 size-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      resolvedThemeMode === "light"
                        ? "scale-100 rotate-0 opacity-100"
                        : "scale-75 -rotate-30 opacity-0",
                    )}
                  />
                  <MoonStar
                    className={cn(
                      "absolute inset-0 size-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      resolvedThemeMode === "dark"
                        ? "scale-100 rotate-0 opacity-100"
                        : "scale-75 rotate-30 opacity-0",
                    )}
                  />
                </span>
              </Button>
              <ModxAuthDialog />
            </div>

            {!isMacStyle && (
              <div
                className={cn(
                  navbarControlGroupClass,
                  "ml-2 gap-1 bg-slate-950/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_rgba(15,23,42,0.08)] dark:bg-white/[0.035] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.2)]",
                )}
              >
                <WindowActionButton
                  kind="minimize"
                  title={t("navbar.minimizeWindow")}
                  onClick={() => void appWindow.minimize()}
                />
                <WindowActionButton
                  kind={isMaximized ? "restore" : "maximize"}
                  title={
                    isMaximized
                      ? t("navbar.restoreWindow")
                      : t("navbar.maximizeWindow")
                  }
                  onClick={() => void handleToggleMaximize()}
                />
                <WindowActionButton
                  kind="close"
                  tone="danger"
                  title={t("navbar.closeWindow")}
                  onClick={() => void appWindow.close()}
                />
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
  kind,
  onClick,
  title,
  tone = "default",
}: {
  kind: "minimize" | "maximize" | "restore" | "close";
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "relative h-9 w-10 cursor-pointer rounded-[12px] border-0 px-0 text-slate-600 transition-colors hover:bg-slate-950/[0.07] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white",
        tone === "danger" &&
          "hover:bg-[#e81123] hover:text-white dark:hover:bg-[#e81123]",
      )}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <WindowActionGlyph kind={kind} />
    </Button>
  );
}

function WindowActionGlyph({
  kind,
}: {
  kind: "minimize" | "maximize" | "restore" | "close";
}) {
  if (kind === "minimize") {
    return <span className="block h-px w-3 bg-current" />;
  }

  if (kind === "maximize") {
    return <span className="block size-3 border border-current" />;
  }

  if (kind === "restore") {
    return (
      <span className="relative block size-3.5">
        <span className="absolute right-0 top-0 size-[10px] border border-current bg-transparent" />
        <span className="absolute bottom-0 left-0 size-[10px] border border-current bg-transparent" />
      </span>
    );
  }

  return (
    <span className="relative block size-3.5">
      <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
      <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
    </span>
  );
}

export { Navbar };
