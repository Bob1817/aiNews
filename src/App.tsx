import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { Chat } from './pages/Chat'
import { NewsList } from './pages/NewsList'
import { NewsEdit } from './pages/NewsEdit'
import { SavedFileWorkbench } from './pages/SavedFileWorkbench'
import { Settings } from './pages/Settings'
import { Config } from './pages/Config'
import { Workflows } from './pages/Workflows'
import { History } from './pages/History'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-shell flex h-screen overflow-hidden text-editorial-ink">
        <div className="flex flex-1 flex-col overflow-hidden">
          <TitleBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="relative flex-1 overflow-hidden bg-transparent">
              <div className="relative flex h-full flex-col overflow-hidden p-3 md:p-4">
                <div className="surface-panel flex-1 overflow-hidden">
                  <Routes>
                    <Route path="/" element={<Navigate to="/chat/new" replace />} />
                    <Route path="/chat" element={<Navigate to="/chat/new" replace />} />
                    <Route path="/chat/:conversationId" element={<Chat />} />
                    <Route path="/workflows" element={<Workflows />} />
                    <Route path="/news" element={<NewsList />} />
                    <Route path="/news/edit/:id?" element={<NewsEdit />} />
                    <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/config" element={<Config />} />
                  </Routes>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
