<template>
  <div class="security-audit-logs">
    <h2>Security Audit Logs</h2>
    
    <div v-if="!userProfileStore.isAdmin" class="access-denied">
      <p>You don't have permission to access this section.</p>
    </div>
    
    <div v-else>
      <div class="filter-panel">
        <h3>Filters</h3>
        
        <div class="filter-row">
          <div class="filter-group">
            <label for="action-filter">Action</label>
            <input 
              id="action-filter" 
              v-model="filters.action" 
              placeholder="Filter by action"
              type="text"
            >
          </div>
          
          <div class="filter-group">
            <label for="user-filter">User ID/Email</label>
            <input 
              id="user-filter" 
              v-model="filters.userId" 
              placeholder="Filter by user ID or email"
              type="text"
            >
          </div>
          
          <div class="filter-group">
            <label for="severity-filter">Severity</label>
            <select id="severity-filter" v-model="filters.severity">
              <option value="">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="success-filter">Status</label>
            <select id="success-filter" v-model="filters.success">
              <option value="">All</option>
              <option :value="true">Success</option>
              <option :value="false">Failure</option>
            </select>
          </div>
        </div>
        
        <div class="filter-row">
          <div class="filter-group">
            <label for="start-date">Start Date</label>
            <input 
              id="start-date" 
              v-model="filters.startDate" 
              type="date"
            >
          </div>
          
          <div class="filter-group">
            <label for="end-date">End Date</label>
            <input 
              id="end-date" 
              v-model="filters.endDate" 
              type="date"
            >
          </div>
          
          <div class="filter-actions">
            <button @click="resetFilters" class="reset-btn">Reset Filters</button>
            <button @click="fetchLogs" class="apply-btn" :disabled="loading">
              <span v-if="loading">Loading...</span>
              <span v-else>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="export-panel">
        <button @click="exportLogs" class="export-btn" :disabled="exportLoading">
          <span v-if="exportLoading">Exporting...</span>
          <span v-else>Export Logs</span>
        </button>
      </div>
      
      <div class="logs-container">
        <div v-if="loading" class="loading">
          Loading audit logs...
        </div>
        
        <div v-else-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-else-if="logs.length === 0" class="empty-state">
          No logs found matching your criteria.
        </div>
        
        <table v-else class="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="log in logs" 
              :key="log.id"
              :class="{
                'severity-warning': log.severity === 'warning',
                'severity-critical': log.severity === 'critical',
                'status-failure': !log.success
              }"
            >
              <td>{{ formatDate(log.timestamp) }}</td>
              <td>{{ formatAction(log.action) }}</td>
              <td>
                <div v-if="log.userEmail">{{ log.userEmail }}</div>
                <div v-else-if="log.userId">{{ log.userId }}</div>
                <div v-else>System</div>
              </td>
              <td>
                <span :class="`severity-badge severity-${log.severity}`">
                  {{ capitalize(log.severity) }}
                </span>
              </td>
              <td>
                <span :class="`status-badge status-${log.success ? 'success' : 'failure'}`">
                  {{ log.success ? 'Success' : 'Failure' }}
                </span>
              </td>
              <td>
                <button @click="viewLogDetails(log)" class="details-btn">View</button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="logs.length > 0 && hasMoreLogs" class="load-more">
          <button @click="loadMoreLogs" :disabled="loading" class="load-more-btn">
            Load More
          </button>
        </div>
      </div>
      
      <!-- Log Details Modal -->
      <div v-if="selectedLog" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Audit Log Details</h3>
            <button @click="closeLogDetails" class="close-btn">&times;</button>
          </div>
          
          <div class="log-details">
            <div class="log-info-grid">
              <div class="info-group">
                <label>Action:</label>
                <span>{{ formatAction(selectedLog.action) }}</span>
              </div>
              
              <div class="info-group">
                <label>Timestamp:</label>
                <span>{{ formatDate(selectedLog.timestamp, true) }}</span>
              </div>
              
              <div class="info-group">
                <label>User ID:</label>
                <span>{{ selectedLog.userId || 'System' }}</span>
              </div>
              
              <div class="info-group">
                <label>User Email:</label>
                <span>{{ selectedLog.userEmail || 'N/A' }}</span>
              </div>
              
              <div class="info-group">
                <label>IP Address:</label>
                <span>{{ selectedLog.userIp || 'N/A' }}</span>
              </div>
              
              <div class="info-group">
                <label>Severity:</label>
                <span :class="`severity-badge severity-${selectedLog.severity}`">
                  {{ capitalize(selectedLog.severity) }}
                </span>
              </div>
              
              <div class="info-group">
                <label>Status:</label>
                <span :class="`status-badge status-${selectedLog.success ? 'success' : 'failure'}`">
                  {{ selectedLog.success ? 'Success' : 'Failure' }}
                </span>
              </div>
              
              <div class="info-group">
                <label>Resource:</label>
                <span>{{ selectedLog.resource || 'N/A' }}</span>
              </div>
              
              <div class="info-group">
                <label>Session ID:</label>
                <span>{{ selectedLog.sessionId || 'N/A' }}</span>
              </div>
              
              <div v-if="selectedLog.errorMessage" class="info-group full-width">
                <label>Error Message:</label>
                <span class="error-text">{{ selectedLog.errorMessage }}</span>
              </div>
            </div>
            
            <div v-if="selectedLog.details" class="details-section">
              <h4>Details</h4>
              <pre class="details-json">{{ formatJson(selectedLog.details) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { useUserProfileStore } from '@/stores/userProfile';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);
const functions = getFunctions(firebaseApp);

export default defineComponent({
  name: 'SecurityAuditLogs',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    
    // Logs state
    const logs = ref<any[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const hasMoreLogs = ref(false);
    const lastLogId = ref<string | null>(null);
    
    // Export state
    const exportLoading = ref(false);
    
    // Filters
    const filters = reactive({
      action: '',
      userId: '',
      severity: '',
      success: '' as '' | boolean,
      startDate: '',
      endDate: ''
    });
    
    // Selected log details
    const selectedLog = ref<any | null>(null);
    
    // Action mappings for better display
    const actionMappings: Record<string, string> = {
      'user_login': 'User Login',
      'user_logout': 'User Logout',
      'login_failure': 'Login Failure',
      'user_created': 'User Created',
      'user_deleted': 'User Deleted',
      'user_role_changed': 'Role Changed',
      'view_audit_logs': 'Audit Logs Viewed',
      'export_audit_logs': 'Audit Logs Exported',
      'audit_logs_purged': 'Audit Logs Purged',
      'create_support_ticket': 'Support Ticket Created',
      'update_ticket_status': 'Ticket Status Updated',
      'view_admin_tickets': 'Admin Tickets Viewed',
      'view_ticket_details': 'Ticket Details Viewed',
      'stale_ticket_identified': 'Stale Ticket Identified',
      'checkout_supply': 'Supply Checked Out',
      'checkin_supply': 'Supply Checked In',
      'adjust_inventory': 'Inventory Adjusted',
      'waste_supply': 'Supply Wasted',
      'transfer_supply': 'Supply Transferred',
      'password_reset': 'Password Reset',
      'account_creation': 'Account Created',
      'permission_change': 'Permissions Changed',
      'data_export': 'Data Exported',
      'controlled_substance_access': 'Controlled Substance Access',
      'patient_data_access': 'Patient Data Access',
      'billing_access': 'Billing Access',
      'admin_action': 'Admin Action',
      'configuration_change': 'Configuration Changed',
      'integration_access': 'Integration Access',
      'api_key_generation': 'API Key Generated',
      'authentication_failure': 'Authentication Failed'
    };
    
    // Load logs initially
    onMounted(async () => {
      if (userProfileStore.isAdmin) {
        await fetchLogs();
      }
    });
    
    // Format functions
    const formatDate = (timestamp: any, includeTime = false) => {
      if (!timestamp || !timestamp.toDate) {
        return 'N/A';
      }
      
      const date = timestamp.toDate();
      
      if (includeTime) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: true
        }).format(date);
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    };
    
    const formatAction = (action: string) => {
      return actionMappings[action] || formatActionString(action);
    };
    
    const formatActionString = (action: string) => {
      // Convert snake_case to Title Case with spaces
      return action
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    const capitalize = (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };
    
    const formatJson = (obj: any) => {
      try {
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return String(obj);
      }
    };
    
    // Log retrieval functions
    const fetchLogs = async () => {
      if (!userProfileStore.isAdmin) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        // Reset pagination
        lastLogId.value = null;
        
        // Prepare filter parameters
        const filterParams: Record<string, any> = {};
        
        if (filters.action) filterParams.action = filters.action;
        if (filters.userId) filterParams.userId = filters.userId;
        if (filters.severity) filterParams.severity = filters.severity;
        if (filters.success !== '') filterParams.success = filters.success;
        
        if (filters.startDate) {
          filterParams.startTime = new Date(filters.startDate).getTime();
        }
        
        if (filters.endDate) {
          // Set to end of day for the end date
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          filterParams.endTime = endDate.getTime();
        }
        
        // Set page size
        filterParams.pageSize = 50;
        
        const getAuditLogsFunc = httpsCallable(functions, 'getAuditLogs');
        const result = await getAuditLogsFunc(filterParams);
        
        // Handle the response
        const response = result.data as any;
        logs.value = response.logs || [];
        hasMoreLogs.value = response.hasMore || false;
        
        // Set the last ID for pagination
        if (logs.value.length > 0) {
          lastLogId.value = logs.value[logs.value.length - 1].id;
        }
      } catch (err: any) {
        console.error('Error fetching audit logs:', err);
        error.value = err.message || 'Failed to load audit logs';
      } finally {
        loading.value = false;
      }
    };
    
    const loadMoreLogs = async () => {
      if (!userProfileStore.isAdmin || !lastLogId.value) return;
      
      loading.value = true;
      
      try {
        // Prepare filter parameters (same as fetchLogs)
        const filterParams: Record<string, any> = {};
        
        if (filters.action) filterParams.action = filters.action;
        if (filters.userId) filterParams.userId = filters.userId;
        if (filters.severity) filterParams.severity = filters.severity;
        if (filters.success !== '') filterParams.success = filters.success;
        
        if (filters.startDate) {
          filterParams.startTime = new Date(filters.startDate).getTime();
        }
        
        if (filters.endDate) {
          // Set to end of day for the end date
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          filterParams.endTime = endDate.getTime();
        }
        
        // Add pagination parameters
        filterParams.pageSize = 50;
        filterParams.startAfter = lastLogId.value;
        
        const getAuditLogsFunc = httpsCallable(functions, 'getAuditLogs');
        const result = await getAuditLogsFunc(filterParams);
        
        // Handle the response
        const response = result.data as any;
        const newLogs = response.logs || [];
        
        // Add new logs to the existing list
        logs.value = [...logs.value, ...newLogs];
        hasMoreLogs.value = response.hasMore || false;
        
        // Update the last ID for pagination
        if (newLogs.length > 0) {
          lastLogId.value = newLogs[newLogs.length - 1].id;
        } else {
          // No more logs
          lastLogId.value = null;
        }
      } catch (err: any) {
        console.error('Error loading more logs:', err);
        error.value = err.message || 'Failed to load more logs';
      } finally {
        loading.value = false;
      }
    };
    
    const exportLogs = async () => {
      if (!userProfileStore.isAdmin) return;
      
      exportLoading.value = true;
      
      try {
        // Prepare filter parameters (same as fetchLogs)
        const filterParams: Record<string, any> = {};
        
        if (filters.action) filterParams.action = filters.action;
        if (filters.userId) filterParams.userId = filters.userId;
        if (filters.severity) filterParams.severity = filters.severity;
        if (filters.success !== '') filterParams.success = filters.success;
        
        if (filters.startDate) {
          filterParams.startTime = new Date(filters.startDate).getTime();
        }
        
        if (filters.endDate) {
          // Set to end of day for the end date
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          filterParams.endTime = endDate.getTime();
        }
        
        const exportAuditLogsFunc = httpsCallable(functions, 'exportAuditLogs');
        const result = await exportAuditLogsFunc(filterParams);
        
        // Handle the response - in a real application, this might download a file
        const response = result.data as any;
        
        if (response.success) {
          // For this example, we'll generate and download a JSON file
          const exportData = response.data;
          const jsonData = JSON.stringify(exportData, null, 2);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          // Create a download link and click it
          const link = document.createElement('a');
          link.href = url;
          link.download = response.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          URL.revokeObjectURL(url);
        } else {
          throw new Error('Export failed');
        }
      } catch (err: any) {
        console.error('Error exporting audit logs:', err);
        error.value = err.message || 'Failed to export audit logs';
      } finally {
        exportLoading.value = false;
      }
    };
    
    const resetFilters = () => {
      // Reset all filters to default values
      filters.action = '';
      filters.userId = '';
      filters.severity = '';
      filters.success = '';
      filters.startDate = '';
      filters.endDate = '';
      
      // Refresh logs with no filters
      fetchLogs();
    };
    
    // Log details functions
    const viewLogDetails = (log: any) => {
      selectedLog.value = log;
    };
    
    const closeLogDetails = () => {
      selectedLog.value = null;
    };
    
    return {
      userProfileStore,
      logs,
      loading,
      error,
      hasMoreLogs,
      filters,
      selectedLog,
      exportLoading,
      formatDate,
      formatAction,
      capitalize,
      formatJson,
      fetchLogs,
      loadMoreLogs,
      exportLogs,
      resetFilters,
      viewLogDetails,
      closeLogDetails
    };
  }
});
</script>

<style scoped>
.security-audit-logs {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h2, h3, h4 {
  margin-top: 0;
  color: #333;
}

.access-denied {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 6px;
  text-align: center;
  margin-top: 20px;
}

.filter-panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}

.filter-group {
  flex: 1;
  min-width: 180px;
}

.filter-group.full-width {
  flex-basis: 100%;
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.filter-group input,
.filter-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.reset-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.apply-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.apply-btn:hover {
  background-color: #1976d2;
}

.apply-btn:disabled,
.reset-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.export-panel {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.export-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.export-btn:hover {
  background-color: #45a049;
}

.export-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.logs-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.logs-table th, 
.logs-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.logs-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.logs-table tr:hover {
  background-color: #f9f9f9;
}

.severity-badge, .status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.severity-info {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.severity-warning {
  background-color: #fff3e0;
  color: #e65100;
}

.severity-critical {
  background-color: #ffebee;
  color: #b71c1c;
}

.status-success {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.status-failure {
  background-color: #ffebee;
  color: #b71c1c;
}

tr.severity-warning {
  background-color: #fff8e1;
}

tr.severity-critical {
  background-color: #ffebee;
}

tr.status-failure {
  background-color: #ffebee;
}

.details-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.details-btn:hover {
  background-color: #1976d2;
}

.loading, .empty-state {
  text-align: center;
  padding: 30px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.load-more {
  margin-top: 20px;
  text-align: center;
}

.load-more-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.load-more-btn:hover {
  background-color: #e9e9e9;
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
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.log-details {
  padding: 20px;
}

.log-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.info-group.full-width {
  grid-column: span 3;
}

.info-group label {
  display: block;
  font-weight: bold;
  color: #666;
  margin-bottom: 5px;
  font-size: 12px;
}

.error-text {
  color: #c62828;
}

.details-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.details-json {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .log-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .info-group.full-width {
    grid-column: span 2;
  }
}

@media (max-width: 600px) {
  .log-info-grid {
    grid-template-columns: 1fr;
  }
  
  .info-group.full-width {
    grid-column: span 1;
  }
  
  .logs-table {
    font-size: 12px;
  }
  
  .logs-table th, 
  .logs-table td {
    padding: 8px;
  }
  
  .filter-group {
    flex-basis: 100%;
  }
}
</style>