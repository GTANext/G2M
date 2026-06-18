import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router-dom"

import { AppI18nProvider } from "@/components/app/i18nProvider"
import { AppPreferencesProvider } from "@/components/app/preferencesProvider"
import App from "./App"
import { ThemeProvider } from "@/components/app/themeProvider"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppI18nProvider>
        <AppPreferencesProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </AppPreferencesProvider>
      </AppI18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
