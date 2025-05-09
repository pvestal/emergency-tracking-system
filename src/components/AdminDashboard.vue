<template>
  <div class="admin-dashboard">
    <div v-if="!userProfileStore.canManageUsers" class="access-denied">
      <p>You don't have permission to access the admin dashboard.</p>
    </div>
    
    <div v-else>
      <h1>Admin Dashboard</h1>
      
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>Users</h3>
          <div class="stat-value">{{ userCount }}</div>
          <div class="stat-footer">
            <span class="stat-label">By Role:</span>
            <div class="stat-breakdown">
              <div v-for="(count, role) in userRoleCounts" :key="role" class="breakdown-item">
                <span class="breakdown-label">{{ role }}:</span>
                <span class="breakdown-value">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <h3>System Activity</h3>
          <div class="stat-value">{{ activeUsersToday }} <span class="unit">active today</span></div>
          <div class="stat-footer">
            <div class="stat-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-label">New users (7d):</span>
                <span class="breakdown-value">{{ newUsersLastWeek }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">Total logins (24h):</span>
                <span class="breakdown-value">{{ loginCountLast24Hours }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <h3>Patients</h3>
          <div class="stat-value">{{ patientCount }}</div>
          <div class="stat-footer">
            <div class="stat-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-label">Active:</span>
                <span class="breakdown-value">{{ activePatientCount }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">New today:</span>
                <span class="breakdown-value">{{ newPatientsToday }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <h3>System Health</h3>
          <div class="stat-value">
            <span :class="systemHealthStatus.toLowerCase()">{{ systemHealthStatus }}</span>
          </div>
          <div class="stat-footer">
            <div class="stat-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-label">Uptime:</span>
                <span class="breakdown-value">{{ uptime }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">API Status:</span>
                <span class="breakdown-value" :class="apiStatus.toLowerCase()">{{ apiStatus }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Admin Quick Actions -->
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="action-buttons">
          <router-link to="/users" class="action-button">
            <span class="action-icon">👥</span>
            <span class="action-text">Manage Users</span>
          </router-link>
          
          <router-link to="/analytics" class="action-button">
            <span class="action-icon">📊</span>
            <span class="action-text">Analytics</span>
          </router-link>
          
          <router-link to="/integrations" class="action-button">
            <span class="action-icon">🔌</span>
            <span class="action-text">Integrations</span>
          </router-link>
          
          <router-link to="/tracking" class="action-button">
            <span class="action-icon">📍</span>
            <span class="action-text">Location Tracking</span>
          </router-link>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="recent-activity">
        <h2>Recent Activity</h2>
        <div v-if="loading" class="loading">Loading activity...</div>
        <div v-else-if="recentActivity.length === 0" class="empty-state">
          No recent activity to display
        </div>
        <ul v-else class="activity-list">
          <li v-for="(activity, index) in recentActivity" :key="index" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              <span v-if="activity.type === 'login'">🔑</span>
              <span v-else-if="activity.type === 'user'">👤</span>
              <span v-else-if="activity.type === 'patient'">🏥</span>
              <span v-else-if="activity.type === 'system'">⚙️</span>
            </div>
            <div class="activity-content">
              <div class="activity-message">{{ activity.message }}</div>
              <div class="activity-time">{{ formatDate(activity.timestamp) }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useUserProfileStore, type UserProfile } from '@/stores/userProfile';
import { usePatientsStore } from '@/stores/patients';

interface Activity {
  type: 'login' | 'user' | 'patient' | 'system';
  message: string;
  timestamp: Timestamp;
  userId?: string;
}

export default defineComponent({
  name: 'AdminDashboard',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const patientsStore = usePatientsStore();
    
    const loading = ref(true);
    const error = ref<string | null>(null);
    const users = ref<UserProfile[]>([]);
    const recentActivity = ref<Activity[]>([]);
    
    // System stats
    const systemHealthStatus = ref('Good');
    const apiStatus = ref('Operational');
    const uptime = ref('99.9%');
    
    // Fetch users data
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'userProfiles');
        const q = query(usersRef);
        
        const querySnapshot = await getDocs(q);
        users.value = [];
        querySnapshot.forEach((doc) => {
          users.value.push({
            id: doc.id,
            ...doc.data()
          } as UserProfile);
        });
      } catch (err: any) {
        console.error('Error fetching users:', err);
        error.value = err.message;
      }
    };
    
    // Fetch recent activity
    const fetchRecentActivity = () => {
      try {
        const activityRef = collection(db, 'systemActivity');
        const q = query(
          activityRef,
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        onSnapshot(q, (snapshot) => {
          const activities: Activity[] = [];
          snapshot.forEach((doc) => {
            activities.push(doc.data() as Activity);
          });
          recentActivity.value = activities;
          loading.value = false;
        }, (err) => {
          console.error('Error fetching activity:', err);
          error.value = err.message;
          loading.value = false;
        });
      } catch (err: any) {
        console.error('Error setting up activity listener:', err);
        error.value = err.message;
        loading.value = false;
      }
    };
    
    // Initialize data fetching
    onMounted(() => {
      fetchUsers();
      fetchRecentActivity();
      // In a real application, we would fetch patient data here too
    });
    
    // Computed properties for dashboard metrics
    const userCount = computed(() => users.value.length);
    
    const userRoleCounts = computed(() => {
      const counts: Record<string, number> = {
        admin: 0,
        provider: 0,
        nurse: 0,
        receptionist: 0,
        viewer: 0
      };
      
      users.value.forEach(user => {
        if (user.role && counts[user.role] !== undefined) {
          counts[user.role]++;
        }
      });
      
      return counts;
    });
    
    // Sample computed values (in a real app, these would be calculated from actual data)
    const activeUsersToday = computed(() => {
      // This would normally be calculated based on login timestamps
      return Math.min(5, users.value.length);
    });
    
    const newUsersLastWeek = computed(() => {
      // This would normally check creation dates within the last 7 days
      return Math.min(3, users.value.length);
    });
    
    const loginCountLast24Hours = computed(() => {
      // This would normally be calculated from an activity log
      return Math.min(10, users.value.length * 2);
    });
    
    // Patient stats (these would be real in a production app)
    const patientCount = ref(12);
    const activePatientCount = ref(8);
    const newPatientsToday = ref(3);
    
    // Format date helper
    const formatDate = (timestamp: any) => {
      if (!timestamp || !timestamp.toDate) {
        return 'Unknown';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    };
    
    return {
      userProfileStore,
      loading,
      error,
      users,
      recentActivity,
      userCount,
      userRoleCounts,
      activeUsersToday,
      newUsersLastWeek,
      loginCountLast24Hours,
      patientCount,
      activePatientCount,
      newPatientsToday,
      systemHealthStatus,
      apiStatus,
      uptime,
      formatDate
    };
  }
});
</script>

<style scoped>
.admin-dashboard {
  padding: 20px;
}

h1 {
  margin-bottom: 20px;
  color: #2c3e50;
}

h2 {
  margin: 30px 0 15px;
  color: #2c3e50;
  font-size: 1.5rem;
}

/* Stats Cards */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.stat-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: #666;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 15px;
  color: #2c3e50;
}

.unit {
  font-size: 0.9rem;
  font-weight: normal;
  color: #666;
}

.stat-footer {
  margin-top: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.stat-breakdown {
  margin-top: 5px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 3px;
}

.breakdown-label {
  color: #666;
}

.breakdown-value {
  font-weight: bold;
}

/* Status colors */
.good {
  color: #4caf50;
}

.warning {
  color: #ff9800;
}

.error {
  color: #f44336;
}

.operational {
  color: #4caf50;
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 30px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.action-button {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #2c3e50;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-icon {
  font-size: 1.5rem;
  margin-right: 10px;
}

.action-text {
  font-weight: bold;
}

/* Recent Activity */
.recent-activity {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-item {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  margin-right: 15px;
  font-size: 1.2rem;
}

.activity-content {
  flex: 1;
}

.activity-message {
  margin-bottom: 5px;
}

.activity-time {
  font-size: 0.8rem;
  color: #666;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

.access-denied {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin-top: 20px;
}
</style>