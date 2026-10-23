import React from 'react';
import ReactDOM from 'react-dom/client';
import { syncProgressWithFile } from './storage/fileSync.js';
import './App.css';

// Load saved-progress.json into the browser before anything reads it
syncProgressWithFile().finally(async () => {
  const { default: App } = await import('./App.jsx');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
