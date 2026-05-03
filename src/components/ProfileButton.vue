<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const open = ref(false)
const wrapper = ref<HTMLElement | null>(null)

function toggleMenu() {
  open.value = !open.value
}

function goToProfile() {
  router.push('/profile')
  open.value = false
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('guest')
  router.push('/login')
  open.value = false
}

// Klick außerhalb schließen
function handleClickOutside(event: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="profile-wrapper" ref="wrapper">
    <button class="profile-btn" @click.stop="toggleMenu">
      <span class="profile-icon">👤</span>
    </button>

    <div v-if="open" class="dropdown">
      <button @click="goToProfile">Profil</button>
      <button @click="logout">Logout</button>
    </div>
  </div>
</template>

<style scoped>
.profile-wrapper {
  position: relative;
  display: inline-block;
}

/* Button mit hellgrauem Kasten */
.profile-btn {
  background: #f2f2f2;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.profile-icon {
  font-size: 20px;
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  min-width: 120px;
  z-index: 3000;
}

.dropdown button {
  background: none;
  border: none;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.dropdown button:hover {
  background: #f5f5f5;
}
</style>
