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
const openInEditor = inject<(file: any) => void>('openInEditor')
const repoOpen = ref<Record<number, boolean>>({})
const repoFiles = ref<Record<number, any[]>>({})
const folderOpen = ref<Record<string, boolean>>({})
const emit = defineEmits(['close'])




const toggleFolder = (path: string) => {
  folderOpen.value[path] = !folderOpen.value[path]
}

async function loadRepoFilesRecursively(repo: GitHubRepo, path = '') {
  const token = localStorage.getItem("token")

  const res = await fetch(
      `http://localhost:3000/github/repo-files?owner=${repo.owner.login}&repo=${repo.name}&path=${path}`,
      { headers: { Authorization: `Bearer ${token}` } }
  )

  const items = await res.json()

  // Für jeden Ordner: Kinder laden
  return await Promise.all(
      items.map(async (item: any) => {
        if (item.type === "dir") {
          const children = await loadRepoFilesRecursively(repo, item.path)
          return { ...item, children }
        }
        return item
      })
  )
}

async function deleteFile(repo, path) {
  const ok = confirm(`Soll "${path}" wirklich gelöscht werden?`)
  if (!ok) return

  await fetch("http://localhost:3000/github/delete-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      repo: repo.name,
      owner: repo.owner.login,
      path,
      message: `Delete ${path}`
    })
  })

  await loadRepoFiles(repo)
}



async function createFileInFolder(repo, folderPath) {
  const name = prompt("Dateiname (z.B. notes.txt):")
  if (!name) return

  const base64 = btoa("Neue Datei")

  await fetch("http://localhost:3000/github/create-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      repo: repo.name,
      owner: repo.owner.login,
      path: `${folderPath}/${name}`,
      base64,
      message: `Create ${name}`
    })
  })

  await loadRepoFiles(repo)
}



async function uploadToFolder(repo, folderPath) {
  const input = document.createElement("input")
  input.type = "file"

  input.onchange = async () => {
    const file = input.files[0]
    if (!file) return

    const base64 = await fileToBase64(file)

    await fetch("http://localhost:3000/github/upload-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({
        repo: repo.name,
        owner: repo.owner.login,
        path: `${folderPath}/${file.name}`,
        base64,
        message: `Upload ${file.name}`
      })
    })

    await loadRepoFiles(repo)
  }

  input.click()
}

async function loadRepoFiles(repo: GitHubRepo) {
  repoFiles.value[repo.id] = await loadRepoFilesRecursively(repo)
}


function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(",")[1])
    reader.readAsDataURL(file)
  })
}


const openFile = (repo: GitHubRepo, filePath: string, fileType: string) => {
  console.log('[Profile] openFile clicked:', { filePath, fileType })

  if (!openInEditor) {
    console.warn('[Profile] openInEditor is undefined')
    return
  }

  const lower = filePath.toLowerCase()

  if (fileType === "file") {
    if (lower.endsWith(".tex")) {
      console.log('[Profile] calling openInEditor for TEX')
      openInEditor({ type: "txt", path: filePath, repo })
    }
    if (lower.endsWith(".png")) {
      const isPublic = !repo.private

      if (isPublic) {
        // Öffentliche Repos
        const url = `https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/main/${filePath}`
        openInEditor({
          type: "public-image",
          url,
          path: filePath,
          repo
        })
      } else {
        // Private Repos
        openInEditor({
          type: "private-image",
          path: filePath,
          repo
        })
      }
      return
    }
  }
}


const toggleRepo = async (repo: GitHubRepo) => {
  repoOpen.value[repo.id] = !repoOpen.value[repo.id]

  if (!repoOpen.value[repo.id]) return

  if (!repoFiles.value[repo.id]) {
    repoFiles.value[repo.id] = await loadRepoFilesRecursively(repo)
  }
}

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
function openRepoInEditor(repo: GitHubRepo) {
  if (!openInEditor) {
    console.warn("openInEditor is undefined")
    return
  }

  openInEditor({
    type: "open-repo",
    repo: {
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private
    }
  })

  // Profil schließen
  emit("close")
}

</script>

<template>
  <div class="profile-overlay" @click.stop>
    <div class="profile-box" @click.stop>
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
        <button class="back-btn" @click="$emit('close')">Zurück zum Editor</button>
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
        <li v-for="repo in githubRepos" :key="repo.id" class="repo-item">

          <!-- Kopfzeile -->
          <div class="repo-header">

            <div class="repo-click-area" @click="toggleRepo(repo)">
              <div class="project-info">
                <strong>{{ repo.name }}</strong>
                <small>{{ repo.private ? "Privat" : "Öffentlich" }}</small>
              </div>
            </div>

            <button
                class="open-repo-btn"
                @click.stop="openRepoInEditor(repo)"
                title="Ganzes Projekt im Editor öffnen"
            >
              📂
            </button>

            <span class="arrow" :class="{ open: repoOpen[repo.id] }">▸</span>
          </div>


          <!-- Akkordeon-Inhalt -->
          <div v-if="repoOpen[repo.id]" class="repo-content">

            <p v-if="!repoFiles[repo.id]">Lade Dateien...</p>

            <ul class="file-list">
              <li v-for="file in repoFiles[repo.id]" :key="file.path">

                <!-- ORDNER -->
                <div
                    v-if="file.type === 'dir'"
                    class="folder"
                    @click="toggleFolder(file.path)"
                    style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                >
  <span>
    {{ folderOpen[file.path] ? '📂' : '📁' }} {{ file.name }}
  </span>
                  <span class="folder-actions">

    <button @click.stop="createFileInFolder(repo, file.path)" title="Neue Datei">📄➕</button>

    <button @click.stop="uploadToFolder(repo, file.path)" title="Datei hochladen">📤</button>

    <button @click.stop="deleteFile(repo, file.path)" title="Ordner löschen">🗑️</button>
  </span>
                </div>


                <!-- DATEI -->
                <div
                    v-else
                    class="file"
                    @click="openFile(repo, file.path, 'file')"
                    style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                >
                  <span>📄 {{ file.name }}</span>

                  <button
                      class="delete-btn"
                      @click.stop="deleteFile(repo, file.path)"
                      title="Datei löschen"
                  >
                    🗑️
                  </button>
                </div>


                <!-- KINDER DES ORDNER -->
                <ul
                    v-if="file.type === 'dir' && folderOpen[file.path]"
                    class="nested"
                    style="margin-left: 20px;"
                >
                  <li v-for="child in file.children" :key="child.path">

                    <!-- Unterordner -->
                    <div
                        v-if="child.type === 'dir'"
                        class="folder"
                        @click="toggleFolder(child.path)"
                        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                    >
  <span>
    {{ folderOpen[child.path] ? '📂' : '📁' }} {{ child.name }}
  </span>

                      <span class="folder-actions">
    <button @click.stop="createFileInFolder(repo, child.path)">📄➕</button>
    <button @click.stop="uploadToFolder(repo, child.path)">📤</button>
    <button @click.stop="deleteFile(repo, child.path)">🗑️</button>
  </span>
                    </div>


                    <!-- Datei -->
                    <div
                        v-else
                        class="file"
                        @click="openFile(repo, child.path, 'file')"
                        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                    >
                      <span>📄 {{ child.name }}</span>

                      <button @click.stop="deleteFile(repo, child.path)">🗑️</button>
                    </div>


                    <!-- REKURSION: Unterordner -->
                    <ul
                        v-if="child.type === 'dir' && folderOpen[child.path]"
                        class="nested"
                        style="margin-left: 20px;"
                    >
                      <li v-for="sub in child.children" :key="sub.path">

                        <div
                            v-if="sub.type === 'dir'"
                            class="folder"
                            @click="toggleFolder(sub.path)"
                            style="cursor: pointer;"
                        >
                          <span>{{ folderOpen[sub.path] ? '📂' : '📁' }}</span>
                          {{ sub.name }}
                        </div>
                        <div
                            v-else
                            class="file"
                            @click="openFile(repo, sub.path, 'file')"
                            style="cursor: pointer;"
                        >
                          📄 {{ sub.name }}
                        </div>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </div>
  </div>
  </div>
</template>


<style scoped>

/* OVERLAY */
.profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
}

/* BOX */
.profile-box {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1000000;
}

/* INHALT */
.profile-card {
  width: 100%;
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
  text-align: center;
}

input::placeholder {
  text-align: center;
}

.readonly-input { background-color: #f9f9f9; color: #888; cursor: not-allowed; text-align: center;  }

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

/* LISTEN */
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

.repo-item {
  display: block !important;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.repo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.repo-content {
  margin-top: 10px;
  padding-left: 10px;
}

.file-list {
  list-style: none;
  padding-left: 15px;
}

.file-list li {
  padding: 4px 0;
}

.arrow {
  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(90deg);
}

.delete-btn,
.folder-actions button {
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  margin-left: 6px;
}

.delete-btn:hover,
.folder-actions button:hover {
  opacity: 1;
}

.open-repo-btn {
  background: #333;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 8px;
}

.open-repo-btn:hover {
  background: #444;
}

.repo-click-area {
  flex: 1;
  cursor: pointer;
}

</style>