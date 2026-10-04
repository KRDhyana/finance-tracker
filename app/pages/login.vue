<template>
  <UTabs :items="items">
    <template #email-login>
      <UCard v-if="!success">
        <template #header> Sign-in to Finance Tracker</template>
        <form
          @submit.prevent="handleLogin"
          class="flex flex-col items-end gap-4"
        >
          <UFormField
            class="w-full"
            label="Email"
            name="email"
            :required="true"
            help="You will receive an email with confirmation link"
          >
            <UInput
              type="email"
              placeholder="Email"
              v-model="email"
              class="w-full"
            />
          </UFormField>
          <UButton
            class="w-fit"
            type="submit"
            label="Sign in"
            color="neutral"
            variant="solid"
            :loading="pending"
            :disabled="pending"
          />
        </form>
      </UCard>
      <UCard v-else>
        <template #header> Email has been sent</template>
        <div class="text-center">
          <p>
            We have sent an email to <strong>{{ email }}</strong> with a link to
            sign in.
          </p>
          <p><strong>Important:</strong> The link will expire in 5 minutes.</p>
        </div>
      </UCard>
    </template>

    <template #password-login>
      <UCard>
        <template #header> Sign-in to Finance Tracker</template>
        <form
          @submit.prevent="handlePasswordLogin"
          class="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <UFormField
            class="w-full"
            label="Email"
            name="email"
            :required="true"
            help="Enter your email and password to sign in"
          >
            <UInput
              type="email"
              placeholder="Email"
              v-model="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            class="w-full"
            label="Password"
            name="password"
            :required="true"
          >
            <UInput
              :type="showPassword ? 'text' : 'password'"
              placeholder="Password"
              v-model="password"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :padded="false"
                  tabindex="-1"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>
          <UButton
            class="lg:w-fit justify-self-end col-span-1 lg:col-span-2"
            type="submit"
            color="neutral"
            variant="solid"
            label="Sign in"
            :loading="pending"
            :disabled="pending"
          />
        </form>
      </UCard>
    </template>
  </UTabs>
</template>

<script setup>
const items = [
  {
    label: "Email Login",
    icon: "i-heroicons-envelope",
    slot: "email-login",
  },
  {
    label: "Password Login",
    icon: "i-lucide-lock",
    slot: "password-login",
  },
];
const success = ref(false);
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const pending = ref(false);
const { toastError, toastSuccess } = useAppToast();
const supabase = useSupabaseClient();
useRedirectedIfAuthenticated();

const { authRedirectUrl } = useAppRedirect();

const handleLogin = async () => {
  pending.value = true;
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: authRedirectUrl.value,
      },
    });
    if (error) throw error;
    success.value = true;
  } catch (error) {
    toastError({ title: "Error Authenticating", description: error.message });
  } finally {
    pending.value = false;
  }
};

const handlePasswordLogin = async () => {
  pending.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    toastSuccess({ title: "Successfully Signed In" });
    await supabase.auth.refreshSession();
    return navigateTo("/");
  } catch (error) {
    toastError({ title: "Error Authenticating", description: error.message });
  } finally {
    pending.value = false;
  }
};
</script>
