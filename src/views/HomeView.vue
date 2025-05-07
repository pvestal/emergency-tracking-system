<template>
  <div class="home">
    <PatientTrackingBoard />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PatientTrackingBoard from '@/components/PatientTrackingBoard.vue';

export default defineComponent({
  name: 'HomeView',
  components: {
    PatientTrackingBoard,
  },
});
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
