<template>
  <div class="medical-supplies-view">
    <h1>Medical Supply Inventory</h1>
    <MedicalSupplyInventory />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MedicalSupplyInventory from '@/components/MedicalSupplyInventory.vue';

export default defineComponent({
  name: 'MedicalSuppliesView',
  components: {
    MedicalSupplyInventory
  }
});
</script>

<style scoped>
.medical-supplies-view {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  margin-bottom: 20px;
  color: var(--color-on-surface);
}
</style>