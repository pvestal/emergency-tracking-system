<template>
  <div class="theme-toggle">
    <button 
      class="theme-button" 
      @click="openThemeMenu"
      :aria-label="themeStore.isDarkTheme ? 'Dark theme active' : 'Light theme active'"
    >
      <!-- Sun icon (light theme) -->
      <svg v-if="!themeStore.isDarkTheme" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      
      <!-- Moon icon (dark theme) -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </button>
    
    <div v-if="showThemeMenu" class="theme-menu">
      <div class="theme-menu-option" :class="{ active: themeStore.themeMode === 'light' }" @click="selectTheme('light')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <span>Light</span>
      </div>
      
      <div class="theme-menu-option" :class="{ active: themeStore.themeMode === 'dark' }" @click="selectTheme('dark')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <span>Dark</span>
      </div>
      
      <div class="theme-menu-option" :class="{ active: themeStore.themeMode === 'system' }" @click="selectTheme('system')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>System</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useThemeStore } from '@/stores/theme';

export default defineComponent({
  name: 'ThemeToggle',
  
  setup() {
    const themeStore = useThemeStore();
    const showThemeMenu = ref(false);
    
    // Open/close the theme selection menu
    const openThemeMenu = () => {
      showThemeMenu.value = !showThemeMenu.value;
    };
    
    // Select a theme
    const selectTheme = (mode: 'light' | 'dark' | 'system') => {
      themeStore.setTheme(mode);
      showThemeMenu.value = false;
    };
    
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.theme-toggle')) {
        showThemeMenu.value = false;
      }
    };
    
    // Add/remove event listener for click outside
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });
    
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });
    
    return {
      themeStore,
      showThemeMenu,
      openThemeMenu,
      selectTheme
    };
  }
});
</script>

<style scoped>
.theme-toggle {
  position: relative;
}

.theme-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface-variant);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  color: var(--color-on-surface);
  transition: all var(--transition-normal);
}

.theme-button:hover {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.theme-menu {
  position: absolute;
  top: 45px;
  right: 0;
  background-color: var(--color-surface);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  width: 160px;
  z-index: 10;
  overflow: hidden;
}

.theme-menu-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.theme-menu-option:hover {
  background-color: var(--color-surface-variant);
}

.theme-menu-option.active {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

@media (max-width: 768px) {
  .theme-button {
    width: 36px;
    height: 36px;
  }
  
  .theme-menu {
    width: 140px;
  }
}
</style>