<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { generatePassword } from "@/entrypoints/password-generator";
import FlashMessage from '@/components/FlashMessage.vue'

const passwords = ref<string[]>([]);
const total = ref(4);
const length = ref(24);
const includeLower = ref(true);
const includeUpper = ref(false);
const includeNumber = ref(false);
const includeSymbol = ref(false);

function generate() {
  passwords.value = [];
  for (let index = 0; index < total.value; index++) {
    passwords.value.push(generatePassword(
      length.value,
      includeLower.value,
      includeUpper.value,
      includeNumber.value,
      includeSymbol.value
    ));
  }
}

// Create a ref for the child component
const childRef = ref<any>(null);
// Define message state
const flashMessages = ref<{ text: string; type: 'success' | 'error' } | null>(null);
const showFlashMessage = (message: { text: string; type: 'success' | 'error' }) => {
  flashMessages.value = message;
  if (childRef.value) {
    childRef.value.showMessage(flashMessages.value); // Call the showMessage method on the child
  }
};

function copy(content: string) {
  navigator.clipboard
    .writeText(content)
    .then(() => {
      if (!sessionStorage.getItem("copy")) {
        sessionStorage.setItem("copy", "yes");
        // You could add a toast notification here
        showFlashMessage({ text: 'Hey! Password copied', type: 'success' })
      }
    })
    .catch(() => {
      showFlashMessage({ text: 'No! Failed to copy password', type: 'error' })
    });
}

onMounted(() => {
  generate();
})

</script>

<template>
  <div class="h-screen flex flex-col items-start justify-between bg-gray-900">
    <div class="flex items-center justify-between p-4 bg-base-100">
      <div class="flex items-center flex-1">
        <div class="flex items-center md:hidden">
          <a href="#/" class="text-gray-500 p-2 -ml-4 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" width="24px"
              height="24px" viewBox="0 0 512 512">
              <polyline points="244 400 100 256 244 112"
                style="fill: none; stroke: rgb(255, 255, 255); stroke-linecap: round; stroke-linejoin: round; stroke-width: 48px;">
              </polyline>
              <line x1="120" y1="256" x2="412" y2="256"
                style="fill: none; stroke: rgb(255, 255, 255); stroke-linecap: round; stroke-linejoin: round; stroke-width: 48px;">
              </line>
            </svg>
          </a>
        </div><!-- Account Info -->
        <div class="flex items-center">
          <img src="/wxt.png" alt="Perakit" class="w-10 h-10 rounded-full">
          <div class="ml-3">
            <h2 class="font-semibold">Perakit Password Generator</h2>
          </div>
        </div>
      </div><!-- Action Buttons -->
    </div>
    <article class="w-[100vw] flex-1 p-2 overflow-y-auto">
      <div v-for="(password, index) of passwords" class="flex items-center mb-4">
        <input @change="copy(password)" type="checkbox" :id="'pass-' + index" class="mr-2">
        <label :for="'pass-' + index" class="text-white" v-text="password"></label>
      </div>
    </article>
    <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full">
      <div class="mb-4">
        <label class="text-white block mb-2" v-text="length + ' characters'"></label>
        <input @input="generate" type="range" min="8" max="64" value="28" class="w-full" v-model="length">
      </div>
      <div class="mb-4">
        <label class="text-white block mb-2" v-text="'Total Password: ' + total"></label>
        <input @input="generate" type="range" min="1" max="64" value="28" class="w-full" v-model="total">
      </div>
      <div class="flex items-center mb-4">
        <input @change="generate" type="checkbox" id="special-characters" class="mr-2" v-model="includeSymbol">
        <label for="special-characters" class="text-white">Special characters (!&*)</label>
      </div>
      <div class="flex items-center mb-4">
        <input @change="generate" type="checkbox" id="capital-latter" class="mr-2" v-model="includeUpper">
        <label for="capital-latter" class="text-white">Capital letters (A-Z)</label>
      </div>
      <div class="flex items-center mb-4">
        <input @change="generate" type="checkbox" id="iclude-number" class="mr-2" v-model="includeNumber">
        <label for="iclude-number" class="text-white">Include numbers (0-9)</label>
      </div>
    </div>
    <FlashMessage ref="childRef"></FlashMessage>
  </div>
</template>

<style scoped>
/* Add any additional styling here */
</style>
