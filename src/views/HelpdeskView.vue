<template>
  <div class="helpdesk">
    <AdminHelpdesk />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AdminHelpdesk from '@/components/AdminHelpdesk.vue';

export default defineComponent({
  name: 'HelpdeskView',
  components: {
    AdminHelpdesk
  }
});
</script>

<style scoped>
.helpdesk {
  min-height: calc(100vh - 60px);
  background-color: #f5f5f5;
}
</style>