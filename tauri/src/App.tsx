import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import './App.css'

function App() {
  const [rustDeskId, setRustDeskId] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [remoteId, setRemoteId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'addressBook' | 'recent'>('addressBook')

  useEffect(() => {
    const fetchId = async () => {
      try {
        const id = await invoke<string>('get_id')
        setRustDeskId(id)
      } catch (err) {
        console.error('Failed to fetch RustDesk ID:', err)
      }
    }

    fetchId()
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rustDeskId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = async () => {
    if (!remoteId.trim()) return;

    try {
      const result = await invoke<{success: boolean, message?: string}>('connect', {
        remote_id: remoteId.trim(),
        password: password || null,
        is_file_transfer: false,
        is_view_camera: false,
        is_terminal: false,
        force_relay: false,
      });

      if (!result.success) {
        console.error('Failed to connect:', result.message);
        alert(`Failed to connect: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Connection error:', err);
      alert(`Connection error: ${err}`);
    }
  }

  return (
    <div className="app-container">
      {/* Left Pane - Local Info */}
      <div className="left-pane">
        <div className="logo-section">
          <svg viewBox="0 0 110 54" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo">
             <path d="M55 0L109.5 54H0L55 0Z" fill="#F65000" />
          </svg>
          <h1>RustDesk</h1>
        </div>

        {/* ID Board */}
        <div className="id-board">
          <div className="id-header">
            <span className="label">ID</span>
            <button className="more-btn" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </div>
          <div className="id-value-container" onDoubleClick={copyToClipboard}>
            <span className="id-value">{rustDeskId || '---'}</span>
            <button className="copy-btn" onClick={copyToClipboard} title="Copy ID">
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Password Board */}
        <div className="password-board">
          <div className="password-header">
            <span className="label">Password</span>
          </div>
          <input
            type="password"
            placeholder="Unset"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="password-input"
          />
        </div>

        {/* Status */}
        <div className="status-section">
          <div className="status-dot"></div>
          <span>Ready for Connection</span>
        </div>

        {/* Settings button at bottom left */}
        <button className="settings-fab" title="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.588 1.066c1.543-.43 3.025.794 2.595 2.594a1.724 1.724 0 0 0 1.065 2.588c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.588c.43 1.543-.794 3.025-2.594 2.595a1.724 1.724 0 0 0 -2.588 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.588 -1.066c-1.543.43-3.025-.794-2.595-2.594a1.724 1.724 0 0 0 -1.065 -2.588c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.588c-.43-1.543.794-3.025 2.594-2.595a1.724 1.724 0 0 0 2.588-1.065z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>

      {/* Right Pane - Connection */}
      <div className="divider"></div>
      <div className="right-pane">
        {/* Connection Input */}
        <div className="connection-section">
          <div className="connection-title">Remote Control</div>
          <div className="remote-input-container">
            <input
              type="text"
              placeholder="Enter remote ID"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              className="remote-input"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button className="connect-btn" onClick={handleConnect} disabled={!remoteId}>
              Connect
            </button>
          </div>
        </div>

        {/* Tabs for Address Book / Recent */}
        <div className="tabs-container">
          <button
            className={`tab ${activeTab === 'addressBook' ? 'active' : ''}`}
            onClick={() => setActiveTab('addressBook')}
          >
            Address Book
          </button>
          <button
            className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent
          </button>
        </div>

        {/* Placeholder for peer list */}
        <div className="peer-list-container">
          {activeTab === 'addressBook' ? (
            <div className="empty-state">
              <p>No saved peers</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>No recent connections</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
