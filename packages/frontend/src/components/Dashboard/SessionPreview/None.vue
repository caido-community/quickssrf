<script setup lang="ts">
import Card from "primevue/card";
</script>

<template>
  <Card
    class="h-full"
    :pt="{
      body: { class: 'h-full p-0' },
      content: { class: 'h-full flex flex-col' },
    }"
  >
    <template #content>
      <div
        class="flex-1 flex items-center justify-center flex-col gap-3 p-8 text-center"
      >
        <i class="fas fa-crosshairs text-surface-500 text-4xl" />
        <p class="text-surface-400 text-sm">
          Create a session to start capturing interactions.
        </p>
      </div>
    </template>
  </Card>
</template>
