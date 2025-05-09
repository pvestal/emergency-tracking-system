import { defineStore } from 'pinia';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { auth } from '@/firebase/config';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: false,
    error: null as string | null,
    registerMode: false,
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    userEmail: (state) => state.user?.email,
    userId: (state) => state.user?.uid,
    isAdmin: () => {
      // This getter requires the userProfile store
      // Import it dynamically to avoid circular dependency
      const { useUserProfileStore } = require('./userProfile');
      const userProfileStore = useUserProfileStore();
      return userProfileStore.canManageUsers;
    },
  },
  
  actions: {
    async signInWithGoogle() {
      this.loading = true;
      this.error = null;
      
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        this.user = result.user;
      } catch (err: any) {
        this.error = err.message;
        console.error('Google sign-in error:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async signInWithGithub() {
      this.loading = true;
      this.error = null;
      
      try {
        const provider = new GithubAuthProvider();
        const result = await signInWithPopup(auth, provider);
        this.user = result.user;
      } catch (err: any) {
        this.error = err.message;
        console.error('GitHub sign-in error:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async registerWithEmailPassword(email: string, password: string, displayName: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        this.user = userCredential.user;
        
        // Update the user's display name
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: displayName
          });
        }
        
        // Reload user to get updated profile
        if (auth.currentUser) {
          await auth.currentUser.reload();
          this.user = auth.currentUser;
        }
      } catch (err: any) {
        this.error = err.message;
        console.error('Registration error:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async loginWithEmailPassword(email: string, password: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        this.user = userCredential.user;
      } catch (err: any) {
        this.error = err.message;
        console.error('Login error:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async sendPasswordReset(email: string) {
      this.loading = true;
      this.error = null;
      
      try {
        await sendPasswordResetEmail(auth, email);
        return true;
      } catch (err: any) {
        this.error = err.message;
        console.error('Password reset error:', err);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    async logout() {
      this.loading = true;
      this.error = null;
      
      try {
        await signOut(auth);
        this.user = null;
      } catch (err: any) {
        this.error = err.message;
        console.error('Logout error:', err);
      } finally {
        this.loading = false;
      }
    },
    
    setRegisterMode(mode: boolean) {
      this.registerMode = mode;
    },
    
    initAuthListener() {
      onAuthStateChanged(auth, (user) => {
        this.user = user;
        
        // If we have a user, initialize the user profile
        if (user) {
          // We need to import the userProfile store here to avoid circular dependency
          // This will be executed after the auth state changes
          import('./userProfile').then(({ useUserProfileStore }) => {
            const userProfileStore = useUserProfileStore();
            userProfileStore.fetchUserProfile();
          });
        }
      });
    },
  },
});