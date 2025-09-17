
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { navItems } from "./nav-items"
import ProtectedRoute from "./components/ProtectedRoute"
import LeadDetailPage from "./components/leads/LeadDetailPage"
import TaskDetailPage from "./components/tasks/TaskDetailPage"
import JobDetailPage from "./components/jobs/JobDetailPage"
import DebriefingEdit from "./pages/DebriefingEdit"
import DebriefingCreate from "./pages/DebriefingCreate"
import DebriefingView from "./pages/DebriefingView"
import Outbound from "./pages/Outbound"
import SuperAdmin from "./pages/SuperAdmin"
const queryClient = new QueryClient()

const App = () => {
  // Schedulers agora funcionam via cron jobs no banco de dados
  // Removido useN8nAutoProcessor() para evitar conflitos
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {navItems.map(({ to, page, protected: isProtected }) => (
              <Route
                key={to}
                path={to}
                element={isProtected ? <ProtectedRoute>{page}</ProtectedRoute> : page}
              />
            ))}
            <Route path="/leads/:id" element={<ProtectedRoute><LeadDetailPage /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
            <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
            <Route path="/debriefing/create" element={<ProtectedRoute><DebriefingCreate /></ProtectedRoute>} />
            <Route path="/debriefing/:id" element={<ProtectedRoute><DebriefingView /></ProtectedRoute>} />
            <Route path="/debriefing/:id/edit" element={<ProtectedRoute><DebriefingEdit /></ProtectedRoute>} />
            <Route path="/outbound" element={<ProtectedRoute><Outbound /></ProtectedRoute>} />
            <Route path="/super-adm-sys" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
