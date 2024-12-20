import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    "name": "Perakit Kunci Digital",
    "description": "Extensi browser untuk password generator dan 2fa code berada di satu tempat",
    "version":"1.0.6",
    "homepage_url": "https://perakit.com",
    "minimum_chrome_version" : "114",
    "offline_enabled": true,
    "action": {
      "default_title": "Click to open panel"
    },
    "permissions": ["storage"]
  }
});
