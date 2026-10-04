<template>
  <div class="mb-2">
    <UButton to="/groups" icon="i-heroicons-arrow-left" color="neutral" variant="outline" aria-label="Back to Groups" />
  </div>

  <div v-if="accessPending && !myMembership" class="space-y-6">
    <USkeleton class="h-10 w-64" />
    <USkeleton class="h-24 w-full" />
    <USkeleton class="h-40 w-full" />
  </div>

  <Suspense v-else-if="myMembership">
    <component
      :is="groupViewComponent"
      :group-id="groupIdString"
      :group-title="groupTitle"
      :members="members ?? []"
      :group-category-label="groupCategoryLabel"
      :members-pending="membersInitialPending"
      :cycle-start-day="monthlyCycleStartDay"
      :cycle-end-day="monthlyCycleEndDay"
    />
    <template #fallback>
      <div class="space-y-6">
        <USkeleton class="h-10 w-64" />
        <USkeleton class="h-24 w-full" />
        <USkeleton class="h-40 w-full" />
      </div>
    </template>
  </Suspense>

  <div v-else-if="accessError" class="space-y-3">
    <p class="text-sm text-gray-500">Couldn't load this group.</p>
    <UButton color="neutral" variant="outline" label="Try again" @click="refreshAccess()" />
  </div>
</template>

<script setup>
import { navigateTo } from "#app";
import { expenseGroupCategoryOptions } from "~/constants";

const route = useRoute();
const { toastError } = useAppToast();
const { getMyGroupMembership, listGroupMembers } = useExpenseGroups();

const GroupCreditCardView = defineAsyncComponent(
  () => import("~/components/group/GroupCreditCardView.vue"),
);
const GroupMonthlyView = defineAsyncComponent(
  () => import("~/components/group/GroupMonthlyView.vue"),
);
const GroupDefaultView = defineAsyncComponent(
  () => import("~/components/group/GroupDefaultView.vue"),
);

const groupIdString = computed(() => {
  const raw = route.params.groupId;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id ? String(id) : "";
});

const accessKey = computed(() => `group-access-${groupIdString.value}`);
const membersKey = computed(() => `group-members-${groupIdString.value}`);

const {
  data: myMembership,
  pending: accessPending,
  error: accessError,
  refresh: refreshAccess,
} = await useCachedAsyncData(
  accessKey,
  async () => {
    if (!groupIdString.value) return null;
    const { data, error } = await getMyGroupMembership(groupIdString.value);
    if (error) throw error;
    return data;
  },
  { watch: [groupIdString], ttl: 10 * 60 * 1000 },
);

const { data: members, pending: membersPending } = await useCachedAsyncData(
  membersKey,
  async () => {
    if (!groupIdString.value) return [];
    const { data, error } = await listGroupMembers(groupIdString.value);
    if (error) throw error;
    return data ?? [];
  },
  { watch: [groupIdString], ttl: 10 * 60 * 1000 },
);

const membersInitialPending = computed(
  () => membersPending.value && members.value == null,
);

watch(
  [myMembership, accessPending, accessError],
  () => {
    if (accessPending.value) return;
    if (accessError.value) return;
    if (!groupIdString.value) return;
    if (!myMembership.value) {
      toastError({
        title: "Unable to view this group",
        description: "You are not a member of this group.",
      });
      navigateTo("/groups");
    }
  },
  { immediate: true },
);

const groupTitle = computed(
  () => myMembership.value?.expense_groups?.name ?? "Group",
);

const groupType = computed(() => {
  const eg = myMembership.value?.expense_groups;
  if (!eg) return null;
  return eg.type ?? eg.category ?? null;
});

const groupCategoryLabel = computed(() => {
  const c = groupType.value;
  if (!c) return null;
  return expenseGroupCategoryOptions.find((o) => o.value === c)?.label ?? null;
});

const monthlyCycleStartDay = computed(
  () => myMembership.value?.expense_groups?.cycle_start_day ?? null,
);
const monthlyCycleEndDay = computed(
  () => myMembership.value?.expense_groups?.cycle_end_day ?? null,
);

const groupViewComponent = computed(() => {
  if (groupType.value === "credit_card") return GroupCreditCardView;
  if (groupType.value === "monthly") return GroupMonthlyView;
  return GroupDefaultView;
});

useHead({
  title: computed(() =>
    groupTitle.value ? `${groupTitle.value} · Group` : "Group",
  ),
});
</script>
