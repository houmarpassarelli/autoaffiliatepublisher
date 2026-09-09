// apps/dashboard-remote/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@aap/ui/styles.css';
import { App } from './App.js';

// Ponto de montagem único da SPA.
const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemento raiz #root não encontrado no documento.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
