<script setup lang="ts">
import {ref} from "vue";
import { useRouter } from "vue-router";


const isLogin = ref(true)
const email = ref('')
const password = ref('')
const authError = ref('')
const router = useRouter();




function toggleMode() {
  isLogin.value = !isLogin.value;
}

async function submitAuth() {
  authError.value = "";

  const url = isLogin.value
      ? "http://localhost:3000/auth/login"
      : "http://localhost:3000/auth/register";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.value,
      password: password.value
    })
  });

  const data = await res.json();

  if (res.ok && data.token) {
    // Token speichern (für API Anfragen)
    localStorage.setItem('token', data.token);

    // E-Mail speichern (für die Anzeige im Profil)
    localStorage.setItem('userEmail', email.value);

    // Weiterleitung zum Editor
    router.push("/main");
  } else {
    authError.value = data.error || "Login fehlgeschlagen";
  }

  if (data.error) {
    authError.value = data.error;
    return;
  }

}

function loginWithGitHub() {
  window.location.href = "http://localhost:3000/auth/github"
}

function continueWithoutLogin() {
  router.push("/main");
}
</script>

<template>
  <div class="login-page">
    <h1>Login</h1>

    <input v-model="email" placeholder="E-Mail" />
    <input v-model="password" type="password" placeholder="Passwort" />

    <p v-if="authError" class="error">{{ authError }}</p>

    <button @click="submitAuth">
      {{ isLogin ? "Einloggen" : "Registrieren" }}
    </button>

    <button @click="toggleMode">
      {{ isLogin ? "Account erstellen" : "Schon einen Account?" }}
    </button>

    <hr />

    <button @click="loginWithGitHub">Mit GitHub anmelden</button>

    <button @click="continueWithoutLogin">Ohne Login fortfahren</button>
  </div>
</template>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
}

.auth-box {
  background: black;
  color: white;
  padding: 2rem 3rem;
  border-radius: 20px;
  text-align: center;
  width: 600px;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  background-clip: padding-box;
  position: relative;
  overflow: hidden;
}


.auth-box input {
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 10px 12px;     /* beeinflusst Höhe */
  font-size: 1rem;
  border-radius: 8px;     /* runde Ecken für Inputs */
  border: 1px solid #ccc;
  box-sizing: border-box;
}
.auth-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}
.continueWithoutLogin{
  display: block;        /* eigener Block → kann verschoben werden */
  width: fit-content;    /* nur so breit wie nötig */
  margin-left: auto;     /* schiebt ihn komplett nach rechts */
  margin-top: 12px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.95rem;
}

.auth-actions .link {
  background: transparent;
  border: none;
  color: #06c;
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.95rem;
}
.error { color: #b00020; margin-top:8px; }

</style>