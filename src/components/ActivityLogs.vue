<template>
  <div class="activity-logs">
    <h2>Activity Logs</h2>
    
    <div v-if="!userProfileStore.canManageUsers" class="access-denied">
      <p>You don't have permission to access activity logs.</p>
    </div>
    
    <div v-else>
      <div class="filters">
        <div class="filter-group">
          <label for="activityType">Activity Type</label>
          <select id="activityType" v-model="filters.type">
            <option value="all">All Activities</option>
            <option value="login">Login/Logout</option>
            <option value="user">User Management</option>
            <option value="patient">Patient Records</option>
            <option value="system">System Settings</option>
            <option value="admin">Admin Actions</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="timeRange">Time Range</label>
          <select id="timeRange" v-model="filters.timeRange">
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="userFilter">User</label>
          <select id="userFilter" v-model="filters.userId">
            <option value="all">All Users</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.displayName }} ({{ user.email }})
            </option>
          </select>
        </div>
        
        <button class="btn primary-btn" @click="applyFilters">
          Apply Filters
        </button>
        
        <button class="btn secondary-btn" @click="resetFilters">
          Reset
        </button>
        
        <button class="btn export-btn" @click="exportLogs">
          <span class="icon">📥</span> Export
        </button>
      </div>
      
      <div v-if="loading" class="loading">
        Loading activity logs...
      </div>
      
      <div v-else-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else>
        <div class="log-stats">
          <div class="stat-item">
            <span class="stat-label">Total Records:</span>
            <span class="stat-value">{{ filteredLogs.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Date Range:</span>
            <span class="stat-value">{{ getDateRangeText() }}</span>
          </div>
        </div>
        
        <div class="log-container">
          <table class="log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, index) in paginatedLogs" :key="index" :class="log.type">
                <td>{{ formatDate(log.timestamp) }}</td>
                <td>
                  <span class="type-badge" :class="log.type">
                    {{ formatType(log.type) }}
                  </span>
                </td>
                <td>{{ getUserName(log.userId) || 'System' }}</td>
                <td>{{ log.message }}</td>
                <td>
                  <button 
                    v-if="log.details" 
                    class="details-btn"
                    @click="showLogDetails(log)"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="filteredLogs.length === 0" class="empty-state">
            No activity logs match your filter criteria
          </div>
          
          <div class="pagination" v-if="totalPages > 1">
            <button 
              class="page-btn" 
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              &laquo; Previous
            </button>
            
            <div class="page-info">
              Page {{ currentPage }} of {{ totalPages }}
            </div>
            
            <button 
              class="page-btn" 
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              Next &raquo;
            </button>
          </div>
        </div>
      </div>
      
      <!-- Log Details Modal -->
      <div v-if="selectedLog" class="modal">
        <div class="modal-content">
          <h3>Log Details</h3>
          
          <div class="log-details">
            <div class="detail-row">
              <span class="label">Type:</span>
              <span class="type-badge" :class="selectedLog.type">
                {{ formatType(selectedLog.type) }}
              </span>
            </div>
            
            <div class="detail-row">
              <span class="label">Timestamp:</span>
              <span>{{ formatDate(selectedLog.timestamp, true) }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">User:</span>
              <span>{{ getUserName(selectedLog.userId) || 'System' }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Action:</span>
              <span>{{ selectedLog.message }}</span>
            </div>
            
            <div class="detail-section">
              <h4>Additional Information</h4>
              <pre>{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
            </div>
            
            <div v-if="selectedLog.type === 'admin'" class="detail-section">
              <h4>Admin Action</h4>
              <div class="detail-row">
                <span class="label">Target:</span>
                <span>{{ selectedLog.details?.targetType || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Target ID:</span>
                <span>{{ selectedLog.details?.targetId || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Changes:</span>
                <pre v-if="selectedLog.details?.changes">{{ JSON.stringify(selectedLog.details.changes, null, 2) }}</pre>
                <span v-else>No change details recorded</span>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn secondary-btn" @click="selectedLog = null">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useUserProfileStore, type UserProfile } from '@/stores/userProfile';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  startAfter,
  endAt,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/firebase/config';

interface ActivityLog {
  id: string;
  type: 'login' | 'user' | 'patient' | 'system' | 'admin';
  message: string;
  userId?: string;
  timestamp: Timestamp;
  details?: any;
}

interface Filters {
  type: string;
  timeRange: string;
  userId: string;
}

export default defineComponent({
  name: 'ActivityLogs',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const loading = ref(true);
    const error = ref<string | null>(null);
    
    const logs = ref<ActivityLog[]>([]);
    const filteredLogs = ref<ActivityLog[]>([]);
    const selectedLog = ref<ActivityLog | null>(null);
    const users = ref<UserProfile[]>([]);
    
    // Pagination
    const currentPage = ref(1);
    const logsPerPage = 20;
    
    // Filters
    const filters = ref<Filters>({
      type: 'all',
      timeRange: '7d',
      userId: 'all'
    });
    
    // Calculate total pages
    const totalPages = computed(() => 
      Math.ceil(filteredLogs.value.length / logsPerPage)
    );
    
    // Get logs for current page
    const paginatedLogs = computed(() => {
      const startIndex = (currentPage.value - 1) * logsPerPage;
      const endIndex = startIndex + logsPerPage;
      return filteredLogs.value.slice(startIndex, endIndex);
    });
    
    // Fetch activity logs
    const fetchLogs = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        // Build query constraints based on filters
        const constraints: QueryConstraint[] = [];
        
        // Time range filter
        if (filters.value.timeRange !== 'all') {
          let timeAgo: Date;
          const now = new Date();
          
          switch (filters.value.timeRange) {
            case '24h':
              timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '7d':
              timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            default:
              timeAgo = new Date(0); // Beginning of time
          }
          
          constraints.push(where('timestamp', '>=', Timestamp.fromDate(timeAgo)));
        }
        
        // Type filter
        if (filters.value.type !== 'all') {
          constraints.push(where('type', '==', filters.value.type));
        }
        
        // User filter
        if (filters.value.userId !== 'all') {
          constraints.push(where('userId', '==', filters.value.userId));
        }
        
        // Add sorting and limit
        constraints.push(orderBy('timestamp', 'desc'));
        constraints.push(limit(500)); // Limit to 500 most recent logs
        
        const logsRef = collection(db, 'activityLogs');
        const q = query(logsRef, ...constraints);
        
        const querySnapshot = await getDocs(q);
        logs.value = [];
        
        querySnapshot.forEach((doc) => {
          logs.value.push({
            id: doc.id,
            ...doc.data()
          } as ActivityLog);
        });
        
        // Apply filters to the fetched logs
        applyFilters();
      } catch (err: any) {
        console.error('Error fetching activity logs:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };
    
    // Fetch users for filtering
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'userProfiles');
        const querySnapshot = await getDocs(usersRef);
        
        users.value = [];
        querySnapshot.forEach((doc) => {
          users.value.push({
            id: doc.id,
            ...doc.data()
          } as UserProfile);
        });
      } catch (err: any) {
        console.error('Error fetching users:', err);
      }
    };
    
    // Apply current filters to logs
    const applyFilters = () => {
      filteredLogs.value = [...logs.value];
      currentPage.value = 1;
    };
    
    // Reset filters to defaults
    const resetFilters = () => {
      filters.value = {
        type: 'all',
        timeRange: '7d',
        userId: 'all'
      };
      fetchLogs();
    };
    
    // Export logs to CSV
    const exportLogs = () => {
      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Add header row
      csvContent += 'Timestamp,Type,User,Action,Details\n';
      
      // Add data rows
      filteredLogs.value.forEach(log => {
        const timestamp = formatDate(log.timestamp);
        const type = formatType(log.type);
        const user = getUserName(log.userId) || 'System';
        const action = log.message.replace(/,/g, ' '); // Remove commas to avoid CSV issues
        const details = log.details ? JSON.stringify(log.details).replace(/,/g, ' ') : '';
        
        csvContent += `${timestamp},${type},${user},${action},${details}\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `activity_logs_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
    };
    
    // Format date for display
    const formatDate = (timestamp: any, includeSeconds = false) => {
      if (!timestamp || !timestamp.toDate) {
        return 'Unknown';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: includeSeconds ? 'numeric' : undefined,
        hour12: true
      }).format(date);
    };
    
    // Format activity type for display
    const formatType = (type: string) => {
      switch (type) {
        case 'login':
          return 'Authentication';
        case 'user':
          return 'User Management';
        case 'patient':
          return 'Patient Records';
        case 'system':
          return 'System Settings';
        case 'admin':
          return 'Admin Action';
        default:
          return type.charAt(0).toUpperCase() + type.slice(1);
      }
    };
    
    // Get user name from user ID
    const getUserName = (userId?: string) => {
      if (!userId) return null;
      
      const user = users.value.find(u => u.id === userId);
      return user ? user.displayName : userId;
    };
    
    // Get date range text based on current filter
    const getDateRangeText = () => {
      switch (filters.value.timeRange) {
        case '24h':
          return 'Last 24 Hours';
        case '7d':
          return 'Last 7 Days';
        case '30d':
          return 'Last 30 Days';
        case 'all':
          return 'All Time';
        default:
          return 'Custom Range';
      }
    };
    
    // Show log details
    const showLogDetails = (log: ActivityLog) => {
      selectedLog.value = log;
    };
    
    // Pagination navigation
    const goToPage = (page: number) => {
      if (page < 1) page = 1;
      if (page > totalPages.value) page = totalPages.value;
      currentPage.value = page;
    };
    
    onMounted(async () => {
      await fetchUsers();
      await fetchLogs();
    });
    
    return {
      userProfileStore,
      logs,
      filteredLogs,
      paginatedLogs,
      loading,
      error,
      users,
      filters,
      selectedLog,
      currentPage,
      totalPages,
      formatDate,
      formatType,
      getUserName,
      fetchLogs,
      applyFilters,
      resetFilters,
      exportLogs,
      showLogDetails,
      goToPage,
      getDateRangeText
    };
  }
});
</script>

<style scoped>
.activity-logs {
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

h4 {
  margin: 15px 0 10px;
  color: #2c3e50;
  font-size: 1rem;
}

/* Filters */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

label {
  font-size: 0.85rem;
  margin-bottom: 5px;
  color: #666;
}

select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  min-width: 150px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  margin-top: auto;
}

.primary-btn {
  background-color: #4caf50;
  color: white;
}

.primary-btn:hover {
  background-color: #43a047;
}

.secondary-btn {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.secondary-btn:hover {
  background-color: #e9ecef;
}

.export-btn {
  background-color: #2196f3;
  color: white;
  margin-left: auto;
}

.export-btn:hover {
  background-color: #1e88e5;
}

.icon {
  margin-right: 5px;
}

/* Log stats */
.log-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-label {
  font-weight: bold;
  margin-right: 5px;
  color: #666;
}

.stat-value {
  color: #2c3e50;
}

/* Log table */
.log-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
}

.log-table th, 
.log-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.log-table th {
  background-color: #f5f7fa;
  font-weight: bold;
  color: #666;
}

.log-table tr:hover {
  background-color: #f9f9f9;
}

/* Type badges */
.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.type-badge.login {
  background-color: #e3f2fd;
  color: #1565c0;
}

.type-badge.user {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.type-badge.patient {
  background-color: #fff8e1;
  color: #f57f17;
}

.type-badge.system {
  background-color: #ede7f6;
  color: #4527a0;
}

.type-badge.admin {
  background-color: #ffebee;
  color: #c62828;
}

/* View details button */
.details-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.details-btn:hover {
  background-color: #eee;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-top: 1px solid #eee;
}

.page-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  background-color: #e9ecef;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}

/* Modal */
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
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.log-details {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 10px;
}

.detail-row .label {
  font-weight: bold;
  width: 100px;
  margin-bottom: 0;
  color: #333;
}

.detail-section {
  margin-top: 15px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* State indicators */
.loading {
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

.empty-state {
  text-align: center;
  padding: 30px;
  color: #666;
  font-style: italic;
}

.access-denied {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
  margin-top: 20px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    gap: 10px;
  }
  
  .export-btn {
    margin-left: 0;
  }
  
  .log-table th:nth-child(5),
  .log-table td:nth-child(5) {
    display: none;
  }
}</style>