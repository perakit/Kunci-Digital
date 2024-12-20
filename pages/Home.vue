<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import MenuItem from '@/components/MenuItem.vue';
import Locker from '@/interfaces/Locker';
import Account from '@/interfaces/Account';
import Website from '@/interfaces/Website';
import { generatePassword } from '@/entrypoints/password-generator';
import IDBDatabases from '@/entrypoints/databases';
import { Totp } from "@/entrypoints/jsOTP";
import SymmetricPGPEncryption from '@/entrypoints/pgp';

const idbMan = new IDBDatabases();
let defaultLocker = localStorage.getItem("defaultLocker") ?? 1;
const restoreSelectedLocker = ref(defaultLocker);
const searchQuery = ref("");
const lockers = ref<Locker[]>([]);
const selectedLocker = ref<Locker>({
    id: 0,
    name: "",
    icon: null
});
const accounts = ref<Account[]>([]);
const selectedAccount = ref<Account>();
const isMobileAndAccountOpen = ref(false);
const showPassword = ref(false)
const isRestoreAll = ref(false)
const isVisible = ref(false)
const isPasswordDeletionVisible = ref(false)
const isBinSelected = ref(false)
const isBinVisible = ref(false)
const websites = ref<Website[]>([]);
const passgen = ref("");
const pg = ref({
    length: 24,
    includeLower: true,
    includeUpper: true,
    includeNumber: true,
    includeSymbol: false
});

const refreshLockers = () => {
    return idbMan.setPass()
    .then(() => idbMan.getLockers())
    .then(listLocker => {
        lockers.value = listLocker;
    });
}

const showAccountBins = () => {
    websites.value = [];
    isPasswordDeletionVisible.value = false;
    isMobileAndAccountOpen.value = false;
    selectedAccount.value = undefined;
    isBinSelected.value = true;

    return idbMan.getBins().then(listAccount => {
        accounts.value = listAccount;
        isDrawerAsideOpen.value = false;
    });
}

const refreshAccounts = () => {
    isBinSelected.value = false;
    return idbMan.getAccounts(defaultLocker).then(listAccount => {
        accounts.value = listAccount;
    })
}

const filterAccount = () => {
    websites.value = [];
    const pattern = searchQuery.value
    if (isBinSelected.value) {
        return idbMan.getBins(pattern).then(listAccount => {
            accounts.value = listAccount;
        });
    } else {
        return idbMan.getAccounts(defaultLocker, pattern).then(listAccount => {
            accounts.value = listAccount;
        });
    }
}

const closeAccount = () => {
    isMobileAndAccountOpen.value = false;
}

var loop: any;

const selectAccount = async (account: Account) => {
    selectedAccount.value = account;
    console.log(account);
    isMobileAndAccountOpen.value = true;
    websites.value = await idbMan.getWebsites(account.id);
    if(account.secret) {
        secret = account.secret;
        code.value = totp.getOtp(account.secret);
        getNextTOTP(account.secret);
        loop = setInterval(timeLoop, 1000);
    } else {
        clearTimeout(loop)
    }
}

var isDrawerOpen = ref(false)
const toggleDrawer = function () {
    isDrawerOpen.value = !isDrawerOpen.value;
}

var isDrawerLockerOpen = ref(false)
const toggleDrawerLocker = function () {
    selectedLocker.value = {
        id: 0,
        name: "",
        icon: "",
    };
    isDrawerLockerOpen.value = !isDrawerLockerOpen.value;
}

var isDrawerAsideOpen = ref(false)
const toggleDrawerAside = function () {
    isDrawerAsideOpen.value = !isDrawerAsideOpen.value;
}

var isDrawerRestoreOpen = ref(false)
const toggleRestoreDrawer = function () {
    isDrawerRestoreOpen.value = !isDrawerRestoreOpen.value;
}

var isDrawerPGOpen = ref(false)
const toggleDrawerPG = function () {
    isDrawerPGOpen.value = !isDrawerPGOpen.value;
    if (isDrawerPGOpen.value) {
        passgen.value = generatePassword(
            pg.value.length,
            pg.value.includeLower,
            pg.value.includeUpper,
            pg.value.includeNumber,
            pg.value.includeSymbol
        );
    }
}

const addWebsite = function () {
    websites.value.push({ id: 0, account_id: "", site_url: "" })
}

const removeWebsite = function (index: number) {
    websites.value.splice(index, 1);
}

const newAccount = () => {
    selectedAccount.value = {
        "id": 0,
        "locker_id": 0,
        "account": "",
        "username": "",
        "email": "",
        "password": "",
        "secret": "",
        "time": "",
        "notes": "",
        "avatar": ""
    };
    isDrawerOpen.value = true;
    websites.value = [];
}

const generate = () => {
    let value = pg.value;
    passgen.value = generatePassword(
        value.length,
        value.includeLower,
        value.includeUpper,
        value.includeNumber,
        value.includeSymbol
    );
}

const fillPassword = () => {
    if (selectedAccount.value) {
        selectedAccount.value.password = passgen.value;
        passgen.value = "";
        isDrawerPGOpen.value = false;
    }
}

const openUrl = (url: string) => {
    chrome.tabs.create({ url: url });
}

const validateUrl = (index: number) => {
    if (websites.value[index].site_url != ""
        && !websites.value[index].site_url.includes('://')
    ) {
        websites.value[index].site_url = "https://" + websites.value[index].site_url
    }
}

async function faviconURL(pageUrl: string) {
    let url = await chrome.storage.local.get('favicon');
    let favicon = url.favicon.replace("$domain", pageUrl);
    return favicon;
}

const selectLocker = (locker: Locker) => {
    defaultLocker = locker.id;
    refreshAccounts().then(_ => {
        isDrawerAsideOpen.value = false;
    });
}

const editLocker = (locker: Locker) => {
    selectedLocker.value = locker;
    isDrawerLockerOpen.value = true;
}

const saveLocker = async () => {
    if (selectedLocker.value.id) {
        await idbMan.addLocker({
            id: selectedLocker.value.id,
            name: selectedLocker.value.name
        } as Locker);
    } else {
        await idbMan.addLocker({
            name: selectedLocker.value.name
        } as Locker);
    }
    isDrawerLockerOpen.value = false;
    refreshLockers();
}

const deleteLocker = (locker: Locker) => {
    selectedLocker.value = locker;
    isVisible.value = true;
}

const confirmDeleteLocker = () => {
    idbMan.removeLocker(selectedLocker.value).then(async (listLockers) => {
        isVisible.value = false;
        lockers.value = await listLockers;
    });
}

const confirmDeletePassword = () => {
    let accountId = selectedAccount.value?.id ?? 0;
    if (isBinSelected.value) {
        idbMan.removeBins(accountId).then(_ => {
            showAccountBins();
        });
    } else {
        idbMan.removeAccount(defaultLocker as number, accountId).then(listAccount => {
            isPasswordDeletionVisible.value = false;
            websites.value = [];
            isMobileAndAccountOpen.value = false;
            selectedAccount.value = undefined;
            accounts.value = listAccount;
        })
    }
}

const confirmDeleteBin = () => {
    idbMan.clearBins().then(_ => {
        isBinVisible.value = false;
        showAccountBins();
    })
}

const saveAccount = async () => {
    let account = selectedAccount.value as Account;
    account.locker_id = defaultLocker as number;

    if (websites.value.length > 0) {
        account.avatar = await faviconURL(websites.value[0].site_url);
    }

    if (account.id == undefined || account.id == 0) {
        // Tambah akun
        await idbMan.addAccount(account as Account).then(newAccount => {
            account = newAccount;
            return idbMan.addWebsites(account.id, websites.value);
        })
    } else {
        // Ubah Akun
        await idbMan.updateAccount(account, websites.value)
    }

    isDrawerOpen.value = false;
    
    idbMan.setPass().then(() => {
        refreshAccounts().then(_ => {
            selectAccount(account);
        });
    });
}

const restoreAllAccount = async () => {
    isRestoreAll.value = true
    isDrawerRestoreOpen.value = true;
}

const restoreAccount = async () => {
    let lockerId = restoreSelectedLocker.value as number;

    if(isRestoreAll.value) {
        await idbMan.restoreAccounts(lockerId);
        isDrawerRestoreOpen.value = false;
        showAccountBins();
    } else {
        let account = selectedAccount.value as Account;
        account.locker_id = lockerId;
        
        if (websites.value.length > 0) {
            account.avatar = await faviconURL(websites.value[0].site_url);
        }
    
        idbMan.updateAccount(account, websites.value)
            .then(() => idbMan.removeBins(account.id, false))
            .then(() => {
                isDrawerRestoreOpen.value = false;
                showAccountBins();
            });
    }
}

const lockerOptions = ref([
    {
        label: "Ubah loker",
        emit: "edit-locker",
    },
    {
        label: "Hapus loker",
        emit: "delete-locker"
    }
]);

const trashOptions = ref([
    {
        label: "Pulihkan Password",
        emit: "restore-accounts",
    },
    {
        label: "Kosongkan Sampah",
        emit: "empty-bin",
    },
]);

var totp = new Totp();
var secret = "";
var code = ref("");
var nextCode = ref("");
var codeValidFor = ref(0);

var updateTicker = function (tick: number) {
    codeValidFor.value = tick;
};

var updateTotp = function (secret: string) {
    code.value = totp.getOtp(secret);
};

var timeLoop = function () {
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var countDown = 30 - (epoch % 30);
    updateTicker(countDown);
    if (epoch % 30 == 0) {
        getNextTOTP(secret);
        updateTotp(secret);
    }
};

var getNextTOTP = function(secret: string) {
    // Get the current date and time
    const now = new Date();
    // Add 30 seconds to the current time
    const plus = now.setSeconds(now.getSeconds() + 30);
    nextCode.value = totp.getOtp(secret, plus);
}

function copy(content: string) {
  navigator.clipboard.writeText(content);
}

const passphrase = ref("");
const rpassphrase = ref("");
const isPassphraseError = ref("");
const isPassphraseVisible = ref(false);
const isUnlockVisible = ref(false);

const lockManagement = () => {
    lockers.value = [];
    accounts.value = [];
    selectedAccount.value = {
        "id": 0,
        "locker_id": 0,
        "account": "",
        "username": "",
        "email": "",
        "password": "",
        "secret": "",
        "time": "",
        "notes": "",
        "avatar": ""
    };
    isDrawerAsideOpen.value = false;
    chrome.storage.session.clear().then(() => {
        passphrase.value = "";
        isUnlockVisible.value = true;
    });
}

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
                refreshLockers().then(_ => {
                    refreshAccounts();
                });
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
                refreshLockers().then(_ => {
                    refreshAccounts();
                });
            });
            passphrase.value = "";
        } else {
            isPassphraseError.value = decrypt.message;
        }
    } catch (error) {
        console.error(error);
        passphrase.value = "";
    }
}

onMounted(() => {
    (async () => {
        const isPassSet = await chrome.storage.local.get(["isPassSet"])

        if(isPassSet['isPassSet'] === undefined) {
            isPassphraseVisible.value = true;
        
        } else {
            const passSession = await chrome.storage.session.get(["passphrase"]);
            
            if(!passSession['passphrase']) {
                isUnlockVisible.value = true;
            
            } else if ((selectedAccount.value?.id ?? 0) == 0) {
                refreshLockers().then(_ => {
                    refreshAccounts();
                });
            }
        }
    })();
})

</script>

<template>
    <div class="flex h-screen light:bg-gray-100">
        <!-- accounts Sidebar -->
        <div class="w-full md:w-80 bg-base-100 shadow-xl" :class="{ 'hidden md:block': isMobileAndAccountOpen }">
            <!-- Search Bar -->
            <div class="flex lg:block items-center justify-between p-4 gap-2">
                <div class="flex-none lg:hidden">
                    <button @click="toggleDrawerAside"
                        for="my-drawer-3" aria-label="open sidebar" class="btn btn-square btn-ghost">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
                <div class="relative w-[100%]">
                    <input v-model="searchQuery" 
                        type="text" v-on:keyup="filterAccount" placeholder="Search accounts..."
                        class="w-full px-4 py-2 bg-base-200 rounded-lg focus:outline-none" />
                    <span class="absolute right-3 top-2.5 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                        </svg>
                    </span>
                </div>
            </div>

            <!-- accounts List -->
            <div class="overflow-y-auto h-[calc(100vh-5rem)]">
                <div v-for="account in accounts" :key="account.id" @click="selectAccount(account)"
                    :class="{ 'bg-gray-700': selectedAccount?.id === account.id }"    
                    class="flex items-center p-4 hover:bg-gray-900 cursor-pointer">
                    <img :src="account.avatar" :alt="account.account" class="w-6 h-6 rounded-full" />
                    <div class="ml-3 flex-1">
                        <div class="flex justify-between">
                            <h3 class="font-medium">{{ account.account }}</h3>
                            <span class="text-xs text-gray-500">{{ account.time }}</span>
                        </div>
                        <p class="text-sm text-gray-500 truncate">{{ account.email }}</p>
                    </div>
                </div>
                <div v-if="accounts.length == 0" class="h-full">
                    <div v-if="isBinSelected" class="h-full text-xl flex items-center justify-center text-gray-500">Tempat Sampah kosong!</div>
                    <div v-else class="h-full text-xl flex items-center justify-center text-gray-500">Locker ini masih kosong!</div>
                </div>
            </div>

            <!-- Floating Button -->
            <button @click="newAccount"
                class="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition duration-300">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
            </button>
        </div>

        <!-- Account Area -->
        <div class="flex-1 flex flex-col" :class="{ 'hidden md:flex': !isMobileAndAccountOpen }">
            <template v-if="selectedAccount && selectedAccount.id">
                <!-- Account Header -->
                <div class="flex items-center justify-between p-4 bg-base-100">
                    <div class="flex items-center flex-1">
                        <!-- Back Button Container - Only visible on mobile -->
                        <div class="flex items-center md:hidden">
                            <button @click="closeAccount" class="text-gray-500 p-2 -ml-4 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 512 512">
                                    <polyline points="244 400 100 256 244 112" style="fill:none;stroke:#ffff;stroke-linecap:round;stroke-linejoin:round;stroke-width:48px" />
                                    <line x1="120" y1="256" x2="412" y2="256" style="fill:none;stroke:#ffff;stroke-linecap:round;stroke-linejoin:round;stroke-width:48px" />
                                </svg>
                            </button>
                        </div>

                        <!-- Account Info -->
                        <div class="flex items-center">
                            <img :src="selectedAccount.avatar" :alt="selectedAccount.account"
                                class="w-10 h-10 rounded-full" />
                            <div class="ml-3">
                                <h2 class="font-medium">{{ selectedAccount.account }}</h2>
                                <p class="text-sm text-gray-500">{{ selectedAccount.email }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex space-x-4">
                        <button @click="isPasswordDeletionVisible = true" class="text-gray-400 hover:text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-red-500 bi bi-trash" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                            </svg>
                        </button>
                        <button @click="toggleRestoreDrawer" v-if="isBinSelected"
                            class="text-gray-400 hover:text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5" />
                                <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
                            </svg>
                        </button>
                        <button @click="toggleDrawer" v-else class="text-gray-400 hover:text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Account Details -->
                <div class="flex-1 overflow-y-auto bg-gray-900 p-4 space-y-2">
                    <div class="text-white rounded-lg">
                        <div class="mb-4">
                            <label for="username" class="block font-medium mb-2">Username</label>
                            <input v-model="selectedAccount.username" 
                                type="username" id="username" readonly
                                class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div class="mb-4">
                            <label for="email" class="block font-medium mb-2">Email</label>
                            <input v-model="selectedAccount.email" 
                                type="email" id="email" readonly
                                class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div class="mb-4">
                            <label for="password" class="block font-medium mb-2">Password</label>
                            <div class="relative">
                                <input v-model="selectedAccount.password" 
                                    :type="showPassword ? 'text' : 'password'" id="password" readonly
                                    class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                <button @click="showPassword = !showPassword" 
                                    type="button" class="absolute top-1/2 right-9 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                                    <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                                    </svg>
                                </button>
                                <button @click="copy(selectedAccount.password)" 
                                    type="button" class="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
                                        <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div v-if="selectedAccount.secret"
                            class="mb-4 p-4 gap-1 bg-gray-800 shadow-md rounded-md">
                            <div class="flex items-start">
                                <div class="flex-1 flex flex-col">
                                    <h1 v-text="code"
                                        class="text-4xl mb-1 font-semibold"></h1>
                                    <div class="flex items-center space-x-2">
                                        <div class="flex flex-col items-center">
                                            <span v-text="codeValidFor" class="text-2xl font-mono" id="seconds"></span>
                                            <span class="text-xs text-gray-500">Code Valid</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-none text-right">
                                    <div class="text-xs text-gray-500">Next</div>
                                    <strong class="text-2xl text-gray-500" v-text="nextCode"></strong>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <div v-for="website in websites" :key="website.id" class="flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                                </svg>
                                <button @click="openUrl(website.site_url)" class="text-purple-400 hover:underline">
                                    {{ website.site_url }}
                                </button>
                            </div>
                        </div>
                        <div class="mt-4" v-if="selectedAccount.notes">
                            <strong>Note</strong>
                            <div class="mt-1" v-html="selectedAccount.notes"></div>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="flex-1 flex items-center justify-center text-gray-500">Pilih akun untuk melihat detail</div>
            </template>
        </div>

        <!-- Overlay for the drawer -->
        <div v-if="isDrawerOpen" @click="toggleDrawer" class="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
        <!-- Drawer -->
        <div :class="{ 'translate-x-0': isDrawerOpen, 'translate-x-full': !isDrawerOpen }"
            class="fixed inset-y-0 right-0 w-[90vw] bg-gray-900 text-white p-4 transform transition-transform duration-300 z-50">
            <div class="flex items-center mb-2">
                <h2 class="text-xl font-semibold" v-if="selectedAccount && selectedAccount.id == 0">Tambah Account</h2>
                <h2 class="text-xl font-semibold" v-else>Ubah Account</h2>
                <button type="button" class="absolute right-3 text-gray-400 hover:text-gray-300" @click="saveAccount">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                        class="bi bi-floppy2" viewBox="0 0 16 16">
                        <path
                            d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v3.5A1.5 1.5 0 0 1 11.5 6h-7A1.5 1.5 0 0 1 3 4.5V1H1.5a.5.5 0 0 0-.5.5m9.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z" />
                    </svg>
                </button>
            </div>
            <!-- Details -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2" v-if="selectedAccount">
                <div class="text-white rounded-lg">
                    <div class="mb-4">
                        <label for="account" class="block font-medium mb-2">Account</label>
                        <input v-model="selectedAccount.account" 
                            type="account" id="account"
                            class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div class="mb-4">
                        <label for="username" class="block font-medium mb-2">Username</label>
                        <input v-model="selectedAccount.username"
                            type="username" id="username"
                            class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div class="mb-4">
                        <label for="email" class="block font-medium mb-2">Email</label>
                        <input v-model="selectedAccount.email"
                            type="email" id="email"
                            class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div class="mb-4">
                        <label for="password" class="block font-medium mb-2">Password</label>
                        <div class="relative">
                            <input v-model="selectedAccount.password" @focus="showPassword = true"
                                :type="showPassword ? 'text' : 'password'" id="password"
                                @blur="showPassword = false"
                                class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <button @click="toggleDrawerPG" 
                                type="button" class="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-repeat" viewBox="0 0 16 16">
                                    <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z" />
                                </svg>
                            </button>
                        </div>
                        <div v-if="selectedAccount.password.length < 8" class="mt-1 text-red-500">
                            Password must be at least 8 characters long.
                        </div>
                    </div>
                    <div class="mb-4">
                        <label for="secret" class="block font-medium mb-2">Secret Code</label>
                        <input v-model="selectedAccount.secret"
                            type="text" id="secret" class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div class="mb-4 space-y-2">
                        <label for="password" class="block font-medium mb-2">Website</label>
                        <div v-for="(website, index) in websites" :key="index" class="relative">
                            <input v-model="website.site_url" @blur="validateUrl(index)" 
                                type="text" class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <button @click="removeWebsite(index)"
                                type="button" class="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button @click="addWebsite()"
                        type="button" class="mb-4 flex items-center rounded-md font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-2 bi bi-plus-lg" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2" />
                        </svg>
                        Add Website
                    </button>
                    <div class="mb-4">
                        <label for="notes" class="block font-medium mb-2">Notes</label>
                        <textarea id="notes" v-model="selectedAccount.notes" rows="5"
                            class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" >
                        </textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay for the drawer -->
        <div v-if="isDrawerPGOpen" @click="toggleDrawerPG" class="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
        <!-- Drawer -->
        <div :class="{ 'translate-x-0': isDrawerPGOpen, 'translate-x-full': !isDrawerPGOpen }"
            class="fixed inset-y-0 right-0 w-[90vw] bg-gray-900 text-white transform transition-transform duration-300 z-50">
            <div class="flex items-center justify-center bg-gray-900">
                <div class="p-6 rounded-lg shadow-lg w-96">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-white text-lg">Password Generator</h2>
                        <button class="bg-purple-600 text-white px-4 py-2 rounded-lg" @click="fillPassword">Fill password</button>
                    </div>
                    <div class="bg-gray-700 text-white p-4 rounded-lg mb-4">
                        <p class="break-all" v-text="passgen"></p>
                        <p class="text-green-500 mt-2">Strong</p>
                    </div>
                    <div class="mb-4">
                        <label class="text-white block mb-2">Type</label>
                        <select class="bg-gray-700 text-white p-2 rounded-lg w-full">
                            <option>Memorable Password</option>
                            <option selected>Random Password</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label v-text="pg.length + ' characters'" class="text-white block mb-2"></label>
                        <input v-model="pg.length" type="range" @input="generate" min="8" max="64" value="28" class="w-full">
                    </div>
                    <div class="flex items-center mb-4">
                        <input v-model="pg.includeSymbol" type="checkbox" @change="generate" id="special-characters" class="mr-2" checked>
                        <label for="special-characters" class="text-white">Special characters (!&*)</label>
                    </div>
                    <div class="flex items-center mb-4">
                        <input v-model="pg.includeUpper" type="checkbox" @change="generate" id="capital-characters" class="mr-2" checked>
                        <label for="capital-characters" class="text-white">Capital letters (A-Z)</label>
                    </div>
                    <div class="flex items-center mb-4">
                        <input v-model="pg.includeNumber" type="checkbox" @change="generate" id="include-numbers" class="mr-2" checked>
                        <label for="include-numbers" class="text-white">Include numbers (0-9)</label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay for the drawer -->
        <div v-if="isDrawerAsideOpen" @click="toggleDrawerAside" class="fixed inset-0 bg-black bg-opacity-50 z-40">
        </div>
        <!-- Drawer -->
        <div :class="{ 'translate-x-0': isDrawerAsideOpen, '-translate-x-full': !isDrawerAsideOpen }"
            class="fixed inset-y-0 left-0 w-[85vw] sm:w-[340px] bg-gray-900 text-white transform transition-transform duration-300 z-50">
            <div class="bg-gray-900 text-white p-4 w-100">
                <div class="flex items-center mb-6">
                    <img src="/wxt.png" alt="" class="w-8 h-8 rounded-full mr-2">
                    <span class="text-xl font-semibold">Perakit <span class="text-pink-400">Kunci Digital</span></span>
                </div>
                <div class="flex flex-col justify-between h-[calc(100vh-5rem)] overflow-y-auto">
                    <div>
                        <div class="flex items-center justify-between rounded mb-3">
                            <h2 class="text-gray-400 mb-2">Locker</h2>
                            <button @click="toggleDrawerLocker" type="button"
                                class="flex items-center rounded-md font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-2 bi bi-plus-lg" viewBox="0 0 16 16">
                                    <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"></path>
                                </svg>
                            </button>
                        </div>
                        <MenuItem v-for="locker of lockers" :menu="locker.name" count="" :options="lockerOptions"
                            @select-locker="selectLocker" @edit-locker="editLocker" @delete-locker="deleteLocker"
                            :locker="locker">
                        </MenuItem>
                        <MenuItem menu="Sampah" count="" @select-locker="showAccountBins" @restore-accounts="restoreAllAccount"
                            @empty-bin="isBinVisible = true" :options="trashOptions" :locker="undefined">
                        </MenuItem>
                    </div>
                    <div class="mt-6">
                        <a href="#/pass-gen" class="flex items-center hover:bg-gray-800 p-3 justify-between">
                            <span>Buat banyak Password</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pass" viewBox="0 0 16 16">
                                <path d="M5.5 5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1z" />
                                <path d="M8 2a2 2 0 0 0 2-2h2.5A1.5 1.5 0 0 1 14 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-13A1.5 1.5 0 0 1 3.5 0H6a2 2 0 0 0 2 2m0 1a3 3 0 0 1-2.83-2H3.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-1.67A3 3 0 0 1 8 3" />
                            </svg>
                        </a>
                        <button @click="lockManagement"
                            class="w-full flex items-center hover:bg-gray-800 p-3 justify-between">
                            <span>Kunci Extensi</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock" viewBox="0 0 16 16">
                                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1"/>
                            </svg>
                        </button>
                        <button @click="openUrl('https://github.com/perakit/kunci-digital')"
                            class="w-full flex items-center hover:bg-gray-800 p-3 justify-between">
                            <span>Github (Source Code)</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
                            </svg>
                        </button>
                        <div class="flex items-center justify-between p-2">
                            <div class="flex items-center">
                                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"></path>
                                </svg>
                                <div>
                                    <a href="mailto:team@perakit.com">team@perakit.com</a>
                                    <p class="text-xs text-gray-400">© 2024 perakit.com</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay for the drawer -->
        <div v-if="isDrawerRestoreOpen" @click="toggleRestoreDrawer" class="fixed inset-0 bg-black bg-opacity-50 z-40">
        </div>
        <!-- Drawer -->
        <div :class="{ 'translate-x-0': isDrawerRestoreOpen, '-translate-x-full': !isDrawerRestoreOpen }"
            class="fixed inset-y-0 left-0 w-[90vw] bg-gray-900 text-white p-4 transform transition-transform duration-300 z-50">
            <div class="flex items-center mb-2">
                <h2 class="text-xl font-semibold">Restore Account</h2>
                <button @click="restoreAccount" type="button" 
                    class="absolute right-3 text-gray-400 hover:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5" />
                        <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
                    </svg>
                </button>
            </div>
            <!-- Details -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2">
                <div class="text-white rounded-lg">
                    <div class="mb-4">
                        <label class="text-white block mb-2">Pilih Locker</label>
                        <select v-model="restoreSelectedLocker" class="bg-gray-700 text-white p-2 rounded-lg w-full">
                            <option v-for="locker of lockers" :value="locker.id" v-text="locker.name"></option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay for the drawer -->
        <div v-if="isDrawerLockerOpen" @click="toggleDrawerLocker" class="fixed inset-0 bg-black bg-opacity-50 z-40">
        </div>
        <!-- Drawer -->
        <div :class="{ 'translate-x-0': isDrawerLockerOpen, '-translate-x-full': !isDrawerLockerOpen }"
            class="fixed inset-y-0 left-0 w-[90vw] bg-gray-900 text-white p-4 transform transition-transform duration-300 z-50">
            <div class="flex items-center mb-2">
                <h2 class="text-xl font-semibold" v-if="selectedLocker && selectedLocker.id == 0">Tambah Locker</h2>
                <h2 class="text-xl font-semibold" v-else>Ubah Locker</h2>
                <button type="button" class="absolute right-3 text-gray-400 hover:text-gray-300" @click="saveLocker">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-floppy2" viewBox="0 0 16 16">
                        <path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v3.5A1.5 1.5 0 0 1 11.5 6h-7A1.5 1.5 0 0 1 3 4.5V1H1.5a.5.5 0 0 0-.5.5m9.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z" />
                    </svg>
                </button>
            </div>
            <!-- Details -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2">
                <div class="text-white rounded-lg">
                    <div class="mb-4">
                        <label for="account" class="block font-medium mb-2">Nama Locker</label>
                        <input v-model="selectedLocker.name" type="account" id="account"
                            class="bg-gray-800 border-gray-700 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                </div>
            </div>
        </div>

        <teleport to="body">
            <transition enter-active-class="transition ease-out duration-300"
                enter-from-class="opacity-0 translate-y-10 scale-95"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition ease-in duration-200"
                leave-from-class="opacity-100 translate-y-0 scale-100"
                leave-to-class="opacity-0 translate-y-10 scale-95">
                <div class="fixed inset-0 z-50" v-if="isPasswordDeletionVisible">
                    <div class="fixed inset-0 bg-gray-800 bg-opacity-25" @click="isPasswordDeletionVisible = false">
                    </div>
                    <div class="fixed inset-0 flex items-center justify-center">
                        <div class="bg-gray-600 rounded-lg shadow-lg p-6 w-96">
                            <h2 class="text-lg font-semibold mb-4">Hapus Password?</h2>
                            <p class="text-gray-200 mb-6">Password akan dimasukkan ke tempat sampah!</p>
                            <div class="flex justify-end space-x-4">
                                <button @click="isPasswordDeletionVisible = false"
                                    class="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-800">Batal</button>
                                <button @click="confirmDeletePassword"
                                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Hapus</button>
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
                <div class="fixed inset-0 z-50" v-if="isVisible">
                    <div class="fixed inset-0 bg-gray-800 bg-opacity-25" @click="isVisible = false"></div>
                    <div class="fixed inset-0 flex items-center justify-center">
                        <div class="bg-gray-600 rounded-lg shadow-lg p-6 w-96">
                            <h2 class="text-lg font-semibold mb-4">Hapus Loker?</h2>
                            <p class="text-gray-200 mb-6">Semua password dalam loker akan dimasukkan ke Loker Sampah!
                            </p>
                            <div class="flex justify-end space-x-4">
                                <button @click="isVisible = false"
                                    class="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-800">Batal</button>
                                <button @click="confirmDeleteLocker"
                                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Hapus</button>
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
                <div class="fixed inset-0 z-50" v-if="isBinVisible">
                    <div class="fixed inset-0 bg-gray-800 bg-opacity-25" @click="isBinVisible = false"></div>
                    <div class="fixed inset-0 flex items-center justify-center">
                        <div class="bg-gray-600 rounded-lg shadow-lg p-6 w-96">
                            <h2 class="text-lg font-semibold mb-4">Hapus Semua Password di loker sampah?</h2>
                            <p class="text-gray-200 mb-6">Semua password dalam loker sampah akan terhapus dan tidak dapat dipulihkan.</p>
                            <div class="flex justify-end space-x-4">
                                <button @click="isBinVisible = false"
                                    class="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-800">Batal</button>
                                <button @click="confirmDeleteBin"
                                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Hapus</button>
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
    </div>

</template>