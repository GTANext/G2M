import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router-dom"

import { ModxAuthProvider } from "@/components/app/modxAuthProvider"
import { AppPreferencesProvider } from "@/components/app/preferencesProvider"
import App from "./App"
import { ThemeProvider } from "@/components/app/themeProvider"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ModxAuthProvider>
        <AppPreferencesProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </AppPreferencesProvider>
      </ModxAuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
