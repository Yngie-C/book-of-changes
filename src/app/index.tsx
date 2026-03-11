import React from 'react';
import ReactDOM from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import App from './App';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import '@/styles/global.css';
import '@/styles/animations.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TDSMobileAITProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </TDSMobileAITProvider>
  </React.StrictMode>
);
