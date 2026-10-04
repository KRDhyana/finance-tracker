<template>
  <div class="space-y-10">
    <div class="flex justify-between items-center">
      <UButton to="/" icon="i-heroicons-arrow-left" color="neutral" variant="outline" aria-label="Back to Summary" />
      <section class="flex items-center gap-2">
        <UButton icon="i-heroicons-plus" label="Create group" color="neutral" variant="solid"
          @click="createGroupModalOpen = true" />
      </section>
    </div>



    <section class="space-y-3">
      <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">My groups</h2>
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" aria-label="Refresh"
          :loading="isRefreshing" @click="refresh()" />
        <UButton icon="i-heroicons-arrow-right-on-rectangle" label="Join group" color="neutral" variant="outline"
          @click="joinGroupModalOpen = true" />
      </div>
      </div>
      <div v-if="pendingGroups" class="grid gap-4">
        <USkeleton v-for="i in 3" :key="i" class="h-32 w-full" />
      </div>
      <div v-else-if="!memberships.length && groupsError" class="text-sm text-gray-500">
        Couldn't load your groups.
      </div>
      <div v-else-if="!memberships.length" class="text-sm text-gray-500">
        No memberships yet.
      </div>
      <div v-else class="grid gap-4">
        <article v-for="group in memberships" :key="group.id"
          class="border border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-lg">
                  {{ group.name ?? "Unnamed group" }}
                </p>
                <UBadge v-if="group.is_owner" color="warning" variant="subtle">Owner</UBadge>
                <UBadge v-if="groupCategoryLabel(group)" color="neutral" variant="subtle">
                  {{ groupCategoryLabel(group) }}
                </UBadge>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <NuxtLink v-if="group.id" :to="`/groups/${group.id}`"
                class="text-sm font-medium text-blue-600 dark:text-blue-400">
                View
              </NuxtLink>
              <UButton v-if="group.is_owner && group.id" size="xs" color="error" variant="outline"
                icon="i-heroicons-trash-20-solid" aria-label="Delete group" @click="openDeleteModal(group)" />
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Created
            {{
              group.created_at
                ? new Date(group.created_at).toLocaleDateString()
                : "—"
            }}
          </p>
          <div v-if="group.is_owner" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Invite token
            </p>
            <template v-if="group.token">
              <p v-if="isTokenRevealed(group.id)" class="text-xs font-mono break-all text-gray-700 dark:text-gray-300">
                {{ group.token }}
              </p>
              <p v-if="isTokenRevealed(group.id) && group.invite_expires_at" class="text-xs text-gray-500 mt-1">
                Expires {{ new Date(group.invite_expires_at).toLocaleString() }}
              </p>
              <div class="flex flex-wrap gap-2 mt-3">
                <UButton size="xs" color="neutral" variant="outline"
                  :icon="isTokenRevealed(group.id) ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :label="isTokenRevealed(group.id) ? 'Hide' : 'Show'"
                  @click="toggleToken(group.id)" />
                <UButton v-if="isTokenRevealed(group.id)" size="xs" color="neutral" variant="outline"
                  icon="i-heroicons-clipboard-document" label="Copy" @click="copyGroupToken(group.token)" />
                <UButton v-if="isTokenRevealed(group.id) && canShare" size="xs" color="neutral" variant="outline"
                  icon="i-heroicons-share" label="Share" @click="shareGroupInvite(group)" />
              </div>
            </template>
            <p v-else class="text-xs text-gray-500">
              No invite token loaded. Ensure your Supabase policy allows owners
              to read
              <span class="font-mono">group_invites</span>
              for this group.
            </p>
          </div>
        </article>
      </div>
    </section>

    <UModal v-model:open="createGroupModalOpen" title="Create a group">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">
          Start a shared workspace and generate an invite token.
        </p>
        <UFormField label="Group name" name="group">
          <UInput v-model="groupName" placeholder="e.g. Household Budgets" class="w-full" />
        </UFormField>
        <UFormField label="Group category" name="groupCategory" class="mt-4">
          <USelectMenu v-model="groupCategory" value-key="value" :items="groupCategoryItems"
            placeholder="Select a category" class="w-full" />
        </UFormField>
        <div class="flex items-center justify-end gap-3 mt-4">
          <UButton color="neutral" variant="outline" label="Cancel" @click="createGroupModalOpen = false" />
          <UButton :loading="isCreating" color="neutral" variant="solid" label="Create group"
            @click="handleCreateGroup" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="joinGroupModalOpen" title="Join a group">
      <template #body>
        <p class="text-sm text-gray-500 mb-4">
          Enter the invite token shared with you.
        </p>
        <UFormField label="Invite token" name="token">
          <UInput v-model="joinToken" placeholder="Token" class="w-full" />
        </UFormField>
        <div class="flex items-center justify-end gap-3 mt-4">
          <UButton color="neutral" variant="outline" label="Cancel" @click="joinGroupModalOpen = false" />
          <UButton :loading="isJoining" color="neutral" variant="solid" label="Join group" @click="handleJoinGroup" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="groupCreatedModalOpen" title="Group created" class="sm:max-w-md">
      <template #body>
        <div v-if="groupCreated" class="space-y-4">
          <dl class="space-y-2 text-sm">
            <div class="flex flex-wrap items-baseline gap-2">
              <dt class="shrink-0 text-gray-500 dark:text-gray-400">Name</dt>
              <dd class="min-w-0 font-medium text-gray-900 dark:text-white">
                {{ groupCreated.name }}
              </dd>
            </div>
            <div class="flex flex-wrap items-baseline gap-2">
              <dt class="shrink-0 text-gray-500 dark:text-gray-400">Category</dt>
              <dd>
                <UBadge v-if="groupCategoryLabel(groupCreated)" color="neutral" variant="subtle">
                  {{ groupCategoryLabel(groupCreated) }}
                </UBadge>
                <span v-else class="text-gray-600 dark:text-gray-300">—</span>
              </dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Invite token</dt>
              <dd v-if="createdTokenVisible"
                class="mt-1 break-all rounded-md bg-gray-50 p-2.5 font-mono text-xs text-gray-800 dark:bg-gray-800/80 dark:text-gray-200">
                {{ groupCreated.token }}
              </dd>
              <dd v-else class="mt-1 text-xs text-gray-500">Hidden</dd>
            </div>
          </dl>
          <div class="flex flex-wrap gap-2">
            <UButton color="neutral" variant="outline"
              :icon="createdTokenVisible ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              :label="createdTokenVisible ? 'Hide' : 'Show'"
              @click="createdTokenVisible = !createdTokenVisible" />
            <UButton v-if="createdTokenVisible" color="neutral" variant="outline" icon="i-heroicons-clipboard-document"
              label="Copy token" @click="copyGroupToken(groupCreated.token)" />
            <UButton v-if="createdTokenVisible && canShare" color="neutral" variant="solid" icon="i-heroicons-share"
              label="Share" @click="shareGroupInvite({ name: groupCreated.name, token: groupCreated.token })" />
          </div>
          <div class="flex justify-end border-t border-gray-200 pt-3 dark:border-gray-800">
            <UButton color="neutral" variant="solid" label="Done" @click="closeGroupCreatedModal" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="monthlyModalOpen" title="Monthly cycle (days)">
      <template #body>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Day of the month (1–31) only, same as credit card billing. Repeats every month.
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <UFormField label="Cycle start (day)" name="modalCycleStartDay">
            <DayOfMonthPicker v-model="modalCycleStartDay" title="Start" />
          </UFormField>
          <UFormField label="Cycle end (day)" name="modalCycleEndDay">
            <DayOfMonthPicker v-model="modalCycleEndDay" title="End" />
          </UFormField>
        </div>
        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <UButton color="neutral" variant="outline" label="Cancel" :disabled="isCreating"
            @click="monthlyModalOpen = false" />
          <UButton color="neutral" variant="solid" label="Create group" :loading="isCreating" :disabled="isCreating"
            @click="confirmMonthlyGroup" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteModalOpen" title="Delete group">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This permanently deletes
          <span class="font-medium text-gray-900 dark:text-gray-100">{{
            groupPendingDelete?.name ?? "this group"
          }}</span>
          , including invites, members, and all transactions stored for this
          group. This cannot be undone.
        </p>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton color="neutral" variant="outline" label="Cancel" @click="deleteModalOpen = false" />
          <UButton color="error" variant="solid" label="Delete group" :loading="isDeletingGroup"
            @click="confirmDeleteGroup" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from "vue";
import { useExpenseGroups } from "~/composables/useExpenseGroups";
import { expenseGroupCategoryOptions } from "~/constants";

const {
  listMyMemberships,
  createGroupWithInvite,
  acceptInvite,
  deleteGroupAsOwner,
  getLatestInviteForGroup,
} = useExpenseGroups();
const { toastSuccess, toastError } = useAppToast();

const groupCategoryItems = expenseGroupCategoryOptions;

const groupName = ref("");
/** USelectMenu may set the value string or a selected item object depending on Nuxt UI version. */
const groupCategory = ref(null);
const createGroupModalOpen = ref(false);
const joinGroupModalOpen = ref(false);
const monthlyModalOpen = ref(false);
const modalCycleStartDay = ref(1);
const modalCycleEndDay = ref(1);

const selectedCategory = computed(() => {
  const g = groupCategory.value;
  if (g == null) return null;
  if (typeof g === "string") return g;
  if (typeof g === "object" && "value" in g && g.value) return g.value;
  return null;
});

const isMonthlyGroup = computed(() => selectedCategory.value === "monthly");

const groupCreatedModalOpen = ref(false);
const groupCreated = ref(null);
const createdTokenVisible = ref(false);
const joinToken = ref("");
const memberships = ref([]);
const pendingGroups = ref(true);
const isCreating = ref(false);
const isJoining = ref(false);
const deleteModalOpen = ref(false);
const groupPendingDelete = ref(null);
const isDeletingGroup = ref(false);
const isRefreshing = ref(false);
const groupsError = ref("");
const revealedTokenIds = ref(new Set());

const isTokenRevealed = (id) => revealedTokenIds.value.has(id);

const toggleToken = (id) => {
  const next = new Set(revealedTokenIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  revealedTokenIds.value = next;
};

const openDeleteModal = (group) => {
  groupPendingDelete.value = group;
  deleteModalOpen.value = true;
};

const normalizeGroupsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return [payload];
  return [];
};

/** Align RPC / view column names so the template always has id, is_owner, token, name. */
const normalizeGroupRow = (raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw.id ?? raw.group_id;
  const token = raw.token ?? raw.invite_token ?? null;
  const isOwner = Boolean(raw.is_owner ?? raw.isOwner ?? raw.role === "owner");
  const groupType = raw.type ?? raw.category ?? null;
  return {
    ...raw,
    id,
    name: raw.name ?? raw.group_name ?? null,
    type: groupType,
    category: groupType,
    is_owner: isOwner,
    token,
    created_at: raw.created_at ?? raw.createdAt ?? null,
    invite_expires_at: raw.invite_expires_at ?? raw.expires_at ?? null,
  };
};

function groupCategoryLabel(group) {
  const c = group?.type ?? group?.category;
  if (!c) return null;
  return (
    expenseGroupCategoryOptions.find((o) => o.value === c)?.label ?? null
  );
}

const enrichOwnerInviteTokens = async (groups) => {
  await Promise.all(
    (groups ?? []).map(async (g) => {
      if (!g?.id || !g.is_owner) return;
      if (g.token && g.invite_expires_at) return;
      try {
        const inv = await getLatestInviteForGroup(g.id);
        if (inv?.token) {
          g.token = inv.token;
          g.invite_expires_at = inv.expires_at ?? g.invite_expires_at;
        }
      } catch {
        /* RLS or network — leave token empty */
      }
    }),
  );
};

const confirmDeleteGroup = async () => {
  const id = groupPendingDelete.value?.id;
  if (!id) return;
  try {
    isDeletingGroup.value = true;
    await deleteGroupAsOwner(id);
    memberships.value = memberships.value.filter((g) => g.id !== id);
    toastSuccess({
      title: "Group deleted",
      description: "The group and its data were removed.",
    });
    deleteModalOpen.value = false;
    groupPendingDelete.value = null;
    await refresh(id);
  } catch (error) {
    toastError({ title: "Delete failed", description: error.message });
  } finally {
    isDeletingGroup.value = false;
  }
};

const canShare = computed(
  () =>
    import.meta.client &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function",
);

const copyGroupToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token);
    toastSuccess({
      title: "Copied",
      description: "Invite token copied to clipboard.",
    });
  } catch (error) {
    toastError({ title: "Copy failed", description: error.message });
  }
};

const shareGroupInvite = async (group) => {
  if (!group?.token) return;
  try {
    await navigator.share({
      title: `Join ${group.name ?? "group"}`,
      text: `Invite token for "${group.name ?? "group"}": ${group.token}`,
    });
  } catch (error) {
    if (error?.name === "AbortError") return;
    toastError({ title: "Share failed", description: error.message });
  }
};

const refresh = async (omitGroupId = null) => {
  isRefreshing.value = true;
  if (!memberships.value.length) {
    pendingGroups.value = true;
  }
  try {
    const { data, error } = await listMyMemberships();
    if (error) {
      groupsError.value = error.message || "Request failed";
      toastError({ title: "Unable to read groups", description: groupsError.value });
      return;
    }
    groupsError.value = "";
    let list = normalizeGroupsPayload(data).map(normalizeGroupRow);
    if (omitGroupId) {
      list = list.filter((g) => g && g.id !== omitGroupId);
    }
    await enrichOwnerInviteTokens(list);
    memberships.value = list;
  } finally {
    pendingGroups.value = false;
    isRefreshing.value = false;
  }
};

const closeGroupCreatedModal = () => {
  groupCreatedModalOpen.value = false;
};

watch(groupCreatedModalOpen, (open) => {
  if (!open) {
    groupCreated.value = null;
    createdTokenVisible.value = false;
  }
});

/** @returns {Promise<boolean>} */
const runCreateGroup = async (options) => {
  isCreating.value = true;
  try {
    const { group, invite } = await createGroupWithInvite(
      groupName.value.trim(),
      selectedCategory.value,
      options,
    );
    groupCreated.value = {
      name: group.name,
      type: group.type,
      token: invite.token,
    };
    groupCreatedModalOpen.value = true;
    createGroupModalOpen.value = false;
    groupName.value = "";
    groupCategory.value = null;
    await refresh();
    return true;
  } catch (error) {
    toastError({ title: "Creation failed", description: error.message });
    return false;
  } finally {
    isCreating.value = false;
  }
};

const handleCreateGroup = async () => {
  if (!groupName.value.trim()) {
    toastError({ title: "Give the group a name" });
    return;
  }
  if (!selectedCategory.value) {
    toastError({ title: "Select a group category" });
    return;
  }
  if (isMonthlyGroup.value) {
    modalCycleStartDay.value = 1;
    modalCycleEndDay.value = 1;
    monthlyModalOpen.value = true;
    return;
  }
  await runCreateGroup(undefined);
};

const confirmMonthlyGroup = async () => {
  if (!isMonthlyGroup.value) return;
  const ok = await runCreateGroup({
    monthlyCycleStartDay: modalCycleStartDay.value,
    monthlyCycleEndDay: modalCycleEndDay.value,
  });
  if (ok) {
    monthlyModalOpen.value = false;
  }
};

const handleJoinGroup = async () => {
  if (!joinToken.value.trim()) {
    toastError({ title: "Invite token required" });
    return;
  }

  try {
    isJoining.value = true;
    const data = await acceptInvite(joinToken.value.trim());
    toastSuccess({
      title: "Joined",
      description: "Now you can see the group finances",
    });
    joinToken.value = "";
    joinGroupModalOpen.value = false;
    refresh();
  } catch (error) {
    toastError({ title: "Join failed", description: error.message });
  } finally {
    isJoining.value = false;
  }
};

onMounted(() => {
  refresh();
});

onActivated(() => {
  refresh();
});
</script>
