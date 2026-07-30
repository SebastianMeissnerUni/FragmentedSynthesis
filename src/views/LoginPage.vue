<script setup lang="ts">
import {ref} from "vue";
import { useRouter } from "vue-router";
import Icon from "../Icon.vue";





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
  localStorage.setItem("guest", "true");
  router.push("/main");
}
</script>

<template>
  <div class="login-wrapper">
    <div class="form-container">

      <h1 class="title">
        {{ isLogin ? "Login" : "Registrieren" }}
      </h1>

      <div class="form">

        <div class="input-group">
          <label>E-Mail</label>
          <input v-model="email" placeholder="E-Mail" />
        </div>

        <div class="input-group">
          <label>Passwort</label>
          <input v-model="password" type="password" placeholder="Passwort" />
        </div>

        <p v-if="authError" class="error">{{ authError }}</p>

        <button class="sign" @click="submitAuth">
          {{ isLogin ? "Einloggen" : "Registrieren" }}
        </button>

        <div class="forgot">
          <a @click="toggleMode">
            {{ isLogin ? "Account erstellen" : "Schon einen Account?" }}
          </a>
        </div>

        <div class="social-message">
          <div class="line"></div>
          <p class="message">oder</p>
          <div class="line"></div>
        </div>

        <div class="social-icons">
          <button class="icon" @click="loginWithGitHub">
            <Icon name="github" />
          </button>

        </div>

        <div class="signup">
          <a @click="continueWithoutLogin">Ohne Login fortfahren</a>
        </div>

      </div>
    </div>
  </div>
</template>


<style scoped>
.login-wrapper {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #bce0f7; /* dunkler Hintergrund */
}


.form-container {
  width: 320px;
  border-radius: 0.75rem;
  background-color: #02376b;
  padding: 2rem;
  color: #f2f7f8;
}

.title {
  text-align: center;
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
}

.form {
  margin-top: 1.5rem;
}

.input-group {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.input-group label {
  display: block;
  color: #f2f7f8;
  margin-bottom: 4px;
}

.input-group input {
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid #f2f7f8;
  outline: 0;
  background-color: #bce0f7;
  padding: 0.75rem 1rem;
  color: #02376b;
  max-width: 260px;
  margin: 0 auto;   /* zentriert */
  display: block;
}

.input-group input:focus {
  border-color: #f2f7f8;
}

.forgot {
  display: flex;
  justify-content: flex-end;
  font-size: 0.75rem;
  line-height: 1rem;
  color: red;
  margin: 8px 0 14px 0;
}

.forgot a,
.signup a {
  color: rgba(243, 244, 246, 1);
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
}

.forgot a:hover,
.signup a:hover {
  text-decoration: underline rgba(167, 139, 250, 1);
}

.sign {
  display: block;
  width: 100%;
  background-color: #66a6d1;
  padding: 0.75rem;
  text-align: center;
  color: #02376b;
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
}

.social-message {
  display: flex;
  align-items: center;
  padding-top: 1rem;
}

.line {
  height: 1px;
  flex: 1 1 0%;
  background-color: #66a6d1;
}

.social-message .message {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #66a6d1;
}

.social-icons {
  display: flex;
  justify-content: center;
}

.social-icons .icon {
  border-radius: 0.125rem;
  padding: 0.75rem;
  border: none;
  background-color: transparent;
  margin-left: 8px;
  cursor: pointer;
}

.social-icons .icon svg {
  height: 1.75rem;
  width: 1.75rem;
  fill: #fff;
}

.signup {
  text-align: center;
  font-size: 0.75rem;
  line-height: 1rem;
  color: rgba(156, 163, 175, 1);
}

.error {
  color: #ff6b6b;
  margin-top: 8px;
}

</style>