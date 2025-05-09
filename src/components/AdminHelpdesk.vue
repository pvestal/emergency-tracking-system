<template>
  <div class="admin-helpdesk">
    <h2>Admin Helpdesk</h2>
    
    <div v-if="!userProfileStore.isAdmin" class="access-denied">
      <p>You don't have permission to access this section.</p>
    </div>
    
    <div v-else>
      <div class="dashboard">
        <div class="stats-panel">
          <div class="stats-header">
            <h3>Helpdesk Dashboard</h3>
            <button @click="refreshStats" :disabled="statsLoading" class="refresh-btn">
              <span v-if="statsLoading">Loading...</span>
              <span v-else>Refresh</span>
            </button>
          </div>
          
          <div v-if="statsLoading" class="loading">
            Loading statistics...
          </div>
          
          <div v-else-if="statsError" class="error-message">
            {{ statsError }}
          </div>
          
          <div v-else class="stats-grid">
            <div class="stat-card">
              <h4>Total Tickets</h4>
              <div class="stat-value">{{ stats.totalTickets || 0 }}</div>
            </div>
            
            <div class="stat-card">
              <h4>Open Tickets</h4>
              <div class="stat-value">{{ stats.statusCounts?.open || 0 }}</div>
            </div>
            
            <div class="stat-card">
              <h4>In Progress</h4>
              <div class="stat-value">{{ stats.statusCounts?.in_progress || 0 }}</div>
            </div>
            
            <div class="stat-card">
              <h4>Resolved/Closed</h4>
              <div class="stat-value">
                {{ (stats.statusCounts?.resolved || 0) + (stats.statusCounts?.closed || 0) }}
              </div>
            </div>
            
            <div class="stat-card">
              <h4>High Priority</h4>
              <div class="stat-value">{{ stats.priorityCounts?.high || 0 }}</div>
            </div>
            
            <div class="stat-card">
              <h4>Critical Priority</h4>
              <div class="stat-value">{{ stats.priorityCounts?.critical || 0 }}</div>
            </div>
            
            <div class="stat-card">
              <h4>New This Week</h4>
              <div class="stat-value">{{ stats.recentTicketsCount || 0 }}</div>
            </div>
            
            <div class="stat-card">
              <h4>Avg. Response Time</h4>
              <div class="stat-value">{{ formatResponseTime(stats.averageResponseTime) }}</div>
            </div>
          </div>
        </div>
        
        <div class="filter-panel">
          <h3>Ticket Filters</h3>
          
          <div class="filter-group">
            <label for="status-filter">Status</label>
            <select id="status-filter" v-model="filters.status" @change="fetchTickets">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="priority-filter">Priority</label>
            <select id="priority-filter" v-model="filters.priority" @change="fetchTickets">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="category-filter">Category</label>
            <select id="category-filter" v-model="filters.category" @change="fetchTickets">
              <option value="">All Categories</option>
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="feature">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="tier-filter">Subscription Tier</label>
            <select id="tier-filter" v-model="filters.subscriptionTier" @change="fetchTickets">
              <option value="">All Tiers</option>
              <option value="demo">Demo</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="assignee-filter">Assignee</label>
            <select id="assignee-filter" v-model="filters.assignedTo" @change="fetchTickets">
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              <option 
                v-for="admin in adminUsers" 
                :key="admin.id" 
                :value="admin.id"
              >
                {{ admin.displayName }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="sort-by">Sort By</label>
            <select id="sort-by" v-model="filters.sortBy" @change="fetchTickets">
              <option value="date">Date (Newest First)</option>
              <option value="priority">Priority (Highest First)</option>
            </select>
          </div>
          
          <button @click="resetFilters" class="reset-btn">Reset Filters</button>
        </div>
      </div>
      
      <div class="tickets-container">
        <h3>Support Tickets</h3>
        
        <div v-if="loading" class="loading">
          Loading tickets...
        </div>
        
        <div v-else-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-else-if="tickets.length === 0" class="empty-state">
          No tickets match your filter criteria.
        </div>
        
        <table v-else class="tickets-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Submitted By</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Subscription</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="ticket in tickets" 
              :key="ticket.id"
              :class="{
                'high-priority': ticket.priority === 'high',
                'critical-priority': ticket.priority === 'critical'
              }"
            >
              <td>{{ ticket.id.substring(0, 8) }}...</td>
              <td>{{ ticket.subject }}</td>
              <td>{{ ticket.userName }}</td>
              <td>
                <span :class="`status-badge status-${ticket.status}`">
                  {{ formatStatus(ticket.status) }}
                </span>
              </td>
              <td>
                <span :class="`priority-badge priority-${ticket.priority}`">
                  {{ ticket.priority }}
                </span>
              </td>
              <td>{{ formatCategory(ticket.category) }}</td>
              <td>{{ formatSubscriptionTier(ticket.subscriptionTier) }}</td>
              <td>{{ formatDate(ticket.createdAt) }}</td>
              <td>
                <button @click="viewTicket(ticket)" class="view-btn">View</button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="tickets.length > 0 && hasMoreTickets" class="load-more">
          <button @click="loadMoreTickets" :disabled="loading" class="load-more-btn">
            Load More
          </button>
        </div>
      </div>
      
      <!-- Ticket Details Modal -->
      <div v-if="selectedTicket" class="modal">
        <div class="modal-content ticket-detail-modal">
          <div class="modal-header">
            <h3>Ticket: {{ selectedTicket.subject }}</h3>
            <button @click="closeTicketDetails" class="close-btn">&times;</button>
          </div>
          
          <div class="ticket-details">
            <div class="ticket-meta">
              <div class="ticket-info-grid">
                <div class="info-group">
                  <label>Status:</label>
                  <select v-model="ticketStatus" @change="updateTicketStatusHandler">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div class="info-group">
                  <label>Priority:</label>
                  <select v-model="ticketPriority" @change="updateTicketPriorityHandler">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div class="info-group">
                  <label>Assignee:</label>
                  <select v-model="ticketAssignee" @change="updateTicketAssigneeHandler">
                    <option value="">Unassigned</option>
                    <option 
                      v-for="admin in adminUsers" 
                      :key="admin.id" 
                      :value="admin.id"
                    >
                      {{ admin.displayName }}
                    </option>
                  </select>
                </div>
                
                <div class="info-group">
                  <label>Category:</label>
                  <span>{{ formatCategory(selectedTicket.category) }}</span>
                </div>
                
                <div class="info-group">
                  <label>Subscription:</label>
                  <span>{{ formatSubscriptionTier(selectedTicket.subscriptionTier) }}</span>
                </div>
                
                <div class="info-group">
                  <label>Created:</label>
                  <span>{{ formatDate(selectedTicket.createdAt) }}</span>
                </div>
                
                <div class="info-group">
                  <label>Updated:</label>
                  <span>{{ formatDate(selectedTicket.updatedAt) }}</span>
                </div>
                
                <div class="info-group">
                  <label>User:</label>
                  <span>{{ selectedTicket.userName }} ({{ selectedTicket.userEmail }})</span>
                </div>
              </div>
            </div>
            
            <div class="ticket-description">
              <h4>Description</h4>
              <div class="description-content">
                {{ selectedTicket.description }}
              </div>
            </div>
            
            <div v-if="ticketResponses.length > 0" class="ticket-responses">
              <h4>Responses</h4>
              
              <div 
                v-for="response in ticketResponses" 
                :key="response.id"
                :class="[
                  'response-item', 
                  {'admin-response': response.userRole === 'admin'},
                  {'user-response': response.userRole !== 'admin'},
                  {'internal-note': response.isInternal}
                ]"
              >
                <div class="response-header">
                  <span class="response-author">
                    {{ response.userName }} 
                    <span class="response-role">({{ formatRole(response.userRole) }})</span>
                    <span v-if="response.isInternal" class="internal-badge">Internal Note</span>
                  </span>
                  <span class="response-date">{{ formatDate(response.createdAt) }}</span>
                </div>
                <div class="response-content">{{ response.content }}</div>
              </div>
            </div>
            
            <div class="new-response">
              <h4>Add Response</h4>
              
              <div class="response-type-toggle">
                <label>
                  <input 
                    type="radio" 
                    v-model="newResponseType" 
                    value="public"
                    name="response-type"
                  >
                  Response to User
                </label>
                <label>
                  <input 
                    type="radio" 
                    v-model="newResponseType" 
                    value="internal"
                    name="response-type"
                  >
                  Internal Note
                </label>
              </div>
              
              <textarea 
                v-model="newResponseContent" 
                placeholder="Type your response here..."
                rows="5"
                class="response-textarea"
              ></textarea>
              
              <div class="response-actions">
                <button 
                  @click="addResponse" 
                  :disabled="!newResponseContent.trim() || responseLoading"
                  class="submit-response-btn"
                >
                  <span v-if="responseLoading">Sending...</span>
                  <span v-else>{{ newResponseType === 'public' ? 'Send Response' : 'Add Internal Note' }}</span>
                </button>
              </div>
            </div>
            
            <div v-if="ticketStatus === 'resolved' || ticketStatus === 'closed'" class="resolution-section">
              <h4>Resolution</h4>
              <textarea 
                v-model="ticketResolution" 
                placeholder="Describe how this ticket was resolved..."
                rows="3"
                class="resolution-textarea"
              ></textarea>
              <button 
                @click="updateResolution" 
                :disabled="updateLoading"
                class="update-resolution-btn"
              >
                Update Resolution
              </button>
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
  name: 'AdminHelpdesk',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    
    // Tickets state
    const tickets = ref<any[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const hasMoreTickets = ref(false);
    const lastTicketId = ref<string | null>(null);
    
    // Filters
    const filters = reactive({
      status: '',
      priority: '',
      category: '',
      subscriptionTier: '',
      assignedTo: '',
      sortBy: 'date'
    });
    
    // Stats
    const stats = ref<any>({});
    const statsLoading = ref(false);
    const statsError = ref<string | null>(null);
    
    // Admin users for assignment
    const adminUsers = ref<any[]>([]);
    
    // Selected ticket details
    const selectedTicket = ref<any | null>(null);
    const ticketResponses = ref<any[]>([]);
    const ticketStatus = ref('');
    const ticketPriority = ref('');
    const ticketAssignee = ref('');
    const ticketResolution = ref('');
    
    // New response
    const newResponseContent = ref('');
    const newResponseType = ref('public');
    const responseLoading = ref(false);
    const detailsLoading = ref(false);
    const updateLoading = ref(false);
    
    // Load tickets initially
    onMounted(async () => {
      if (userProfileStore.isAdmin) {
        await Promise.all([
          fetchTickets(),
          fetchStats(),
          fetchAdminUsers()
        ]);
      }
    });
    
    // Format functions
    const formatDate = (timestamp: any) => {
      if (!timestamp || !timestamp.toDate) {
        return 'N/A';
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
    
    const formatResponseTime = (time: number) => {
      if (!time) return 'N/A';
      
      const hours = Math.floor(time / (1000 * 60 * 60));
      const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    };
    
    const formatStatus = (status: string) => {
      const statusMap: Record<string, string> = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'resolved': 'Resolved',
        'closed': 'Closed'
      };
      
      return statusMap[status] || status;
    };
    
    const formatCategory = (category: string) => {
      const categoryMap: Record<string, string> = {
        'account': 'Account',
        'billing': 'Billing',
        'technical': 'Technical',
        'feature': 'Feature Request',
        'other': 'Other'
      };
      
      return categoryMap[category] || category;
    };
    
    const formatSubscriptionTier = (tier: string) => {
      const tierMap: Record<string, string> = {
        'demo': 'Demo',
        'basic': 'Basic',
        'premium': 'Premium',
        'enterprise': 'Enterprise'
      };
      
      return tierMap[tier] || tier;
    };
    
    const formatRole = (role: string) => {
      const roleMap: Record<string, string> = {
        'admin': 'Admin',
        'provider': 'Provider',
        'nurse': 'Nurse',
        'physician': 'Physician',
        'receptionist': 'Receptionist',
        'viewer': 'Viewer'
      };
      
      return roleMap[role] || role;
    };
    
    // Fetch functions
    const fetchTickets = async () => {
      if (!userProfileStore.isAdmin) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        // Add conditional handling for "unassigned"
        let filterData: Record<string, any> = { ...filters };
        
        // Special handling for "unassigned" tickets
        if (filterData.assignedTo === 'unassigned') {
          // Firebase doesn't directly support "where field doesn't exist" in queries
          // This is a workaround handled on the server side
          filterData.assignedTo = null;
        }
        
        // Reset pagination
        lastTicketId.value = null;
        
        const getAdminTicketsFunc = httpsCallable(functions, 'getAdminTickets');
        const result = await getAdminTicketsFunc(filterData);
        
        // Handle the response
        const response = result.data as any;
        tickets.value = response.tickets || [];
        hasMoreTickets.value = response.hasMore || false;
        
        // Set the last ID for pagination
        if (tickets.value.length > 0) {
          lastTicketId.value = tickets.value[tickets.value.length - 1].id;
        }
      } catch (err: any) {
        console.error('Error fetching tickets:', err);
        error.value = err.message || 'Failed to load tickets';
      } finally {
        loading.value = false;
      }
    };
    
    const loadMoreTickets = async () => {
      if (!userProfileStore.isAdmin || !lastTicketId.value) return;
      
      loading.value = true;
      
      try {
        // Add conditional handling for "unassigned"
        let filterData: Record<string, any> = { 
          ...filters,
          startAfter: lastTicketId.value
        };
        
        // Special handling for "unassigned" tickets
        if (filterData.assignedTo === 'unassigned') {
          filterData.assignedTo = null;
        }
        
        const getAdminTicketsFunc = httpsCallable(functions, 'getAdminTickets');
        const result = await getAdminTicketsFunc(filterData);
        
        // Handle the response
        const response = result.data as any;
        const newTickets = response.tickets || [];
        
        // Add new tickets to the existing list
        tickets.value = [...tickets.value, ...newTickets];
        hasMoreTickets.value = response.hasMore || false;
        
        // Update the last ID for pagination
        if (newTickets.length > 0) {
          lastTicketId.value = newTickets[newTickets.length - 1].id;
        } else {
          // No more tickets
          lastTicketId.value = null;
        }
      } catch (err: any) {
        console.error('Error loading more tickets:', err);
        error.value = err.message || 'Failed to load more tickets';
      } finally {
        loading.value = false;
      }
    };
    
    const fetchStats = async () => {
      if (!userProfileStore.isAdmin) return;
      
      statsLoading.value = true;
      statsError.value = null;
      
      try {
        const getHelpdeskStatsFunc = httpsCallable(functions, 'getHelpdeskStats');
        const result = await getHelpdeskStatsFunc({});
        
        // Handle the response
        stats.value = result.data as any;
      } catch (err: any) {
        console.error('Error fetching stats:', err);
        statsError.value = err.message || 'Failed to load statistics';
      } finally {
        statsLoading.value = false;
      }
    };
    
    const refreshStats = () => {
      fetchStats();
    };
    
    const fetchAdminUsers = async () => {
      if (!userProfileStore.isAdmin) return;
      
      try {
        const getAdminUsersFunc = httpsCallable(functions, 'getAdminUsers');
        const result = await getAdminUsersFunc({});
        
        // Handle the response
        adminUsers.value = (result.data as any).adminUsers || [];
      } catch (err: any) {
        console.error('Error fetching admin users:', err);
      }
    };
    
    const fetchTicketDetails = async (ticketId: string) => {
      if (!userProfileStore.isAdmin || !ticketId) return;
      
      detailsLoading.value = true;
      
      try {
        const getTicketDetailsFunc = httpsCallable(functions, 'getTicketDetails');
        const result = await getTicketDetailsFunc({ ticketId });
        
        // Handle the response
        const response = result.data as any;
        selectedTicket.value = response.ticket || null;
        ticketResponses.value = response.responses || [];
        
        // Set current values for editing
        if (selectedTicket.value) {
          ticketStatus.value = selectedTicket.value.status;
          ticketPriority.value = selectedTicket.value.priority;
          ticketAssignee.value = selectedTicket.value.assignedTo || '';
          ticketResolution.value = selectedTicket.value.resolution || '';
        }
      } catch (err: any) {
        console.error('Error fetching ticket details:', err);
        error.value = err.message || 'Failed to load ticket details';
      } finally {
        detailsLoading.value = false;
      }
    };
    
    // Action functions
    const viewTicket = (ticket: any) => {
      fetchTicketDetails(ticket.id);
    };
    
    const closeTicketDetails = () => {
      selectedTicket.value = null;
      ticketResponses.value = [];
      newResponseContent.value = '';
      newResponseType.value = 'public';
    };
    
    const resetFilters = () => {
      Object.keys(filters).forEach(key => {
        filters[key as keyof typeof filters] = key === 'sortBy' ? 'date' : '';
      });
      fetchTickets();
    };
    
    const addResponse = async () => {
      if (
        !userProfileStore.isAdmin || 
        !selectedTicket.value || 
        !newResponseContent.value.trim()
      ) return;
      
      responseLoading.value = true;
      
      try {
        const addTicketResponseFunc = httpsCallable(functions, 'addTicketResponse');
        await addTicketResponseFunc({
          ticketId: selectedTicket.value.id,
          content: newResponseContent.value.trim(),
          isInternal: newResponseType.value === 'internal'
        });
        
        // Refresh ticket details
        await fetchTicketDetails(selectedTicket.value.id);
        
        // Clear input
        newResponseContent.value = '';
      } catch (err: any) {
        console.error('Error adding response:', err);
        error.value = err.message || 'Failed to add response';
      } finally {
        responseLoading.value = false;
      }
    };
    
    const updateTicketStatusHandler = async () => {
      if (!userProfileStore.isAdmin || !selectedTicket.value) return;
      
      updateLoading.value = true;
      
      try {
        const updateTicketStatusFunc = httpsCallable(functions, 'updateTicketStatus');
        await updateTicketStatusFunc({
          ticketId: selectedTicket.value.id,
          status: ticketStatus.value
        });
        
        // Update the local selected ticket
        if (selectedTicket.value) {
          selectedTicket.value.status = ticketStatus.value;
        }
        
        // Refresh stats
        fetchStats();
      } catch (err: any) {
        console.error('Error updating ticket status:', err);
        error.value = err.message || 'Failed to update status';
        
        // Revert to original value
        ticketStatus.value = selectedTicket.value.status;
      } finally {
        updateLoading.value = false;
      }
    };
    
    const updateTicketPriorityHandler = async () => {
      if (!userProfileStore.isAdmin || !selectedTicket.value) return;
      
      updateLoading.value = true;
      
      try {
        const updateTicketStatusFunc = httpsCallable(functions, 'updateTicketStatus');
        await updateTicketStatusFunc({
          ticketId: selectedTicket.value.id,
          priority: ticketPriority.value
        });
        
        // Update the local selected ticket
        if (selectedTicket.value) {
          selectedTicket.value.priority = ticketPriority.value;
        }
        
        // Refresh stats
        fetchStats();
      } catch (err: any) {
        console.error('Error updating ticket priority:', err);
        error.value = err.message || 'Failed to update priority';
        
        // Revert to original value
        ticketPriority.value = selectedTicket.value.priority;
      } finally {
        updateLoading.value = false;
      }
    };
    
    const updateTicketAssigneeHandler = async () => {
      if (!userProfileStore.isAdmin || !selectedTicket.value) return;
      
      updateLoading.value = true;
      
      try {
        const updateTicketStatusFunc = httpsCallable(functions, 'updateTicketStatus');
        await updateTicketStatusFunc({
          ticketId: selectedTicket.value.id,
          assignedTo: ticketAssignee.value || null
        });
        
        // Update the local selected ticket
        if (selectedTicket.value) {
          selectedTicket.value.assignedTo = ticketAssignee.value;
        }
      } catch (err: any) {
        console.error('Error updating ticket assignee:', err);
        error.value = err.message || 'Failed to update assignee';
        
        // Revert to original value
        ticketAssignee.value = selectedTicket.value.assignedTo || '';
      } finally {
        updateLoading.value = false;
      }
    };
    
    const updateResolution = async () => {
      if (!userProfileStore.isAdmin || !selectedTicket.value) return;
      
      updateLoading.value = true;
      
      try {
        const updateTicketStatusFunc = httpsCallable(functions, 'updateTicketStatus');
        await updateTicketStatusFunc({
          ticketId: selectedTicket.value.id,
          resolution: ticketResolution.value
        });
        
        // Update the local selected ticket
        if (selectedTicket.value) {
          selectedTicket.value.resolution = ticketResolution.value;
        }
      } catch (err: any) {
        console.error('Error updating resolution:', err);
        error.value = err.message || 'Failed to update resolution';
      } finally {
        updateLoading.value = false;
      }
    };
    
    return {
      userProfileStore,
      tickets,
      loading,
      error,
      filters,
      hasMoreTickets,
      stats,
      statsLoading,
      statsError,
      adminUsers,
      selectedTicket,
      ticketResponses,
      ticketStatus,
      ticketPriority,
      ticketAssignee,
      ticketResolution,
      newResponseContent,
      newResponseType,
      responseLoading,
      updateLoading,
      formatDate,
      formatResponseTime,
      formatStatus,
      formatCategory,
      formatSubscriptionTier,
      formatRole,
      fetchTickets,
      loadMoreTickets,
      refreshStats,
      viewTicket,
      closeTicketDetails,
      resetFilters,
      addResponse,
      updateTicketStatusHandler,
      updateTicketPriorityHandler,
      updateTicketAssigneeHandler,
      updateResolution
    };
  }
});
</script>

<style scoped>
.admin-helpdesk {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
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

.dashboard {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.stats-panel, .filter-panel {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.refresh-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-btn:hover {
  background-color: #e9e9e9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.stat-card {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.filter-group {
  margin-bottom: 15px;
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.filter-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.reset-btn:hover {
  background-color: #e6e6e6;
}

.tickets-container {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tickets-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.tickets-table th, 
.tickets-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.tickets-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.tickets-table tr:hover {
  background-color: #f9f9f9;
}

.high-priority {
  background-color: #fff9f0;
}

.critical-priority {
  background-color: #fff0f0;
}

.status-badge, .priority-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-open {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.status-in_progress {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.status-resolved {
  background-color: #f3e5f5;
  color: #4a148c;
}

.status-closed {
  background-color: #eeeeee;
  color: #424242;
}

.priority-low {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.priority-medium {
  background-color: #fff3e0;
  color: #e65100;
}

.priority-high {
  background-color: #ffebee;
  color: #b71c1c;
}

.priority-critical {
  background-color: #b71c1c;
  color: white;
}

.view-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.view-btn:hover {
  background-color: #1976d2;
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

.ticket-detail-modal {
  padding: 0;
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

.ticket-details {
  padding: 20px;
}

.ticket-meta {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.ticket-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.info-group {
  margin-bottom: 10px;
}

.info-group label {
  display: block;
  font-weight: bold;
  color: #666;
  margin-bottom: 5px;
  font-size: 12px;
}

.info-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.ticket-description {
  margin-bottom: 20px;
}

.description-content {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
  white-space: pre-line;
}

.ticket-responses {
  margin-bottom: 20px;
}

.response-item {
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #ddd;
}

.admin-response {
  background-color: #e3f2fd;
  border-left-color: #2196F3;
}

.user-response {
  background-color: #f5f5f5;
  border-left-color: #9e9e9e;
}

.internal-note {
  background-color: #fff8e1;
  border-left-color: #ffc107;
  border-style: dashed;
}

.response-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.response-author {
  font-weight: bold;
}

.response-role {
  font-weight: normal;
  color: #666;
  font-size: 0.9em;
}

.response-date {
  color: #666;
  font-size: 0.9em;
}

.internal-badge {
  display: inline-block;
  margin-left: 5px;
  padding: 2px 6px;
  background-color: #ffc107;
  color: #000;
  border-radius: 12px;
  font-size: 11px;
}

.response-content {
  white-space: pre-line;
}

.new-response {
  margin-bottom: 20px;
}

.response-type-toggle {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.response-textarea, .resolution-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 10px;
}

.response-actions {
  display: flex;
  justify-content: flex-end;
}

.submit-response-btn, .update-resolution-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-response-btn:hover, .update-resolution-btn:hover {
  background-color: #45a049;
}

.submit-response-btn:disabled, .update-resolution-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.resolution-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

@media (max-width: 900px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .ticket-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .ticket-info-grid {
    grid-template-columns: 1fr;
  }
  
  .tickets-table {
    font-size: 12px;
  }
  
  .tickets-table th, 
  .tickets-table td {
    padding: 8px;
  }
}
</style>