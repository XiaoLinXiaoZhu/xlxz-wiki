<template>
  <MainLayout />
  <HoverCardLayer />
</template>

<script setup lang="ts">
import MainLayout from './components/layout/MainLayout.vue'
import HoverCardLayer from './components/viewer/HoverCardLayer.vue'
</script>

<style>
/* 全局重置 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #24292e;
  background: #fff;
}
</style>
