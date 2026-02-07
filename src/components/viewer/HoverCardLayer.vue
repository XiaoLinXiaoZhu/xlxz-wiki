<template>
  <Teleport to="body">
    <TransitionGroup name="hover-card">
      <WikiHoverCard
        v-for="card in cards"
        :key="card.id"
        :id="card.id"
        :term="card.term"
        :trigger-rect="card.triggerRect"
        :level="card.level"
      />
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useHoverCards } from '@/composables/useHoverCards'
import WikiHoverCard from './WikiHoverCard.vue'

const { cards } = useHoverCards()
</script>

<style>
/* 全局样式（不 scoped），因为 TransitionGroup 需要 */
.hover-card-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.hover-card-leave-active {
  transition: opacity 0.1s ease;
}

.hover-card-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.hover-card-leave-to {
  opacity: 0;
}
</style>
