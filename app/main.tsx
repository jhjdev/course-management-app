import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './providers'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
<React.StrictMode>
    <AppProviders>
    <App />
    </AppProviders>
</React.StrictMode>
)

