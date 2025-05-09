<template>
  <div class="support-ticket-form">
    <h2>Contact Support</h2>
    
    <div v-if="success" class="success-message">
      <div class="success-icon">✓</div>
      <h3>Ticket Submitted</h3>
      <p>Your support ticket has been submitted successfully. Our team will respond as soon as possible.</p>
      <p class="ticket-id">Ticket ID: {{ ticketId }}</p>
      <button @click="resetForm" class="new-ticket-btn">Create Another Ticket</button>
    </div>
    
    <form v-else @submit.prevent="submitTicket">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div class="form-group">
        <label for="subject">Subject *</label>
        <input 
          type="text" 
          id="subject" 
          v-model="ticketForm.subject"
          placeholder="Brief summary of your issue"
          required
          maxlength="100"
        >
        <div class="char-count">{{ ticketForm.subject.length }}/100</div>
      </div>
      
      <div class="form-group">
        <label for="category">Category *</label>
        <select id="category" v-model="ticketForm.category" required>
          <option value="">Select a category</option>
          <option value="account">Account Issues</option>
          <option value="billing">Billing & Subscription</option>
          <option value="technical">Technical Support</option>
          <option value="feature">Feature Request</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="description">Description *</label>
        <textarea 
          id="description" 
          v-model="ticketForm.description"
          placeholder="Please provide details about your issue or request"
          required
          rows="6"
        ></textarea>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancelTicket" class="cancel-btn">Cancel</button>
        <button 
          type="submit" 
          class="submit-btn"
          :disabled="loading || !isFormValid"
        >
          <span v-if="loading">Submitting...</span>
          <span v-else>Submit Ticket</span>
        </button>
      </div>
    </form>
    
    <div v-if="userTickets.length > 0" class="user-tickets">
      <h3>Your Recent Tickets</h3>
      
      <div v-if="ticketsLoading" class="loading">
        Loading your tickets...
      </div>
      
      <table v-else class="tickets-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ticket in userTickets" :key="ticket.id">
            <td>{{ ticket.subject }}</td>
            <td>
              <span :class="`status-badge status-${ticket.status}`">
                {{ formatStatus(ticket.status) }}
              </span>
            </td>
            <td>{{ formatDate(ticket.createdAt) }}</td>
            <td>
              <button @click="viewTicket(ticket)" class="view-btn">View</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="hasMoreTickets" class="load-more">
        <button @click="loadMoreTickets" :disabled="ticketsLoading" class="load-more-btn">
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
            <div class="info-group">
              <label>Status:</label>
              <span :class="`status-badge status-${selectedTicket.status}`">
                {{ formatStatus(selectedTicket.status) }}
              </span>
            </div>
            
            <div class="info-group">
              <label>Category:</label>
              <span>{{ formatCategory(selectedTicket.category) }}</span>
            </div>
            
            <div class="info-group">
              <label>Created:</label>
              <span>{{ formatDate(selectedTicket.createdAt) }}</span>
            </div>
            
            <div class="info-group">
              <label>Last Updated:</label>
              <span>{{ formatDate(selectedTicket.updatedAt) }}</span>
            </div>
          </div>
          
          <div class="ticket-description">
            <h4>Description</h4>
            <div class="description-content">
              {{ selectedTicket.description }}
            </div>
          </div>
          
          <div v-if="selectedTicket.resolution" class="ticket-resolution">
            <h4>Resolution</h4>
            <div class="resolution-content">
              {{ selectedTicket.resolution }}
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
                {'user-response': response.userRole !== 'admin'}
              ]"
            >
              <div class="response-header">
                <span class="response-author">
                  {{ response.userName }} 
                  <span class="response-role">({{ formatRole(response.userRole) }})</span>
                </span>
                <span class="response-date">{{ formatDate(response.createdAt) }}</span>
              </div>
              <div class="response-content">{{ response.content }}</div>
            </div>
          </div>
          
          <div v-if="selectedTicket.status !== 'closed'" class="new-response">
            <h4>Add Response</h4>
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
                <span v-else>Send Response</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, computed } from 'vue';
import { useUserProfileStore } from '@/stores/userProfile';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);
const functions = getFunctions(firebaseApp);

export default defineComponent({
  name: 'SupportTicketForm',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    
    // Form state
    const ticketForm = reactive({
      subject: '',
      category: '',
      description: ''
    });
    
    const loading = ref(false);
    const error = ref<string | null>(null);
    const success = ref(false);
    const ticketId = ref('');
    
    // User tickets
    const userTickets = ref<any[]>([]);
    const ticketsLoading = ref(false);
    const hasMoreTickets = ref(false);
    const lastTicketId = ref<string | null>(null);
    
    // Selected ticket details
    const selectedTicket = ref<any | null>(null);
    const ticketResponses = ref<any[]>([]);
    const newResponseContent = ref('');
    const responseLoading = ref(false);
    
    // Load user's tickets on mount
    onMounted(() => {
      if (userProfileStore.currentUser) {
        fetchUserTickets();
      }
    });
    
    // Form validation
    const isFormValid = computed(() => {
      return (
        ticketForm.subject.trim().length > 0 &&
        ticketForm.category.trim().length > 0 &&
        ticketForm.description.trim().length > 0
      );
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
        'account': 'Account Issues',
        'billing': 'Billing & Subscription',
        'technical': 'Technical Support',
        'feature': 'Feature Request',
        'other': 'Other'
      };
      
      return categoryMap[category] || category;
    };
    
    const formatRole = (role: string) => {
      const roleMap: Record<string, string> = {
        'admin': 'Support Team',
        'provider': 'Provider',
        'nurse': 'Nurse',
        'physician': 'Physician',
        'receptionist': 'Receptionist',
        'viewer': 'User'
      };
      
      return roleMap[role] || role;
    };
    
    // Form actions
    const submitTicket = async () => {
      if (!userProfileStore.currentUser) {
        error.value = 'You must be logged in to submit a support ticket';
        return;
      }
      
      loading.value = true;
      error.value = null;
      
      try {
        const createTicketFunc = httpsCallable(functions, 'createSupportTicket');
        const result = await createTicketFunc({
          subject: ticketForm.subject.trim(),
          description: ticketForm.description.trim(),
          category: ticketForm.category
        });
        
        // Handle the response
        const response = result.data as any;
        
        if (response.success) {
          success.value = true;
          ticketId.value = response.ticketId;
          
          // Refresh user tickets
          await fetchUserTickets();
        } else {
          error.value = 'Failed to submit ticket';
        }
      } catch (err: any) {
        console.error('Error submitting ticket:', err);
        error.value = err.message || 'An error occurred while submitting your ticket';
      } finally {
        loading.value = false;
      }
    };
    
    const resetForm = () => {
      // Reset the form
      ticketForm.subject = '';
      ticketForm.category = '';
      ticketForm.description = '';
      success.value = false;
      ticketId.value = '';
      error.value = null;
    };
    
    const cancelTicket = () => {
      // Just reset the form
      resetForm();
    };
    
    // Ticket management functions
    const fetchUserTickets = async () => {
      if (!userProfileStore.currentUser) return;
      
      ticketsLoading.value = true;
      
      try {
        // Reset pagination
        lastTicketId.value = null;
        
        const getUserTicketsFunc = httpsCallable(functions, 'getUserTickets');
        const result = await getUserTicketsFunc({
          limit: 5 // Small limit for the UI
        });
        
        // Handle the response
        const response = result.data as any;
        userTickets.value = response.tickets || [];
        hasMoreTickets.value = response.hasMore || false;
        
        // Set the last ID for pagination
        if (userTickets.value.length > 0) {
          lastTicketId.value = userTickets.value[userTickets.value.length - 1].id;
        }
      } catch (err: any) {
        console.error('Error fetching user tickets:', err);
      } finally {
        ticketsLoading.value = false;
      }
    };
    
    const loadMoreTickets = async () => {
      if (!userProfileStore.currentUser || !lastTicketId.value) return;
      
      ticketsLoading.value = true;
      
      try {
        const getUserTicketsFunc = httpsCallable(functions, 'getUserTickets');
        const result = await getUserTicketsFunc({
          limit: 5,
          startAfter: lastTicketId.value
        });
        
        // Handle the response
        const response = result.data as any;
        const newTickets = response.tickets || [];
        
        // Add new tickets to the existing list
        userTickets.value = [...userTickets.value, ...newTickets];
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
      } finally {
        ticketsLoading.value = false;
      }
    };
    
    const viewTicket = async (ticket: any) => {
      await fetchTicketDetails(ticket.id);
    };
    
    const closeTicketDetails = () => {
      selectedTicket.value = null;
      ticketResponses.value = [];
      newResponseContent.value = '';
    };
    
    const fetchTicketDetails = async (ticketId: string) => {
      if (!userProfileStore.currentUser || !ticketId) return;
      
      responseLoading.value = true;
      
      try {
        const getTicketDetailsFunc = httpsCallable(functions, 'getTicketDetails');
        const result = await getTicketDetailsFunc({ ticketId });
        
        // Handle the response
        const response = result.data as any;
        selectedTicket.value = response.ticket || null;
        ticketResponses.value = response.responses || [];
      } catch (err: any) {
        console.error('Error fetching ticket details:', err);
        error.value = err.message || 'Failed to load ticket details';
      } finally {
        responseLoading.value = false;
      }
    };
    
    const addResponse = async () => {
      if (
        !userProfileStore.currentUser || 
        !selectedTicket.value || 
        !newResponseContent.value.trim()
      ) return;
      
      responseLoading.value = true;
      
      try {
        const addTicketResponseFunc = httpsCallable(functions, 'addTicketResponse');
        await addTicketResponseFunc({
          ticketId: selectedTicket.value.id,
          content: newResponseContent.value.trim()
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
    
    return {
      userProfileStore,
      ticketForm,
      loading,
      error,
      success,
      ticketId,
      userTickets,
      ticketsLoading,
      hasMoreTickets,
      selectedTicket,
      ticketResponses,
      newResponseContent,
      responseLoading,
      isFormValid,
      formatDate,
      formatStatus,
      formatCategory,
      formatRole,
      submitTicket,
      resetForm,
      cancelTicket,
      loadMoreTickets,
      viewTicket,
      closeTicketDetails,
      addResponse
    };
  }
});
</script>

<style scoped>
.support-ticket-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2, h3, h4 {
  margin-top: 0;
  color: #333;
}

.success-message {
  background-color: #e8f5e9;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  margin-bottom: 30px;
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background-color: #4CAF50;
  color: white;
  font-size: 30px;
  border-radius: 50%;
  margin: 0 auto 20px;
}

.ticket-id {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin: 15px 0;
}

.new-ticket-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.new-ticket-btn:hover {
  background-color: #45a049;
}

form {
  background-color: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-family: inherit;
}

textarea {
  resize: vertical;
  min-height: 120px;
}

.char-count {
  position: absolute;
  right: 10px;
  bottom: -20px;
  font-size: 12px;
  color: #777;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.cancel-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.submit-btn:hover {
  background-color: #1976d2;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.user-tickets {
  background-color: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

.status-badge {
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

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
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

.ticket-description, .ticket-resolution {
  margin-bottom: 20px;
}

.description-content, .resolution-content {
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

.response-content {
  white-space: pre-line;
}

.new-response {
  margin-bottom: 20px;
}

.response-textarea {
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

.submit-response-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-response-btn:hover {
  background-color: #45a049;
}

.submit-response-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .ticket-meta {
    grid-template-columns: 1fr;
  }
}
</style>