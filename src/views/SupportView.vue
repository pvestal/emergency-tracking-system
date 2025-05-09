<template>
  <div class="support">
    <SupportTicketForm />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SupportTicketForm from '@/components/SupportTicketForm.vue';

export default defineComponent({
  name: 'SupportView',
  components: {
    SupportTicketForm
  }
});
</script>

<style scoped>
.support {
  min-height: calc(100vh - 60px);
  background-color: #f5f5f5;
}
</style>