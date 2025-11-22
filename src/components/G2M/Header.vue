<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>

<template>
  <NCard class="page-header-card" :bordered="false">
    <div class="header-content">
      <div class="header-left">
        <slot name="left">
          <h1 v-if="title" class="page-title">{{ title }}</h1>
        </slot>
      </div>
      <div class="header-right">
        <NSpace>
        <slot name="right"></slot>
        </NSpace>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.page-header-card {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.header-right {
  flex-shrink: 0;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .page-title {
    font-size: 20px;
  }
}
</style>