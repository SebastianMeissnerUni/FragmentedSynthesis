<script setup lang="ts">
import { ref } from 'vue'
import { inject } from 'vue';


const message = ref<{text: string, type: 'error' | 'success'} | null>(null)

const passwords = ref({
  old: '',
  new: '',
  confirm: ''
})

const handlePasswordChange = async () => {
  // 1. Check: Felder leer?
  if (!passwords.value.old || !passwords.value.new || !passwords.value.confirm) {
    message.value = { text: 'Bitte alle Felder ausfüllen!', type: 'error' };
    return;
  }

  // 2. Check: Neue Passwörter gleich?
  if (passwords.value.new !== passwords.value.confirm) {
    message.value = { text: 'Die neuen Passwörter stimmen nicht überein!', type: 'error' };
    return;
  }

  try {
    // JETZT DER API-CALL (wie bei Login):
    const res = await fetch("http://localhost:3000/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail.value, // Die E-Mail von inject()
        oldPassword: passwords.value.old,
        newPassword: passwords.value.new
      })
    });

    const data = await res.json();

    if (res.ok) {
      message.value = { text: "Passwort erfolgreich aktualisiert!", type: "success" };
      // Felder leeren
      passwords.value.old = '';
      passwords.value.new = '';
      passwords.value.confirm = '';
    } else {
      // Hier die Fehlermeldung vom Backend (z.B. "Altes Passwort falsch")
      message.value = { text: data.error, type: "error" };
    }
  } catch (err) {
    message.value = { text: "Verbindung zum Server fehlgeschlagen", type: "error" };
  }
};
const userEmail = inject('userEmail');

</script>

<template>
  <div class="profile-page">
    <div class="profile-card">
      <h2>Profil-Einstellungen</h2>

      <div class="info-group">
        <label>E-Mail Adresse</label>
        <input type="text" :value="userEmail" disabled class="readonly-input" />
      </div>

      <hr />

      <h3>Passwort ändern</h3>
      <div class="input-group">
        <label>Aktuelles Passwort</label>
        <input type="password" v-model="passwords.old" placeholder="Altes Passwort eingeben" />
      </div>

      <div class="input-group">
        <label>Neues Passwort</label>
        <input type="password" v-model="passwords.new" placeholder="Neues Passwort" />
      </div>

      <div class="input-group">
        <label>Neues Passwort bestätigen</label>
        <input type="password" v-model="passwords.confirm" placeholder="Wiederholen" />
      </div>

      <div class="actions">
        <button class="save-btn" @click="handlePasswordChange">Passwort aktualisieren</button>
        <button class="back-btn" @click="$router.push('/')">Zurück zum Editor</button>
      </div>

      <p v-if="message" :class="message.type">{{ message.text }}</p>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5; /* Hellgrauer Hintergrund */
  font-family: sans-serif;
}

.profile-card {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

h2, h3 { color: #333; margin-bottom: 20px; }

.info-group, .input-group { margin-bottom: 15px; }

label { display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666; }

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box; /* Wichtig für Padding */
}

.readonly-input { background-color: #f9f9f9; color: #888; cursor: not-allowed; }

.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }

.save-btn {
  background-color: #4a90e2; /* Dein Blau aus den Nodes */
  color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer;
}

.back-btn {
  background: none; border: 1px solid #ccc; padding: 8px; cursor: pointer; color: #666;
}

.error { color: #d9534f; margin-top: 15px; font-size: 0.9rem; }
.success { color: #5cb85c; margin-top: 15px; font-size: 0.9rem; }
</style>