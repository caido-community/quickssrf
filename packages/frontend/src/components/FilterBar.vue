<script setup lang="ts">
import AutoComplete, {
  type AutoCompleteCompleteEvent,
} from "primevue/autocomplete";
import Button from "primevue/button";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

import { useInteractionStore } from "@/stores/interactionStore";

// Syntax highlighting colors
const COLORS = {
  field: "#90c191", // protocol, ip, path, payload
  operator: "#fec418", // eq, ne, cont, like, etc.
  value: "#ce9178", // quoted values
  punctuation: "#ffffff", // . : AND OR
};

const interactionStore = useInteractionStore();
const autocompleteRef = ref();
const highlightOverlay = ref<HTMLElement>();
const inputScrollLeft = ref(0);

// Local model for the input - syncs with store
const localFilter = ref(interactionStore.filterQuery);

// Debounce timer for syncing to backend
let syncTimeout: ReturnType<typeof setTimeout> | undefined;

// Sync local filter to store when user types (with debounce)
function syncFilterToBackend() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    interactionStore.setFilterQuery(localFilter.value);
  }, 300); // 300ms debounce
}

// Keep local filter in sync with store (for external changes)
watch(
  () => interactionStore.filterQuery,
  (newValue) => {
    if (localFilter.value !== newValue) {
      localFilter.value = newValue;
    }
  },
);

// Syntax highlighting function
function highlightSyntax(query: string): string {
  if (!query) return "";

  let result = "";
  let i = 0;

  while (i < query.length) {
    // Check for spaces
    if (query[i] === " ") {
      result += " ";
      i++;
      continue;
    }

    // Check for AND/OR
    const remaining = query.substring(i);
    const andMatch = remaining.match(/^(AND)(?=\s|$)/i);
    const orMatch = remaining.match(/^(OR)(?=\s|$)/i);

    if (andMatch && andMatch[1]) {
      result += `<span style="color: ${COLORS.punctuation}">${andMatch[1]}</span>`;
      i += andMatch[1].length;
      continue;
    }

    if (orMatch && orMatch[1]) {
      result += `<span style="color: ${COLORS.punctuation}">${orMatch[1]}</span>`;
      i += orMatch[1].length;
      continue;
    }

    // Parse token: field.operator:"value" or partial
    const tokenMatch = remaining.match(
      /^([a-zA-Z]+)(\.?)([a-zA-Z]*)(:{1,2})?("?)([^"]*)("?)/,
    );

    if (tokenMatch) {
      const [
        fullMatch,
        field,
        dot,
        operator,
        colon,
        openQuote,
        value,
        closeQuote,
      ] = tokenMatch;

      // Field (green)
      if (field) {
        result += `<span style="color: ${COLORS.field}">${escapeHtml(field)}</span>`;
      }

      // Dot (white)
      if (dot) {
        result += `<span style="color: ${COLORS.punctuation}">${dot}</span>`;
      }

      // Operator (yellow)
      if (operator) {
        result += `<span style="color: ${COLORS.operator}">${escapeHtml(operator)}</span>`;
      }

      // Colon (white)
      if (colon) {
        result += `<span style="color: ${COLORS.punctuation}">${colon}</span>`;
      }

      // Value with quotes (orange)
      if (openQuote || value || closeQuote) {
        result += `<span style="color: ${COLORS.value}">${escapeHtml(openQuote || "")}${escapeHtml(value || "")}${escapeHtml(closeQuote || "")}</span>`;
      }

      i += fullMatch.length;
    } else {
      // Fallback: just add the character
      result += escapeHtml(query[i] || "");
      i++;
    }
  }

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Computed highlighted HTML
const highlightedQuery = computed(() => highlightSyntax(localFilter.value));

// Sync scroll position
function syncScroll() {
  const input = autocompleteRef.value?.$el?.querySelector("input");
  if (input) {
    inputScrollLeft.value = input.scrollLeft;
  }
}

onMounted(() => {
  const input = autocompleteRef.value?.$el?.querySelector("input");
  if (input) {
    input.addEventListener("scroll", syncScroll);
  }
});

onBeforeUnmount(() => {
  const input = autocompleteRef.value?.$el?.querySelector("input");
  if (input) {
    input.removeEventListener("scroll", syncScroll);
  }
});

// Available fields
const fields = ["protocol", "ip", "path", "payload", "source", "tag"];

// Available operators
const operators = [
  "eq",
  "ne",
  "cont",
  "ncont",
  "like",
  "nlike",
  "regex",
  "nregex",
];

// Logical operators
const logicalOps = ["AND", "OR"];

const suggestions = ref<string[]>([]);
// Store the prefix before selection happens
let prefixBeforeSelect = "";
// Flag to indicate we should reopen after selection
let shouldReopenAfterSelect = false;

// Get unique values from current data
const protocolValues = computed(() => {
  const values = new Set<string>();
  interactionStore.data.forEach((item) => {
    values.add(item.protocol.toLowerCase());
  });
  values.add("dns");
  values.add("http");
  return Array.from(values);
});

const pathValues = computed(() => {
  const values = new Set<string>();
  interactionStore.data.forEach((item) => {
    if (item.httpPath) values.add(item.httpPath);
  });
  return Array.from(values);
});

const sourceValues = computed(() => {
  const values = new Set<string>();
  interactionStore.data.forEach((item) => {
    if (item.remoteAddress) values.add(item.remoteAddress);
  });
  return Array.from(values);
});

const tagValues = computed(() => {
  const values = new Set<string>();
  interactionStore.data.forEach((item) => {
    if (item.tag) values.add(item.tag);
  });
  return Array.from(values);
});

function getLastToken(query: string): { prefix: string; token: string } {
  // Don't trim - we need to detect trailing spaces
  const lastSpaceIndex = query.lastIndexOf(" ");
  if (lastSpaceIndex === -1) {
    return { prefix: "", token: query };
  }
  return {
    prefix: query.substring(0, lastSpaceIndex + 1),
    token: query.substring(lastSpaceIndex + 1),
  };
}

function computeSuggestions(query: string): string[] {
  const { prefix, token } = getLastToken(query);
  const lowerToken = token.toLowerCase();

  // Empty token - show fields, and AND/OR if there's already an expression
  if (!token) {
    const fieldSuggestions = fields.map((f) => `${f}.`);
    // If there's a prefix (meaning we already have an expression), also suggest AND/OR
    if (prefix.trim()) {
      return [...logicalOps, ...fieldSuggestions];
    }
    return fieldSuggestions;
  }

  // Check structure: field.operator:"value" or field.operator:value
  const dotIndex = token.indexOf(".");
  const colonIndex = token.indexOf(":");

  // Just started typing field name (no dot yet)
  if (dotIndex === -1 && colonIndex === -1) {
    const matchingFields = fields
      .filter((f) => f.startsWith(lowerToken))
      .map((f) => `${f}.`);
    const matchingLogical = logicalOps.filter((op) =>
      op.toLowerCase().startsWith(lowerToken),
    );
    return [...matchingFields, ...matchingLogical];
  }

  // Has dot but no colon - suggest operators
  if (dotIndex > 0 && colonIndex === -1) {
    const field = token.substring(0, dotIndex);
    const opPrefix = token.substring(dotIndex + 1).toLowerCase();

    if (opPrefix === "") {
      return operators.map((op) => `${field}.${op}:`);
    } else {
      return operators
        .filter((op) => op.startsWith(opPrefix))
        .map((op) => `${field}.${op}:`);
    }
  }

  // Has colon - suggest values
  if (colonIndex > 0) {
    const beforeColon = token.substring(0, colonIndex);
    const valuePrefix = token
      .substring(colonIndex + 1)
      .replace(/^["']|["']$/g, "")
      .toLowerCase();

    const fieldDotIndex = beforeColon.indexOf(".");
    const field =
      fieldDotIndex > 0 ? beforeColon.substring(0, fieldDotIndex) : beforeColon;

    let values: string[] = [];
    if (field === "protocol") {
      values = protocolValues.value;
    } else if (field === "ip" || field === "source") {
      values = sourceValues.value;
    } else if (field === "path") {
      values = pathValues.value;
    } else if (field === "tag") {
      values = tagValues.value;
    }

    return values
      .filter((v) => v.toLowerCase().startsWith(valuePrefix))
      .map((v) => `${beforeColon}:"${v}"`);
  }

  return [];
}

function search(event: AutoCompleteCompleteEvent) {
  suggestions.value = computeSuggestions(event.query);
  // Save the prefix before any selection happens
  const { prefix } = getLastToken(event.query);
  prefixBeforeSelect = prefix;
}

function onSelect(event: { value: string }) {
  const selected = event.value;

  // Use the saved prefix from before selection
  const prefix = prefixBeforeSelect;

  let newQuery: string;
  let cursorOffset = 0; // Offset from end of string for cursor position
  let shouldShowNextSuggestions = false;

  if (logicalOps.includes(selected)) {
    newQuery = `${prefix}${selected} `;
    shouldShowNextSuggestions = true; // Show field suggestions after AND/OR
  } else if (selected.endsWith(":")) {
    // Operator selected - add quotes and position cursor between them
    newQuery = `${prefix}${selected}""`;
    cursorOffset = 1; // Position cursor before the closing quote
    shouldShowNextSuggestions = true; // Show value suggestions
  } else if (selected.endsWith(".")) {
    newQuery = `${prefix}${selected}`;
    shouldShowNextSuggestions = true; // Show operator suggestions after field
  } else {
    // Value selected - add space
    newQuery = `${prefix}${selected} `;
    shouldShowNextSuggestions = true; // Show AND/OR or field suggestions
  }

  localFilter.value = newQuery;
  interactionStore.setFilterQuery(newQuery);

  // Update suggestions for new query
  nextTick(() => {
    const newSuggestions = computeSuggestions(newQuery);
    suggestions.value = newSuggestions;
    prefixBeforeSelect = getLastToken(newQuery).prefix;
    focusInputWithOffset(cursorOffset);

    // Set flag to reopen dropdown after it closes
    if (shouldShowNextSuggestions && newSuggestions.length > 0) {
      shouldReopenAfterSelect = true;
    }
  });
}

function onBeforeHide() {
  // If we should reopen after selection, do it in nextTick
  if (shouldReopenAfterSelect) {
    shouldReopenAfterSelect = false;
    nextTick(() => {
      // Recompute suggestions for current query and show
      suggestions.value = computeSuggestions(localFilter.value);
      prefixBeforeSelect = getLastToken(localFilter.value).prefix;
      nextTick(() => {
        autocompleteRef.value?.show();
      });
    });
  }
}

function focusInput() {
  focusInputWithOffset(0);
}

function focusInputWithOffset(offsetFromEnd: number) {
  const input = autocompleteRef.value?.$el?.querySelector("input");
  if (input) {
    input.focus();
    // Move cursor to position (offset from end)
    const len = input.value.length;
    const pos = len - offsetFromEnd;
    input.setSelectionRange(pos, pos);
  }
}

function triggerSearch() {
  // Simulate typing to trigger the autocomplete search
  const input = autocompleteRef.value?.$el?.querySelector("input");
  if (input) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // Also dispatch a focus event to ensure dropdown opens
    setTimeout(() => {
      input.dispatchEvent(new Event("focus", { bubbles: true }));
    }, 50);
  }
}

function updateFilter(newQuery: string) {
  localFilter.value = newQuery;
  interactionStore.setFilterQuery(newQuery);
}

function clearLocalFilter() {
  localFilter.value = "";
  interactionStore.setFilterQuery("");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Tab") {
    event.preventDefault();

    const query = localFilter.value;
    const { prefix, token } = getLastToken(query);

    // Single suggestion - autocomplete it
    if (suggestions.value.length === 1 && suggestions.value[0]) {
      const selected = suggestions.value[0];
      let newQuery: string;
      let cursorOffset = 0;

      if (logicalOps.includes(selected)) {
        newQuery = `${prefix}${selected} `;
      } else if (selected.endsWith(":")) {
        // Operator - add quotes and position cursor between them
        newQuery = `${prefix}${selected}""`;
        cursorOffset = 1;
      } else if (selected.endsWith(".")) {
        newQuery = `${prefix}${selected}`;
      } else {
        newQuery = `${prefix}${selected} `;
      }

      updateFilter(newQuery);

      nextTick(() => {
        suggestions.value = computeSuggestions(newQuery);
        focusInputWithOffset(cursorOffset);
        triggerSearch();
      });
      return;
    }

    // Try to find a match
    if (token) {
      const lowerToken = token.toLowerCase();
      const dotIndex = token.indexOf(".");
      const colonIndex = token.indexOf(":");

      // Match field
      if (dotIndex === -1 && colonIndex === -1) {
        const matchingField = fields.find((f) => f.startsWith(lowerToken));
        if (matchingField) {
          const newQuery = `${prefix}${matchingField}.`;
          updateFilter(newQuery);
          nextTick(() => {
            suggestions.value = computeSuggestions(newQuery);
            focusInput();
            triggerSearch();
          });
          return;
        }

        const matchingLogical = logicalOps.find((op) =>
          op.toLowerCase().startsWith(lowerToken),
        );
        if (matchingLogical) {
          const newQuery = `${prefix}${matchingLogical} `;
          updateFilter(newQuery);
          nextTick(() => {
            suggestions.value = computeSuggestions(newQuery);
            focusInput();
            triggerSearch();
          });
          return;
        }
      }

      // Match operator
      if (dotIndex > 0 && colonIndex === -1) {
        const field = token.substring(0, dotIndex);
        const opPrefix = token.substring(dotIndex + 1).toLowerCase();
        const matchingOp = operators.find((op) => op.startsWith(opPrefix));
        if (matchingOp) {
          const newQuery = `${prefix}${field}.${matchingOp}:""`;
          updateFilter(newQuery);
          nextTick(() => {
            suggestions.value = computeSuggestions(newQuery);
            focusInputWithOffset(1); // Position cursor between quotes
            triggerSearch();
          });
          return;
        }
      }

      // Match value
      if (colonIndex > 0) {
        const beforeColon = token.substring(0, colonIndex);
        const valuePrefix = token
          .substring(colonIndex + 1)
          .replace(/^["']|["']$/g, "")
          .toLowerCase();

        const fieldDotIndex = beforeColon.indexOf(".");
        const field =
          fieldDotIndex > 0
            ? beforeColon.substring(0, fieldDotIndex)
            : beforeColon;

        let values: string[] = [];
        if (field === "protocol") {
          values = protocolValues.value;
        } else if (field === "ip" || field === "source") {
          values = sourceValues.value;
        } else if (field === "path") {
          values = pathValues.value;
        } else if (field === "tag") {
          values = tagValues.value;
        }

        const matchingValue = values.find((v) =>
          v.toLowerCase().startsWith(valuePrefix),
        );
        if (matchingValue) {
          const newQuery = `${prefix}${beforeColon}:"${matchingValue}" `;
          updateFilter(newQuery);
          nextTick(() => {
            suggestions.value = computeSuggestions(newQuery);
            focusInput();
            triggerSearch();
          });
          return;
        }
      }
    }
  }
}

// Watch for local filter changes to update suggestions and sync to backend
watch(localFilter, (newQuery) => {
  suggestions.value = computeSuggestions(newQuery);
  syncFilterToBackend();
});
</script>

<template>
  <div
    class="filter-bar"
    :class="{ 'filter-disabled': !interactionStore.filterEnabled }"
  >
    <i class="fas fa-search text-surface-400 shrink-0" />
    <div class="autocomplete-wrapper">
      <AutoComplete
        ref="autocompleteRef"
        v-model="localFilter"
        :suggestions="suggestions"
        placeholder='protocol.eq:"dns" AND path.cont:"admin" (Tab to autocomplete)'
        fluid
        dropdown
        complete-on-focus
        class="flex-1 min-w-0"
        :pt="{
          root: { class: 'w-full' },
          pcInputText: {
            root: {
              class:
                'w-full !bg-surface-900 !border-surface-700 !rounded-lg !py-2.5 !px-3 placeholder:!text-surface-500 !text-transparent !caret-white !text-base !font-medium',
              spellcheck: 'false',
              autocomplete: 'off',
              autocorrect: 'off',
              autocapitalize: 'off',
            },
          },
          dropdown: {
            class: '!bg-surface-800 !border-surface-700 !rounded-r-lg',
          },
        }"
        @complete="search"
        @item-select="onSelect"
        @before-hide="onBeforeHide"
        @keydown="onKeydown"
        @input="syncScroll"
      />
      <div
        v-if="localFilter"
        ref="highlightOverlay"
        class="highlight-overlay"
        :style="{ transform: `translateX(-${inputScrollLeft}px)` }"
        v-html="highlightedQuery"
      />
    </div>
    <Button
      v-if="localFilter"
      v-tooltip="
        interactionStore.filterEnabled ? 'Disable filter' : 'Enable filter'
      "
      :icon="
        interactionStore.filterEnabled
          ? 'fas fa-toggle-on'
          : 'fas fa-toggle-off'
      "
      :severity="interactionStore.filterEnabled ? 'primary' : 'secondary'"
      text
      size="small"
      class="shrink-0"
      @click="interactionStore.toggleFilter"
    />
    <Button
      v-if="localFilter"
      v-tooltip="'Clear filter'"
      icon="fas fa-filter-circle-xmark"
      severity="secondary"
      text
      size="small"
      class="shrink-0"
      @click="clearLocalFilter"
    />
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.filter-bar.filter-disabled .autocomplete-wrapper {
  opacity: 0.5;
}

.autocomplete-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.highlight-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.625rem 0.75rem; /* Match !py-2.5 !px-3 */
  pointer-events: none;
  white-space: pre;
  overflow: hidden;
  font-family: inherit;
  font-size: 1rem; /* text-base */
  font-weight: 500; /* font-medium */
  line-height: 1.5;
  /* Account for the dropdown button width */
  margin-right: 2.5rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
}

/* Hide overlay when input has selection to avoid double text */
.autocomplete-wrapper:has(input:focus) .highlight-overlay {
  /* Keep visible but ensure no conflict with selection */
}

/* Style the input selection to be invisible */
.autocomplete-wrapper :deep(input::selection) {
  background: rgba(59, 130, 246, 0.5);
  color: transparent;
}

/* Remove focus outline/ring */
.autocomplete-wrapper :deep(input:focus) {
  outline: none !important;
  box-shadow: none !important;
}
</style>
