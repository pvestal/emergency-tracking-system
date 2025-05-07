import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import LoginForm from '@/components/LoginForm.vue';
import { useAuthStore } from '@/stores/auth';

// Mock the firebase auth store
jest.mock('@/firebase/config', () => ({
  auth: {},
  db: {}
}));

describe('LoginForm.vue', () => {
  it('renders login options', () => {
    // Create a testing pinia instance
    const pinia = createTestingPinia();
    
    // Mount the component with the testing pinia
    const wrapper = mount(LoginForm, {
      global: {
        plugins: [pinia],
      },
    });
    
    // Check that the sign-in buttons are rendered
    expect(wrapper.text()).toContain('Sign in with Google');
    expect(wrapper.text()).toContain('Sign in with GitHub');
  });
  
  it('calls signInWithGoogle when Google button is clicked', async () => {
    // Create a testing pinia instance
    const pinia = createTestingPinia({
      stubActions: false
    });
    
    // Get the auth store and mock the signInWithGoogle method
    const authStore = useAuthStore(pinia);
    authStore.signInWithGoogle = jest.fn();
    
    // Mount the component with the testing pinia
    const wrapper = mount(LoginForm, {
      global: {
        plugins: [pinia],
      },
    });
    
    // Find and click the Google sign-in button
    const googleButton = wrapper.find('.google-btn');
    await googleButton.trigger('click');
    
    // Check that the signInWithGoogle method was called
    expect(authStore.signInWithGoogle).toHaveBeenCalled();
  });
  
  it('displays error message when auth fails', async () => {
    // Create a testing pinia instance
    const pinia = createTestingPinia();
    
    // Get the auth store and set an error
    const authStore = useAuthStore(pinia);
    authStore.error = 'Authentication failed';
    
    // Mount the component with the testing pinia
    const wrapper = mount(LoginForm, {
      global: {
        plugins: [pinia],
      },
    });
    
    // Check that the error message is displayed
    expect(wrapper.find('.error-message').exists()).toBe(true);
    expect(wrapper.find('.error-message').text()).toContain('Authentication failed');
  });
  
  it('disables buttons when loading', async () => {
    // Create a testing pinia instance
    const pinia = createTestingPinia();
    
    // Get the auth store and set loading state
    const authStore = useAuthStore(pinia);
    authStore.loading = true;
    
    // Mount the component with the testing pinia
    const wrapper = mount(LoginForm, {
      global: {
        plugins: [pinia],
      },
    });
    
    // Check that the buttons are disabled
    const googleButton = wrapper.find('.google-btn');
    const githubButton = wrapper.find('.github-btn');
    
    expect(googleButton.attributes('disabled')).toBeDefined();
    expect(githubButton.attributes('disabled')).toBeDefined();
  });
});