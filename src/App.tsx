import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Chat } from './pages/Chat'
import { NewsList } from './pages/NewsList'
import { NewsEdit } from './pages/NewsEdit'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Settings } from './pages/Settings'
import { Config } from './pages/Config'
import { isAuthenticated, subscribeToAuthChange } from './lib/auth'

function App() {
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated())

  useEffect(() => {
    return subscribeToAuthChange(() => {
      setAuthenticated(isAuthenticated())
    })
  }, [])

  if (!authenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/news" element={<NewsList />} />
            <Route path="/news/edit/:id?" element={<NewsEdit />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/config" element={<Config />} />
            <Route path="/login" element={<Navigate to="/chat" replace />} />
            <Route path="/register" element={<Navigate to="/chat" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
