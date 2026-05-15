<script setup lang="ts">
import { authClient } from '~/utils/auth.client';

const route = useRoute();
const router = useRouter();
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

// 提取查询参数，以便登录后透传给桥接页
const queryParams = computed(() => {
  const q = new URLSearchParams();
  if (route.query.source) q.append('source', String(route.query.source));
  if (route.query.client_id) q.append('client_id', String(route.query.client_id));
  if (route.query.state) q.append('state', String(route.query.state));
  if (route.query.code_challenge) q.append('code_challenge', String(route.query.code_challenge));
  if (route.query.redirect_uri) q.append('redirect_uri', String(route.query.redirect_uri));
  return q.toString();
});

const getRedirectUrl = () => {
  const isExtension = route.query.source === 'extension';
  const targetPath = isExtension ? '/user/ext-auth/complete' : '/';
  const qs = queryParams.value;
  return qs ? `${targetPath}?${qs}` : targetPath;
};

const loginWithGoogle = async () => {
  loading.value = true;
  try {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: getRedirectUrl(),
    });
  } catch (err: any) {
    errorMsg.value = err.message || 'Google login failed';
    loading.value = false;
  }
};

const loginWithEmail = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
      callbackURL: getRedirectUrl(),
    });
    if (error) {
      errorMsg.value = error.message || 'Email login failed';
      loading.value = false;
    } else {
      router.push(getRedirectUrl());
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Login failed';
    loading.value = false;
  }
};
</script>

<template>
  <div style="max-width: 400px; margin: 100px auto; font-family: sans-serif;">
    <h2>Sign In to Entropy</h2>
    <p v-if="route.query.source === 'extension'" style="color: gray;">
      Connecting with Entropy Browser Extension...
    </p>

    <div style="margin-bottom: 20px;">
      <button @click="loginWithGoogle" :disabled="loading" style="padding: 10px; width: 100%; cursor: pointer;">
        {{ loading ? 'Loading...' : 'Sign in with Google' }}
      </button>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">or</div>

    <form @submit.prevent="loginWithEmail">
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">Email</label>
        <input v-model="email" type="email" required style="width: 100%; padding: 8px; box-sizing: border-box;" />
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px;">Password</label>
        <input v-model="password" type="password" required style="width: 100%; padding: 8px; box-sizing: border-box;" />
      </div>
      <div v-if="errorMsg" style="color: red; margin-bottom: 10px;">
        {{ errorMsg }}
      </div>
      <button type="submit" :disabled="loading" style="padding: 10px; width: 100%; cursor: pointer;">
        {{ loading ? 'Loading...' : 'Sign in with Email' }}
      </button>
    </form>
  </div>
</template>