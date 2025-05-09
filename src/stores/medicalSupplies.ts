import { defineStore } from 'pinia';
import { 
  collection, 
  doc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp, 
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useUserProfileStore } from './userProfile';

// Supply categories for organization
export type SupplyCategory = 
  'medication' | 
  'disposable' | 
  'equipment' | 
  'ppe' | 
  'fluid' | 
  'diagnostic' | 
  'respiratory' | 
  'trauma' | 
  'other';

// Supply status for inventory management
export type SupplyStatus = 
  'in_stock' | 
  'low_stock' | 
  'critical_stock' | 
  'on_order' | 
  'discontinued';

// Units of measure for supplies
export type SupplyUnit = 
  'each' | 
  'box' | 
  'case' | 
  'pack' | 
  'bottle' | 
  'vial' | 
  'ampule' | 
  'syringe' | 
  'bag' | 
  'pair' | 
  'roll' | 
  'kit';

// Supply location for tracking
export type SupplyLocation = 
  'central_supply' | 
  'emergency_dept' | 
  'trauma_room' | 
  'med_surg' | 
  'icu' | 
  'pediatrics' | 
  'ob_gyn' | 
  'operating_room' | 
  'other';

// Transaction types for logging
export type TransactionType = 
  'check_in' | 
  'check_out' | 
  'restock' | 
  'return' | 
  'waste' | 
  'transfer' | 
  'adjust' | 
  'expire';

// Medical Supply interface
export interface MedicalSupply {
  id: string;
  name: string;
  description: string;
  category: SupplyCategory;
  manufacturer?: string;
  modelNumber?: string;
  lotNumber?: string;
  status: SupplyStatus;
  currentQuantity: number;
  minimumQuantity: number;
  criticalQuantity: number;
  unit: SupplyUnit;
  unitPrice?: number;
  location: SupplyLocation;
  expirationDate?: Timestamp;
  lastRestockDate?: Timestamp;
  lastUpdated: Timestamp;
  isControlled: boolean; // For controlled substances requiring extra tracking
  requiredSignature: boolean; // If signature/auth is required for checkout
  imageUrl?: string;
  tags?: string[];
  notes?: string;
}

// Transaction for logging all supply movements
export interface SupplyTransaction {
  id: string;
  supplyId: string;
  supplyName: string;
  transactionType: TransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  patientId?: string;
  patientName?: string;
  destination?: SupplyLocation;
  source?: SupplyLocation;
  notes?: string;
  lotNumber?: string;
  expirationDate?: Timestamp;
}

// Main store state interface
interface MedicalSuppliesState {
  supplies: MedicalSupply[];
  transactions: SupplyTransaction[];
  filteredSupplies: MedicalSupply[];
  selectedSupplyId: string | null;
  currentCategory: SupplyCategory | 'all';
  currentStatus: SupplyStatus | 'all';
  currentLocation: SupplyLocation | 'all';
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

// Define the store
export const useMedicalSuppliesStore = defineStore('medicalSupplies', {
  state: (): MedicalSuppliesState => ({
    supplies: [],
    transactions: [],
    filteredSupplies: [],
    selectedSupplyId: null,
    currentCategory: 'all',
    currentStatus: 'all',
    currentLocation: 'all',
    searchQuery: '',
    loading: false,
    error: null
  }),
  
  getters: {
    // Get a specific supply by ID
    getSupplyById: (state) => (id: string): MedicalSupply | undefined => {
      return state.supplies.find(supply => supply.id === id);
    },
    
    // Get supplies by status
    getSuppliesByStatus: (state) => (status: SupplyStatus): MedicalSupply[] => {
      return state.supplies.filter(supply => supply.status === status);
    },
    
    // Get low stock supplies
    getLowStockSupplies: (state): MedicalSupply[] => {
      return state.supplies.filter(
        supply => 
          supply.currentQuantity <= supply.minimumQuantity && 
          supply.currentQuantity > supply.criticalQuantity
      );
    },
    
    // Get critical stock supplies
    getCriticalStockSupplies: (state): MedicalSupply[] => {
      return state.supplies.filter(
        supply => supply.currentQuantity <= supply.criticalQuantity
      );
    },
    
    // Get controlled substances
    getControlledSubstances: (state): MedicalSupply[] => {
      return state.supplies.filter(supply => supply.isControlled);
    },
    
    // Get transactions for a specific supply
    getTransactionsBySupplyId: (state) => (supplyId: string): SupplyTransaction[] => {
      return state.transactions
        .filter(transaction => transaction.supplyId === supplyId)
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    },
    
    // Get transactions for a specific patient
    getTransactionsByPatientId: (state) => (patientId: string): SupplyTransaction[] => {
      return state.transactions
        .filter(transaction => transaction.patientId === patientId)
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    },
    
    // Get recent transactions
    getRecentTransactions: (state): SupplyTransaction[] => {
      return [...state.transactions]
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
        .slice(0, 20);
    },
    
    // Get supplies that will expire soon (within 30 days)
    getSuppliesExpiringWithin30Days: (state): MedicalSupply[] => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      return state.supplies.filter(supply => {
        if (!supply.expirationDate) return false;
        
        const expirationDate = supply.expirationDate.toDate();
        return expirationDate <= thirtyDaysFromNow && supply.currentQuantity > 0;
      });
    },
    
    // Check if a specific supply requires restocking
    needsRestocking: (state) => (id: string): boolean => {
      const supply = state.supplies.find(s => s.id === id);
      if (!supply) return false;
      
      return supply.currentQuantity <= supply.minimumQuantity;
    },
    
    // Total inventory value
    totalInventoryValue: (state): number => {
      return state.supplies.reduce((total, supply) => {
        const price = supply.unitPrice || 0;
        return total + (price * supply.currentQuantity);
      }, 0);
    },
    
    // Count supplies by category
    suppliesCountByCategory: (state) => {
      const counts: Record<SupplyCategory | 'total', number> = {
        medication: 0,
        disposable: 0,
        equipment: 0,
        ppe: 0,
        fluid: 0,
        diagnostic: 0,
        respiratory: 0,
        trauma: 0,
        other: 0,
        total: 0
      };
      
      state.supplies.forEach(supply => {
        counts[supply.category]++;
        counts.total++;
      });
      
      return counts;
    }
  },
  
  actions: {
    // Fetch all supplies
    async fetchSupplies() {
      this.loading = true;
      this.error = null;
      
      try {
        const suppliesRef = collection(db, 'medical_supplies');
        const querySnapshot = await getDocs(suppliesRef);
        
        const supplies: MedicalSupply[] = [];
        querySnapshot.forEach((doc) => {
          supplies.push({
            id: doc.id,
            ...doc.data()
          } as MedicalSupply);
        });
        
        this.supplies = supplies;
        this.applyFilters();
        this.loading = false;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error fetching supplies:', err);
      }
    },
    
    // Fetch transactions
    async fetchTransactions(limit = 100) {
      this.loading = true;
      this.error = null;
      
      try {
        const transactionsRef = collection(db, 'supply_transactions');
        const q = query(
          transactionsRef,
          orderBy('timestamp', 'desc'),
          firestoreLimit(Number(limit))
        );
        
        const querySnapshot = await getDocs(q);
        
        const transactions: SupplyTransaction[] = [];
        querySnapshot.forEach((doc) => {
          transactions.push({
            id: doc.id,
            ...doc.data()
          } as SupplyTransaction);
        });
        
        this.transactions = transactions;
        this.loading = false;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error fetching transactions:', err);
      }
    },
    
    // Apply filters for the UI
    applyFilters() {
      let result = [...this.supplies];
      
      // Apply category filter
      if (this.currentCategory !== 'all') {
        result = result.filter(supply => supply.category === this.currentCategory);
      }
      
      // Apply status filter
      if (this.currentStatus !== 'all') {
        result = result.filter(supply => supply.status === this.currentStatus);
      }
      
      // Apply location filter
      if (this.currentLocation !== 'all') {
        result = result.filter(supply => supply.location === this.currentLocation);
      }
      
      // Apply search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(supply => 
          supply.name.toLowerCase().includes(query) ||
          supply.description.toLowerCase().includes(query) ||
          supply.manufacturer?.toLowerCase().includes(query) ||
          supply.modelNumber?.toLowerCase().includes(query) ||
          supply.lotNumber?.toLowerCase().includes(query) ||
          supply.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      this.filteredSupplies = result;
    },
    
    // Set filters
    setFilters(filters: { 
      category?: SupplyCategory | 'all', 
      status?: SupplyStatus | 'all',
      location?: SupplyLocation | 'all',
      searchQuery?: string 
    }) {
      if (filters.category !== undefined) {
        this.currentCategory = filters.category;
      }
      
      if (filters.status !== undefined) {
        this.currentStatus = filters.status;
      }
      
      if (filters.location !== undefined) {
        this.currentLocation = filters.location;
      }
      
      if (filters.searchQuery !== undefined) {
        this.searchQuery = filters.searchQuery;
      }
      
      this.applyFilters();
    },
    
    // Add a new supply to inventory
    async addSupply(supplyData: Omit<MedicalSupply, 'id' | 'lastUpdated'>) {
      this.loading = true;
      this.error = null;
      
      try {
        const suppliesRef = collection(db, 'medical_supplies');
        
        const supplyWithTimestamp = {
          ...supplyData,
          lastUpdated: serverTimestamp()
        };
        
        const docRef = await addDoc(suppliesRef, supplyWithTimestamp);
        
        // Create an initial transaction for adding the supply
        const userProfileStore = useUserProfileStore();
        
        if (supplyData.currentQuantity > 0) {
          const transactionData: Omit<SupplyTransaction, 'id'> = {
            supplyId: docRef.id,
            supplyName: supplyData.name,
            transactionType: 'restock',
            quantity: supplyData.currentQuantity,
            previousQuantity: 0,
            newQuantity: supplyData.currentQuantity,
            timestamp: Timestamp.now(),
            userId: userProfileStore.currentUser?.id || 'system',
            userName: userProfileStore.currentUser?.displayName || 'System',
            notes: 'Initial inventory creation'
          };
          
          await this.createTransaction(transactionData);
        }
        
        // Fetch the supplies to update the local state
        await this.fetchSupplies();
        
        this.loading = false;
        return { success: true, id: docRef.id };
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error adding supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Update an existing supply
    async updateSupply(supplyId: string, updates: Partial<MedicalSupply>) {
      this.loading = true;
      this.error = null;
      
      try {
        const supplyRef = doc(db, 'medical_supplies', supplyId);
        
        // Add the timestamp
        const updatesWithTimestamp = {
          ...updates,
          lastUpdated: serverTimestamp()
        };
        
        await updateDoc(supplyRef, updatesWithTimestamp);
        
        // Update local state
        const index = this.supplies.findIndex(s => s.id === supplyId);
        if (index !== -1) {
          this.supplies[index] = {
            ...this.supplies[index],
            ...updates,
            lastUpdated: Timestamp.now()
          };
        }
        
        this.applyFilters();
        this.loading = false;
        return { success: true };
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error updating supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Delete a supply (soft delete by setting status to discontinued)
    async discontinueSupply(supplyId: string) {
      return this.updateSupply(supplyId, { 
        status: 'discontinued',
        notes: (this.getSupplyById(supplyId)?.notes || '') + '\nDiscontinued: ' + new Date().toLocaleString()
      });
    },
    
    // Hard delete a supply (usually only for testing/admin purposes)
    async deleteSupply(supplyId: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const supplyRef = doc(db, 'medical_supplies', supplyId);
        await deleteDoc(supplyRef);
        
        // Update local state
        this.supplies = this.supplies.filter(s => s.id !== supplyId);
        this.applyFilters();
        
        this.loading = false;
        return { success: true };
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error deleting supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Create a transaction
    async createTransaction(transactionData: Omit<SupplyTransaction, 'id'>) {
      this.loading = true;
      this.error = null;
      
      try {
        const transactionsRef = collection(db, 'supply_transactions');
        const docRef = await addDoc(transactionsRef, transactionData);
        
        // Add to local state
        const newTransaction: SupplyTransaction = {
          id: docRef.id,
          ...transactionData
        };
        
        this.transactions.unshift(newTransaction);
        
        this.loading = false;
        return { success: true, id: docRef.id };
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error creating transaction:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Process a check-out transaction using cloud function
    async checkOutSupply(
      supplyId: string, 
      quantity: number, 
      userId: string, 
      userName: string,
      options?: {
        patientId?: string,
        patientName?: string,
        destination?: SupplyLocation,
        notes?: string
      }
    ) {
      this.loading = true;
      this.error = null;
      
      try {
        // Get the current supply for client-side validation
        const supply = this.getSupplyById(supplyId);
        if (!supply) {
          throw new Error(`Supply with ID ${supplyId} not found`);
        }
        
        // Client-side validation for better user experience
        if (supply.currentQuantity < quantity) {
          throw new Error(`Not enough inventory. Requested: ${quantity}, Available: ${supply.currentQuantity}`);
        }
        
        // Import Firebase functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        
        // Call the cloud function
        const checkOutSupplyFunction = httpsCallable(functions, 'checkOutSupply');
        const result = await checkOutSupplyFunction({
          supplyId,
          quantity,
          options
        });
        
        // The function returns the result with updated quantity and status
        const functionResult = result.data as any;
        
        if (functionResult.success) {
          // Update local state to match server
          const supplyIndex = this.supplies.findIndex(s => s.id === supplyId);
          if (supplyIndex !== -1) {
            this.supplies[supplyIndex] = {
              ...this.supplies[supplyIndex],
              currentQuantity: functionResult.newQuantity,
              status: functionResult.status,
              lastUpdated: Timestamp.now()
            };
          }
          
          // Refresh the filtered supplies as well
          this.applyFilters();
          
          // Fetch transactions to get the new transaction that was created
          await this.fetchTransactions(20);
        }
        
        this.loading = false;
        return functionResult;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error checking out supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Process a check-in/restock transaction using cloud function
    async checkInSupply(
      supplyId: string, 
      quantity: number, 
      userId: string, 
      userName: string,
      options?: {
        source?: SupplyLocation,
        notes?: string,
        lotNumber?: string,
        expirationDate?: Date,
        transactionType?: TransactionType
      }
    ) {
      this.loading = true;
      this.error = null;
      
      try {
        // Get the current supply for client-side validation
        const supply = this.getSupplyById(supplyId);
        if (!supply) {
          throw new Error(`Supply with ID ${supplyId} not found`);
        }
        
        // Import Firebase functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        
        // Call the cloud function
        const checkInSupplyFunction = httpsCallable(functions, 'checkInSupply');
        const result = await checkInSupplyFunction({
          supplyId,
          quantity,
          options: {
            ...options,
            // If this is a date object, we need to convert it to an ISO string
            expirationDate: options?.expirationDate ? options.expirationDate.toISOString() : undefined
          }
        });
        
        // The function returns the result with updated quantity and status
        const functionResult = result.data as any;
        
        if (functionResult.success) {
          // Update local state to match server
          const supplyIndex = this.supplies.findIndex(s => s.id === supplyId);
          if (supplyIndex !== -1) {
            const updates: Partial<MedicalSupply> = {
              currentQuantity: functionResult.newQuantity,
              status: functionResult.status,
              lastUpdated: Timestamp.now(),
              lastRestockDate: Timestamp.now()
            };
            
            // Update lot number and expiration date if provided
            if (options?.lotNumber) {
              updates.lotNumber = options.lotNumber;
            }
            
            if (options?.expirationDate) {
              updates.expirationDate = Timestamp.fromDate(options.expirationDate);
            }
            
            this.supplies[supplyIndex] = {
              ...this.supplies[supplyIndex],
              ...updates
            };
          }
          
          // Refresh the filtered supplies as well
          this.applyFilters();
          
          // Fetch transactions to get the new transaction that was created
          await this.fetchTransactions(20);
        }
        
        this.loading = false;
        return functionResult;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error checking in supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Process a return transaction (returning unused supplies) using cloud function
    async returnSupply(
      supplyId: string, 
      quantity: number, 
      userId: string, 
      userName: string,
      options?: {
        patientId?: string,
        patientName?: string,
        notes?: string
      }
    ) {
      // Reuse check-in supply function but specify the transaction type as 'return'
      return this.checkInSupply(
        supplyId, 
        quantity, 
        userId, 
        userName, 
        {
          ...options,
          source: 'central_supply',
          transactionType: 'return'
        }
      );
    },
    
    // Process a waste transaction using cloud function
    async wasteSupply(
      supplyId: string, 
      quantity: number, 
      userId: string, 
      userName: string,
      reason: string
    ) {
      this.loading = true;
      this.error = null;
      
      try {
        // Get the current supply for client-side validation
        const supply = this.getSupplyById(supplyId);
        if (!supply) {
          throw new Error(`Supply with ID ${supplyId} not found`);
        }
        
        // Client-side validation for better user experience
        if (supply.currentQuantity < quantity) {
          throw new Error(`Not enough inventory. Requested: ${quantity}, Available: ${supply.currentQuantity}`);
        }
        
        // Import Firebase functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        
        // Call the cloud function
        const wasteSupplyFunction = httpsCallable(functions, 'wasteSupply');
        const result = await wasteSupplyFunction({
          supplyId,
          quantity,
          reason
        });
        
        // The function returns the result with updated quantity and status
        const functionResult = result.data as any;
        
        if (functionResult.success) {
          // Update local state to match server
          const supplyIndex = this.supplies.findIndex(s => s.id === supplyId);
          if (supplyIndex !== -1) {
            this.supplies[supplyIndex] = {
              ...this.supplies[supplyIndex],
              currentQuantity: functionResult.newQuantity,
              status: functionResult.status,
              lastUpdated: Timestamp.now()
            };
          }
          
          // Refresh the filtered supplies as well
          this.applyFilters();
          
          // Fetch transactions to get the new transaction that was created
          await this.fetchTransactions(20);
        }
        
        this.loading = false;
        return functionResult;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error wasting supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Process a transfer transaction using cloud function
    async transferSupply(
      supplyId: string, 
      quantity: number, 
      sourceLocation: SupplyLocation,
      destinationLocation: SupplyLocation,
      userId: string, 
      userName: string,
      notes?: string
    ) {
      this.loading = true;
      this.error = null;
      
      try {
        // Get the current supply for client-side validation
        const supply = this.getSupplyById(supplyId);
        if (!supply) {
          throw new Error(`Supply with ID ${supplyId} not found`);
        }
        
        // Client-side validation for better user experience
        if (supply.currentQuantity < quantity) {
          throw new Error(`Not enough inventory. Requested: ${quantity}, Available: ${supply.currentQuantity}`);
        }
        
        // Validate that the supply is at the source location
        if (supply.location !== sourceLocation) {
          throw new Error(`Supply is not at the specified source location. Current location: ${supply.location}`);
        }
        
        // Import Firebase functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        
        // Call the cloud function
        const transferSupplyFunction = httpsCallable(functions, 'transferSupply');
        const result = await transferSupplyFunction({
          supplyId,
          quantity,
          sourceLocation,
          destinationLocation,
          notes
        });
        
        // The function returns the result with the new location if applicable
        const functionResult = result.data as any;
        
        if (functionResult.success) {
          // Update local state to match server if the location changed
          if (functionResult.newLocation !== sourceLocation) {
            const supplyIndex = this.supplies.findIndex(s => s.id === supplyId);
            if (supplyIndex !== -1) {
              this.supplies[supplyIndex] = {
                ...this.supplies[supplyIndex],
                location: functionResult.newLocation,
                lastUpdated: Timestamp.now()
              };
            }
            
            // Refresh the filtered supplies as well
            this.applyFilters();
          }
          
          // Fetch transactions to get the new transaction that was created
          await this.fetchTransactions(20);
        }
        
        this.loading = false;
        return functionResult;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error transferring supply:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Helper method to calculate supply status based on quantities
    calculateSupplyStatus(
      currentQuantity: number, 
      minimumQuantity: number, 
      criticalQuantity: number
    ): SupplyStatus {
      if (currentQuantity <= 0) {
        return 'critical_stock';
      } else if (currentQuantity <= criticalQuantity) {
        return 'critical_stock';
      } else if (currentQuantity <= minimumQuantity) {
        return 'low_stock';
      } else {
        return 'in_stock';
      }
    },
    
    // Process expired supplies
    async processExpiredSupplies() {
      this.loading = true;
      this.error = null;
      
      try {
        const userProfileStore = useUserProfileStore();
        if (!userProfileStore.canManageInventory) {
          throw new Error('You do not have permission to process expired supplies');
        }
        
        // Import Firebase functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        
        // Call the cloud function
        const processExpiredFn = httpsCallable(functions, 'processExpiredSupplies');
        const result = await processExpiredFn({});
        
        // Update local state
        await this.fetchSupplies();
        await this.fetchTransactions(20);
        
        this.loading = false;
        return result.data;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error processing expired supplies:', err);
        return { success: false, error: err.message };
      }
    },
    
    // Get low stock supplies
    async getLowStockSupplies(includeDetails = true) {
      this.loading = true;
      this.error = null;
      
      try {
        // Import Firebase functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        
        // Call the cloud function
        const getLowStockFn = httpsCallable(functions, 'getLowStockSupplies');
        const result = await getLowStockFn({ includeDetails });
        
        this.loading = false;
        return result.data;
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
        console.error('Error getting low stock supplies:', err);
        return { success: false, error: err.message };
      }
    }
  }
});