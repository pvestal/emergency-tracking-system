<template>
  <div class="security-audit">
    <SecurityAuditLogs />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SecurityAuditLogs from '@/components/SecurityAuditLogs.vue';

export default defineComponent({
  name: 'SecurityAuditView',
  components: {
    SecurityAuditLogs
  }
});
</script>

<style scoped>
.security-audit {
  min-height: calc(100vh - 60px);
  background-color: #f5f5f5;
}
</style>