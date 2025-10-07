
import { ReactElement } from 'react';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Tasks from './pages/Tasks';
import Pipeline from './pages/Pipeline';
import Jobs from './pages/Jobs';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WhatsApp from './pages/WhatsApp';
import Marketing from './pages/Marketing';
import Automation from './pages/Automation';
import Webhooks from './pages/Webhooks';
import WhatsAppWeb from './pages/WhatsAppWeb';
import Debriefing from './pages/Debriefing';
import DebriefingView from './pages/DebriefingView';
import Outbound from './pages/Outbound';
import Atendimento from './pages/Atendimento';
import CanalComunicacao from './pages/CanalComunicacao';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import TVDashboard from './pages/TVDashboard';

export interface NavItem {
  to: string;
  page: ReactElement;
  protected: boolean;
}

export const navItems: NavItem[] = [
  { to: '/', page: <Index />, protected: false },
  { to: '/dashboard', page: <Dashboard />, protected: true },
  { to: '/leads', page: <Leads />, protected: true },
  { to: '/tasks', page: <Tasks />, protected: true },
  { to: '/pipeline', page: <Pipeline />, protected: true },
  { to: '/jobs', page: <Jobs />, protected: true },
  { to: '/reports', page: <Reports />, protected: true },
  { to: '/settings', page: <Settings />, protected: true },
  { to: '/automation', page: <Automation />, protected: true },
  { to: '/atendimento', page: <Atendimento />, protected: true },
  
  { to: '/whatsapp', page: <WhatsApp />, protected: true },
  { to: '/whatsapp-web', page: <WhatsAppWeb />, protected: true },
  { to: '/debriefing', page: <Debriefing />, protected: true },
  { to: '/debriefing/:id', page: <DebriefingView />, protected: true },
  
  { to: '/marketing', page: <Marketing />, protected: true },
  { to: '/webhooks', page: <Webhooks />, protected: true },
  { to: '/tv-dashboard', page: <TVDashboard />, protected: true },
  { to: '/auth', page: <Auth />, protected: false },
  { to: '*', page: <NotFound />, protected: false },
];
