import { Routes, Route, NavLink } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlannerPage from './pages/PlannerPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-panel border-b border-border px-6 py-3 flex items-center gap-8 shrink-0">
        <span className="text-accent font-bold text-lg tracking-tight">
          XIV Mit Planner
        </span>
        <div className="flex gap-4">
          {[
            { to: '/', label: 'Plans' },
            { to: '/admin', label: 'Admin' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plan/:planId" element={<PlannerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}
