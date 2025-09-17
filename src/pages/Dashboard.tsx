
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import { useN8nScheduler } from '@/hooks/useN8nScheduler';
import { useAutomationProcessor } from '@/hooks/useAutomationProcessor';
import { useEffect } from 'react';

export default function Dashboard() {
  // Iniciar o scheduler automático do N8N
  useN8nScheduler();
  
  // Inicializar processador de automação
  useAutomationProcessor();

  // SEO
  useEffect(() => {
    document.title = 'Dashboard NexCRM – Leads e Tarefas';
    const desc = 'Visão geral do NexCRM com total de leads, tarefas e UTMs.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', window.location.origin + '/dashboard');
  }, []);

  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  );
}
