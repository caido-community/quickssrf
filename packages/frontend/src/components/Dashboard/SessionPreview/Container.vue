<script setup lang="ts">
import { computed } from "vue";

import None from "./None.vue";
import Success from "./Success.vue";

import { useSessionsService } from "@/services/sessions";

const sessionsService = useSessionsService();
const session = computed(() => sessionsService.selectedSession);
</script>

<template>
  <Success v-if="session !== undefined" :session="session" />
  <None v-else />
</template>
