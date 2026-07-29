import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
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
  Shield,
  Building2,
  Check,
  Headphones,
} from 'lucide-react';

import { SalesRepToggle } from './SalesRepToggle';

interface SidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const { currentView, setCurrentView, deals, contacts, workflows, leads, tasks, setIsAddDealModalOpen } = useCRM();
  const { user, logout, userTenants, switchTenant } = useAuth();
  const { canNav, roleName, roleId } = usePermissions();
  const { t } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const activeDealsCount = deals.filter(d => d.stage !== 'closed_lost').length;

  const allNavItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'dashboard',
      label: t('sidebar.dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'inbox',
      label: t('sidebar.inbox'),
      icon: <MessageCircle className="w-5 h-5" />,
      badge: leads.reduce((s, l) => s + l.unreadCount, 0)
    },
    {
      id: 'pipeline',
      label: t('sidebar.pipeline'),
      icon: <Kanban className="w-5 h-5" />,
      badge: activeDealsCount
    },
    {
      id: 'contacts',
      label: t('sidebar.contacts'),
      icon: <Users className="w-5 h-5" />,
      badge: contacts.length
    },
    {
      id: 'workflows',
      label: t('sidebar.workflows'),
      icon: <Zap className="w-5 h-5" />,
      badge: workflows.filter((w) => w.status === 0).length
    },
    {
      id: 'tasks',
      label: t('sidebar.tasks'),
      icon: <ClipboardList className="w-5 h-5" />,
      badge: tasks.filter((tk) => tk.status !== 'done').length
    },
    {
      id: 'calendar',
      label: t('sidebar.calendar'),
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: t('sidebar.analytics'),
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'cs-queue',
      label: t('sidebar.csQueue'),
      icon: <Headphones className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: <Settings className="w-5 h-5" />
    }
  ];

  const navItems = allNavItems.filter(n => canNav(n.id));

  const handleSignOut = () => {
    setShowSignOutModal(false);
    setShowUserMenu(false);
    logout();
  };

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="relative p-4 border-b border-slate-100 flex items-center w-full text-left">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center w-full text-left hover:bg-slate-50 transition-all cursor-pointer rounded-lg"
        >
          <img src="/rf.png?v=1" alt="RelateFlows" className="w-9 h-9 object-contain shrink-0" />
          {!collapsed && (
            <div className="truncate ml-3">
              <h1 className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1">
                <span className="text-blue-600">Relate</span><span className="text-yellow-400">Flows</span>
              </h1>
            </div>
          )}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shadow-sm z-10"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="p-3">
        <button
          onClick={() => {
            setIsAddDealModalOpen(true);
            setMobileMenuOpen?.(false);
          }}
          className={`w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl shadow-md rf-yellow-glow flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
            collapsed ? 'p-2.5' : 'py-2.5 px-4'
          }`}
          title={collapsed ? t('sidebar.newDeal') : undefined}
        >
          <Plus className="w-5 h-5 stroke-[2.5] shrink-0" />
          {!collapsed && <span>{t('sidebar.newDeal')}</span>}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('sidebar.mainMenu')}
          </div>
        )}
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setMobileMenuOpen?.(false);
              }}
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
        <div className="p-3 m-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('sidebar.q3Goals')}</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mb-2">
            {t('sidebar.pipelineForecast').replace('{pct}', '82%')}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: '82%' }} />
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-400">
            <span>{t('sidebar.target').replace('{target}', '350k')}</span>
            <span className="font-bold text-blue-600">$287k</span>
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
                {/* Tenant Switcher */}
                {userTenants.length > 1 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('sidebar.company') || 'Company'}
                    </div>
                    {userTenants.map((tenant) => (
                      <button
                        key={tenant.tenantId}
                        onClick={() => {
                          setShowUserMenu(false);
                          if (tenant.tenantId !== user?.tenantId) {
                            switchTenant(tenant.tenantId);
                          }
                        }}
                        disabled={tenant.status !== 'active'}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          tenant.tenantId === user?.tenantId
                            ? 'bg-blue-50 text-blue-700'
                            : tenant.status !== 'active'
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{tenant.name}</span>
                        {tenant.tenantId === user?.tenantId && (
                          <Check className="w-3.5 h-3.5 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                    <hr className="my-1 border-slate-100" />
                  </>
                )}
                {roleId === 5 && (
                  <>
                    <SalesRepToggle />
                    <hr className="my-1 border-slate-100" />
                  </>
                )}
                <button
                  onClick={() => { setShowUserMenu(false); setCurrentView('settings'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>{t('sidebar.settings')}</span>
                </button>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={() => setShowSignOutModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('sidebar.signOut')}</span>
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
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex md:flex-col ${
          collapsed ? 'w-[68px]' : 'w-64'
        } bg-white border-r border-slate-200 h-screen sticky top-0 z-30 shadow-sm transition-all duration-300`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen?.(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col shadow-2xl md:hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/rf.png?v=1" alt="RelateFlows" className="w-8 h-8 object-contain" />
                <h1 className="font-extrabold text-lg tracking-tight text-slate-900">
                  <span className="text-blue-600">Relate</span><span className="text-yellow-400">Flows</span>
                </h1>
              </div>
              <button
                onClick={() => setMobileMenuOpen?.(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileMenuOpen?.(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl font-medium text-sm transition-all duration-200 group px-3.5 py-2.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
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
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full ring-2 ring-blue-500 ring-offset-2 shrink-0">
                  <img src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'} alt={user?.name || 'User'} className="rounded-full" />
                </div>
                <div className="truncate text-left flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{user?.name || 'User'}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{roleName}</p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSignOutModal(false)}>
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 pb-0">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center mb-4 ring-1 ring-red-200/50">
                  <LogOut className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{t('sidebar.signOutTitle')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('sidebar.signOutDesc')}</p>
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="mx-6 mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <img
                  src={user.avatar || 'https://i.pravatar.cc/150?u=default'}
                  alt={user.name || user.email}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name || user.email}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                {t('sidebar.signOutConfirm')}
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 pt-4 flex items-center gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                {t('sidebar.cancel')}
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-200/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('sidebar.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
