import { defineStore } from 'pinia';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from './auth';

export type UserRole = 'admin' | 'provider' | 'nurse' | 'receptionist' | 'viewer';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  department?: string;
  title?: string;
  createdAt: any;
  lastLogin: any;
}

export const useUserProfileStore = defineStore('userProfile', {
  state: () => ({
    profile: null as UserProfile | null,
    loading: false,
    error: null as string | null
  }),
  
  getters: {
    userRole: (state) => state.profile?.role || 'viewer',
    
    // Role-based permission checks
    canViewPatients: (state) => {
      const role = state.profile?.role;
      return !!role; // All authenticated users can view patients
    },
    
    canAddPatients: (state) => {
      const role = state.profile?.role;
      return role === 'admin' || role === 'receptionist' || role === 'nurse';
    },
    
    canTreatPatients: (state) => {
      const role = state.profile?.role;
      return role === 'admin' || role === 'provider' || role === 'nurse';
    },
    
    canDischargePatients: (state) => {
      const role = state.profile?.role;
      return role === 'admin' || role === 'provider';
    },
    
    canManageUsers: (state) => {
      const role = state.profile?.role;
      return role === 'admin';
    },
    
    canViewAnalytics: (state) => {
      const role = state.profile?.role;
      return role === 'admin' || role === 'provider';
    }
  },
  
  actions: {
    async fetchUserProfile() {
      const authStore = useAuthStore();
      if (!authStore.user) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const userId = authStore.user.uid;
        const profileRef = doc(db, 'userProfiles', userId);
        
        // Set up real-time listener
        onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            this.profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          } else {
            // Profile doesn't exist, create a new one
            this.createUserProfile();
          }
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
    
    async createUserProfile() {
      const authStore = useAuthStore();
      if (!authStore.user) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const userId = authStore.user.uid;
        const user = authStore.user;
        
        // Create a default profile with viewer role
        const newProfile: Omit<UserProfile, 'id'> = {
          displayName: user.displayName || 'New User',
          email: user.email || '',
          role: 'viewer', // Default role
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };
        
        const profileRef = doc(db, 'userProfiles', userId);
        await setDoc(profileRef, newProfile);
        
        // Fetch the newly created profile
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          this.profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
        }
      } catch (err: any) {
        this.error = err.message;
        console.error('Error creating user profile:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async updateUserProfile(profileData: Partial<UserProfile>) {
      if (!this.profile) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const profileRef = doc(db, 'userProfiles', this.profile.id);
        await updateDoc(profileRef, profileData);
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating user profile:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async updateLoginTimestamp() {
      if (!this.profile) return;
      
      try {
        const profileRef = doc(db, 'userProfiles', this.profile.id);
        await updateDoc(profileRef, {
          lastLogin: serverTimestamp()
        });
      } catch (err: any) {
        console.error('Error updating login timestamp:', err);
      }
    },
    
    async updateUserRole(userId: string, role: UserRole) {
      this.loading = true;
      this.error = null;
      
      try {
        const profileRef = doc(db, 'userProfiles', userId);
        await updateDoc(profileRef, { role });
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating user role:', err);
      } finally {
        this.loading = false;
      }
    }
  }
});