<script setup lang="ts">
import { SessionPreview, SessionTabList } from "@/components/Dashboard";
</script>

<template>
  <div class="flex flex-col h-full min-h-0 gap-1 overflow-hidden">
    <SessionTabList />
    <div class="flex-1 min-h-0">
      <SessionPreview />
    </div>
  </div>
</template>
