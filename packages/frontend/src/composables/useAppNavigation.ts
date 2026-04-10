import { computed, ref } from "vue";

import Dashboard from "@/views/Dashboard.vue";
import Providers from "@/views/Providers.vue";
import Settings from "@/views/Settings.vue";

type Page = "Dashboard" | "Providers" | "Settings";

export function useAppNavigation() {
  const page = ref<Page>("Dashboard");

  const navItems = [
    {
      label: "Dashboard",
      isActive: () => page.value === "Dashboard",
      command: () => {
        page.value = "Dashboard";
      },
    },
    {
      label: "Providers",
      isActive: () => page.value === "Providers",
      command: () => {
        page.value = "Providers";
      },
    },
    {
      label: "Settings",
      isActive: () => page.value === "Settings",
      command: () => {
        page.value = "Settings";
      },
    },
  ];

  const component = computed(() => {
    switch (page.value) {
      case "Dashboard":
        return Dashboard;
      case "Providers":
        return Providers;
      case "Settings":
        return Settings;
      default:
        return undefined;
    }
  });

  return { page, navItems, component };
}
