<script setup lang="ts">
import type { SpringOptions } from "motion-v";
import { cn } from "~/utils/cn";
import { motion, useMotionValue, useSpring } from "motion-v";
interface StarsBackgroundProps {
  factor?: number;
  speed?: number;
  springOptions?: SpringOptions;
  starColor?: string;
  class?: string;
}

const props = withDefaults(defineProps<StarsBackgroundProps>(), {
  factor: 0.05,
  speed: 50,
  springOptions: () => ({ stiffness: 50, damping: 20 }),
  starColor: undefined, // 如果未提供，将根据主题自动选择
});

// For slot content
defineSlots();

// 获取当前主题
const colorMode = useColorMode()
const isDark = computed(() => {
  if (colorMode.value === 'dark') return true
  if (colorMode.value === 'light') return false
  // system 模式：检查系统偏好
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
})

// 根据主题计算星星颜色
const computedStarColor = computed(() => {
  if (props.starColor) return props.starColor
  return isDark.value ? "#fff" : "#1a1a1a"
})

// 根据主题计算背景渐变
const backgroundGradient = computed(() => {
  if (isDark.value) {
    return "bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]"
  } else {
    return "bg-[radial-gradient(ellipse_at_bottom,_#f5f5f5_0%,_#e0e0e0_100%)]"
  }
})

function generateStars(count: number, starColor: string) {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 4000) - 2000;
    const y = Math.floor(Math.random() * 4000) - 2000;
    shadows.push(`${x}px ${y}px ${starColor}`);
  }
  return shadows.join(", ");
}

const offsetX = useMotionValue(1);
const offsetY = useMotionValue(1);

const springX = useSpring(offsetX, props.springOptions);
const springY = useSpring(offsetY, props.springOptions);

function handleMouseMove(e: MouseEvent) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const newOffsetX = -(e.clientX - centerX) * props.factor;
  const newOffsetY = -(e.clientY - centerY) * props.factor;
  offsetX.set(newOffsetX);
  offsetY.set(newOffsetY);
}

const boxShadow1 = ref("");
const boxShadow2 = ref("");
const boxShadow3 = ref("");

// 生成星星的函数，使用计算后的颜色
const updateStars = () => {
  const color = computedStarColor.value
  boxShadow1.value = generateStars(1000, color);
  boxShadow2.value = generateStars(400, color);
  boxShadow3.value = generateStars(200, color);
}

onMounted(() => {
  updateStars()

  // 监听系统主题变化（当 colorMode 为 'system' 时）
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (colorMode.value === 'system' || colorMode.preference === 'system') {
        updateStars()
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    // 清理函数
    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    })
  }
});

// Watch for starColor prop changes
watch(
  () => props.starColor,
  () => {
    updateStars()
  },
);

// Watch for theme changes
watch(
  () => isDark.value,
  () => {
    updateStars()
  },
);

// Watch for colorMode preference changes
watch(
  () => colorMode.preference,
  () => {
    updateStars()
  },
);

const starLayer1Transition = computed(() => ({
  repeat: Infinity,
  duration: props.speed,
  ease: "linear" as const,
}));

const starLayer2Transition = computed(() => ({
  repeat: Infinity,
  duration: props.speed * 2,
  ease: "linear" as const,
}));

const starLayer3Transition = computed(() => ({
  repeat: Infinity,
  duration: props.speed * 3,
  ease: "linear" as const,
}));
</script>

<template>
  <div :class="cn(
    'relative size-full overflow-hidden',
    backgroundGradient,
    props.class,
  )
    " @mousemove="handleMouseMove">
    <motion.div :style="{ x: springX, y: springY }">
      <!-- Star Layer 1 -->
      <motion.div class="absolute top-0 left-0 w-full h-[2000px]" :animate="{ y: [0, -2000] }"
        :transition="starLayer1Transition">
        <div class="absolute bg-transparent rounded-full" :style="{
          width: '1px',
          height: '1px',
          boxShadow: boxShadow1,
        }" />
        <div class="absolute bg-transparent rounded-full top-[2000px]" :style="{
          width: '1px',
          height: '1px',
          boxShadow: boxShadow1,
        }" />
      </motion.div>

      <!-- Star Layer 2 -->
      <motion.div class="absolute top-0 left-0 w-full h-[2000px]" :animate="{ y: [0, -2000] }"
        :transition="starLayer2Transition">
        <div class="absolute bg-transparent rounded-full" :style="{
          width: '2px',
          height: '2px',
          boxShadow: boxShadow2,
        }" />
        <div class="absolute bg-transparent rounded-full top-[2000px]" :style="{
          width: '2px',
          height: '2px',
          boxShadow: boxShadow2,
        }" />
      </motion.div>

      <!-- Star Layer 3 -->
      <motion.div class="absolute top-0 left-0 w-full h-[2000px]" :animate="{ y: [0, -2000] }"
        :transition="starLayer3Transition">
        <div class="absolute bg-transparent rounded-full" :style="{
          width: '3px',
          height: '3px',
          boxShadow: boxShadow3,
        }" />
        <div class="absolute bg-transparent rounded-full top-[2000px]" :style="{
          width: '3px',
          height: '3px',
          boxShadow: boxShadow3,
        }" />
      </motion.div>
    </motion.div>

    <!-- Slot for child content -->
    <slot />
  </div>
</template>