export const useViewport = () => {
  const isMobile = ref(false)
  const width = ref(0)
  const MOBILE_BREAKPOINT = 768

  const checkViewport = () => {
    if (import.meta.client) {
      width.value = window.innerWidth
      isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      checkViewport()
      window.addEventListener('resize', checkViewport)
    }
  })

  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('resize', checkViewport)
    }
  })

  return {
    isMobile,
    width
  }
}

