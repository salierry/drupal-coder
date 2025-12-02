// Configuration for Drupal-coder website
'use strict';

const CONFIG = {
  // Form endpoints - используем Formcarry
  formEndpoint: "https://formcarry.com/s/0VNi-UehV3I",

  // API configuration
  api: {
    timeout: 10000,
    retries: 3
  },

  // Analytics (optional)
  analytics: {
    enabled: false,
    googleAnalyticsId: null
  },
  features: {
    animations: true,
    lazyLoading: true,
    serviceWorker: false
  },
  contact: {
    phone: "8 800 222-26-73",
    email: "info@drupal-coder.ru",
    address: "г. Краснодар, ул. Красная, 180"
  },
  social: {
    telegram: "#",
    vk: "#",
    github: "#"
  }
};

// Make configuration globally available
window.CONFIG = CONFIG;
window.FORM_ENDPOINT = CONFIG.formEndpoint;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

// ESM export for Vite
export default CONFIG;