<template>
  <div class="staff-identification-view">
    <div class="header-section">
      <h1>Personnel Identification and Management</h1>
      <div class="action-buttons" v-if="userProfileStore.canManageUsers">
        <button class="settings-btn" @click="showSettings = true">
          Security Settings
        </button>
      </div>
    </div>
    
    <div class="content-container">
      <StaffIdentification />
    </div>
    
    <!-- Security Settings Modal -->
    <div v-if="showSettings" class="modal">
      <div class="modal-content">
        <button class="close-btn" @click="showSettings = false">&times;</button>
        <h3>Security Settings</h3>
        
        <div class="settings-section">
          <h4>Staff Identification</h4>
          <p class="section-desc">Configure how staff are identified by the system</p>
          
          <div class="setting-group">
            <label for="minConfidence">
              Minimum Recognition Confidence ({{ minConfidence }}%)
            </label>
            <input 
              type="range" 
              id="minConfidence" 
              v-model="minConfidence" 
              min="50" 
              max="95"
              step="5"
            />
            <div class="setting-hint">
              Higher values increase identification accuracy but may require manual identification more often.
            </div>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="requireManualVerification" />
              <span>Require manual verification for new personnel</span>
            </label>
            <div class="setting-hint">
              When enabled, all new personnel must be manually verified by an administrator.
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h4>Access Control</h4>
          <p class="section-desc">Configure access control for different personnel types</p>
          
          <div class="setting-group">
            <label for="visitorAccessLevel">Default Visitor Access Level</label>
            <select id="visitorAccessLevel" v-model="visitorAccessLevel">
              <option value="none">None (Escort Required)</option>
              <option value="limited">Limited (Public Areas Only)</option>
              <option value="standard">Standard (Visiting Hours)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label for="patientAccessLevel">Default Patient Access Level</label>
            <select id="patientAccessLevel" v-model="patientAccessLevel">
              <option value="limited">Limited (Treatment Areas)</option>
              <option value="standard">Standard (Common Areas)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label for="restrictedAreas">Restricted Areas</label>
            <select id="restrictedAreas" v-model="restrictedAreas" multiple>
              <option value="pharmacy">Pharmacy</option>
              <option value="lab">Laboratory</option>
              <option value="surgery">Surgery</option>
              <option value="icu">Intensive Care Unit</option>
              <option value="admin">Administration</option>
              <option value="security">Security Office</option>
            </select>
            <div class="setting-hint">
              Select areas that require elevated access permissions.
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h4>Security Alerts</h4>
          <p class="section-desc">Configure security alerts for suspicious activities</p>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="alertUnidentified" />
              <span>Alert on unidentified persons in restricted areas</span>
            </label>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="alertAfterHours" />
              <span>Alert on after-hours access</span>
            </label>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="alertUnauthorized" />
              <span>Alert on unauthorized access attempts</span>
            </label>
          </div>
          
          <div class="setting-group">
            <label for="alertRecipients">Alert Recipients</label>
            <select id="alertRecipients" v-model="alertRecipients" multiple>
              <option value="security">Security Team</option>
              <option value="admin">Administrators</option>
              <option value="nurse">Nurse Station</option>
            </select>
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
import StaffIdentification from '@/components/StaffIdentification.vue';
import { useUserProfileStore } from '@/stores/userProfile';

export default defineComponent({
  name: 'StaffIdentificationView',
  
  components: {
    StaffIdentification
  },
  
  setup() {
    const userProfileStore = useUserProfileStore();
    
    // Settings
    const showSettings = ref(false);
    const minConfidence = ref(75);
    const requireManualVerification = ref(true);
    const visitorAccessLevel = ref('limited');
    const patientAccessLevel = ref('limited');
    const restrictedAreas = ref(['pharmacy', 'lab', 'surgery', 'security']);
    const alertUnidentified = ref(true);
    const alertAfterHours = ref(true);
    const alertUnauthorized = ref(true);
    const alertRecipients = ref(['security', 'admin']);
    
    const saveSettings = () => {
      // In a real application, this would save settings to the database
      showSettings.value = false;
      
      // Display a success message
      alert('Security settings saved successfully');
    };
    
    return {
      userProfileStore,
      showSettings,
      minConfidence,
      requireManualVerification,
      visitorAccessLevel,
      patientAccessLevel,
      restrictedAreas,
      alertUnidentified,
      alertAfterHours,
      alertUnauthorized,
      alertRecipients,
      saveSettings
    };
  }
});
</script>

<style scoped>
.staff-identification-view {
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

.action-buttons {
  display: flex;
  gap: 10px;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.setting-hint {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

input[type="range"] {
  width: 100%;
}

select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

select[multiple] {
  height: 100px;
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