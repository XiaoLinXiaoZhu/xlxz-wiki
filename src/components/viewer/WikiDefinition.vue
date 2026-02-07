<template>
  <span class="wiki-definition">
    <span class="wiki-definition__term">【{{ term }}】</span>
    <span class="wiki-definition__colon">：</span>
    <span class="wiki-definition__content">{{ definition }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  term: string
  definition: string
}>()
</script>

<style scoped>
.wiki-definition {
  display: block;
  padding: 4px 0;
  margin: 2px 0;
}

.wiki-definition__term {
  color: #8250df;
  font-weight: 600;
}

.wiki-definition__colon {
  color: #57606a;
}

.wiki-definition__content {
  color: #24292e;
}
</style>
