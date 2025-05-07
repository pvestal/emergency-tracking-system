<template>
  <div class="analytics">
    <AnalyticsDashboard />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AnalyticsDashboard from '@/components/AnalyticsDashboard.vue';

export default defineComponent({
  name: 'AnalyticsView',
  components: {
    AnalyticsDashboard
  }
});
</script>

<style scoped>
.analytics {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>