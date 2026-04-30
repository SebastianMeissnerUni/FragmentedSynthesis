<script setup lang="ts">


import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

onMounted(async () => {
  // Token aus Query lesen
  const token = (route.query.token as string) || ''

  if (!token) {
    // kein Token — zurück zur Loginseite
    router.replace('/login')
    return
  }

  // Token speichern (kurzfristig)
  localStorage.setItem('token', token)


  router.replace('/main')
})
</script>

<template>
  <div class="login-success">
    <p>Login erfolgreich. Du wirst weitergeleitet…</p>
  </div>
</template>

<style>
.login-success {
  display:flex;
  align-items:center;
  justify-content:center;
  height:100vh;
  color:#fff;
}
</style>
