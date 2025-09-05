import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TonConnectUIProvider 
      // For demo purposes, we're using a static manifest URL
      // Replace with your own: manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
      manifestUrl="https://gist.githubusercontent.com/mrruby/243180339f492a052aefc7a666cb14ee/raw/">
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
