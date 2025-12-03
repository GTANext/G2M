export default defineNuxtPlugin(() => {
    const colorMode = useColorMode()

    // 监听主题变化，确保 inspira-ui 的 CSS 变量正确更新
    watch(() => colorMode.preference, (preference) => {
        // Nuxt UI 会自动更新 HTML 类，我们只需要确保 inspira-ui 的变量同步
        nextTick(() => {
            const html = document.documentElement
            // 确保类正确应用
            if (preference === 'dark' || (preference === 'system' && html.classList.contains('dark'))) {
                html.classList.add('dark')
                html.classList.remove('light')
            } else {
                html.classList.add('light')
                html.classList.remove('dark')
            }
        })
    }, { immediate: true })

    // 监听实际的主题值变化
    watch(() => colorMode.value, () => {
        nextTick(() => {
            const html = document.documentElement
            // 根据当前实际主题值更新类
            const isDark = html.classList.contains('dark')
            if (isDark) {
                html.classList.remove('light')
            } else {
                html.classList.remove('dark')
                html.classList.add('light')
            }
        })
    }, { immediate: true })
})

