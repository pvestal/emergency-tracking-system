<template>
  <div class="location-tracking-view">
    <div class="header-section">
      <h1>Real-time Location Tracking</h1>
      <div class="user-controls" v-if="userProfileStore.canManageUsers">
        <button class="settings-btn" @click="showSettings = true">
          Settings
        </button>
      </div>
    </div>
    
    <div class="content-container">
      <LocationTrackingMap />
    </div>
    
    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal">
      <div class="modal-content settings-modal">
        <button class="close-btn" @click="showSettings = false">&times;</button>
        <h3>Location Tracking Settings</h3>
        
        <div class="settings-section">
          <h4>Camera Settings</h4>
          <p class="section-desc">Manage connected cameras and their status</p>
          
          <div class="camera-list">
            <div 
              v-for="camera in locationStore.floorPlan.cameras" 
              :key="camera.id"
              class="camera-item"
            >
              <div class="camera-info">
                <div class="camera-name">{{ camera.name }}</div>
                <div class="camera-position">
                  Position: ({{ camera.position[0] }}, {{ camera.position[1] }})
                </div>
              </div>
              
              <div class="camera-controls">
                <div class="status-indicator" :class="{ active: camera.isActive }">
                  {{ camera.isActive ? 'Active' : 'Inactive' }}
                </div>
                <button 
                  class="toggle-btn" 
                  :class="{ 'active-btn': camera.isActive, 'inactive-btn': !camera.isActive }"
                  @click="toggleCamera(camera.id, !camera.isActive)"
                >
                  {{ camera.isActive ? 'Disable' : 'Enable' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h4>Recognition Settings</h4>
          <p class="section-desc">Configure person recognition and identification thresholds</p>
          
          <div class="setting-group">
            <label for="confidenceThreshold">
              Recognition Confidence Threshold ({{ confidenceThreshold }}%)
            </label>
            <input 
              type="range" 
              id="confidenceThreshold" 
              v-model="confidenceThreshold" 
              min="50" 
              max="95"
              step="5"
            />
            <div class="setting-hint">
              Higher values increase identification accuracy but may miss some personnel.
            </div>
          </div>
          
          <div class="setting-group">
            <label for="trackingFrequency">
              Tracking Update Frequency ({{ trackingFrequency }}s)
            </label>
            <input 
              type="range" 
              id="trackingFrequency" 
              v-model="trackingFrequency" 
              min="1" 
              max="10"
              step="1"
            />
            <div class="setting-hint">
              How often the system updates personnel positions.
            </div>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="trackUnidentified" />
              <span>Track unidentified persons</span>
            </label>
            <div class="setting-hint">
              When enabled, persons without clear identification will be tracked as "Unknown".
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h4>Security Settings</h4>
          <p class="section-desc">Configure alerts and security notifications</p>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="alertOnUnknown" />
              <span>Alert on unknown persons</span>
            </label>
            <div class="setting-hint">
              Send security alerts when unknown persons are detected in restricted areas.
            </div>
          </div>
          
          <div class="setting-group">
            <label for="restrictedAreas">Restricted Areas</label>
            <select id="restrictedAreas" v-model="restrictedAreas" multiple>
              <option 
                v-for="area in locationStore.floorPlan.areas" 
                :key="area.id"
                :value="area.id"
              >
                {{ area.name }}
              </option>
            </select>
            <div class="setting-hint">
              Select areas where access should be restricted and monitored.
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="showSettings = false" class="cancel-btn">Cancel</button>
          <button @click="saveSettings" class="save-btn">Save Settings</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import LocationTrackingMap from '@/components/LocationTrackingMap.vue';
import { useLocationTrackingStore } from '@/stores/locationTracking';
import { useUserProfileStore } from '@/stores/userProfile';

export default defineComponent({
  name: 'LocationTrackingView',
  
  components: {
    LocationTrackingMap
  },
  
  setup() {
    const locationStore = useLocationTrackingStore();
    const userProfileStore = useUserProfileStore();
    
    // Settings modal state
    const showSettings = ref(false);
    
    // Settings values
    const confidenceThreshold = ref(75);
    const trackingFrequency = ref(3);
    const trackUnidentified = ref(true);
    const alertOnUnknown = ref(true);
    const restrictedAreas = ref<string[]>([]);
    
    // Toggle camera status
    const toggleCamera = async (cameraId: string, isActive: boolean) => {
      await locationStore.updateCameraStatus(cameraId, isActive);
    };
    
    // Save settings
    const saveSettings = () => {
      // In a real application, these settings would be saved to the database
      // For now, we'll just close the modal
      showSettings.value = false;
    };
    
    return {
      locationStore,
      userProfileStore,
      showSettings,
      confidenceThreshold,
      trackingFrequency,
      trackUnidentified,
      alertOnUnknown,
      restrictedAreas,
      toggleCamera,
      saveSettings
    };
  }
});
</script>

<style scoped>
.location-tracking-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-section {
  padding: 15px 20px;
  background-color: white;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-section h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.content-container {
  flex: 1;
  overflow: hidden;
}

.settings-btn {
  padding: 8px 15px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.settings-btn:hover {
  background-color: #e0e0e0;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.settings-modal {
  padding-bottom: 70px;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #555;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.settings-section {
  margin-bottom: 30px;
}

.settings-section h4 {
  margin-top: 0;
  margin-bottom: 5px;
  color: #333;
}

.section-desc {
  color: #666;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 14px;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.setting-hint {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

input[type="range"] {
  width: 100%;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 100px;
}

/* Camera list styles */
.camera-list {
  margin-top: 15px;
}

.camera-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 10px;
}

.camera-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.camera-position {
  font-size: 12px;
  color: #666;
}

.camera-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-indicator {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  background-color: #f44336;
  color: white;
}

.status-indicator.active {
  background-color: #4caf50;
}

.toggle-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.active-btn {
  background-color: #ffebee;
  color: #c62828;
}

.active-btn:hover {
  background-color: #ffcdd2;
}

.inactive-btn {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.inactive-btn:hover {
  background-color: #c8e6c9;
}

.modal-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px 25px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.cancel-btn {
  padding: 8px 15px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn {
  padding: 8px 15px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn:hover {
  background-color: #1976D2;
}
</style>