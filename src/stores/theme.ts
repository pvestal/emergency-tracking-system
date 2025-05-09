import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

type ThemeMode = 'light' | 'dark' | 'system';

export const useThemeStore = defineStore('theme', () => {
  // State
  const themeMode = ref<ThemeMode>(
    localStorage.getItem('themeMode') as ThemeMode || 'system'
  );
  
  // Computed value to determine the actual theme based on the mode
  const isDarkTheme = ref(calculateIsDarkTheme());
  
  // Function to determine if dark theme should be active
  function calculateIsDarkTheme(): boolean {
    if (themeMode.value === 'light') return false;
    if (themeMode.value === 'dark') return true;
    
    // System theme - check prefers-color-scheme
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Initialize a media query to detect system preference changes
  let mediaQuery: MediaQueryList | null = null;
  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Listen for system theme changes
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (themeMode.value === 'system') {
        isDarkTheme.value = event.matches;
        applyTheme();
      }
    };
    
    // Add listener for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      // For older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }
  
  // Apply theme to document
  function applyTheme() {
    if (isDarkTheme.value) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }
  
  // Change theme
  function setTheme(mode: ThemeMode) {
    themeMode.value = mode;
    localStorage.setItem('themeMode', mode);
    isDarkTheme.value = calculateIsDarkTheme();
    applyTheme();
  }
  
  // Toggle between light and dark modes
  function toggleTheme() {
    if (themeMode.value === 'system') {
      // If system, use the opposite of current system preference
      setTheme(isDarkTheme.value ? 'light' : 'dark');
    } else {
      // If already set, toggle between light and dark
      setTheme(themeMode.value === 'light' ? 'dark' : 'light');
    }
  }
  
  // Apply theme immediately on initialization
  applyTheme();
  
  // Watch for theme mode changes
  watch(themeMode, () => {
    applyTheme();
  });
  
  return {
    themeMode,
    isDarkTheme,
    setTheme,
    toggleTheme,
    applyTheme
  };
});