import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router-dom"

import App from "./App"
import { ThemeProvider } from "@/components/app/theme-provider"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
