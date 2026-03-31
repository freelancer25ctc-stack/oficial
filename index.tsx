
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';

// Initialize jeep-sqlite for web platform
if (Capacitor.getPlatform() === 'web') {
  jeepSqlite(window);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
