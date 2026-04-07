<script setup lang="ts">
import { useDebounceFn, whenever } from "@vueuse/core";
import Button from "primevue/button";
import ContextMenu from "primevue/contextmenu";
import { nextTick, ref } from "vue";

import { getStatusDotColor } from "@/utils/statusColors";

const isEditable = defineModel<boolean>("isEditable", { default: false });

const props = defineProps<{
  isSelected: boolean;
  label: string;
  status: string;
}>();

const emit = defineEmits<{
  (e: "select"): void;
  (e: "rename", newName: string): void;
  (e: "delete"): void;
}>();

const newValue = ref("");
const inputRef = ref<HTMLInputElement>();
const contextMenuRef = ref<InstanceType<typeof ContextMenu>>();

const contextMenuItems = [
  {
    label: "Rename",
    icon: "fas fa-pencil",
    command: () => {
      isEditable.value = true;
    },
  },
  {
    label: "Delete",
    icon: "fas fa-trash",
    command: () => {
      emit("delete");
    },
  },
];

const onDoubleClick = () => {
  isEditable.value = true;
};

const onRightClick = (event: MouseEvent) => {
  contextMenuRef.value?.show(event);
};

whenever(isEditable, async () => {
  newValue.value = props.label;
  await nextTick();

  const input = inputRef.value;
  if (input !== undefined) {
    input.focus();
    input.select();
  }
});

const onSubmit = useDebounceFn(() => {
  if (newValue.value !== props.label) {
    emit("rename", newValue.value);
  }
  isEditable.value = false;
}, 10);
</script>

<template>
  <div @dblclick="onDoubleClick" @contextmenu.prevent="onRightClick">
    <Button
      :class="[
        isSelected ? '!border-secondary-400' : '!border-surface-700',
        '!bg-surface-900 border-[1px] rounded-md !ring-0',
      ]"
      severity="contrast"
      size="small"
      outlined
      @mousedown="emit('select')"
    >
      <div class="flex items-center gap-2">
        <div
          :class="[
            'w-1.5 h-1.5 rounded-full shrink-0',
            getStatusDotColor(status),
          ]"
        />

        <template v-if="isEditable">
          <div class="relative">
            <span class="invisible px-1 whitespace-nowrap">{{ newValue }}</span>
            <input
              ref="inputRef"
              v-model="newValue"
              autocomplete="off"
              name="label"
              class="absolute top-0 left-0 w-full h-full px-1 text-sm focus:outline outline-1 outline-secondary-400 rounded-sm bg-surface-900 overflow-hidden text-ellipsis"
              @focusout.prevent="onSubmit"
              @keydown.enter.prevent="onSubmit"
            />
          </div>
        </template>
        <span v-else class="px-1 whitespace-nowrap text-sm">{{ label }}</span>
      </div>
    </Button>

    <ContextMenu ref="contextMenuRef" :model="contextMenuItems" />
  </div>
</template>
