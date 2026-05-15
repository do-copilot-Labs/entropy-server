<script setup lang="ts">
import { authClient } from '~/utils/auth.client';

const route = useRoute();
const router = useRouter();
const status = ref('Initializing...');
const errorMsg = ref('');

onMounted(async () => {
  try {
    status.value = 'Verifying session...';
    const { data: sessionData } = await authClient.getSession();
    
    if (!sessionData?.session) {
      status.value = 'Not logged in, redirecting...';
      const qs = new URLSearchParams(route.query as Record<string, string>).toString();
      return router.push(`/login?${qs}`);
    }

    const clientId = route.query.client_id as string;
    const state = route.query.state as string;
    const codeChallenge = route.query.code_challenge as string;
    const redirectUri = route.query.redirect_uri as string;

    if (!clientId || !state || !codeChallenge) {
      throw new Error('Missing required OAuth parameters');
    }

    status.value = 'Issuing extension authorization code...';
    
    const response = await $fetch('/api/oauth2/authorize/complete', {
      method: 'POST',
      body: {
        client_id: clientId,
        state: state,
        code_challenge: codeChallenge
      }
    });

    if (response.code !== 0 || !response.data?.code) {
      throw new Error(response.message || 'Failed to get auth code');
    }

    const authCode = response.data.code;

    status.value = 'Redirecting back to extension...';

    // 如果提供了 redirect_uri，通过 URL 传回（标准的 OAuth2 做法）
    if (redirectUri) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      redirectUrl.searchParams.set('state', state);
      window.location.href = redirectUrl.toString();
    } else {
      // 备用方案：通过 window.postMessage 传回（如果是在 iframe / popup 里打开的）
      // 这个可以根据前端插件具体的设计来决定
      throw new Error('Missing redirect_uri. Cannot return to extension.');
    }

  } catch (err: any) {
    errorMsg.value = err.message || 'An error occurred during extension authentication.';
    status.value = 'Error';
    console.error('Ext Auth Error:', err);
  }
});
</script>

<template>
  <div style="max-width: 400px; margin: 100px auto; font-family: sans-serif; text-align: center;">
    <h2>Entropy Extension Auth</h2>
    <p :style="{ color: errorMsg ? 'red' : 'black' }">
      {{ status }}
    </p>
    <p v-if="errorMsg" style="color: red; margin-top: 20px;">
      {{ errorMsg }}
    </p>
  </div>
</template>