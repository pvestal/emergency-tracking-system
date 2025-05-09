<template>
  <div id="app">
    <header v-if="authStore.isAuthenticated">
      <nav>
        <div class="nav-left">
          <router-link to="/" class="nav-link">Dashboard</router-link>
          <router-link to="/tracking" class="nav-link">Location Tracking</router-link>
          <router-link to="/identification" class="nav-link">Personnel</router-link>
          <router-link to="/medical-supplies" class="nav-link">Medical Supplies</router-link>
          <router-link v-if="userProfileStore.canViewAnalytics" to="/analytics" class="nav-link">Analytics</router-link>
          <router-link to="/about" class="nav-link">About</router-link>
          <router-link v-if="userProfileStore.canManageUsers" to="/users" class="admin-link">User Management</router-link>
          <router-link v-if="userProfileStore.canManageUsers" to="/integrations" class="admin-link">Integrations</router-link>
        </div>
        
        <div class="user-menu">
          <button v-if="!mockDataLoaded" @click="loadMockData" class="mock-data-btn" :disabled="isLoadingMockData">
            {{ isLoadingMockData ? 'Loading Mock Data...' : 'Load Mock Data' }}
          </button>
          <ThemeToggle />
          <span class="user-role">{{ userProfileStore.userRole }}</span>
          <span class="user-email">{{ authStore.userEmail }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </nav>
    </header>
    
    <main>
      <router-view/>
    </main>
    
    <div v-if="mockDataLoaded" class="mock-data-banner">
      Using mock data for demonstration
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUserProfileStore } from '@/stores/userProfile';
import { useThemeStore } from '@/stores/theme';
import { useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { initializeMockData } from '@/utils/mockDataLoader';

export default defineComponent({
  name: 'App',
  components: {
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore();
    const userProfileStore = useUserProfileStore();
    const themeStore = useThemeStore();
    const router = useRouter();
    
    const mockDataLoaded = ref(false);
    const isLoadingMockData = ref(false);
    
    // Initialize auth listener when app loads
    onMounted(() => {
      authStore.initAuthListener();
      
      // Check if mock data has already been loaded in this session
      const hasMockData = localStorage.getItem('mockDataLoaded');
      if (hasMockData === 'true') {
        mockDataLoaded.value = true;
      }
      
      // Apply theme immediately
      themeStore.applyTheme();
    });

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };
    
    const loadMockData = async () => {
      isLoadingMockData.value = true;
      try {
        // Include more random patients for demonstration
        const result = await initializeMockData(true);
        if (result.success) {
          mockDataLoaded.value = true;
          localStorage.setItem('mockDataLoaded', 'true');
          // Show success message
          const toast = document.createElement('div');
          toast.className = 'toast success';
          toast.textContent = 'Mock data loaded successfully!';
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => {
                document.body.removeChild(toast);
              }, 300);
            }, 3000);
          }, 100);
        } else {
          alert('Failed to load mock data. See console for details.');
        }
      } catch (error) {
        console.error('Error loading mock data:', error);
        alert('Failed to load mock data. See console for details.');
      } finally {
        isLoadingMockData.value = false;
      }
    };

    return {
      authStore,
      userProfileStore,
      themeStore,
      mockDataLoaded,
      isLoadingMockData,
      logout,
      loadMockData
    };
  }
});
</script>

<style>
/* Import theme CSS */
@import '@/assets/themes.css';

#app {
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-on-surface);
  min-height: 100vh;
  background-color: var(--color-background);
  transition: background-color var(--transition-normal), color var(--transition-normal);
}

nav {
  padding: 20px 30px;
  display: flex;
  align-items: center;
  background-color: var(--color-surface);
  box-shadow: var(--shadow-md);
  transition: background-color var(--transition-normal), box-shadow var(--transition-normal);
}

nav a {
  font-weight: var(--font-weight-bold);
  color: var(--color-on-surface);
  margin-right: 15px;
  text-decoration: none;
  transition: color var(--transition-normal);
}

nav a.router-link-exact-active {
  color: var(--color-primary);
}

.admin-link {
  color: var(--color-accent-dark);
}

.user-menu {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-role {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
  padding: 4px 8px;
  border-radius: var(--border-radius-pill);
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  text-transform: capitalize;
}

.mock-data-btn {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  border: none;
  padding: 6px 12px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: background-color var(--transition-normal);
}

.mock-data-btn:hover {
  background-color: var(--color-accent-dark);
}

.mock-data-btn:disabled {
  background-color: var(--color-on-surface-subdued);
  cursor: not-allowed;
}

.logout-btn {
  background-color: var(--color-error);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: background-color var(--transition-normal);
}

.logout-btn:hover {
  background-color: #d32f2f;
}

.mock-data-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-warning);
  color: var(--color-on-accent);
  text-align: center;
  padding: 6px;
  font-weight: var(--font-weight-medium);
  font-size: 14px;
  z-index: 1000;
  box-shadow: var(--shadow-md);
}

/* Toast notification */
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 12px 20px;
  border-radius: var(--border-radius-md);
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-lg);
  transform: translateY(100px);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  z-index: 2000;
}

.toast.success {
  background-color: var(--color-success);
  color: white;
}

.toast.error {
  background-color: var(--color-error);
  color: white;
}

.toast.show {
  transform: translateY(0);
  opacity: 1;
}
</style>
