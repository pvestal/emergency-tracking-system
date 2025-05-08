<template>
  <div class="medical-supply-inventory">
    <h2 class="inventory-title">Medical Supply Inventory</h2>
    
    <div v-if="supplyStore.loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>Loading inventory data...</p>
    </div>
    
    <div v-if="supplyStore.error" class="error-message">
      <p>{{ supplyStore.error }}</p>
    </div>
    
    <!-- Inventory Control Panel -->
    <div class="inventory-controls">
      <div class="search-filter">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search supplies..." 
            @input="handleSearchInput"
          >
          <button class="search-btn">
            <i class="search-icon">🔍</i>
          </button>
        </div>
        
        <div class="filters">
          <div class="filter-group">
            <label>Category:</label>
            <select v-model="currentCategory" @change="applyFilters">
              <option value="all">All Categories</option>
              <option value="medication">Medications</option>
              <option value="disposable">Disposables</option>
              <option value="equipment">Equipment</option>
              <option value="ppe">PPE</option>
              <option value="fluid">Fluids</option>
              <option value="diagnostic">Diagnostics</option>
              <option value="respiratory">Respiratory</option>
              <option value="trauma">Trauma</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Status:</label>
            <select v-model="currentStatus" @change="applyFilters">
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="critical_stock">Critical Stock</option>
              <option value="on_order">On Order</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Location:</label>
            <select v-model="currentLocation" @change="applyFilters">
              <option value="all">All Locations</option>
              <option value="central_supply">Central Supply</option>
              <option value="emergency_dept">Emergency Dept</option>
              <option value="trauma_room">Trauma Room</option>
              <option value="med_surg">Med/Surg</option>
              <option value="icu">ICU</option>
              <option value="operating_room">Operating Room</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button 
          v-if="userProfileStore.canManageInventory" 
          class="primary-btn"
          @click="showAddSupplyModal = true"
        >
          Add New Supply
        </button>
        
        <button 
          v-if="userProfileStore.isAdmin" 
          class="export-btn"
          @click="exportInventory"
        >
          Export Inventory
        </button>
        
        <button 
          class="status-badge low"
          @click="showLowStockOnly"
        >
          Low Stock ({{ lowStockCount }})
        </button>
        
        <button 
          class="status-badge critical"
          @click="showCriticalStockOnly"
        >
          Critical ({{ criticalStockCount }})
        </button>
      </div>
    </div>
    
    <!-- Inventory Table -->
    <div class="inventory-table-container">
      <table class="inventory-table">
        <thead>
          <tr>
            <th @click="sortBy('name')" class="sortable">
              Name
              <span v-if="sortField === 'name'" class="sort-icon">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Description</th>
            <th @click="sortBy('category')" class="sortable">
              Category
              <span v-if="sortField === 'category'" class="sort-icon">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sortBy('currentQuantity')" class="sortable">
              Quantity
              <span v-if="sortField === 'currentQuantity'" class="sort-icon">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Status</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="supply in sortedSupplies" :key="supply.id">
            <td>{{ supply.name }}</td>
            <td class="description-cell">{{ supply.description }}</td>
            <td>{{ formatCategory(supply.category) }}</td>
            <td>{{ supply.currentQuantity }} {{ supply.unit }}</td>
            <td>
              <span class="status-indicator" :class="supply.status">
                {{ formatStatus(supply.status) }}
              </span>
            </td>
            <td>{{ formatLocation(supply.location) }}</td>
            <td class="actions-cell">
              <button @click="viewSupplyDetails(supply)" class="action-btn view-btn">
                View
              </button>
              <button @click="openCheckoutModal(supply)" class="action-btn checkout-btn">
                Check Out
              </button>
              <button v-if="userProfileStore.canManageInventory" @click="openCheckinModal(supply)" class="action-btn checkin-btn">
                Check In
              </button>
            </td>
          </tr>
          <tr v-if="sortedSupplies.length === 0">
            <td colspan="7" class="no-data">
              No supplies found. Try adjusting your filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Supply Details Modal -->
    <div v-if="showDetailsModal && selectedSupply" class="modal">
      <div class="modal-content supply-details-modal">
        <button class="close-btn" @click="showDetailsModal = false">&times;</button>
        <h3>{{ selectedSupply.name }}</h3>
        
        <div class="details-grid">
          <div class="details-section">
            <h4>Basic Information</h4>
            <div class="detail-row">
              <div class="detail-label">Description:</div>
              <div class="detail-value">{{ selectedSupply.description }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Category:</div>
              <div class="detail-value">{{ formatCategory(selectedSupply.category) }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span class="status-indicator" :class="selectedSupply.status">
                  {{ formatStatus(selectedSupply.status) }}
                </span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Location:</div>
              <div class="detail-value">{{ formatLocation(selectedSupply.location) }}</div>
            </div>
          </div>
          
          <div class="details-section">
            <h4>Inventory Information</h4>
            <div class="detail-row">
              <div class="detail-label">Current Quantity:</div>
              <div class="detail-value">{{ selectedSupply.currentQuantity }} {{ selectedSupply.unit }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Minimum Quantity:</div>
              <div class="detail-value">{{ selectedSupply.minimumQuantity }} {{ selectedSupply.unit }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Critical Quantity:</div>
              <div class="detail-value">{{ selectedSupply.criticalQuantity }} {{ selectedSupply.unit }}</div>
            </div>
            <div class="detail-row" v-if="selectedSupply.lastRestockDate">
              <div class="detail-label">Last Restocked:</div>
              <div class="detail-value">{{ formatDate(selectedSupply.lastRestockDate) }}</div>
            </div>
          </div>
          
          <div class="details-section">
            <h4>Product Information</h4>
            <div class="detail-row" v-if="selectedSupply.manufacturer">
              <div class="detail-label">Manufacturer:</div>
              <div class="detail-value">{{ selectedSupply.manufacturer }}</div>
            </div>
            <div class="detail-row" v-if="selectedSupply.modelNumber">
              <div class="detail-label">Model Number:</div>
              <div class="detail-value">{{ selectedSupply.modelNumber }}</div>
            </div>
            <div class="detail-row" v-if="selectedSupply.lotNumber">
              <div class="detail-label">Lot Number:</div>
              <div class="detail-value">{{ selectedSupply.lotNumber }}</div>
            </div>
            <div class="detail-row" v-if="selectedSupply.expirationDate">
              <div class="detail-label">Expiration Date:</div>
              <div class="detail-value">{{ formatDate(selectedSupply.expirationDate) }}</div>
            </div>
            <div class="detail-row" v-if="selectedSupply.unitPrice">
              <div class="detail-label">Unit Price:</div>
              <div class="detail-value">${{ selectedSupply.unitPrice.toFixed(2) }}</div>
            </div>
          </div>
          
          <div class="details-section full-width">
            <h4>Special Requirements</h4>
            <div class="detail-row">
              <div class="detail-label">Controlled Substance:</div>
              <div class="detail-value">{{ selectedSupply.isControlled ? 'Yes' : 'No' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Signature Required:</div>
              <div class="detail-value">{{ selectedSupply.requiredSignature ? 'Yes' : 'No' }}</div>
            </div>
            <div class="detail-row" v-if="selectedSupply.notes">
              <div class="detail-label">Notes:</div>
              <div class="detail-value notes">{{ selectedSupply.notes }}</div>
            </div>
          </div>
        </div>
        
        <div class="details-tabs">
          <div 
            :class="['tab', { active: activeTab === 'transactions' }]" 
            @click="activeTab = 'transactions'"
          >
            Transaction History
          </div>
          <div 
            :class="['tab', { active: activeTab === 'usage' }]" 
            @click="activeTab = 'usage'"
          >
            Usage Analytics
          </div>
        </div>
        
        <div class="tab-content">
          <!-- Transaction History Tab -->
          <div v-if="activeTab === 'transactions'" class="transactions-list">
            <h4>Recent Transactions</h4>
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>User</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="transaction in supplyTransactions" :key="transaction.id">
                  <td>{{ formatDateTime(transaction.timestamp) }}</td>
                  <td>
                    <span class="transaction-type" :class="transaction.transactionType">
                      {{ formatTransactionType(transaction.transactionType) }}
                    </span>
                  </td>
                  <td>{{ transaction.quantity }} {{ selectedSupply.unit }}</td>
                  <td>{{ transaction.userName }}</td>
                  <td>{{ transaction.notes || '-' }}</td>
                </tr>
                <tr v-if="supplyTransactions.length === 0">
                  <td colspan="5" class="no-data">No transaction history found</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Usage Analytics Tab -->
          <div v-if="activeTab === 'usage'" class="usage-analytics">
            <h4>Usage Trends</h4>
            <p class="chart-placeholder">
              Usage chart would be displayed here in a production environment.
              This would show usage patterns over time to help with inventory planning.
            </p>
            
            <div class="usage-stats">
              <div class="stat-card">
                <div class="stat-title">30-Day Usage</div>
                <div class="stat-value">{{ calculateUsage(30) }} {{ selectedSupply.unit }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-title">Weekly Average</div>
                <div class="stat-value">{{ calculateWeeklyAverage() }} {{ selectedSupply.unit }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-title">Projected Depletion</div>
                <div class="stat-value">{{ calculateDepletionDate() }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="openCheckoutModal(selectedSupply)" class="action-btn checkout-btn">
            Check Out
          </button>
          <button v-if="userProfileStore.canManageInventory" @click="openCheckinModal(selectedSupply)" class="action-btn checkin-btn">
            Check In
          </button>
          <button v-if="userProfileStore.canManageInventory" @click="openEditModal(selectedSupply)" class="action-btn edit-btn">
            Edit Supply
          </button>
        </div>
      </div>
    </div>
    
    <!-- Check-Out Modal -->
    <div v-if="showCheckoutModal && selectedSupply" class="modal">
      <div class="modal-content checkout-modal">
        <button class="close-btn" @click="showCheckoutModal = false">&times;</button>
        <h3>Check Out: {{ selectedSupply.name }}</h3>
        
        <form @submit.prevent="submitCheckout">
          <div class="form-group">
            <label for="checkoutQuantity">Quantity (max: {{ selectedSupply.currentQuantity }})</label>
            <input 
              type="number" 
              id="checkoutQuantity" 
              v-model.number="checkoutForm.quantity" 
              :max="selectedSupply.currentQuantity"
              min="1"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="checkoutPatient">For Patient (optional)</label>
            <select id="checkoutPatient" v-model="checkoutForm.patientId">
              <option value="">Select Patient</option>
              <option v-for="patient in activePatients" :key="patient.id" :value="patient.id">
                {{ patient.name }} ({{ patient.id }})
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="checkoutDestination">Destination</label>
            <select id="checkoutDestination" v-model="checkoutForm.destination" required>
              <option value="emergency_dept">Emergency Department</option>
              <option value="trauma_room">Trauma Room</option>
              <option value="med_surg">Med/Surg Floor</option>
              <option value="icu">ICU</option>
              <option value="operating_room">Operating Room</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="checkoutNotes">Notes</label>
            <textarea id="checkoutNotes" v-model="checkoutForm.notes"></textarea>
          </div>
          
          <div v-if="checkoutError" class="form-error">
            {{ checkoutError }}
          </div>
          
          <div v-if="selectedSupply.isControlled || selectedSupply.requiredSignature" class="controlled-warning">
            <p>This item requires authorization. Please enter your credentials.</p>
            <div class="form-group">
              <label for="checkoutPassword">Password Verification</label>
              <input type="password" id="checkoutPassword" v-model="checkoutForm.password" required>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCheckoutModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="isSubmitting">Check Out</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Check-In Modal -->
    <div v-if="showCheckinModal && selectedSupply" class="modal">
      <div class="modal-content checkin-modal">
        <button class="close-btn" @click="showCheckinModal = false">&times;</button>
        <h3>Check In: {{ selectedSupply.name }}</h3>
        
        <form @submit.prevent="submitCheckin">
          <div class="form-group">
            <label for="checkinQuantity">Quantity</label>
            <input 
              type="number" 
              id="checkinQuantity" 
              v-model.number="checkinForm.quantity" 
              min="1"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="checkinSource">Source</label>
            <select id="checkinSource" v-model="checkinForm.source" required>
              <option value="central_supply">Central Supply</option>
              <option value="vendor">Vendor</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="checkinLotNumber">Lot Number (optional)</label>
            <input type="text" id="checkinLotNumber" v-model="checkinForm.lotNumber">
          </div>
          
          <div class="form-group">
            <label for="checkinExpDate">Expiration Date (optional)</label>
            <input type="date" id="checkinExpDate" v-model="checkinForm.expirationDate">
          </div>
          
          <div class="form-group">
            <label for="checkinNotes">Notes</label>
            <textarea id="checkinNotes" v-model="checkinForm.notes"></textarea>
          </div>
          
          <div v-if="checkinError" class="form-error">
            {{ checkinError }}
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCheckinModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="isSubmitting">Check In</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Add Supply Modal -->
    <div v-if="showAddSupplyModal" class="modal">
      <div class="modal-content add-supply-modal">
        <button class="close-btn" @click="showAddSupplyModal = false">&times;</button>
        <h3>Add New Medical Supply</h3>
        
        <form @submit.prevent="submitAddSupply">
          <div class="form-columns">
            <div class="form-column">
              <div class="form-group">
                <label for="supplyName">Name*</label>
                <input type="text" id="supplyName" v-model="newSupply.name" required>
              </div>
              
              <div class="form-group">
                <label for="supplyDescription">Description*</label>
                <textarea id="supplyDescription" v-model="newSupply.description" required></textarea>
              </div>
              
              <div class="form-group">
                <label for="supplyCategory">Category*</label>
                <select id="supplyCategory" v-model="newSupply.category" required>
                  <option value="medication">Medication</option>
                  <option value="disposable">Disposable</option>
                  <option value="equipment">Equipment</option>
                  <option value="ppe">PPE</option>
                  <option value="fluid">Fluid</option>
                  <option value="diagnostic">Diagnostic</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="trauma">Trauma</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="supplyManufacturer">Manufacturer</label>
                <input type="text" id="supplyManufacturer" v-model="newSupply.manufacturer">
              </div>
              
              <div class="form-group">
                <label for="supplyModelNumber">Model Number</label>
                <input type="text" id="supplyModelNumber" v-model="newSupply.modelNumber">
              </div>
            </div>
            
            <div class="form-column">
              <div class="form-group">
                <label for="supplyQuantity">Initial Quantity*</label>
                <input type="number" id="supplyQuantity" v-model.number="newSupply.currentQuantity" min="0" required>
              </div>
              
              <div class="form-group">
                <label for="supplyMinQuantity">Minimum Quantity*</label>
                <input type="number" id="supplyMinQuantity" v-model.number="newSupply.minimumQuantity" min="0" required>
              </div>
              
              <div class="form-group">
                <label for="supplyCriticalQuantity">Critical Quantity*</label>
                <input type="number" id="supplyCriticalQuantity" v-model.number="newSupply.criticalQuantity" min="0" required>
              </div>
              
              <div class="form-group">
                <label for="supplyUnit">Unit*</label>
                <select id="supplyUnit" v-model="newSupply.unit" required>
                  <option value="each">Each</option>
                  <option value="box">Box</option>
                  <option value="case">Case</option>
                  <option value="pack">Pack</option>
                  <option value="bottle">Bottle</option>
                  <option value="vial">Vial</option>
                  <option value="ampule">Ampule</option>
                  <option value="syringe">Syringe</option>
                  <option value="bag">Bag</option>
                  <option value="pair">Pair</option>
                  <option value="roll">Roll</option>
                  <option value="kit">Kit</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="supplyUnitPrice">Unit Price ($)</label>
                <input type="number" id="supplyUnitPrice" v-model.number="newSupply.unitPrice" min="0" step="0.01">
              </div>
            </div>
            
            <div class="form-column">
              <div class="form-group">
                <label for="supplyLocation">Location*</label>
                <select id="supplyLocation" v-model="newSupply.location" required>
                  <option value="central_supply">Central Supply</option>
                  <option value="emergency_dept">Emergency Department</option>
                  <option value="trauma_room">Trauma Room</option>
                  <option value="med_surg">Med/Surg Floor</option>
                  <option value="icu">ICU</option>
                  <option value="operating_room">Operating Room</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="supplyLotNumber">Lot Number</label>
                <input type="text" id="supplyLotNumber" v-model="newSupply.lotNumber">
              </div>
              
              <div class="form-group">
                <label for="supplyExpirationDate">Expiration Date</label>
                <input type="date" id="supplyExpirationDate" v-model="newSupply.expirationDate">
              </div>
              
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="newSupply.isControlled">
                  <span>Controlled Substance</span>
                </label>
              </div>
              
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="newSupply.requiredSignature">
                  <span>Signature Required for Checkout</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-group full-width">
            <label for="supplyTags">Tags (comma-separated)</label>
            <input type="text" id="supplyTags" v-model="tagsInput" placeholder="e.g. sterile, latex-free, procedure">
          </div>
          
          <div class="form-group full-width">
            <label for="supplyNotes">Notes</label>
            <textarea id="supplyNotes" v-model="newSupply.notes"></textarea>
          </div>
          
          <div v-if="addSupplyError" class="form-error">
            {{ addSupplyError }}
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddSupplyModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="isSubmitting">Add Supply</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useMedicalSuppliesStore, type MedicalSupply, type SupplyTransaction, type SupplyCategory, type SupplyStatus, type SupplyLocation, type SupplyUnit, type TransactionType } from '@/stores/medicalSupplies';
import { useUserProfileStore } from '@/stores/userProfile';
import { usePatientStore, type Patient } from '@/stores/patients';
import { Timestamp } from 'firebase/firestore';

export default defineComponent({
  name: 'MedicalSupplyInventory',
  
  setup() {
    const supplyStore = useMedicalSuppliesStore();
    const userProfileStore = useUserProfileStore();
    const patientStore = usePatientStore();
    
    // States for filtering and sorting
    const searchQuery = ref('');
    const currentCategory = ref<SupplyCategory | 'all'>('all');
    const currentStatus = ref<SupplyStatus | 'all'>('all');
    const currentLocation = ref<SupplyLocation | 'all'>('all');
    const sortField = ref('name');
    const sortDirection = ref<'asc' | 'desc'>('asc');
    
    // Modal states
    const showDetailsModal = ref(false);
    const showCheckoutModal = ref(false);
    const showCheckinModal = ref(false);
    const showAddSupplyModal = ref(false);
    const selectedSupply = ref<MedicalSupply | null>(null);
    const activeTab = ref<'transactions' | 'usage'>('transactions');
    
    // Form data
    const checkoutForm = ref({
      quantity: 1,
      patientId: '',
      destination: 'emergency_dept' as SupplyLocation,
      notes: '',
      password: ''
    });
    
    const checkinForm = ref({
      quantity: 1,
      source: 'central_supply' as SupplyLocation,
      lotNumber: '',
      expirationDate: '',
      notes: ''
    });
    
    // Default new supply
    const defaultNewSupply = {
      name: '',
      description: '',
      category: 'disposable' as SupplyCategory,
      manufacturer: '',
      modelNumber: '',
      lotNumber: '',
      status: 'in_stock' as SupplyStatus,
      currentQuantity: 0,
      minimumQuantity: 0,
      criticalQuantity: 0,
      unit: 'each',
      unitPrice: 0,
      location: 'central_supply' as SupplyLocation,
      expirationDate: '',
      isControlled: false,
      requiredSignature: false,
      notes: ''
    };
    
    const newSupply = ref({ ...defaultNewSupply });
    const tagsInput = ref('');
    
    // Error states
    const checkoutError = ref('');
    const checkinError = ref('');
    const addSupplyError = ref('');
    const isSubmitting = ref(false);
    
    // Computed properties
    const activePatients = computed(() => {
      return patientStore.allPatients.filter(
        (p: Patient) => p.status === 'waiting' || p.status === 'in_treatment'
      );
    });
    
    const sortedSupplies = computed(() => {
      if (!supplyStore.filteredSupplies.length) return [];
      
      const supplies = [...supplyStore.filteredSupplies];
      
      if (sortField.value === 'name') {
        supplies.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortDirection.value === 'asc' ? comparison : -comparison;
        });
      } else if (sortField.value === 'category') {
        supplies.sort((a, b) => {
          const comparison = a.category.localeCompare(b.category);
          return sortDirection.value === 'asc' ? comparison : -comparison;
        });
      } else if (sortField.value === 'currentQuantity') {
        supplies.sort((a, b) => {
          const comparison = a.currentQuantity - b.currentQuantity;
          return sortDirection.value === 'asc' ? comparison : -comparison;
        });
      }
      
      return supplies;
    });
    
    const supplyTransactions = computed(() => {
      if (!selectedSupply.value) return [];
      return supplyStore.getTransactionsBySupplyId(selectedSupply.value.id);
    });
    
    const lowStockCount = computed(() => {
      return supplyStore.getLowStockSupplies.length;
    });
    
    const criticalStockCount = computed(() => {
      return supplyStore.getCriticalStockSupplies.length;
    });
    
    // Methods for filtering and sorting
    const applyFilters = () => {
      supplyStore.setFilters({
        category: currentCategory.value,
        status: currentStatus.value,
        location: currentLocation.value,
        searchQuery: searchQuery.value
      });
    };
    
    const handleSearchInput = () => {
      applyFilters();
    };
    
    const sortBy = (field: string) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortDirection.value = 'asc';
      }
    };
    
    const showLowStockOnly = () => {
      currentStatus.value = 'low_stock';
      applyFilters();
    };
    
    const showCriticalStockOnly = () => {
      currentStatus.value = 'critical_stock';
      applyFilters();
    };
    
    // Methods for formatters
    const formatCategory = (category: SupplyCategory): string => {
      const categoryMap: Record<SupplyCategory, string> = {
        medication: 'Medication',
        disposable: 'Disposable',
        equipment: 'Equipment',
        ppe: 'PPE',
        fluid: 'Fluid',
        diagnostic: 'Diagnostic',
        respiratory: 'Respiratory',
        trauma: 'Trauma',
        other: 'Other'
      };
      
      return categoryMap[category] || category;
    };
    
    const formatStatus = (status: SupplyStatus): string => {
      const statusMap: Record<SupplyStatus, string> = {
        in_stock: 'In Stock',
        low_stock: 'Low Stock',
        critical_stock: 'Critical',
        on_order: 'On Order',
        discontinued: 'Discontinued'
      };
      
      return statusMap[status] || status;
    };
    
    const formatLocation = (location: SupplyLocation): string => {
      const locationMap: Record<SupplyLocation, string> = {
        central_supply: 'Central Supply',
        emergency_dept: 'Emergency Dept',
        trauma_room: 'Trauma Room',
        med_surg: 'Med/Surg',
        icu: 'ICU',
        pediatrics: 'Pediatrics',
        ob_gyn: 'OB/GYN',
        operating_room: 'Operating Room',
        other: 'Other'
      };
      
      return locationMap[location] || location;
    };
    
    const formatTransactionType = (type: TransactionType): string => {
      const typeMap: Record<TransactionType, string> = {
        check_in: 'Check In',
        check_out: 'Check Out',
        restock: 'Restock',
        return: 'Return',
        waste: 'Waste',
        transfer: 'Transfer',
        adjust: 'Adjustment',
        expire: 'Expired'
      };
      
      return typeMap[type] || type;
    };
    
    const formatDate = (timestamp: Timestamp): string => {
      if (!timestamp || !timestamp.toDate) {
        return 'N/A';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    };
    
    const formatDateTime = (timestamp: Timestamp): string => {
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
    
    // Modal methods
    const viewSupplyDetails = (supply: MedicalSupply) => {
      selectedSupply.value = supply;
      showDetailsModal.value = true;
      activeTab.value = 'transactions';
    };
    
    const openCheckoutModal = (supply: MedicalSupply) => {
      selectedSupply.value = supply;
      checkoutForm.value = {
        quantity: 1,
        patientId: '',
        destination: 'emergency_dept',
        notes: '',
        password: ''
      };
      checkoutError.value = '';
      showCheckoutModal.value = true;
      showDetailsModal.value = false;
    };
    
    const openCheckinModal = (supply: MedicalSupply) => {
      selectedSupply.value = supply;
      checkinForm.value = {
        quantity: 1,
        source: 'central_supply',
        lotNumber: supply.lotNumber || '',
        expirationDate: supply.expirationDate ? formatDateForInput(supply.expirationDate) : '',
        notes: ''
      };
      checkinError.value = '';
      showCheckinModal.value = true;
      showDetailsModal.value = false;
    };
    
    const openEditModal = (supply: MedicalSupply) => {
      // This would be implemented for editing supplies
      console.log('Edit modal not yet implemented for:', supply.id);
    };
    
    // Helper for date formatting for input fields
    const formatDateForInput = (timestamp: Timestamp): string => {
      if (!timestamp || !timestamp.toDate) {
        return '';
      }
      
      const date = timestamp.toDate();
      return date.toISOString().split('T')[0];
    };
    
    // Transaction submission
    const submitCheckout = async () => {
      if (!selectedSupply.value) return;
      
      checkoutError.value = '';
      isSubmitting.value = true;
      
      try {
        // Validate quantity
        if (checkoutForm.value.quantity <= 0) {
          throw new Error('Quantity must be greater than zero');
        }
        
        if (checkoutForm.value.quantity > selectedSupply.value.currentQuantity) {
          throw new Error(`Only ${selectedSupply.value.currentQuantity} ${selectedSupply.value.unit} available`);
        }
        
        // Validate credentials for controlled substances
        if ((selectedSupply.value.isControlled || selectedSupply.value.requiredSignature) && 
            !checkoutForm.value.password) {
          throw new Error('Password verification required for this item');
        }
        
        // Build options object for checkout
        const options: any = {
          destination: checkoutForm.value.destination,
          notes: checkoutForm.value.notes
        };
        
        // Add patient info if selected
        if (checkoutForm.value.patientId) {
          const patient = patientStore.getPatientById(checkoutForm.value.patientId);
          if (patient) {
            options.patientId = patient.id;
            options.patientName = patient.name;
          }
        }
        
        // Call the store method to process the checkout
        const result = await supplyStore.checkOutSupply(
          selectedSupply.value.id,
          checkoutForm.value.quantity,
          userProfileStore.currentUser?.id || 'system',
          userProfileStore.currentUser?.displayName || 'System User',
          options
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to check out supply');
        }
        
        // Close the modal and refresh supply data
        showCheckoutModal.value = false;
        
        // Update the selected supply with new quantity
        if (selectedSupply.value) {
          selectedSupply.value = {
            ...selectedSupply.value,
            currentQuantity: result.newQuantity || 0,
            status: result.status as SupplyStatus
          };
        }
      } catch (error: any) {
        checkoutError.value = error.message;
      } finally {
        isSubmitting.value = false;
      }
    };
    
    const submitCheckin = async () => {
      if (!selectedSupply.value) return;
      
      checkinError.value = '';
      isSubmitting.value = true;
      
      try {
        // Validate quantity
        if (checkinForm.value.quantity <= 0) {
          throw new Error('Quantity must be greater than zero');
        }
        
        // Build options object
        const options: any = {
          source: checkinForm.value.source,
          notes: checkinForm.value.notes
        };
        
        // Add lot number if provided
        if (checkinForm.value.lotNumber) {
          options.lotNumber = checkinForm.value.lotNumber;
        }
        
        // Add expiration date if provided
        if (checkinForm.value.expirationDate) {
          options.expirationDate = new Date(checkinForm.value.expirationDate);
        }
        
        // Call the store method to process the checkin
        const result = await supplyStore.checkInSupply(
          selectedSupply.value.id,
          checkinForm.value.quantity,
          userProfileStore.currentUser?.id || 'system',
          userProfileStore.currentUser?.displayName || 'System User',
          options
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to check in supply');
        }
        
        // Close the modal and refresh supply data
        showCheckinModal.value = false;
        
        // Update the selected supply with new quantity
        if (selectedSupply.value) {
          selectedSupply.value = {
            ...selectedSupply.value,
            currentQuantity: result.newQuantity || 0,
            status: result.status as SupplyStatus,
            lastRestockDate: Timestamp.now()
          };
        }
      } catch (error: any) {
        checkinError.value = error.message;
      } finally {
        isSubmitting.value = false;
      }
    };
    
    const submitAddSupply = async () => {
      addSupplyError.value = '';
      isSubmitting.value = true;
      
      try {
        // Validate required fields
        if (!newSupply.value.name || !newSupply.value.description) {
          throw new Error('Name and description are required');
        }
        
        // Process tags
        const tags = tagsInput.value.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        
        // Process expiration date if provided
        let expirationDate;
        if (newSupply.value.expirationDate) {
          expirationDate = Timestamp.fromDate(new Date(newSupply.value.expirationDate));
        }
        
        // Prepare the supply data
        const supplyData = {
          ...newSupply.value,
          tags,
          expirationDate,
          unit: newSupply.value.unit as SupplyUnit,
          // Set status based on quantities
          status: determineStatus(
            newSupply.value.currentQuantity, 
            newSupply.value.minimumQuantity, 
            newSupply.value.criticalQuantity
          )
        };
        
        // Add the supply
        const result = await supplyStore.addSupply(supplyData);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to add supply');
        }
        
        // Close the modal and reset form
        showAddSupplyModal.value = false;
        newSupply.value = { ...defaultNewSupply };
        tagsInput.value = '';
        
        // Fetch updated supplies
        await supplyStore.fetchSupplies();
      } catch (error: any) {
        addSupplyError.value = error.message;
      } finally {
        isSubmitting.value = false;
      }
    };
    
    // Helper to determine status based on quantities
    const determineStatus = (current: number, minimum: number, critical: number): SupplyStatus => {
      if (current <= 0) {
        return 'critical_stock';
      } else if (current <= critical) {
        return 'critical_stock';
      } else if (current <= minimum) {
        return 'low_stock';
      } else {
        return 'in_stock';
      }
    };
    
    // Export inventory to CSV (simplified example)
    const exportInventory = () => {
      const supplies = supplyStore.supplies;
      
      // Create CSV header
      let csv = 'Name,Category,Current Qty,Unit,Status,Location,Expiration Date\n';
      
      // Add each supply as a row
      supplies.forEach(supply => {
        const expirationDate = supply.expirationDate ? formatDate(supply.expirationDate) : 'N/A';
        csv += `"${supply.name}",${formatCategory(supply.category)},${supply.currentQuantity},${supply.unit},${formatStatus(supply.status)},${formatLocation(supply.location)},${expirationDate}\n`;
      });
      
      // Create a downloadable file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    // Simplified analytics functions for the usage tab
    const calculateUsage = (days: number): number => {
      if (!selectedSupply.value || !supplyTransactions.value.length) return 0;
      
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Count the quantity of all check-out transactions in the period
      let usage = 0;
      supplyTransactions.value.forEach(transaction => {
        if (transaction.transactionType === 'check_out' && 
            transaction.timestamp.toDate() >= startDate) {
          usage += transaction.quantity;
        }
      });
      
      return usage;
    };
    
    const calculateWeeklyAverage = (): number => {
      const usage30Days = calculateUsage(30);
      return Math.round((usage30Days / 30) * 7 * 100) / 100; // Round to 2 decimals
    };
    
    const calculateDepletionDate = (): string => {
      if (!selectedSupply.value) return 'N/A';
      
      const weeklyAverage = calculateWeeklyAverage();
      if (weeklyAverage <= 0) return 'N/A';
      
      const weeksRemaining = selectedSupply.value.currentQuantity / weeklyAverage;
      if (weeksRemaining <= 0) return 'Depleted';
      
      const daysRemaining = Math.round(weeksRemaining * 7);
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + daysRemaining);
      
      return formatDate(Timestamp.fromDate(depletionDate));
    };
    
    // Initialize data
    onMounted(async () => {
      // Fetch data if not already loaded
      if (supplyStore.supplies.length === 0) {
        await supplyStore.fetchSupplies();
      }
      await supplyStore.fetchTransactions();
      
      // Initialize filters from store
      searchQuery.value = supplyStore.searchQuery;
      currentCategory.value = supplyStore.currentCategory;
      currentStatus.value = supplyStore.currentStatus;
      currentLocation.value = supplyStore.currentLocation;
      
      // If patient store data is needed
      if (patientStore.allPatients.length === 0) {
        await patientStore.fetchPatients();
      }
    });
    
    // Watch for filter changes
    watch(searchQuery, () => {
      supplyStore.setFilters({ searchQuery: searchQuery.value });
    });
    
    return {
      // Store references
      supplyStore,
      userProfileStore,
      patientStore,
      
      // Filter and sort states
      searchQuery,
      currentCategory,
      currentStatus,
      currentLocation,
      sortField,
      sortDirection,
      
      // Computed properties
      sortedSupplies,
      supplyTransactions,
      activePatients,
      lowStockCount,
      criticalStockCount,
      
      // Modal states
      showDetailsModal,
      showCheckoutModal,
      showCheckinModal,
      showAddSupplyModal,
      selectedSupply,
      activeTab,
      
      // Form data
      checkoutForm,
      checkinForm,
      newSupply,
      tagsInput,
      
      // Error states
      checkoutError,
      checkinError,
      addSupplyError,
      isSubmitting,
      
      // Methods
      applyFilters,
      handleSearchInput,
      sortBy,
      showLowStockOnly,
      showCriticalStockOnly,
      formatCategory,
      formatStatus,
      formatLocation,
      formatTransactionType,
      formatDate,
      formatDateTime,
      viewSupplyDetails,
      openCheckoutModal,
      openCheckinModal,
      openEditModal,
      submitCheckout,
      submitCheckin,
      submitAddSupply,
      exportInventory,
      calculateUsage,
      calculateWeeklyAverage,
      calculateDepletionDate
    };
  }
});
</script>

<style scoped>
.medical-supply-inventory {
  padding: 20px;
  width: 100%;
  color: var(--color-on-surface);
}

.inventory-title {
  margin-bottom: 20px;
  font-size: 1.8rem;
  color: var(--color-on-surface);
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinner {
  border: 4px solid var(--color-surface-variant);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
  padding: 15px;
  border-radius: var(--border-radius-md);
  margin-bottom: 20px;
}

.inventory-controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.search-filter {
  flex: 1;
  min-width: 300px;
}

.search-box {
  display: flex;
  margin-bottom: 10px;
  max-width: 600px;
}

.search-box input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm) 0 0 var(--border-radius-sm);
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  padding: 10px 15px;
  border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
  cursor: pointer;
}

.search-icon {
  font-style: normal;
}

.filters {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: var(--color-on-surface);
}

.filter-group select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
}

.primary-btn:hover {
  background-color: var(--color-primary-dark);
}

.export-btn {
  background-color: var(--color-surface-variant);
  color: var(--color-on-surface);
  border: 1px solid var(--color-border);
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

.export-btn:hover {
  background-color: var(--color-divider);
}

.status-badge {
  padding: 8px 12px;
  border-radius: var(--border-radius-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.status-badge.low {
  background-color: var(--color-moderate-bg);
  color: var(--color-on-moderate);
}

.status-badge.critical {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
}

.inventory-table-container {
  overflow-x: auto;
  margin-bottom: 30px;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-surface);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.inventory-table th,
.inventory-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--color-divider);
}

.inventory-table th {
  background-color: var(--color-surface-variant);
  color: var(--color-on-surface);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.inventory-table tbody tr:hover {
  background-color: var(--color-surface-variant);
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sort-icon {
  margin-left: 5px;
  display: inline-block;
}

.description-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-indicator {
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--border-radius-pill);
  font-size: 0.85rem;
}

.status-indicator.in_stock {
  background-color: var(--color-minor-bg);
  color: var(--color-on-minor);
}

.status-indicator.low_stock {
  background-color: var(--color-moderate-bg);
  color: var(--color-on-moderate);
}

.status-indicator.critical_stock {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
}

.status-indicator.on_order {
  background-color: var(--color-info);
  color: var(--color-on-primary);
}

.status-indicator.discontinued {
  background-color: var(--color-surface-variant);
  color: var(--color-on-surface-subdued);
}

.actions-cell {
  white-space: nowrap;
}

.action-btn {
  padding: 5px 10px;
  margin-right: 5px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  border: none;
}

.view-btn {
  background-color: var(--color-info);
  color: var(--color-on-primary);
}

.checkout-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.checkin-btn {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
}

.edit-btn {
  background-color: var(--color-moderate);
  color: var(--color-on-moderate);
}

.no-data {
  text-align: center;
  padding: 40px;
  color: var(--color-on-surface-subdued);
  font-style: italic;
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
  background-color: var(--color-surface);
  padding: 30px;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  color: var(--color-on-surface);
}

.supply-details-modal {
  width: 90%;
  max-width: 900px;
}

.checkout-modal,
.checkin-modal {
  width: 90%;
  max-width: 500px;
}

.add-supply-modal {
  width: 90%;
  max-width: 1000px;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-on-surface-medium);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 30px;
  font-size: 1.5rem;
  padding-right: 30px;
  color: var(--color-on-surface);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.details-section {
  background-color: var(--color-surface-variant);
  padding: 20px;
  border-radius: var(--border-radius-md);
}

.details-section.full-width {
  grid-column: span 2;
}

.details-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: var(--color-on-surface);
}

.detail-row {
  margin-bottom: 10px;
  display: flex;
}

.detail-label {
  width: 40%;
  font-weight: 500;
  color: var(--color-on-surface-medium);
}

.detail-value {
  flex: 1;
  color: var(--color-on-surface);
}

.detail-value.notes {
  white-space: pre-line;
}

.details-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 20px;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  color: var(--color-on-surface-medium);
  border-bottom: 2px solid transparent;
  margin-right: 20px;
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 500;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.transactions-table th,
.transactions-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid var(--color-divider);
}

.transactions-table th {
  background-color: var(--color-surface-variant);
  color: var(--color-on-surface);
  font-weight: 500;
}

.transaction-type {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--border-radius-pill);
  font-size: 0.8rem;
}

.transaction-type.check_out {
  background-color: var(--color-severe-bg);
  color: var(--color-on-severe);
}

.transaction-type.restock,
.transaction-type.check_in,
.transaction-type.return {
  background-color: var(--color-minor-bg);
  color: var(--color-on-minor);
}

.transaction-type.waste {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
}

.transaction-type.transfer {
  background-color: var(--color-moderate-bg);
  color: var(--color-on-moderate);
}

.chart-placeholder {
  height: 200px;
  background-color: var(--color-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-md);
  color: var(--color-on-surface-medium);
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.usage-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.stat-card {
  background-color: var(--color-surface-variant);
  padding: 15px;
  border-radius: var(--border-radius-md);
  text-align: center;
}

.stat-title {
  font-size: 0.9rem;
  margin-bottom: 5px;
  color: var(--color-on-surface-medium);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

/* Form styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--color-on-surface);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.form-error {
  color: var(--color-critical);
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--color-critical-bg);
  border-radius: var(--border-radius-sm);
}

.controlled-warning {
  background-color: var(--color-severe-bg);
  padding: 15px;
  border-radius: var(--border-radius-sm);
  margin-bottom: 20px;
}

.controlled-warning p {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--color-on-severe);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  background-color: var(--color-surface-variant);
  color: var(--color-on-surface);
  border: 1px solid var(--color-border);
  padding: 10px 20px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

.submit-btn {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  padding: 10px 20px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
}

.submit-btn:hover {
  background-color: var(--color-primary-dark);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.full-width {
  grid-column: 1 / -1;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .form-columns {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .details-section.full-width {
    grid-column: auto;
  }
  
  .usage-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .form-columns {
    grid-template-columns: 1fr;
  }
  
  .inventory-table th:nth-child(2),
  .inventory-table td:nth-child(2) {
    display: none;
  }
}

@media (max-width: 576px) {
  .inventory-table th:nth-child(3),
  .inventory-table td:nth-child(3),
  .inventory-table th:nth-child(6),
  .inventory-table td:nth-child(6) {
    display: none;
  }
  
  .details-tabs {
    flex-direction: column;
  }
  
  .tab {
    padding: 15px 0;
    text-align: center;
    border-bottom: 1px solid var(--color-border);
    margin-right: 0;
  }
}
</style>