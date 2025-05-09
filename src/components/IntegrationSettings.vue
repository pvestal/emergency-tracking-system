<template>
  <div class="integration-settings">
    <h2>External System Integrations</h2>
    
    <div v-if="!userProfileStore.canManageUsers" class="access-denied">
      <p>You don't have permission to access this section.</p>
    </div>
    
    <div v-else>
      <div v-if="integrationStore.loading" class="loading">
        Loading integration settings...
      </div>
      
      <div v-else-if="integrationStore.error" class="error-message">
        {{ integrationStore.error }}
      </div>
      
      <div v-else>
        <div class="action-bar">
          <button @click="showAddSystemModal = true" class="add-btn">
            Add External System
          </button>
        </div>
        
        <div v-if="integrationStore.systems.length === 0" class="empty-state">
          No external systems configured yet. Click "Add External System" to get started.
        </div>
        
        <div v-else class="systems-grid">
          <div 
            v-for="system in integrationStore.systems" 
            :key="system.id"
            class="system-card"
            :class="{ inactive: !system.active }"
          >
            <div class="system-header">
              <h3>{{ system.name }}</h3>
              <div class="system-type">{{ system.type }}</div>
              <div class="system-status" :class="{ active: system.active }">
                {{ system.active ? 'Active' : 'Inactive' }}
              </div>
            </div>
            
            <div class="system-details">
              <div class="detail-row">
                <span class="label">Endpoint:</span>
                <span class="value">{{ system.endpoint }}</span>
              </div>
              
              <div v-if="system.lastSync" class="detail-row">
                <span class="label">Last Sync:</span>
                <span class="value">{{ formatDate(system.lastSync) }}</span>
              </div>
              
              <div v-if="system.syncFrequency" class="detail-row">
                <span class="label">Sync Frequency:</span>
                <span class="value">Every {{ system.syncFrequency }} minutes</span>
              </div>
            </div>
            
            <div class="system-actions">
              <button 
                @click="editSystem(system)" 
                class="edit-btn"
              >
                Edit
              </button>
              <button 
                @click="toggleSystemActive(system.id, !system.active)" 
                :class="system.active ? 'deactivate-btn' : 'activate-btn'"
              >
                {{ system.active ? 'Deactivate' : 'Activate' }}
              </button>
              <button 
                @click="testConnection(system.id)" 
                class="test-btn"
                :disabled="!system.active"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add System Modal -->
      <div v-if="showAddSystemModal" class="modal">
        <div class="modal-content">
          <h3>Add External System</h3>
          
          <form @submit.prevent="addSystem">
            <div class="form-group">
              <label for="name">System Name</label>
              <input 
                type="text" 
                id="name" 
                v-model="newSystem.name" 
                required
                placeholder="e.g., Hospital EMR, Lab System"
              >
            </div>
            
            <div class="form-group">
              <label for="type">System Type</label>
              <select id="type" v-model="newSystem.type" required>
                <option value="EMR">Electronic Medical Record (EMR)</option>
                <option value="LIS">Laboratory Information System (LIS)</option>
                <option value="PACS">Picture Archiving and Communication System (PACS)</option>
                <option value="PMS">Practice Management System (PMS)</option>
                <option value="NOTIFICATION">Notification System</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="endpoint">API Endpoint</label>
              <input 
                type="url" 
                id="endpoint" 
                v-model="newSystem.endpoint" 
                required
                placeholder="https://api.example.com/v1"
              >
            </div>
            
            <div class="form-group">
              <label for="apiKey">API Key (Optional)</label>
              <input 
                type="text" 
                id="apiKey" 
                v-model="newSystem.apiKey"
                placeholder="Leave blank if not using API key authentication"
              >
            </div>
            
            <div class="form-group">
              <label for="username">Username (Optional)</label>
              <input 
                type="text" 
                id="username" 
                v-model="newSystem.username"
                placeholder="Leave blank if not using username/password authentication"
              >
            </div>
            
            <div class="form-group">
              <label for="password">Password (Optional)</label>
              <input 
                type="password" 
                id="password" 
                v-model="password"
                placeholder="Leave blank if not using username/password authentication"
              >
            </div>
            
            <div class="form-group">
              <label for="syncFrequency">Sync Frequency (minutes)</label>
              <input 
                type="number" 
                id="syncFrequency" 
                v-model.number="newSystem.syncFrequency"
                min="0"
                placeholder="0 for manual sync only"
              >
            </div>
            
            <div class="form-group checkbox">
              <input type="checkbox" id="active" v-model="newSystem.active">
              <label for="active">Active</label>
            </div>
            
            <div class="form-group">
              <label for="settings">Additional Settings (JSON)</label>
              <textarea 
                id="settings" 
                v-model="settingsJson"
                placeholder='{ "key": "value" }'
                rows="4"
              ></textarea>
              <div v-if="jsonError" class="field-error">{{ jsonError }}</div>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="cancelAddSystem" class="cancel-btn">
                Cancel
              </button>
              <button type="submit" class="submit-btn" :disabled="integrationStore.loading">
                {{ integrationStore.loading ? 'Adding...' : 'Add System' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Edit System Modal -->
      <div v-if="editingSystem" class="modal">
        <div class="modal-content">
          <h3>Edit External System</h3>
          
          <form @submit.prevent="updateSystem">
            <div class="form-group">
              <label for="edit-name">System Name</label>
              <input 
                type="text" 
                id="edit-name" 
                v-model="editingSystem.name" 
                required
              >
            </div>
            
            <div class="form-group">
              <label for="edit-endpoint">API Endpoint</label>
              <input 
                type="url" 
                id="edit-endpoint" 
                v-model="editingSystem.endpoint" 
                required
              >
            </div>
            
            <div class="form-group">
              <label for="edit-apiKey">API Key</label>
              <input 
                type="text" 
                id="edit-apiKey" 
                v-model="editingSystem.apiKey"
                placeholder="Leave blank to keep existing"
              >
            </div>
            
            <div class="form-group">
              <label for="edit-username">Username</label>
              <input 
                type="text" 
                id="edit-username" 
                v-model="editingSystem.username"
                placeholder="Leave blank to keep existing"
              >
            </div>
            
            <div class="form-group">
              <label for="edit-password">Password</label>
              <input 
                type="password" 
                id="edit-password" 
                v-model="password"
                placeholder="Leave blank to keep existing password"
              >
            </div>
            
            <div class="form-group">
              <label for="edit-syncFrequency">Sync Frequency (minutes)</label>
              <input 
                type="number" 
                id="edit-syncFrequency" 
                v-model.number="editingSystem.syncFrequency"
                min="0"
              >
            </div>
            
            <div class="form-group checkbox">
              <input type="checkbox" id="edit-active" v-model="editingSystem.active">
              <label for="edit-active">Active</label>
            </div>
            
            <div class="form-group">
              <label for="edit-settings">Additional Settings (JSON)</label>
              <textarea 
                id="edit-settings" 
                v-model="settingsJson"
                rows="4"
              ></textarea>
              <div v-if="jsonError" class="field-error">{{ jsonError }}</div>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="cancelEditSystem" class="cancel-btn">
                Cancel
              </button>
              <button type="submit" class="submit-btn" :disabled="integrationStore.loading">
                {{ integrationStore.loading ? 'Updating...' : 'Update System' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Connection Test Modal -->
      <div v-if="testingConnection" class="modal">
        <div class="modal-content test-modal">
          <h3>Testing Connection</h3>
          
          <div v-if="connectionTest.loading" class="connection-testing">
            <div class="spinner"></div>
            <p>Testing connection to {{ connectionTest.systemName }}...</p>
          </div>
          
          <div v-else-if="connectionTest.error" class="connection-error">
            <div class="error-icon">❌</div>
            <h4>Connection Failed</h4>
            <p class="error-message">{{ connectionTest.error }}</p>
          </div>
          
          <div v-else-if="connectionTest.success" class="connection-success">
            <div class="success-icon">✓</div>
            <h4>Connection Successful</h4>
            <p>Successfully connected to {{ connectionTest.systemName }}</p>
            <div class="details-section">
              <h5>Response Details</h5>
              <pre>{{ JSON.stringify(connectionTest.details, null, 2) }}</pre>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closeConnectionTest" class="close-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useUserProfileStore } from '@/stores/userProfile';
import { useIntegrationConfigStore, type ExternalSystem } from '@/stores/integrationConfig';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';

export default defineComponent({
  name: 'IntegrationSettings',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const integrationStore = useIntegrationConfigStore();
    
    // Get Firebase functions
    const functions = getFunctions();
    
    // UI state
    const showAddSystemModal = ref(false);
    const editingSystem = ref<ExternalSystem | null>(null);
    const password = ref('');
    const settingsJson = ref('{}');
    const jsonError = ref('');
    
    // Connection testing state
    const testingConnection = ref(false);
    
    // Define a type for the connection test result
    interface ConnectionTestResult {
      loading: boolean;
      success: boolean;
      error: string;
      systemName: string;
      details: null | Record<string, any>;
    }
    
    const connectionTest = ref<ConnectionTestResult>({
      loading: false,
      success: false,
      error: '',
      systemName: '',
      details: null
    });
    
    // New system form data
    const newSystem = ref({
      name: '',
      type: 'EMR' as ExternalSystem['type'],
      endpoint: '',
      apiKey: '',
      username: '',
      active: true,
      syncFrequency: 60,
      settings: {}
    });
    
    // Fetch external systems on component mount
    onMounted(() => {
      if (userProfileStore.canManageUsers) {
        integrationStore.fetchExternalSystems();
      }
    });
    
    // Format date for display
    const formatDate = (timestamp: Timestamp) => {
      if (!timestamp || !timestamp.toDate) {
        return 'Never';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    };
    
    // Add a new external system
    const addSystem = async () => {
      try {
        // Parse settings JSON
        try {
          newSystem.value.settings = JSON.parse(settingsJson.value);
          jsonError.value = '';
        } catch (e) {
          jsonError.value = 'Invalid JSON format for settings';
          return;
        }
        
        // Prepare system data
        const systemData = {
          ...newSystem.value,
          passwordSet: !!password.value
        };
        
        // Add the system
        const systemId = await integrationStore.addExternalSystem(systemData);
        
        // If password is provided, update it securely
        if (password.value && systemId) {
          await integrationStore.updateSystemPassword(systemId, password.value);
        }
        
        // Reset form and close modal
        resetForm();
        showAddSystemModal.value = false;
      } catch (error) {
        console.error('Error adding system:', error);
      }
    };
    
    // Cancel adding a system
    const cancelAddSystem = () => {
      resetForm();
      showAddSystemModal.value = false;
    };
    
    // Reset the form
    const resetForm = () => {
      newSystem.value = {
        name: '',
        type: 'EMR',
        endpoint: '',
        apiKey: '',
        username: '',
        active: true,
        syncFrequency: 60,
        settings: {}
      };
      password.value = '';
      settingsJson.value = '{}';
      jsonError.value = '';
    };
    
    // Edit an existing system
    const editSystem = (system: ExternalSystem) => {
      editingSystem.value = { ...system };
      settingsJson.value = JSON.stringify(system.settings || {}, null, 2);
      password.value = ''; // Don't load existing password for security
    };
    
    // Cancel editing a system
    const cancelEditSystem = () => {
      editingSystem.value = null;
      password.value = '';
      settingsJson.value = '{}';
      jsonError.value = '';
    };
    
    // Update an existing system
    const updateSystem = async () => {
      if (!editingSystem.value) return;
      
      try {
        // Parse settings JSON
        try {
          const settings = JSON.parse(settingsJson.value);
          jsonError.value = '';
          editingSystem.value.settings = settings;
        } catch (e) {
          jsonError.value = 'Invalid JSON format for settings';
          return;
        }
        
        // Update the system
        await integrationStore.updateExternalSystem(editingSystem.value.id, editingSystem.value);
        
        // If password is provided, update it securely
        if (password.value) {
          await integrationStore.updateSystemPassword(editingSystem.value.id, password.value);
        }
        
        // Reset and close modal
        editingSystem.value = null;
        password.value = '';
        settingsJson.value = '{}';
      } catch (error) {
        console.error('Error updating system:', error);
      }
    };
    
    // Toggle system active status
    const toggleSystemActive = async (id: string, active: boolean) => {
      await integrationStore.toggleSystemActive(id, active);
    };
    
    // Test connection to a system
    const testConnection = async (id: string) => {
      const system = integrationStore.getSystemById(id);
      if (!system) return;
      
      testingConnection.value = true;
      connectionTest.value = {
        loading: true,
        success: false,
        error: '',
        systemName: system.name,
        details: null
      };
      
      try {
        // Call Firebase function to test connection
        const testConnectionFunction = httpsCallable(functions, 'testExternalSystemConnection');
        const result = await testConnectionFunction({ systemId: id });
        
        // Update connection test state
        connectionTest.value = {
          loading: false,
          success: true,
          error: '',
          systemName: system.name,
          details: result.data as Record<string, any>
        };
        
        // Update last sync time in Firestore
        await integrationStore.updateLastSync(id);
      } catch (error: any) {
        connectionTest.value = {
          loading: false,
          success: false,
          error: error.message || 'Connection failed',
          systemName: system.name,
          details: null
        };
      }
    };
    
    // Close connection test modal
    const closeConnectionTest = () => {
      testingConnection.value = false;
      connectionTest.value = {
        loading: false,
        success: false,
        error: '',
        systemName: '',
        details: null
      };
    };
    
    return {
      userProfileStore,
      integrationStore,
      showAddSystemModal,
      editingSystem,
      newSystem,
      password,
      settingsJson,
      jsonError,
      testingConnection,
      connectionTest,
      formatDate,
      addSystem,
      cancelAddSystem,
      editSystem,
      cancelEditSystem,
      updateSystem,
      toggleSystemActive,
      testConnection,
      closeConnectionTest
    };
  }
});
</script>

<style scoped>
.integration-settings {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  text-align: center;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.add-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.add-btn:hover {
  background-color: #45a049;
}

.systems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.system-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #2196F3;
}

.system-card.inactive {
  opacity: 0.7;
  border-left-color: #9e9e9e;
}

.system-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.system-header h3 {
  margin: 0;
  flex-grow: 1;
}

.system-type {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 10px;
}

.system-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  background-color: #f5f5f5;
  color: #9e9e9e;
}

.system-status.active {
  background-color: #e8f5e9;
  color: #4CAF50;
}

.system-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.detail-row .label {
  font-weight: bold;
  width: 120px;
  flex-shrink: 0;
}

.detail-row .value {
  word-break: break-all;
}

.system-actions {
  display: flex;
  gap: 10px;
}

.edit-btn, .test-btn, .activate-btn, .deactivate-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  flex-grow: 1;
}

.edit-btn {
  background-color: #2196F3;
  color: white;
}

.edit-btn:hover {
  background-color: #1976d2;
}

.test-btn {
  background-color: #ff9800;
  color: white;
}

.test-btn:hover:not(:disabled) {
  background-color: #f57c00;
}

.test-btn:disabled {
  background-color: #ffcc80;
  cursor: not-allowed;
}

.activate-btn {
  background-color: #4CAF50;
  color: white;
}

.activate-btn:hover {
  background-color: #45a049;
}

.deactivate-btn {
  background-color: #f44336;
  color: white;
}

.deactivate-btn:hover {
  background-color: #d32f2f;
}

.empty-state {
  text-align: center;
  padding: 40px;
  background-color: #f5f5f5;
  border-radius: 8px;
  color: #757575;
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
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

/* Modal styles */
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
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

textarea {
  font-family: monospace;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
}

.form-group.checkbox input {
  width: auto;
  margin-right: 10px;
}

.form-group.checkbox label {
  margin-bottom: 0;
}

.field-error {
  color: #f44336;
  font-size: 14px;
  margin-top: 5px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  background-color: #f5f5f5;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn, .close-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.submit-btn:hover:not(:disabled), .close-btn:hover {
  background-color: #45a049;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Connection test modal styles */
.test-modal {
  max-width: 500px;
}

.connection-testing {
  text-align: center;
  padding: 20px;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #2196F3;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.connection-error, .connection-success {
  text-align: center;
  padding: 20px;
}

.error-icon, .success-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.error-icon {
  color: #f44336;
}

.success-icon {
  color: #4CAF50;
}

.connection-error h4 {
  color: #f44336;
  margin-top: 0;
}

.connection-success h4 {
  color: #4CAF50;
  margin-top: 0;
}

.details-section {
  margin-top: 20px;
  text-align: left;
}

.details-section h5 {
  margin-top: 0;
  margin-bottom: 10px;
}

.details-section pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
</style>