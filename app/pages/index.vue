<template>
  <div style="max-width: 600px; margin: 100px auto; font-family: sans-serif; text-align: center;">
    <h1>Welcome to Entropy</h1>
    <p>Your personal knowledge base and bookmark manager.</p>
    
    <div style="margin-top: 40px;">
      <NuxtLink to="/user/login" style="padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">
        Sign In
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// You can add session checks here later to auto-redirect to a dashboard
</script>