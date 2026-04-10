<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import ToggleSwitch from "primevue/toggleswitch";
import {
  type Provider,
  PROVIDER_NOTES,
  PROVIDER_PROTOCOLS,
  type ProviderKind,
  QUICK_ADD_PRESETS,
} from "shared";
import { computed, ref } from "vue";

import ProviderDialog from "./ProviderDialog.vue";

import { useProvidersStore } from "@/stores/providers";

const providersStore = useProvidersStore();

const showDialog = ref(false);
const editMode = ref(false);
const editingId = ref<string | undefined>(undefined);
const dialogRef = ref<InstanceType<typeof ProviderDialog>>();

const enabledCount = computed(
  () => providersStore.providers.filter((p) => p.enabled).length,
);
const isLastProvider = computed(() => providersStore.providers.length <= 1);

const presetUrls = new Set(QUICK_ADD_PRESETS.map((p) => p.url));
const isCustomProvider = (provider: Provider) => !presetUrls.has(provider.url);

const openCustomDialog = () => {
  editMode.value = false;
  editingId.value = undefined;
  dialogRef.value?.setForm({
    name: "",
    kind: "interactsh",
    url: "",
    token: "",
    enabled: true,
  });
  showDialog.value = true;
};

const onEdit = (provider: Provider) => {
  editMode.value = true;
  editingId.value = provider.id;
  dialogRef.value?.setForm({
    name: provider.name,
    kind: provider.kind,
    url: provider.url,
    token: provider.token ?? "",
    enabled: provider.enabled,
  });
  showDialog.value = true;
};

const onSave = async (form: {
  name: string;
  kind: ProviderKind;
  url: string;
  token: string;
  enabled: boolean;
}) => {
  const input = { ...form, token: form.token || undefined };

  if (editingId.value !== undefined) {
    const result = await providersStore.updateProvider(editingId.value, input);
    if (result.kind === "Ok") showDialog.value = false;
  } else {
    const result = await providersStore.addProvider(input);
    if (result.kind === "Ok") showDialog.value = false;
  }
};

const onToggleEnabled = async (id: string, enabled: boolean) => {
  await providersStore.updateProvider(id, { enabled });
};

const onDelete = async (id: string) => {
  await providersStore.deleteProvider(id);
};

const getProviderTooltip = (provider: Provider) => {
  if (isCustomProvider(provider) && provider.kind === "interactsh") {
    return `<small>Supports: DNS, HTTP/S, SMTP, LDAP, FTP, SMB<br>Self-hosted server</small>`;
  }
  const protocols = PROVIDER_PROTOCOLS[provider.kind].join(", ");
  return `<small>Supports: ${protocols}<br>${PROVIDER_NOTES[provider.kind]}</small>`;
};

defineExpose({ openCustomDialog });
</script>

<template>
  <div class="flex flex-col">
    <DataTable :value="providersStore.providers" striped-rows size="small">
      <Column field="name" header="Name">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <span>{{ data.name }}</span>
            <i
              v-tooltip.right="{
                value: getProviderTooltip(data),
                showDelay: 300,
                escape: false,
              }"
              class="fas fa-circle-info text-surface-500 text-xs cursor-help"
            />
          </div>
        </template>
      </Column>
      <Column field="kind" header="Type" />
      <Column field="url" header="URL" />
      <Column header="Enabled" style="width: 6rem">
        <template #body="{ data }">
          <ToggleSwitch
            :model-value="data.enabled"
            :disabled="data.enabled && enabledCount <= 1"
            @update:model-value="onToggleEnabled(data.id, $event)"
          />
        </template>
      </Column>
      <Column header="" style="width: 3rem">
        <template #body="{ data }">
          <Button
            v-if="isCustomProvider(data)"
            icon="fas fa-pencil"
            severity="secondary"
            text
            size="small"
            @click="onEdit(data)"
          />
        </template>
      </Column>
      <Column header="" style="width: 3rem">
        <template #body="{ data }">
          <Button
            icon="fas fa-trash"
            severity="danger"
            text
            size="small"
            :disabled="isLastProvider"
            @click="onDelete(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <ProviderDialog
      ref="dialogRef"
      v-model:visible="showDialog"
      :edit-mode="editMode"
      @save="onSave"
    />
  </div>
</template>
