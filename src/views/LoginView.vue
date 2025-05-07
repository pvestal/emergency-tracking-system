<template>
  <div class="login">
    <h1>Emergency Department Tracking System</h1>
    <p>Sign in to access the patient tracking dashboard</p>
    <LoginForm />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import LoginForm from '@/components/LoginForm.vue';

export default defineComponent({
  name: 'LoginView',
  components: {
    LoginForm
  }
});
</script>

<style scoped>
.login {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
}

h1 {
  margin-bottom: 10px;
  color: #2c3e50;
}

p {
  margin-bottom: 30px;
  color: #546e7a;
}
</style>