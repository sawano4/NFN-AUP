import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import ChatBot from './components/ChatBot'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Sources from './pages/Sources'
import Lots from './pages/Lots'
import Users from './pages/Users'
import Shipments from './pages/Shipments'
import Receipts from './pages/Receipts'
import Classifications from './pages/Classifications'
import Exceptions from './pages/Exceptions'
import Documents from './pages/Documents'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Depots from './pages/Depots'
import Laveries from './pages/Laveries'
import Transformateurs from './pages/Transformateurs'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
      <Route path="/sources" element={<PrivateRoute><Sources /></PrivateRoute>} />
      <Route path="/lots" element={<PrivateRoute><Lots /></PrivateRoute>} />
      <Route path="/shipments" element={<PrivateRoute><Shipments /></PrivateRoute>} />
      <Route path="/receipts" element={<PrivateRoute><Receipts /></PrivateRoute>} />
      <Route path="/classifications" element={<PrivateRoute><Classifications /></PrivateRoute>} />
      <Route path="/exceptions" element={<PrivateRoute><Exceptions /></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/depots" element={<PrivateRoute><Depots /></PrivateRoute>} />
      <Route path="/laveries" element={<PrivateRoute><Laveries /></PrivateRoute>} />
      <Route path="/transformateurs" element={<PrivateRoute><Transformateurs /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ChatBotGuard() {
  const { token } = useAuth()
  return token ? <ChatBot /> : null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ChatBotGuard />
      </BrowserRouter>
    </AuthProvider>
  )
}
