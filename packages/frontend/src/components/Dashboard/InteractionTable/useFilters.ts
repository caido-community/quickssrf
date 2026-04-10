import type { Interaction } from "shared";
import { computed, ref, watch } from "vue";

const PROTOCOL_BUTTONS = [
  "all",
  "dns",
  "http",
  "smtp",
  "ftp",
  "ldap",
  "smb",
  "other",
];
const KNOWN_PROTOCOLS = new Set([
  "dns",
  "http",
  "https",
  "smtp",
  "smtps",
  "ftp",
  "ftps",
  "ldap",
  "smb",
]);

type SortField = "index" | "protocol" | "remoteAddress" | "timestamp";
type SortDir = "asc" | "desc";

export function useFilters(getInteractions: () => Interaction[]) {
  const searchQuery = ref("");
  const selectedProtocols = ref(["all"]);
  const sortField = ref<SortField | undefined>(undefined);
  const sortDir = ref<SortDir | undefined>(undefined);

  watch(selectedProtocols, (newVal, oldVal) => {
    if (newVal.length === 0) {
      selectedProtocols.value = ["all"];
      return;
    }

    const addedAll = newVal.includes("all") && !oldVal.includes("all");
    if (addedAll) {
      selectedProtocols.value = ["all"];
      return;
    }

    const removedAll = !newVal.includes("all") && oldVal.includes("all");
    if (!removedAll && newVal.includes("all") && newVal.length > 1) {
      selectedProtocols.value = newVal.filter((v) => v !== "all");
      return;
    }

    const allNonAll = PROTOCOL_BUTTONS.filter((b) => b !== "all");
    if (newVal.filter((v) => v !== "all").length === allNonAll.length) {
      selectedProtocols.value = ["all"];
    }
  });

  const toggleSort = (field: SortField) => {
    if (sortField.value === field) {
      if (sortDir.value === "asc") {
        sortDir.value = "desc";
      } else {
        sortField.value = undefined;
        sortDir.value = undefined;
      }
    } else {
      sortField.value = field;
      sortDir.value = "asc";
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField.value !== field) return "fas fa-sort";
    if (sortDir.value === "asc") return "fas fa-sort-up";
    return "fas fa-sort-down";
  };

  const filtered = computed(() => {
    let items = getInteractions();

    if (!selectedProtocols.value.includes("all")) {
      const selected = new Set(selectedProtocols.value);
      items = items.filter((i) => {
        if (selected.has("other") && !KNOWN_PROTOCOLS.has(i.protocol))
          return true;
        if (selected.has(i.protocol)) return true;
        const base = i.protocol.replace(/s$/, "");
        if (selected.has(base)) return true;
        return false;
      });
    }

    if (searchQuery.value !== "") {
      const q = searchQuery.value.toLowerCase();
      items = items.filter(
        (i) =>
          i.remoteAddress.toLowerCase().includes(q) ||
          i.rawRequest.toLowerCase().includes(q) ||
          i.fullId.toLowerCase().includes(q),
      );
    }

    if (sortField.value !== undefined && sortDir.value !== undefined) {
      const field = sortField.value;
      const dir = sortDir.value === "asc" ? 1 : -1;
      items = [...items].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * dir;
        }
        return String(aVal).localeCompare(String(bVal)) * dir;
      });
    }

    return items;
  });

  const reset = () => {
    searchQuery.value = "";
    selectedProtocols.value = ["all"];
    sortField.value = undefined;
    sortDir.value = undefined;
  };

  return {
    searchQuery,
    selectedProtocols,
    PROTOCOL_BUTTONS,
    filtered,
    reset,
    toggleSort,
    getSortIcon,
  };
}
