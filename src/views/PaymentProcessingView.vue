<template>
  <div class="payment-processing">
    <PaymentProcessingDemo />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PaymentProcessingDemo from '@/components/PaymentProcessingDemo.vue';

export default defineComponent({
  name: 'PaymentProcessingView',
  components: {
    PaymentProcessingDemo
  }
});
</script>

<style scoped>
.payment-processing {
  min-height: calc(100vh - 60px);
  background-color: #f5f5f5;
}
</style>