<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { type PROVIDER_KINDS } from "shared";
import { ref } from "vue";

const visible = defineModel<boolean>("visible", { default: false });

const props = defineProps<{
  editMode: boolean;
}>();

const emit = defineEmits<{
  (
    e: "save",
    form: {
      name: string;
      kind: (typeof PROVIDER_KINDS)[number];
      url: string;
      token: string;
      enabled: boolean;
    },
  ): void;
}>();

const form = ref({
  name: "",
  kind: "interactsh" as (typeof PROVIDER_KINDS)[number],
  url: "",
  token: "",
  enabled: true,
});

const kindOptions = [
  { label: "Interactsh (self-hosted)", value: "interactsh" },
  { label: "Custom HTTP endpoint", value: "custom" },
];

const setForm = (data: typeof form.value) => {
  form.value = { ...data };
};

const onSave = () => {
  emit("save", { ...form.value });
};

defineExpose({ setForm });
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="props.editMode ? 'Edit Provider' : 'Add Custom Provider'"
    :modal="true"
    style="width: 28rem"
  >
    <div class="flex flex-col gap-3 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium" for="provider-name">Name</label>
        <InputText
          id="provider-name"
          v-model="form.name"
          placeholder="My Server"
          autofocus
        />
      </div>

      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1">
          <label class="text-sm font-medium">Type</label>
          <i
            v-if="form.kind === 'custom'"
            v-tooltip.right="{
              value:
                '<small>Your endpoint must respond to GET with a JSON array:<br>[{ id, protocol, source, rawRequest, timestamp }]<br>The URL itself is used as the payload URL.</small>',
              escape: false,
              showDelay: 200,
            }"
            class="fas fa-circle-info text-surface-500 text-xs cursor-help"
          />
        </div>
        <Select
          v-model="form.kind"
          :options="kindOptions"
          option-label="label"
          option-value="value"
          :disabled="props.editMode"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">URL</label>
        <InputText v-model="form.url" placeholder="https://oast.example.com" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Token (optional)</label>
        <InputText
          v-model="form.token"
          placeholder="auth-token"
          type="password"
        />
      </div>

      <div class="flex items-center justify-between">
        <label class="text-sm font-medium">Enabled</label>
        <ToggleSwitch v-model="form.enabled" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button
          label="Cancel"
          severity="secondary"
          text
          @click="visible = false"
        />
        <Button
          :label="props.editMode ? 'Save' : 'Add'"
          :disabled="form.name === '' || form.url === ''"
          @click="onSave"
        />
      </div>
    </div>
  </Dialog>
</template>
