import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST || "localhost";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined
          }

          if (
            /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)
          ) {
            return "react-vendor"
          }

          if (/node_modules[\\/](@tauri-apps)[\\/]/.test(id)) {
            return "tauri-vendor"
          }

          if (/node_modules[\\/](i18next|react-i18next)[\\/]/.test(id)) {
            return "i18n-vendor"
          }

          if (/node_modules[\\/](lucide-react|next-themes|sonner)[\\/]/.test(id)) {
            return "ui-vendor"
          }

          return "vendor"
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
} as any);
