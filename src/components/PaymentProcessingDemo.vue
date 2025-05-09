<template>
  <div class="payment-processing-demo">
    <h2>Payment Processing Integration</h2>
    
    <div v-if="!userProfileStore.isAdmin" class="access-denied">
      <p>You don't have permission to access this section.</p>
    </div>
    
    <div v-else>
      <div class="info-panel">
        <h3>Payment Gateway Integration</h3>
        <p>
          This demo showcases the external payment processing integration built into the system.
          All payment operations are securely handled via Cloud Functions, with no sensitive data exposed to the client.
        </p>
        <p>
          <strong>Note:</strong> In a production environment, we would use the actual payment gateway APIs, 
          but this demo simulates the integration with mock external providers.
        </p>
      </div>
      
      <div class="payment-stats-panel">
        <h3>Payment Statistics</h3>
        
        <div v-if="statsLoading" class="loading">
          Loading payment statistics...
        </div>
        
        <div v-else-if="statsError" class="error-message">
          {{ statsError }}
        </div>
        
        <div v-else class="stats-grid">
          <div class="stat-card">
            <h4>Total Revenue</h4>
            <div class="stat-value">${{ formatAmount(stats.totalRevenue || 0) }}</div>
          </div>
          
          <div class="stat-card">
            <h4>Recent Revenue (30d)</h4>
            <div class="stat-value">${{ formatAmount(stats.recentRevenue || 0) }}</div>
          </div>
          
          <div class="stat-card">
            <h4>Total Transactions</h4>
            <div class="stat-value">{{ stats.totalTransactions || 0 }}</div>
          </div>
          
          <div class="stat-card">
            <h4>Total Refunds</h4>
            <div class="stat-value">${{ formatAmount(stats.totalRefunds || 0) }}</div>
          </div>
        </div>
        
        <div v-if="stats.statusCounts" class="status-distribution">
          <h4>Payment Status Distribution</h4>
          <div class="status-bars">
            <div 
              v-for="(count, status) in stats.statusCounts" 
              :key="status"
              class="status-bar-container"
            >
              <div 
                class="status-bar" 
                :style="{ width: calculateBarWidth(count, stats.totalTransactions) }"
                :class="`status-${status}`"
              ></div>
              <div class="status-label">
                {{ formatStatus(status) }} ({{ count }})
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="payment-tables">
        <div class="payment-demo-panel">
          <h3>Process Payment (Demo)</h3>
          
          <form @submit.prevent="processPayment" class="payment-form">
            <div class="form-group">
              <label for="amount">Amount ($)</label>
              <input 
                type="number" 
                id="amount" 
                v-model="paymentForm.amount"
                min="1"
                step="0.01"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="currency">Currency</label>
              <select id="currency" v-model="paymentForm.currency" required>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="description">Description</label>
              <input 
                type="text" 
                id="description" 
                v-model="paymentForm.description"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="provider">Payment Provider</label>
              <select id="provider" v-model="paymentForm.provider" required>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="payment-method">Payment Method ID (Demo)</label>
              <input 
                type="text" 
                id="payment-method" 
                v-model="paymentForm.paymentMethodId"
                placeholder="pm_card_visa"
                required
              >
              <div class="helper-text">
                Use <code>pm_card_visa</code> for Stripe or <code>PAYID-123456</code> for PayPal
              </div>
            </div>
            
            <button 
              type="submit" 
              class="process-btn"
              :disabled="paymentLoading"
            >
              <span v-if="paymentLoading">Processing...</span>
              <span v-else>Process Payment</span>
            </button>
          </form>
          
          <div v-if="paymentResult" class="payment-result">
            <div v-if="paymentResult.success" class="success-message">
              <div class="success-icon">✓</div>
              <h4>Payment Successful</h4>
              <div class="payment-details">
                <div>Payment ID: {{ paymentResult.paymentId }}</div>
                <div>Status: {{ paymentResult.status }}</div>
              </div>
            </div>
            
            <div v-else class="error-message">
              <h4>Payment Failed</h4>
              <div>{{ paymentResult.error }}</div>
            </div>
          </div>
        </div>
        
        <div class="recent-payments-panel">
          <h3>Recent Payments</h3>
          
          <div v-if="loading" class="loading">
            Loading payments...
          </div>
          
          <div v-else-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div v-else-if="payments.length === 0" class="empty-state">
            No payments found.
          </div>
          
          <table v-else class="payments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="payment in payments" 
                :key="payment.id"
                :class="{
                  'status-failed': payment.status === 'failed',
                  'status-refunded': payment.status === 'refunded'
                }"
              >
                <td>{{ payment.id.substring(0, 8) }}...</td>
                <td>{{ formatCurrency(payment.amount, payment.currency) }}</td>
                <td>
                  <span :class="`status-badge status-${payment.status}`">
                    {{ formatStatus(payment.status) }}
                  </span>
                </td>
                <td>{{ formatProvider(payment.provider) }}</td>
                <td>{{ formatDate(payment.createdAt) }}</td>
                <td>
                  <button 
                    v-if="canRefund(payment)" 
                    @click="refundPayment(payment)"
                    class="refund-btn"
                    :disabled="refundLoading === payment.id"
                  >
                    <span v-if="refundLoading === payment.id">Refunding...</span>
                    <span v-else>Refund</span>
                  </button>
                  <button 
                    v-else
                    @click="viewPaymentDetails(payment)"
                    class="view-btn"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="payments.length > 0 && hasMorePayments" class="load-more">
            <button 
              @click="loadMorePayments" 
              :disabled="loading"
              class="load-more-btn"
            >
              Load More
            </button>
          </div>
        </div>
      </div>
      
      <!-- Payment Details Modal -->
      <div v-if="selectedPayment" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Payment Details</h3>
            <button @click="closePaymentDetails" class="close-btn">&times;</button>
          </div>
          
          <div class="payment-details">
            <div class="payment-info-grid">
              <div class="info-group">
                <label>Payment ID:</label>
                <span>{{ selectedPayment.id }}</span>
              </div>
              
              <div class="info-group">
                <label>Amount:</label>
                <span>{{ formatCurrency(selectedPayment.amount, selectedPayment.currency) }}</span>
              </div>
              
              <div class="info-group">
                <label>Status:</label>
                <span :class="`status-badge status-${selectedPayment.status}`">
                  {{ formatStatus(selectedPayment.status) }}
                </span>
              </div>
              
              <div class="info-group">
                <label>Provider:</label>
                <span>{{ formatProvider(selectedPayment.provider) }}</span>
              </div>
              
              <div class="info-group">
                <label>Transaction ID:</label>
                <span>{{ selectedPayment.providerTransactionId || 'N/A' }}</span>
              </div>
              
              <div class="info-group">
                <label>Created:</label>
                <span>{{ formatDate(selectedPayment.createdAt, true) }}</span>
              </div>
              
              <div class="info-group">
                <label>Method:</label>
                <span>{{ formatMethod(selectedPayment.method) }}</span>
              </div>
              
              <div class="info-group">
                <label>Description:</label>
                <span>{{ selectedPayment.description }}</span>
              </div>
              
              <div v-if="selectedPayment.refundAmount" class="info-group">
                <label>Refund Amount:</label>
                <span>{{ formatCurrency(selectedPayment.refundAmount, selectedPayment.currency) }}</span>
              </div>
              
              <div v-if="selectedPayment.refundedAt" class="info-group">
                <label>Refunded At:</label>
                <span>{{ formatDate(selectedPayment.refundedAt, true) }}</span>
              </div>
              
              <div v-if="selectedPayment.error" class="info-group full-width">
                <label>Error:</label>
                <span class="error-text">{{ selectedPayment.error }}</span>
              </div>
            </div>
            
            <div v-if="selectedPayment.metadata" class="metadata-section">
              <h4>Metadata</h4>
              <pre class="metadata-json">{{ formatJson(selectedPayment.metadata) }}</pre>
            </div>
            
            <div v-if="canRefund(selectedPayment)" class="refund-section">
              <h4>Refund Payment</h4>
              <form @submit.prevent="refundSelectedPayment" class="refund-form">
                <div class="form-group">
                  <label for="refund-amount">Amount to Refund</label>
                  <input 
                    type="number" 
                    id="refund-amount" 
                    v-model="refundForm.amount"
                    :max="selectedPayment.amount"
                    min="0.01"
                    step="0.01"
                  >
                  <div class="helper-text">
                    Leave blank for full refund ({{ formatCurrency(selectedPayment.amount, selectedPayment.currency) }})
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="refund-reason">Reason</label>
                  <input 
                    type="text" 
                    id="refund-reason" 
                    v-model="refundForm.reason"
                    placeholder="Reason for refund"
                  >
                </div>
                
                <button 
                  type="submit" 
                  class="refund-btn wide-btn"
                  :disabled="refundLoading === selectedPayment.id"
                >
                  <span v-if="refundLoading === selectedPayment.id">Processing Refund...</span>
                  <span v-else>Process Refund</span>
                </button>
              </form>
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
  name: 'PaymentProcessingDemo',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    
    // Payments state
    const payments = ref<any[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const hasMorePayments = ref(false);
    const lastPaymentId = ref<string | null>(null);
    
    // Stats state
    const stats = ref<any>({});
    const statsLoading = ref(false);
    const statsError = ref<string | null>(null);
    
    // Payment form
    const paymentForm = reactive({
      amount: 19.99,
      currency: 'usd',
      description: 'Subscription payment',
      provider: 'stripe',
      paymentMethodId: 'pm_card_visa'
    });
    const paymentLoading = ref(false);
    const paymentResult = ref<any | null>(null);
    
    // Refund state
    const refundLoading = ref<string | null>(null);
    const refundForm = reactive({
      amount: 0,
      reason: ''
    });
    
    // Selected payment details
    const selectedPayment = ref<any | null>(null);
    
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
    
    const formatStatus = (status: string) => {
      const statusMap: Record<string, string> = {
        'pending': 'Pending',
        'processing': 'Processing',
        'completed': 'Completed',
        'failed': 'Failed',
        'refunded': 'Refunded',
        'partially_refunded': 'Partially Refunded',
        'disputed': 'Disputed',
        'canceled': 'Canceled'
      };
      
      return statusMap[status] || status;
    };
    
    const formatProvider = (provider: string) => {
      const providerMap: Record<string, string> = {
        'stripe': 'Stripe',
        'paypal': 'PayPal',
        'authorize_net': 'Authorize.net',
        'square': 'Square'
      };
      
      return providerMap[provider] || provider;
    };
    
    const formatMethod = (method: string) => {
      if (!method) return 'N/A';
      
      const methodMap: Record<string, string> = {
        'credit_card': 'Credit Card',
        'debit_card': 'Debit Card',
        'bank_transfer': 'Bank Transfer',
        'paypal': 'PayPal',
        'apple_pay': 'Apple Pay',
        'google_pay': 'Google Pay',
        'other': 'Other'
      };
      
      return methodMap[method] || method;
    };
    
    const formatCurrency = (amount: number, currency: string) => {
      const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'USD'
      });
      
      return currencyFormatter.format(amount);
    };
    
    const formatAmount = (amount: number) => {
      return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };
    
    const formatJson = (obj: any) => {
      try {
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return String(obj);
      }
    };
    
    const calculateBarWidth = (count: number, total: number) => {
      if (!total || total === 0) return '0%';
      const percentage = (count / total) * 100;
      return `${Math.max(percentage, 2)}%`; // Min 2% for visibility
    };
    
    // Load payments and stats
    onMounted(async () => {
      if (userProfileStore.isAdmin) {
        await Promise.all([
          fetchPayments(),
          fetchStats()
        ]);
      }
    });
    
    // Fetch functions
    const fetchPayments = async () => {
      if (!userProfileStore.isAdmin) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        // Reset pagination
        lastPaymentId.value = null;
        
        const getAdminPaymentsFunc = httpsCallable(functions, 'getAdminPayments');
        const result = await getAdminPaymentsFunc({
          limit: 10
        });
        
        // Handle the response
        const response = result.data as any;
        payments.value = response.payments || [];
        hasMorePayments.value = response.hasMore || false;
        
        // Set the last ID for pagination
        if (payments.value.length > 0) {
          lastPaymentId.value = payments.value[payments.value.length - 1].id;
        }
      } catch (err: any) {
        console.error('Error fetching payments:', err);
        error.value = err.message || 'Failed to load payments';
      } finally {
        loading.value = false;
      }
    };
    
    const loadMorePayments = async () => {
      if (!userProfileStore.isAdmin || !lastPaymentId.value) return;
      
      loading.value = true;
      
      try {
        const getAdminPaymentsFunc = httpsCallable(functions, 'getAdminPayments');
        const result = await getAdminPaymentsFunc({
          limit: 10,
          startAfter: lastPaymentId.value
        });
        
        // Handle the response
        const response = result.data as any;
        const newPayments = response.payments || [];
        
        // Add new payments to the existing list
        payments.value = [...payments.value, ...newPayments];
        hasMorePayments.value = response.hasMore || false;
        
        // Update the last ID for pagination
        if (newPayments.length > 0) {
          lastPaymentId.value = newPayments[newPayments.length - 1].id;
        } else {
          // No more payments
          lastPaymentId.value = null;
        }
      } catch (err: any) {
        console.error('Error loading more payments:', err);
        error.value = err.message || 'Failed to load more payments';
      } finally {
        loading.value = false;
      }
    };
    
    const fetchStats = async () => {
      if (!userProfileStore.isAdmin) return;
      
      statsLoading.value = true;
      statsError.value = null;
      
      try {
        const getPaymentStatsFunc = httpsCallable(functions, 'getPaymentStats');
        const result = await getPaymentStatsFunc({});
        
        // Handle the response
        stats.value = result.data as any;
      } catch (err: any) {
        console.error('Error fetching payment stats:', err);
        statsError.value = err.message || 'Failed to load payment statistics';
      } finally {
        statsLoading.value = false;
      }
    };
    
    // Payment processing
    const processPayment = async () => {
      if (!userProfileStore.isAdmin) return;
      
      paymentLoading.value = true;
      paymentResult.value = null;
      
      try {
        const processPaymentFunc = httpsCallable(functions, 'processPayment');
        const result = await processPaymentFunc({
          amount: parseFloat(paymentForm.amount.toString()),
          currency: paymentForm.currency,
          description: paymentForm.description,
          provider: paymentForm.provider,
          paymentMethodId: paymentForm.paymentMethodId,
          metadata: {
            demo: true,
            userAgent: navigator.userAgent
          }
        });
        
        // Handle the response
        paymentResult.value = result.data;
        
        // Refresh payments list on success
        if (paymentResult.value.success) {
          await fetchPayments();
          await fetchStats();
        }
      } catch (err: any) {
        console.error('Error processing payment:', err);
        paymentResult.value = {
          success: false,
          error: err.message || 'An error occurred while processing the payment'
        };
      } finally {
        paymentLoading.value = false;
      }
    };
    
    // Payment details
    const viewPaymentDetails = (payment: any) => {
      selectedPayment.value = payment;
      refundForm.amount = 0;
      refundForm.reason = '';
    };
    
    const closePaymentDetails = () => {
      selectedPayment.value = null;
    };
    
    // Refund helpers
    const canRefund = (payment: any) => {
      return payment.status === 'completed' || payment.status === 'processing';
    };
    
    const refundPayment = (payment: any) => {
      selectedPayment.value = payment;
      refundForm.amount = 0;
      refundForm.reason = '';
    };
    
    const refundSelectedPayment = async () => {
      if (!userProfileStore.isAdmin || !selectedPayment.value) return;
      
      refundLoading.value = selectedPayment.value.id;
      
      try {
        const refundPaymentFunc = httpsCallable(functions, 'refundPayment');
        const result = await refundPaymentFunc({
          paymentId: selectedPayment.value.id,
          amount: refundForm.amount || undefined, // Send undefined for full refund
          reason: refundForm.reason || 'Customer requested refund'
        });
        
        // Handle the response
        const response = result.data as any;
        
        if (response.success) {
          // Refresh payments list and stats
          await fetchPayments();
          await fetchStats();
          
          // Close the details modal
          selectedPayment.value = null;
        } else {
          error.value = 'Refund failed';
        }
      } catch (err: any) {
        console.error('Error refunding payment:', err);
        error.value = err.message || 'Failed to process refund';
      } finally {
        refundLoading.value = null;
      }
    };
    
    return {
      userProfileStore,
      payments,
      loading,
      error,
      hasMorePayments,
      stats,
      statsLoading,
      statsError,
      paymentForm,
      paymentLoading,
      paymentResult,
      refundLoading,
      refundForm,
      selectedPayment,
      formatDate,
      formatStatus,
      formatProvider,
      formatMethod,
      formatCurrency,
      formatAmount,
      formatJson,
      calculateBarWidth,
      fetchPayments,
      loadMorePayments,
      processPayment,
      viewPaymentDetails,
      closePaymentDetails,
      canRefund,
      refundPayment,
      refundSelectedPayment
    };
  }
});
</script>

<style scoped>
.payment-processing-demo {
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

.info-panel {
  background-color: #e3f2fd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-stats-panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
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

.status-distribution {
  margin-top: 20px;
}

.status-bars {
  margin-top: 10px;
}

.status-bar-container {
  margin-bottom: 8px;
}

.status-bar {
  height: 20px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.status-completed {
  background-color: #4CAF50;
}

.status-processing {
  background-color: #2196F3;
}

.status-failed {
  background-color: #F44336;
}

.status-refunded, .status-partially_refunded {
  background-color: #FF9800;
}

.status-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.payment-tables {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

.payment-demo-panel, .recent-payments-panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-form {
  margin-top: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.helper-text {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.process-btn, .refund-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.process-btn:hover, .refund-btn:hover {
  background-color: #45a049;
}

.process-btn:disabled, .refund-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.wide-btn {
  width: 100%;
}

.payment-result {
  margin-top: 20px;
  padding: 15px;
  border-radius: 6px;
}

.success-message {
  background-color: #e8f5e9;
  text-align: center;
}

.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #4CAF50;
  color: white;
  font-size: 20px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.payment-details {
  margin-top: 10px;
  font-size: 14px;
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.payments-table th, 
.payments-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.payments-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.payments-table tr:hover {
  background-color: #f9f9f9;
}

.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-pending, .status-processing {
  background-color: #e3f2fd;
  color: #0d47a1;
}

.status-completed {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.status-failed {
  background-color: #ffebee;
  color: #b71c1c;
}

.status-refunded, .status-partially_refunded {
  background-color: #fff3e0;
  color: #e65100;
}

tr.status-failed {
  background-color: #ffebee;
}

tr.status-refunded {
  background-color: #fff8e1;
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

.refund-btn {
  background-color: #FF9800;
}

.refund-btn:hover {
  background-color: #F57C00;
}

.loading, .empty-state {
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

.payment-details {
  padding: 20px;
}

.payment-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.info-group.full-width {
  grid-column: span 2;
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

.metadata-section, .refund-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.metadata-json {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.refund-form {
  margin-top: 15px;
}

@media (max-width: 1000px) {
  .payment-tables {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .payment-info-grid {
    grid-template-columns: 1fr;
  }
  
  .info-group.full-width {
    grid-column: span 1;
  }
  
  .payments-table {
    font-size: 12px;
  }
  
  .payments-table th, 
  .payments-table td {
    padding: 8px;
  }
}
</style>