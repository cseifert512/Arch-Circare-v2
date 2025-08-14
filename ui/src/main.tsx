import React from 'react'
import ReactDOM from 'react-dom/client'
import DropQuery from './components/DropQuery'
import './style.css'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <div style={{ padding: 24 }}>
      <h1>Arch-Circare UI</h1>
      <DropQuery />
    </div>
  </React.StrictMode>
)


