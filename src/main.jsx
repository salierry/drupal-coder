import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './react-popup.jsx';
import { initSite } from './legacy.js';

// Инициализация React
const rootEl = document.getElementById('react-root');
if (rootEl) {
  try {
    const root = createRoot(rootEl);
    root.render(<AppRouter />);
  } catch (error) {
    console.error('Error creating React root:', error);
  }
} else {
  console.warn('React root element not found');
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSite);
  } else {
    initSite();
  }
} catch (error) {
  console.error('Error initializing legacy code:', error);
}