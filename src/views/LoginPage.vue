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
            <!-- GitHub Icon -->
            <svg viewBox="0 0 24 24">
              <path
                  d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1.8-.8.8-.8-.8-.1-1.6-.4-2.2-.9-1.7-1.4-1.7-4.1-.1-5.5.5-.5 1.2-.8 1.9-.9-.1-.3-.2-.8-.2-1.2 0-1.1.4-1.9 1.1-2.6-.4-.1-.9-.2-1.4-.2-.5 0-.9.1-1.4.2C6.4 4.7 7.7 3.5 9.3 3c.4-.1.8-.2 1.2-.2.4 0 .8.1 1.2.2 1.6.5 2.9 1.7 3.5 3.3.5.1.9.3 1.3.6.4.3.7.7.9 1.1.2.4.3.9.3 1.4 0 .4-.1.9-.2 1.2.7.1 1.4.4 1.9.9 1.6 1.4 1.6 4.1-.1 5.5-.6.5-1.4.8-2.2.9 0 0-.2.9.8.8 0 0 .6-.1 1.7-1.2 0 0 1.1-.1.1.7 0 0-.7.3-1.2 1.5 0 0-.7 2.1-3.9 1.4v2c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"
              />
            </svg>
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
  background: #0f172a; /* dunkler Hintergrund */
}

/* From Uiverse.io by Yaya12085 */
.form-container {
  width: 320px;
  border-radius: 0.75rem;
  background-color: Black;
  padding: 2rem;
  color: rgba(243, 244, 246, 1);
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
  color: rgba(156, 163, 175, 1);
  margin-bottom: 4px;
}

.input-group input {
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid rgba(55, 65, 81, 1);
  outline: 0;
  background-color: rgba(17, 24, 39, 1);
  padding: 0.75rem 1rem;
  color: rgba(243, 244, 246, 1);
}

.input-group input:focus {
  border-color: rgba(167, 139, 250);
}

.forgot {
  display: flex;
  justify-content: flex-end;
  font-size: 0.75rem;
  line-height: 1rem;
  color: rgba(156, 163, 175,1);
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
  background-color: rgba(167, 139, 250, 1);
  padding: 0.75rem;
  text-align: center;
  color: rgba(17, 24, 39, 1);
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
}

.social-message {
  display: flex;
  align-items: center;
  padding-top: 1rem;
}

.line {
  height: 1px;
  flex: 1 1 0%;
  background-color: rgba(55, 65, 81, 1);
}

.social-message .message {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: rgba(156, 163, 175, 1);
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
  height: 1.25rem;
  width: 1.25rem;
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