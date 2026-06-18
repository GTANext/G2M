import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export { ThemeProvider }
