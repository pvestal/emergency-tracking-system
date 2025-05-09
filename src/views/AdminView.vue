<template>
  <div class="admin-view">
    <div class="admin-container">
      <aside class="admin-sidebar">
        <div class="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav class="sidebar-nav">
          <router-link to="/admin" class="nav-item" exact-active-class="active">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Dashboard</span>
          </router-link>
          <router-link to="/users" class="nav-item" active-class="active">
            <span class="nav-icon">👥</span>
            <span class="nav-text">User Management</span>
          </router-link>
          <router-link to="/analytics" class="nav-item" active-class="active">
            <span class="nav-icon">📈</span>
            <span class="nav-text">Analytics</span>
          </router-link>
          <router-link to="/integrations" class="nav-item" active-class="active">
            <span class="nav-icon">🔌</span>
            <span class="nav-text">Integrations</span>
          </router-link>
          <router-link to="/tracking" class="nav-item" active-class="active">
            <span class="nav-icon">📍</span>
            <span class="nav-text">Location Tracking</span>
          </router-link>
          <router-link to="/identification" class="nav-item" active-class="active">
            <span class="nav-icon">🆔</span>
            <span class="nav-text">Staff Identification</span>
          </router-link>
          <router-link to="/" class="nav-item" active-class="active">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">Back to Home</span>
          </router-link>
        </nav>
      </aside>
      
      <main class="admin-content">
        <div class="content-header">
          <h1>Admin Dashboard</h1>
          <div class="user-info">
            <span>{{ userEmail }}</span>
            <button class="logout-btn" @click="logout">Logout</button>
          </div>
        </div>
        
        <div class="content-body">
          <div class="tabs">
            <button
              class="tab-button"
              :class="{ active: activeTab === 'dashboard' }"
              @click="activeTab = 'dashboard'"
            >
              Dashboard
            </button>
            <button
              class="tab-button"
              :class="{ active: activeTab === 'settings' }"
              @click="activeTab = 'settings'"
            >
              System Settings
            </button>
          </div>

          <AdminDashboard v-if="activeTab === 'dashboard'" />
          <SystemSettings v-else-if="activeTab === 'settings'" />
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminDashboard from '@/components/AdminDashboard.vue';
import SystemSettings from '@/components/SystemSettings.vue';
import { useAuthStore } from '@/stores/auth';
import { useUserProfileStore } from '@/stores/userProfile';

export default defineComponent({
  name: 'AdminView',
  components: {
    AdminDashboard,
    SystemSettings
  },
  
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const userProfileStore = useUserProfileStore();
    const activeTab = ref('dashboard');

    // Redirect if user is not an admin
    if (!userProfileStore.canManageUsers) {
      router.push('/');
    }

    const userEmail = computed(() => authStore.userEmail || 'User');

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    return {
      userEmail,
      logout,
      activeTab
    };
  }
});
</script>

<style scoped>
.admin-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.admin-container {
  display: flex;
  min-height: 100vh;
}

/* Sidebar Styles */
.admin-sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: white;
  padding: 20px 0;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.4rem;
}

.sidebar-nav {
  padding-top: 20px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: background-color 0.2s;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.nav-icon {
  margin-right: 10px;
  font-size: 1.1rem;
}

/* Content Styles */
.admin-content {
  flex: 1;
  overflow-y: auto;
}

.content-header {
  background-color: white;
  padding: 15px 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 15px;
  color: #666;
}

.logout-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background-color: #d32f2f;
}

.content-body {
  padding: 30px;
}

/* Tab styling */
.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.tab-button {
  padding: 12px 20px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #2c3e50;
}

.tab-button.active {
  color: #2c3e50;
  border-bottom-color: #42b983;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .admin-container {
    flex-direction: column;
  }
  
  .admin-sidebar {
    width: 100%;
    padding: 10px 0;
  }
  
  .nav-item {
    padding: 10px 15px;
  }
  
  .content-header {
    padding: 15px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .content-header h1 {
    margin-bottom: 10px;
  }
  
  .content-body {
    padding: 15px;
  }
}
</style>