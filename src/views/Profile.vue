<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { inject } from 'vue';

interface GitHubRepo {
  id: number
  name: string
  private: boolean
  owner: {
    login: string
  }
}

const message = ref<{text: string, type: 'error' | 'success'} | null>(null)
const userEmail = ref('')
const githubRepos = ref<GitHubRepo[]>([])
const localProjects = ref<any[]>([])


onMounted(async () => {

  const token = localStorage.getItem('token')
  if (!token) return

  // --- 1) Userdaten laden ---
  const res = await fetch("http://localhost:3000/auth/me", {
    headers: { "Authorization": `Bearer ${token}` }
  })

  const data = await res.json()

  if (res.ok) {
    userEmail.value = data.email
  }

  // --- 2) Lokale Projekte laden ---
  const projRes = await fetch("http://localhost:3000/projects/list", {
    headers: { "Authorization": `Bearer ${token}` }
  })
  localProjects.value = await projRes.json()

  // --- 3) GitHub Repositories laden ---
  const ghRes = await fetch("http://localhost:3000/github/repos", {
    headers: { "Authorization": `Bearer ${token}` }
  })
  githubRepos.value = await ghRes.json()
})


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
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
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
        <button class="back-btn" @click="$router.push('/main')">Zurück zum Editor</button>
      </div>

      <p v-if="message" :class="message.type">{{ message.text }}</p>

      <!-- LOKALE PROJEKTE -->

      <hr />

      <h3>Meine lokalen Projekte</h3>
      <ul class="project-list">
        <li v-for="p in localProjects" :key="p.id">
          <div class="project-info">
            <strong>{{ p.title }}</strong>
          </div>
          <button class="open-btn" @click="$router.push('/editor/' + p.id)">
            Öffnen
          </button>
        </li>
      </ul>

      <!-- GITHUB REPOS -->
      <hr />

      <h3>Meine GitHub Repositories</h3>
      <ul class="project-list">
        <li v-for="repo in githubRepos" :key="repo.id">
          <div class="project-info">
            <strong>{{ repo.name }}</strong>
            <small>{{ repo.private ? "Privat" : "Öffentlich" }}</small>
          </div>
          <button class="open-btn"
                  @click="$router.push('/github-editor?repo=' + repo.name + '&owner=' + repo.owner.login)">
            Öffnen
          </button>
        </li>
      </ul>

    </div>
  </div>
</template>


<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  font-family: sans-serif;
}

.profile-card {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 500px;
}

h2, h3 { color: #333; margin-bottom: 20px; }

.info-group, .input-group { margin-bottom: 15px; }

label { display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666; }

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.readonly-input { background-color: #f9f9f9; color: #888; cursor: not-allowed; }

.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }

.save-btn {
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
}

.back-btn {
  background: none;
  border: 1px solid #ccc;
  padding: 8px;
  cursor: pointer;
  color: #666;
}

.error { color: #d9534f; margin-top: 15px; font-size: 0.9rem; }
.success { color: #5cb85c; margin-top: 15px; font-size: 0.9rem; }

/* PROJEKT-LISTEN */

.project-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.project-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.project-info {
  display: flex;
  flex-direction: column;
}

.project-info strong {
  font-size: 1rem;
  color: #333;
}

.project-info small {
  font-size: 0.8rem;
  color: #888;
}

.open-btn {
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.2s ease;
}

.open-btn:hover {
  background-color: #3a78c2;
}

</style>