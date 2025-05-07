<template>
  <div class="integrations">
    <IntegrationSettings />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import IntegrationSettings from '@/components/IntegrationSettings.vue';

export default defineComponent({
  name: 'IntegrationsView',
  components: {
    IntegrationSettings
  }
});
</script>

<style scoped>
.integrations {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>