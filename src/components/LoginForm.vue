<template>
  <div class="login-container">
    <h2>{{ authStore.registerMode ? 'Create Account' : 'Sign In' }}</h2>
    <div v-if="authStore.error" class="error-message">
      {{ authStore.error }}
    </div>
    
    <!-- Email/Password Form -->
    <form v-if="emailFormVisible" @submit.prevent="handleEmailAuth" class="email-form">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      
      <div v-if="authStore.registerMode" class="form-group">
        <label for="displayName">Full Name</label>
        <input type="text" id="displayName" v-model="displayName" required />
      </div>
      
      <div class="form-actions">
        <button 
          type="submit" 
          class="primary-btn" 
          :disabled="authStore.loading"
        >
          <span v-if="authStore.loading">
            {{ authStore.registerMode ? 'Creating account...' : 'Signing in...' }}
          </span>
          <span v-else>
            {{ authStore.registerMode ? 'Create Account' : 'Sign In' }}
          </span>
        </button>
        
        <button type="button" class="text-btn" @click="toggleAuthMode">
          {{ authStore.registerMode ? 'Already have an account? Sign in' : 'Need an account? Register' }}
        </button>
        
        <button v-if="!authStore.registerMode" type="button" class="text-btn" @click="showForgotPassword = true">
          Forgot Password?
        </button>
      </div>
      
      <div class="separator">
        <span>OR</span>
      </div>
      
      <button 
        type="button"
        @click="emailFormVisible = false" 
        class="text-btn"
      >
        Sign in with social providers
      </button>
    </form>
    
    <!-- Social Login Buttons -->
    <div v-else class="login-buttons">
      <button 
        @click="authStore.signInWithGoogle()" 
        :disabled="authStore.loading"
        class="google-btn"
      >
        <span v-if="authStore.loading && loggingWithGoogle">Signing in...</span>
        <span v-else>Sign in with Google</span>
      </button>
      
      <button 
        @click="authStore.signInWithGithub()" 
        :disabled="authStore.loading"
        class="github-btn"
      >
        <span v-if="authStore.loading && loggingWithGithub">Signing in...</span>
        <span v-else>Sign in with GitHub</span>
      </button>
      
      <div class="separator">
        <span>OR</span>
      </div>
      
      <button 
        @click="emailFormVisible = true" 
        class="email-btn"
        :disabled="authStore.loading"
      >
        Sign in with Email
      </button>
    </div>
    
    <!-- Forgot Password Modal -->
    <div v-if="showForgotPassword" class="modal">
      <div class="modal-content">
        <h3>Reset Password</h3>
        <p>Enter your email address to receive a password reset link.</p>
        
        <div v-if="resetMessage" class="success-message">
          {{ resetMessage }}
        </div>
        
        <form @submit.prevent="handlePasswordReset">
          <div class="form-group">
            <label for="resetEmail">Email</label>
            <input type="email" id="resetEmail" v-model="resetEmail" required />
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showForgotPassword = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="authStore.loading">
              {{ authStore.loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

export default defineComponent({
  name: 'LoginForm',
  setup() {
    const authStore = useAuthStore();
    const loggingWithGoogle = ref(false);
    const loggingWithGithub = ref(false);
    const emailFormVisible = ref(false);
    const email = ref('');
    const password = ref('');
    const displayName = ref('');
    const showForgotPassword = ref(false);
    const resetEmail = ref('');
    const resetMessage = ref('');
    
    // Track which provider is being used
    const signInWithGoogle = async () => {
      loggingWithGoogle.value = true;
      await authStore.signInWithGoogle();
      loggingWithGoogle.value = false;
    };
    
    const signInWithGithub = async () => {
      loggingWithGithub.value = true;
      await authStore.signInWithGithub();
      loggingWithGithub.value = false;
    };
    
    const toggleAuthMode = () => {
      authStore.setRegisterMode(!authStore.registerMode);
      authStore.error = null;
    };
    
    const handleEmailAuth = async () => {
      if (authStore.registerMode) {
        // Register new user
        await authStore.registerWithEmailPassword(
          email.value, 
          password.value, 
          displayName.value
        );
      } else {
        // Login existing user
        await authStore.loginWithEmailPassword(
          email.value, 
          password.value
        );
      }
    };
    
    const handlePasswordReset = async () => {
      const success = await authStore.sendPasswordReset(resetEmail.value);
      if (success) {
        resetMessage.value = 'Password reset email sent. Please check your inbox.';
        setTimeout(() => {
          showForgotPassword.value = false;
          resetMessage.value = '';
          resetEmail.value = '';
        }, 3000);
      }
    };
    
    return {
      authStore,
      loggingWithGoogle,
      loggingWithGithub,
      emailFormVisible,
      email,
      password,
      displayName,
      showForgotPassword,
      resetEmail,
      resetMessage,
      signInWithGoogle,
      signInWithGithub,
      toggleAuthMode,
      handleEmailAuth,
      handlePasswordReset
    };
  }
});
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.email-form {
  margin-top: 20px;
  text-align: left;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

button {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.primary-btn {
  background-color: #2196F3;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background-color: #1976D2;
}

.text-btn {
  background: none;
  color: #2196F3;
  font-size: 14px;
  padding: 5px;
  text-decoration: underline;
}

.text-btn:hover {
  color: #1976D2;
}

.google-btn {
  background-color: #4285F4;
  color: white;
}

.google-btn:hover:not(:disabled) {
  background-color: #3367D6;
}

.github-btn {
  background-color: #24292e;
  color: white;
}

.github-btn:hover:not(:disabled) {
  background-color: #2c3136;
}

.email-btn {
  background-color: #FF5722;
  color: white;
}

.email-btn:hover:not(:disabled) {
  background-color: #E64A19;
}

.separator {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
}

.separator::before,
.separator::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.separator span {
  padding: 0 10px;
  font-size: 14px;
  color: #757575;
}

.error-message {
  margin: 10px 0;
  padding: 10px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
}

.success-message {
  margin: 10px 0;
  padding: 10px;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
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
  max-width: 400px;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.modal-content p {
  margin-bottom: 20px;
  color: #666;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
}

.submit-btn {
  background-color: #2196F3;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background-color: #1976D2;
}
</style>