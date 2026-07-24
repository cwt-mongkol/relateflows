import React from 'react';
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
import { AddDealModal } from './components/modals/AddDealModal';
import { AddContactModal } from './components/modals/AddContactModal';
import { AddWorkflowModal } from './components/modals/AddWorkflowModal';
import { ContactDrawer } from './components/drawers/ContactDrawer';
import { DealDetailModal } from './components/modals/DealDetailModal';
import { LoginPage } from './components/auth/LoginPage';

const MainContent: React.FC = () => {
  const { currentView } = useCRM();

  return (
    <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'inbox' && <InboxView />}
      {currentView === 'pipeline' && <PipelineView />}
      {currentView === 'contacts' && <ContactsView />}
      {currentView === 'workflows' && <WorkflowsView />}
      {currentView === 'analytics' && <AnalyticsView />}
      {currentView === 'calendar' && <CalendarView />}
      {currentView === 'tasks' && <TasksView />}
      {currentView === 'settings' && <SettingsView />}
    </main>
  );
};

const DashboardApp: React.FC = () => {
  return (
    <CRMProvider>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <MainContent />
        </div>

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
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <DashboardApp />;
}

export default App;
