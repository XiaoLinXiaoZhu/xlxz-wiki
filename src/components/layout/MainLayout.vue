<template>
  <div class="main-layout">
    <Sidebar class="main-layout__sidebar" />
    <div class="main-layout__content">
      <Header class="main-layout__header" />
      <main class="main-layout__main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-layout__sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
}

.main-layout__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main-layout__header {
  flex-shrink: 0;
  border-bottom: 1px solid #e2e8f0;
}

.main-layout__main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
