<template>
  <div class="users">
    <UserManagement />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import UserManagement from '@/components/UserManagement.vue';

export default defineComponent({
  name: 'UsersView',
  components: {
    UserManagement
  }
});
</script>

<style scoped>
.users {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>