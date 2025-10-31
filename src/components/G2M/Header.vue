<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>

<template>
  <a-card class="page-header-card" :bordered="true">
    <div class="header-content">
      <div class="header-left">
        <slot name="left">
          <h1 v-if="title" class="page-title">{{ title }}</h1>
        </slot>
      </div>
      <div class="header-right">
        <slot name="right"></slot>
      </div>
    </div>
  </a-card>
</template>

<style scoped>
.page-header-card {
  margin-bottom: 24px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1890ff;
  margin: 0;
  line-height: 1.2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header-card {
    margin-bottom: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-left,
  .header-right {
    flex: none;
  }

  .page-title {
    font-size: 24px;
    text-align: center;
  }
}
</style>