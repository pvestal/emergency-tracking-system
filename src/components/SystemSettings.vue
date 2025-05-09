<template>
  <div class="system-settings">
    <h2>System Settings</h2>
    
    <div v-if="!userProfileStore.canManageUsers" class="access-denied">
      <p>You don't have permission to access system settings.</p>
    </div>
    
    <div v-else>
      <div v-if="loading" class="loading">
        Loading settings...
      </div>
      
      <div v-else-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else class="settings-container">
        <div class="settings-section">
          <h3>General Settings</h3>
          
          <div class="setting-item">
            <label for="systemName">System Name</label>
            <input 
              type="text" 
              id="systemName" 
              v-model="settings.systemName"
              placeholder="Emergency Tracking System"
            >
          </div>
          
          <div class="setting-item">
            <label for="orgName">Organization Name</label>
            <input 
              type="text" 
              id="orgName" 
              v-model="settings.organizationName"
              placeholder="Your Hospital/Organization Name"
            >
          </div>
          
          <div class="setting-item">
            <label for="primaryContact">Primary Contact Email</label>
            <input 
              type="email" 
              id="primaryContact" 
              v-model="settings.contactEmail"
              placeholder="admin@example.com"
            >
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Security Settings</h3>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="mfaRequirement">Require MFA for Admin Users</label>
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="mfaRequirement" 
                  v-model="settings.requireMfaForAdmins"
                >
                <label for="mfaRequirement"></label>
              </div>
            </div>
            <div class="setting-description">
              Requires all users with admin role to use multi-factor authentication
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="sessionTimeout">Session Timeout (minutes)</label>
              <input 
                type="number" 
                id="sessionTimeout" 
                v-model.number="settings.sessionTimeoutMinutes"
                min="5"
                max="1440"
              >
            </div>
            <div class="setting-description">
              User will be automatically logged out after this period of inactivity
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="passwordPolicy">Password Policy</label>
              <select id="passwordPolicy" v-model="settings.passwordPolicy">
                <option value="standard">Standard (8+ chars, 1 number)</option>
                <option value="strong">Strong (8+ chars, uppercase, lowercase, number)</option>
                <option value="veryStrong">Very Strong (12+ chars, uppercase, lowercase, number, symbol)</option>
              </select>
            </div>
            <div class="setting-description">
              Password requirements for all users
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>System Modules</h3>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="analyticsModule">Analytics Module</label>
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="analyticsModule" 
                  v-model="settings.enabledModules.analytics"
                >
                <label for="analyticsModule"></label>
              </div>
            </div>
            <div class="setting-description">
              Enable/disable the analytics module for the entire system
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="locationTracking">Location Tracking</label>
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="locationTracking" 
                  v-model="settings.enabledModules.locationTracking"
                >
                <label for="locationTracking"></label>
              </div>
            </div>
            <div class="setting-description">
              Enable/disable the location tracking features
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="integrations">External Integrations</label>
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="integrations" 
                  v-model="settings.enabledModules.integrations"
                >
                <label for="integrations"></label>
              </div>
            </div>
            <div class="setting-description">
              Enable/disable all external system integrations
            </div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button 
            class="btn cancel-btn" 
            @click="resetForm"
          >
            Cancel
          </button>
          <button 
            class="btn save-btn" 
            @click="saveSettings"
            :disabled="saveLoading"
          >
            {{ saveLoading ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useUserProfileStore } from '@/stores/userProfile';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface SystemSettings {
  systemName: string;
  organizationName: string;
  contactEmail: string;
  requireMfaForAdmins: boolean;
  sessionTimeoutMinutes: number;
  passwordPolicy: 'standard' | 'strong' | 'veryStrong';
  enabledModules: {
    analytics: boolean;
    locationTracking: boolean;
    integrations: boolean;
  };
  lastUpdated: any;
  updatedBy: string;
}

export default defineComponent({
  name: 'SystemSettings',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const loading = ref(true);
    const error = ref<string | null>(null);
    const saveLoading = ref(false);
    
    const defaultSettings: SystemSettings = {
      systemName: 'Emergency Tracking System',
      organizationName: 'Hospital Name',
      contactEmail: 'admin@example.com',
      requireMfaForAdmins: true,
      sessionTimeoutMinutes: 60,
      passwordPolicy: 'strong',
      enabledModules: {
        analytics: true,
        locationTracking: true,
        integrations: true
      },
      lastUpdated: null,
      updatedBy: ''
    };
    
    const settings = ref<SystemSettings>({ ...defaultSettings });
    const originalSettings = ref<SystemSettings>({ ...defaultSettings });
    
    // Fetch current settings
    const fetchSettings = async () => {
      loading.value = true;
      
      try {
        const settingsRef = doc(db, 'systemSettings', 'global');
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          settings.value = data;
          originalSettings.value = { ...data };
        } else {
          // Initialize with default settings if none exist
          await setDoc(settingsRef, {
            ...defaultSettings,
            lastUpdated: serverTimestamp(),
            updatedBy: userProfileStore.profile?.id || 'system'
          });
          
          settings.value = { ...defaultSettings };
          originalSettings.value = { ...defaultSettings };
        }
      } catch (err: any) {
        console.error('Error fetching settings:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };
    
    // Reset form to original values
    const resetForm = () => {
      settings.value = { ...originalSettings.value };
    };
    
    // Save settings
    const saveSettings = async () => {
      if (!userProfileStore.canManageUsers) return;
      
      saveLoading.value = true;
      error.value = null;
      
      try {
        const settingsRef = doc(db, 'systemSettings', 'global');
        
        await setDoc(settingsRef, {
          ...settings.value,
          lastUpdated: serverTimestamp(),
          updatedBy: userProfileStore.profile?.id
        });
        
        // Update original settings to match the newly saved ones
        originalSettings.value = { ...settings.value };
        
        // Record activity
        try {
          const activityRef = doc(db, 'systemActivity', Date.now().toString());
          await setDoc(activityRef, {
            type: 'system',
            message: 'System settings updated',
            userId: userProfileStore.profile?.id,
            timestamp: serverTimestamp()
          });
        } catch (activityErr) {
          console.error('Error recording activity:', activityErr);
          // Non-critical error, don't throw
        }
      } catch (err: any) {
        console.error('Error saving settings:', err);
        error.value = err.message;
      } finally {
        saveLoading.value = false;
      }
    };
    
    onMounted(() => {
      fetchSettings();
    });
    
    return {
      userProfileStore,
      settings,
      loading,
      error,
      saveLoading,
      resetForm,
      saveSettings
    };
  }
});
</script>

<style scoped>
.system-settings {
  padding: 20px;
}

h2 {
  margin-bottom: 25px;
  color: #2c3e50;
}

h3 {
  margin: 0 0 15px;
  color: #2c3e50;
  font-size: 1.2rem;
}

.settings-container {
  max-width: 800px;
}

.settings-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.setting-description {
  font-size: 0.85rem;
  color: #666;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #333;
}

input[type="text"],
input[type="email"],
input[type="number"],
select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* Toggle switch styling */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: #2196F3;
}

.toggle-switch input:focus + label {
  box-shadow: 0 0 1px #2196F3;
}

.toggle-switch input:checked + label:before {
  transform: translateX(26px);
}

/* Button styling */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
}

.save-btn:hover {
  background-color: #45a049;
}

.save-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #f8f9fa;
  color: #333;
  border: 1px solid #ddd;
}

.cancel-btn:hover {
  background-color: #e9ecef;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.access-denied {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
  margin-top: 20px;
}
</style>