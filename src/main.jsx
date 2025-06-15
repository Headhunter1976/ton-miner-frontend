import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.jsx';
import './index.css';

// ZMIANA: Wklej tutaj swój link "Raw" z GitHub Gist
const manifestUrl = 'https://gist.github.com/Headhunter1976/39da3451bd940dcc7c4a407882165224/raw/7e2c40a0ae9dfb3cb9fbedd85b0046a02acf9576/tonconnect-manifest.json';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>,
);
