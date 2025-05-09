<template>
  <div id="app">
    <header v-if="authStore.isAuthenticated">
      <nav>
        <router-link to="/">Dashboard</router-link> |
        <router-link to="/tracking">Location Tracking</router-link> |
        <router-link to="/identification">Personnel</router-link> |
        <router-link v-if="userProfileStore.canViewAnalytics" to="/analytics">Analytics</router-link>
        <span v-if="userProfileStore.canViewAnalytics"> | </span>
        <router-link to="/about">About</router-link>
        <router-link v-if="userProfileStore.canManageUsers" to="/admin" class="admin-link">| Admin Dashboard</router-link>
        <router-link v-if="userProfileStore.canManageUsers" to="/users" class="admin-link">| User Management</router-link>
        <router-link v-if="userProfileStore.canManageUsers" to="/integrations" class="admin-link">| Integrations</router-link>
        <div class="user-menu">
          <span class="user-role">{{ userProfileStore.userRole }}</span>
          <span>{{ authStore.userEmail }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </nav>
    </header>
    <router-view/>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUserProfileStore } from '@/stores/userProfile';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'App',
  setup() {
    const authStore = useAuthStore();
    const userProfileStore = useUserProfileStore();
    const router = useRouter();

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    return {
      authStore,
      userProfileStore,
      logout
    };
  }
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}

nav {
  padding: 20px 30px;
  display: flex;
  align-items: center;
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  margin-right: 15px;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #42b983;
}

.admin-link {
  color: #4a148c;
}

.user-menu {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-role {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: capitalize;
}

.logout-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.logout-btn:hover {
  background-color: #d32f2f;
}
</style>
