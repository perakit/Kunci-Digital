<script lang="ts" setup>
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import routes from '@/pages/routes';

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
});

onBeforeUnmount(() => {
    window.removeEventListener('hashchange', handleHashChange);
});
</script>

<template>
    <main>
        <component :is="currentPage"></component>
    </main>
</template>

<style scoped>
/* Add any relevant styles here */
</style>