import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../lib/permissions';
import type { NavView } from '../../types/crm';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Zap,
  BarChart3,
  Settings,
  Calendar,
  MessageCircle,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Plus,
  LogOut,
  X,
  AlertTriangle,
  Shield
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, deals, contacts, workflows, leads, tasks, setIsAddDealModalOpen } = useCRM();
  const { user, logout } = useAuth();
  const { canNav, roleName } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const activeDealsCount = deals.filter(d => d.stage !== 'closed_lost').length;

  const allNavItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'inbox',
      label: 'Social Inbox',
      icon: <MessageCircle className="w-5 h-5" />,
      badge: leads.reduce((s, l) => s + l.unreadCount, 0)
    },
    {
      id: 'pipeline',
      label: 'Sales Pipeline',
      icon: <Kanban className="w-5 h-5" />,
      badge: activeDealsCount
    },
    {
      id: 'contacts',
      label: 'Contacts & Leads',
      icon: <Users className="w-5 h-5" />,
      badge: contacts.length
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <Zap className="w-5 h-5" />,
      badge: workflows.filter((w) => w.status === 0).length
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: tasks.filter((t) => t.status !== 'done').length
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  const navItems = allNavItems.filter(n => canNav(n.id));

  const handleSignOut = () => {
    setShowSignOutModal(false);
    setShowUserMenu(false);
    logout();
  };

  return (
    <>
      <aside
        className={`${
          collapsed ? 'w-[68px]' : 'w-64'
        } bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-30 shadow-sm transition-all duration-300`}
      >
        {/* Brand Header */}
        <div className="relative p-4 border-b border-slate-100 flex items-center">
          <img src="/rf.png?v=1" alt="RelateFlows" className="w-9 h-9 rounded-xl object-contain shadow-sm bg-blue-50 p-1 shrink-0" />
          {!collapsed && (
            <div className="truncate ml-3">
              <h1 className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1">
                <span className="text-blue-600">Relate</span><span className="text-yellow-400">Flows</span>
              </h1>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shadow-sm z-10"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          <button
            onClick={() => setIsAddDealModalOpen(true)}
            className={`w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl shadow-md rf-yellow-glow flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              collapsed ? 'p-2.5' : 'py-2.5 px-4'
            }`}
            title={collapsed ? 'New Sales Deal' : undefined}
          >
            <Plus className="w-5 h-5 stroke-[2.5] shrink-0" />
            {!collapsed && <span>New Sales Deal</span>}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Main Menu
            </div>
          )}
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center justify-between rounded-xl font-medium text-sm transition-all duration-200 group ${
                  collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Pro Card (hidden when collapsed) */}
        {!collapsed && (
          <div className="p-3 m-2 rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 text-white relative overflow-hidden shadow-lg">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-yellow-400/15 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-300" />
              <span className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider">Q3 Goals</span>
            </div>
            <p className="text-[11px] font-medium text-blue-100 mb-2">
              Pipeline forecast reached <span className="font-bold text-white">82%</span> of monthly quota.
            </p>
            <div className="w-full bg-blue-950/60 rounded-full h-1.5 overflow-hidden mb-1.5">
              <div className="bg-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: '82%' }} />
            </div>
            <div className="flex justify-between items-center text-[9px] text-blue-200">
              <span>Target: $350k</span>
              <span className="font-bold text-yellow-300">$287k</span>
            </div>
          </div>
        )}

        {/* User Info Footer */}
        <div className="relative p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 transition-all hover:opacity-80 ${collapsed ? 'justify-center' : ''}`}
          >
              <div className="avatar shrink-0">
                <div className="w-8 h-8 rounded-full ring-2 ring-blue-500 ring-offset-2">
                  <img src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'} alt={user?.name || 'User'} />
                </div>
              </div>
              {!collapsed && (
                <>
                  <div className="truncate text-left flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{user?.name || 'User'}</h4>
                    <p className="text-[10px] text-slate-500 truncate">{roleName}</p>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
                </>
              )}
          </button>

          {/* User Dropdown Menu (right side) */}
          {showUserMenu && (
            <>
              <div className="absolute left-full bottom-0 ml-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-40">
                <div className="p-2 space-y-0.5">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    {roleName}
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); setCurrentView('settings'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </button>
                  <hr className="my-1 border-slate-100" />
                  <button
                    onClick={() => setShowSignOutModal(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowUserMenu(false)}
              />
            </>
          )}
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-red-600 to-red-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Sign Out</h3>
                  <p className="text-xs text-red-100">End your current session</p>
                </div>
              </div>
              <button
                onClick={() => setShowSignOutModal(false)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Are you sure you want to sign out?</p>
                  <p className="text-xs text-slate-500 mt-1">
                    You will need to log in again to access your pipeline, contacts, and workflows.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowSignOutModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
