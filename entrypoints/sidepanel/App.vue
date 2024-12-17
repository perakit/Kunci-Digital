<script lang="ts" setup>
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import routes from '@/pages/routes';
import SymmetricPGPEncryption from '@/entrypoints/pgp';
import IDBDatabases from '@/entrypoints/databases';

const idbMan = new IDBDatabases();
const channel = new BroadcastChannel('isPassSet');
const currentPath = shallowRef<string>(window.location.hash.slice(1) || '/');
const currentPage = shallowRef<unknown>(routes[currentPath.value]); // Use appropriate type for your routes

const route = (path: string) => {
    currentPath.value = path;
    currentPage.value = routes[path];
};

const handleHashChange = () => {
    const path = window.location.hash.slice(1) || '/';
    route(path);
};

const passphrase = ref("");
const rpassphrase = ref("");
const isPassphraseError = ref("");
const isPassphraseVisible = ref(false);
const isUnlockVisible = ref(false);

const confirmSetPassphrase = async () => {

    if(passphrase.value != rpassphrase.value) {
        isPassphraseError.value = "Passphrase tidak sama";
        return;
    }
    
    const pass = passphrase.value;
    const symmetricEncript = new SymmetricPGPEncryption(pass);
    const encrypt = await symmetricEncript.encryptMessage('password-is-set');
    
    if(encrypt.status == "error") {
        return console.error(encrypt.message);
    }

    chrome.storage.local.set({ isPassSet: encrypt.message }, function() {
        chrome.storage.session.set({ passphrase: pass }, function() {
            isPassphraseVisible.value = false;
            idbMan.setPass();
            idbMan.encriptAllAccounts().then(() => {
                channel.postMessage("isPassSet");
            });
        });
    });
}

const validatePasspharase = async () => {
    const pass = passphrase.value;
    const symmetricEncript = new SymmetricPGPEncryption(pass);
    
    const isPassSet = await chrome.storage.local.get(["isPassSet"]);
    const message = isPassSet['isPassSet'];
    try {
        const decrypt = await symmetricEncript.decryptMessage(message);
        
        if(decrypt.message == 'password-is-set') {
            chrome.storage.session.set({ passphrase: pass }, () => {
                isUnlockVisible.value = false;
                channel.postMessage("isPassSet");
            });
        }else {
            isPassphraseError.value = decrypt.message;
        }
    } catch (error) {
        console.error(error);
    }
}

onMounted(() => {
    const submenuToggles = document.querySelectorAll('.submenu-toggle');

    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('is-active');
            const submenu = toggle.nextElementSibling as HTMLElement; // Type assertion
            submenu.classList.toggle('is-hidden');
        });
    });

    window.addEventListener('hashchange', handleHashChange);

    (async () => {
        const isPassSet = await chrome.storage.local.get(["isPassSet"])

        if(isPassSet['isPassSet'] === undefined) {
            isPassphraseVisible.value = true;
        } else {
            const passSession = await chrome.storage.session.get(["passphrase"]);
            
            if(!passSession['passphrase']) {
                isUnlockVisible.value = true;
            }
        }
    })();
});

onBeforeUnmount(() => {
    window.removeEventListener('hashchange', handleHashChange);
});
</script>

<template>
    <main>
        <component :is="currentPage"></component>
        
        <teleport to="body">
            <transition enter-active-class="transition ease-out duration-300"
                enter-from-class="opacity-0 translate-y-10 scale-95"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition ease-in duration-200"
                leave-from-class="opacity-100 translate-y-0 scale-100"
                leave-to-class="opacity-0 translate-y-10 scale-95">
                <div class="fixed inset-0 z-50" v-if="isPassphraseVisible">
                    <div class="fixed inset-0 bg-gray-800 bg-opacity-25"></div>
                    <div class="fixed inset-0 flex items-center justify-center">
                        <div class="bg-gray-900 rounded-lg shadow-lg p-6 w-96">
                            <h2 class="text-lg font-semibold mb-4">Silahkan atur Passphrase baru</h2>
                            <p class="text-gray-200 mb-4">Semua password dan note yang telah di simpan akan dienkripsi menggunakan passphrase.</p>
                            <div class="">
                                <label for="password" class="block font-medium mb-2">Passphrase Baru</label>
                                <input v-model="passphrase" @change="isPassphraseError = ''" @keyup.enter="confirmSetPassphrase" type="password" id="password"
                                    class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div class="mt-1 text-red-500" v-if="isPassphraseError" v-text="isPassphraseError"></div>
                            <div class="mt-4 mb-6">
                                <label for="repat-password" class="block font-medium mb-2">Ulangi Passphrase Baru</label>
                                <input v-model="rpassphrase" @change="isPassphraseError = ''" @keyup.enter="confirmSetPassphrase" type="password" id="repat-password"
                                    class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div class="flex justify-end space-x-4">
                                <button @click="confirmSetPassphrase"
                                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Atur Passphrase</button>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>
        </teleport>

        <teleport to="body">
            <transition enter-active-class="transition ease-out duration-300"
                enter-from-class="opacity-0 translate-y-10 scale-95"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition ease-in duration-200"
                leave-from-class="opacity-100 translate-y-0 scale-100"
                leave-to-class="opacity-0 translate-y-10 scale-95">
                <div class="fixed inset-0 z-50" v-if="isUnlockVisible">
                    <div class="fixed inset-0 bg-gray-800 bg-opacity-25"></div>
                    <div class="fixed inset-0 flex items-center justify-center">
                        <div class="bg-gray-900 rounded-lg shadow-lg p-6 w-96">
                            <h2 class="text-lg font-semibold mb-4">Silahkan masukkan Passphrase</h2>
                            <p class="text-gray-200 mb-4">Untuk melihat password dan note yang telah anda simpan.</p>
                            <div class="">
                                <label for="password" class="block font-medium mb-2">Passphrase</label>
                                <input v-model="passphrase" @change="isPassphraseError = ''" @keyup.enter="validatePasspharase" type="password" id="password"
                                    class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div class="mt-1 text-red-500" v-if="isPassphraseError" v-text="isPassphraseError"></div>
                            <div class="mt-6 flex justify-end space-x-4">
                                <button @click="validatePasspharase"
                                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Unlock</button>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>
        </teleport>
    </main>
</template>

<style scoped>
/* Add any relevant styles here */
</style>