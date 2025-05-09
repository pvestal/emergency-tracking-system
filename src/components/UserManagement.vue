<template>
  <div class="user-management">
    <h2>User Management</h2>
    
    <div v-if="!userProfileStore.canManageUsers" class="access-denied">
      <p>You don't have permission to access this section.</p>
    </div>
    
    <div v-else>
      <div v-if="loading" class="loading">
        Loading users...
      </div>
      
      <div v-else-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else>
        <div class="filter-controls">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search users..."
            class="search-input"
          >
        </div>
        
        <table class="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.displayName }}</td>
              <td>{{ user.email }}</td>
              <td>
                <select 
                  v-model="user.role" 
                  @change="updateUserRole(user.id, user.role)"
                >
                  <option value="admin">Admin</option>
                  <option value="provider">Provider</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td>{{ user.department || 'Not assigned' }}</td>
              <td>{{ formatDate(user.lastLogin) }}</td>
              <td>
                <button 
                  @click="showUserDetails(user)"
                  class="details-btn"
                >
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="filteredUsers.length === 0" class="empty-state">
          No users matching your search criteria
        </div>
      </div>
      
      <!-- User Details Modal -->
      <div v-if="selectedUser" class="modal">
        <div class="modal-content">
          <h3>User Details: {{ selectedUser.displayName }}</h3>
          
          <div class="user-details">
            <div class="detail-row">
              <span class="label">Email:</span>
              <span>{{ selectedUser.email }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Role:</span>
              <span>{{ selectedUser.role }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Department:</span>
              <span>{{ selectedUser.department || 'Not assigned' }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Title:</span>
              <span>{{ selectedUser.title || 'Not specified' }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">User Since:</span>
              <span>{{ formatDate(selectedUser.createdAt) }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Last Login:</span>
              <span>{{ formatDate(selectedUser.lastLogin) }}</span>
            </div>
          </div>
          
          <h4>Edit User</h4>
          <form @submit.prevent="updateUser">
            <div class="form-group">
              <label for="department">Department</label>
              <input 
                type="text" 
                id="department" 
                v-model="editUserForm.department"
              >
            </div>
            
            <div class="form-group">
              <label for="title">Title</label>
              <input 
                type="text" 
                id="title" 
                v-model="editUserForm.title"
              >
            </div>
            
            <div class="modal-actions">
              <button 
                type="button" 
                @click="selectedUser = null" 
                class="cancel-btn"
              >
                Close
              </button>
              <button 
                type="submit" 
                class="submit-btn"
                :disabled="updateLoading"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useUserProfileStore, type UserProfile, type UserRole } from '@/stores/userProfile';

export default defineComponent({
  name: 'UserManagement',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const users = ref<UserProfile[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const searchQuery = ref('');
    const selectedUser = ref<UserProfile | null>(null);
    const editUserForm = ref({
      department: '',
      title: ''
    });
    const updateLoading = ref(false);
    
    // Fetch all users
    onMounted(async () => {
      loading.value = true;
      
      try {
        const usersRef = collection(db, 'userProfiles');
        const q = query(usersRef);
        
        onSnapshot(q, (querySnapshot) => {
          const usersData: UserProfile[] = [];
          querySnapshot.forEach((doc) => {
            usersData.push({
              id: doc.id,
              ...doc.data()
            } as UserProfile);
          });
          users.value = usersData;
          loading.value = false;
        }, (err) => {
          error.value = err.message;
          loading.value = false;
        });
      } catch (err: any) {
        error.value = err.message;
        loading.value = false;
      }
    });
    
    // Filter users by search query
    const filteredUsers = computed(() => {
      if (!searchQuery.value) return users.value;
      
      const query = searchQuery.value.toLowerCase();
      return users.value.filter(user => 
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.department && user.department.toLowerCase().includes(query))
      );
    });
    
    // Format date for display
    const formatDate = (timestamp: any) => {
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
    
    // Show user details and prepare edit form
    const showUserDetails = (user: UserProfile) => {
      selectedUser.value = user;
      editUserForm.value.department = user.department || '';
      editUserForm.value.title = user.title || '';
    };
    
    // Update user role
    const updateUserRole = async (userId: string, role: UserRole) => {
      try {
        await userProfileStore.updateUserRole(userId, role);
      } catch (err: any) {
        error.value = err.message;
      }
    };
    
    // Update user details
    const updateUser = async () => {
      if (!selectedUser.value) return;
      
      updateLoading.value = true;
      
      try {
        const profileRef = doc(db, 'userProfiles', selectedUser.value.id);
        await updateDoc(profileRef, {
          department: editUserForm.value.department,
          title: editUserForm.value.title
        });
        
        // Update the selected user object
        selectedUser.value.department = editUserForm.value.department;
        selectedUser.value.title = editUserForm.value.title;
        
        // Close the modal
        selectedUser.value = null;
      } catch (err: any) {
        error.value = err.message;
      } finally {
        updateLoading.value = false;
      }
    };
    
    return {
      userProfileStore,
      users,
      loading,
      error,
      searchQuery,
      filteredUsers,
      selectedUser,
      editUserForm,
      updateLoading,
      formatDate,
      showUserDetails,
      updateUserRole,
      updateUser
    };
  }
});
</script>

<style scoped>
.user-management {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  text-align: center;
}

.filter-controls {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.users-table th, 
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.users-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.users-table tr:hover {
  background-color: #f9f9f9;
}

.users-table select {
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ddd;
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

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

.modal-content h4 {
  margin-top: 20px;
  margin-bottom: 15px;
}

.user-details {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 10px;
}

.detail-row .label {
  font-weight: bold;
  width: 120px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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

.submit-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn:hover {
  background-color: #45a049;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>