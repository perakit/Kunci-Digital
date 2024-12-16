<script lang="ts" setup>
import { ref } from 'vue'
import Locker from '@/interfaces/Locker';
import MenuItem from '@/interfaces/MenuItem';

const props = withDefaults(defineProps<{
    menu: string;
    count: string;
    options: MenuItem[]|undefined;
    locker: Locker|undefined;
}>(), {
    menu: "",
    count: "",
    options: undefined,
    locker: undefined
});

const isOpen = ref(false);
const toggleMenu = () => {
    isOpen.value = !isOpen.value;
}

const autohide = () => {
    setTimeout(() => {
        isOpen.value = false;
    }, 100);
}

const emit = defineEmits(['select-locker', 'edit-locker', 'delete-locker', 'restore-accounts', 'empty-bin']);

const emitButtonClick = (cmd: any) => {
  emit(cmd, props.locker); // Emit event with parameter
};

const selectLocker = () => {
    emit('select-locker', props.locker);
}

</script>
<template>
    <div class="flex hover:bg-gray-800 rounded px-1">
        <button @click="selectLocker" class="flex-1 flex justify-between py-4 items-center">
            <div class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 6h18M3 6l2 14h14l2-14M5 6V4a2 2 0 012-2h10a2 2 0 012 2v2"></path>
                </svg>
                <span v-text="menu"></span>
            </div>
            {{ count }}
        </button>
        <span style="display: flex;align-items: center;">
            <div class="ms-2 relative inline-block text-left">
                <button @click="toggleMenu" @blur="autohide" class="flex items-center justify-center w-5 h-5 text-gray-500 rounded-full">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z">
                        </path>
                    </svg>
                </button>
                <div v-if="isOpen" @click="toggleMenu" class="fixed inset-0 z-10 w-full h-full"></div>
                <div v-if="isOpen"
                    class="absolute right-0 z-20 w-48 mt-2 origin-top-right bg-gray-800 border border-gray-800 divide-y divide-gray-100 rounded-md shadow-lg outline-none">
                    <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <button v-for="(option, index) in options" :key="index" @click="emitButtonClick(option.emit)" class="w-[100%] flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                            role="menuitem">
                            <svg class="w-5 h-5 mr-3 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5 9h10V7H5v2zm0 4h10v-2H5v2z"></path>
                            </svg>
                            {{option.label}}
                        </button>
                    </div>
                </div>
            </div>
        </span>
    </div>
</template>