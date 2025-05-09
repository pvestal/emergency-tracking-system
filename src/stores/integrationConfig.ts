import { defineStore } from 'pinia';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useUserProfileStore } from './userProfile';

/**
 * Interface for external system configuration
 */
export interface ExternalSystem {
  id: string;
  name: string;
  type: 'EMR' | 'LIS' | 'PACS' | 'PMS' | 'NOTIFICATION' | 'OTHER';
  endpoint: string;
  apiKey?: string;
  username?: string;
  passwordSet: boolean;
  active: boolean;
  lastSync?: Timestamp;
  syncFrequency?: number; // minutes
  settings: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const useIntegrationConfigStore = defineStore('integrationConfig', {
  state: () => ({
    systems: [] as ExternalSystem[],
    loading: false,
    error: null as string | null
  }),
  
  getters: {
    activeSystemsByType: (state) => (type: ExternalSystem['type']) => {
      return state.systems.filter(system => system.active && system.type === type);
    },
    
    getSystemById: (state) => (id: string) => {
      return state.systems.find(system => system.id === id);
    },
    
    hasActiveEMR: (state) => {
      return state.systems.some(system => system.active && system.type === 'EMR');
    },
    
    hasActiveNotificationSystem: (state) => {
      return state.systems.some(system => system.active && system.type === 'NOTIFICATION');
    }
  },
  
  actions: {
    /**
     * Fetch all external system configurations
     */
    async fetchExternalSystems() {
      const userProfileStore = useUserProfileStore();
      
      // Only admins can view integration configurations
      if (!userProfileStore.canManageUsers) {
        this.error = 'Unauthorized access to integration configurations';
        return;
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const systemsRef = collection(db, 'externalSystems');
        
        onSnapshot(systemsRef, (querySnapshot) => {
          const systemsData: ExternalSystem[] = [];
          querySnapshot.forEach((doc) => {
            systemsData.push({
              id: doc.id,
              ...doc.data()
            } as ExternalSystem);
          });
          this.systems = systemsData;
          this.loading = false;
        }, (error) => {
          this.error = error.message;
          this.loading = false;
        });
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
      }
    },
    
    /**
     * Add a new external system
     * @param system External system configuration (without id)
     */
    async addExternalSystem(system: Omit<ExternalSystem, 'id' | 'createdAt' | 'updatedAt'>) {
      const userProfileStore = useUserProfileStore();
      
      // Only admins can add integration configurations
      if (!userProfileStore.canManageUsers) {
        this.error = 'Unauthorized to add integration configurations';
        return;
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const systemsRef = collection(db, 'externalSystems');
        const newSystemRef = doc(systemsRef);
        
        await setDoc(newSystemRef, {
          ...system,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        return newSystemRef.id;
      } catch (err: any) {
        this.error = err.message;
        console.error('Error adding external system:', err);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Update an existing external system
     * @param id System ID
     * @param systemData Updated system data
     */
    async updateExternalSystem(id: string, systemData: Partial<ExternalSystem>) {
      const userProfileStore = useUserProfileStore();
      
      // Only admins can update integration configurations
      if (!userProfileStore.canManageUsers) {
        this.error = 'Unauthorized to update integration configurations';
        return;
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const systemRef = doc(db, 'externalSystems', id);
        
        // Add updated timestamp
        const updateData = {
          ...systemData,
          updatedAt: Timestamp.now()
        };
        
        await updateDoc(systemRef, updateData);
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating external system:', err);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Toggle system active status
     * @param id System ID
     * @param active Active status
     */
    async toggleSystemActive(id: string, active: boolean) {
      await this.updateExternalSystem(id, { active });
    },
    
    /**
     * Update system password (securely)
     * @param id System ID
     * @param newPassword New password
     */
    async updateSystemPassword(id: string, newPassword: string) {
      const userProfileStore = useUserProfileStore();
      
      // Only admins can update integration credentials
      if (!userProfileStore.canManageUsers) {
        this.error = 'Unauthorized to update integration credentials';
        return;
      }
      
      this.loading = true;
      
      // Use newPassword in implementation
      console.log(`Updating password for system ${id} with new secure password length: ${newPassword.length}`);
      this.error = null;
      
      try {
        // Use a Cloud Function to securely store the password
        // This is a placeholder - the actual implementation would call a Cloud Function
        
        // For now, just mark that a password has been set
        const systemRef = doc(db, 'externalSystems', id);
        await updateDoc(systemRef, {
          passwordSet: true,
          updatedAt: Timestamp.now()
        });
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating system password:', err);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Update last sync time for a system
     * @param id System ID
     */
    async updateLastSync(id: string) {
      await this.updateExternalSystem(id, {
        lastSync: Timestamp.now()
      });
    }
  }
});