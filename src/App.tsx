import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { PipelineView } from './components/pipeline/PipelineView';
import { ContactsView } from './components/contacts/ContactsView';
import { WorkflowsView } from './components/workflows/WorkflowsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { InboxView } from './components/inbox/InboxView';
import { CalendarView } from './components/calendar/CalendarView';
import { TasksView } from './components/tasks/TasksView';
import { CsQueueView } from './components/cs-queue/CsQueueView';
import { ChatBot } from './components/chatbot/ChatBot';
import { AddDealModal } from './components/modals/AddDealModal';
import { AddContactModal } from './components/modals/AddContactModal';
import { AddWorkflowModal } from './components/modals/AddWorkflowModal';
import { ContactDrawer } from './components/drawers/ContactDrawer';
import { DealDetailModal } from './components/modals/DealDetailModal';
import { LoginPage } from './components/auth/LoginPage';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';

const MainContent: React.FC = () => {
  const { currentView } = useCRM();

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    inbox: <InboxView />,
    pipeline: <PipelineView />,
    contacts: <ContactsView />,
    workflows: <WorkflowsView />,
    analytics: <AnalyticsView />,
    calendar: <CalendarView />,
    tasks: <TasksView />,
    'cs-queue': <CsQueueView />,
    settings: <SettingsView />,
  };

  return (
    <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
      {views[currentView] || (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <span className="text-4xl font-extrabold text-slate-300">404</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Page not found</h2>
          <p className="text-sm text-slate-500 mb-6">The view "{currentView}" does not exist.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all">
            Reload App
          </button>
        </div>
      )}
    </main>
  );
};

const DashboardApp: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <CRMProvider>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
          <MainContent />
        </div>

        <ChatBot />
        <AddDealModal />
        <AddContactModal />
        <AddWorkflowModal />
        <DealDetailModal />
        <ContactDrawer />
      </div>
    </CRMProvider>
  );
};

export function App() {
  const { isAuthenticated, loginWithLine } = useAuth();
  const [lineProcessing, setLineProcessing] = useState(false);

  // LINE OAuth 2.0 Callback Handler
  // After LINE redirects back to our app with ?code=xxx&state=line-login
  // we intercept here, send the code to backend, then clean up the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state === 'line-login') {
      // Clean URL immediately to prevent re-processing on hot reload
      window.history.replaceState({}, '', window.location.pathname);
      setLineProcessing(true);
      loginWithLine(code).finally(() => setLineProcessing(false));
    }
  }, [loginWithLine]);

  if (lineProcessing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <img src="/rf.png?v=1" alt="RelateFlows" className="w-16 h-16 object-contain animate-pulse" />
        <p className="text-sm font-semibold text-slate-500">กำลังเข้าสู่ระบบด้วย LINE...</p>
        <span className="loading loading-spinner loading-md text-slate-400" />
      </div>
    );
  }

  // Public legal pages (no auth required)
  const path = window.location.pathname;
  if (path === '/privacy' || path === '/privacy-policy') {
    return <PrivacyPolicy />;
  }
  if (path === '/terms' || path === '/terms-of-service') {
    return <TermsOfService />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <DashboardApp />;
}

export default App;
