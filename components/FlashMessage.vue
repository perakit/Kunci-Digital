
<script setup lang="ts">
import { ref, computed } from 'vue';

// Reactive message state
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null);

// Computed class for message styling
const messageClass = computed(() => {
  return {
    'bg-red-200 text-red-900': message.value?.type === 'error',
    'bg-green-200 text-green-900': message.value?.type === 'success',
  };
});

// Close message function
const closeMessage = () => {
  message.value = null;
};

// Method that can be called from the parent
const showMessage = (surat: { text: string; type: 'success' | 'error' } | null) => {
  message.value = surat;
};

// Expose the showMessage method to be accessible from the parent
defineExpose({ showMessage });

</script>
<template>
  <transition name="slide-fade">
    <div v-if="message" class="fixed top-0 right-0 m-6">
      <div :class="messageClass" class="rounded-lg shadow-md p-6 pr-10" style="min-width: 240px">
        <button @click="closeMessage" class="opacity-75 cursor-pointer absolute top-0 right-0 py-2 px-3 hover:opacity-100">×</button>
        <div class="flex items-center">{{ message.text }}</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.4s;
}
.slide-fade-enter, .slide-fade-leave-to /* .slide-fade-leave-active in <2.1.8 */ {
  transform: translateX(400px);
  opacity: 0;
}
</style>
