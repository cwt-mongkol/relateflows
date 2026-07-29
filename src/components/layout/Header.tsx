import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  Bell, 
  Zap, 
  CheckCircle2,
  Calendar,
  Menu
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { t } = useSettings();
  const { 
    currentView, 
    notificationCount,
    clearNotifications
  } = useCRM();

  const getPageMeta = () => {
    switch (currentView) {
      case 'dashboard':
        return { title: t('page.dashboard'), desc: t('page.dashboard.desc') };
      case 'inbox':
        return { title: t('page.inbox'), desc: t('page.inbox.desc') };
      case 'pipeline':
        return { title: t('page.pipeline'), desc: t('page.pipeline.desc') };
      case 'contacts':
        return { title: t('page.contacts'), desc: t('page.contacts.desc') };
      case 'workflows':
        return { title: t('page.workflows'), desc: t('page.workflows.desc') };
      case 'analytics':
        return { title: t('page.analytics'), desc: t('page.analytics.desc') };
      case 'calendar':
        return { title: t('page.calendar'), desc: t('page.calendar.desc') };
      case 'cs-queue':
        return { title: t('page.csQueue'), desc: t('page.csQueue.desc') };
      case 'settings':
        return { title: t('page.settings'), desc: t('page.settings.desc') };
      default:
        return { title: t('page.default'), desc: t('page.default.desc') };
    }
  };

  const meta = getPageMeta();

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Title & View Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{meta.title}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{meta.desc}</p>
        </div>
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="dropdown dropdown-end">
          <button 
            tabIndex={0}
            className="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white animate-bounce">
                {notificationCount}
              </span>
            )}
          </button>
          
          <div 
            tabIndex={0} 
            className="dropdown-content z-[100] menu p-4 shadow-xl bg-white rounded-2xl border border-slate-100 w-80 mt-2 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-sm text-slate-900">{t('header.notifications')}</h4>
              {notificationCount > 0 && (
                <button 
                  onClick={clearNotifications}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  {t('header.markAllRead')}
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">{t('header.notif.dealWon')}</p>
                  <p className="text-slate-500 text-[11px]">{t('header.notif.dealWonDesc')}</p>
                  <span className="text-[10px] text-blue-600 font-medium mt-1 inline-block">10m ago</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-100 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">{t('header.notif.automation')}</p>
                  <p className="text-slate-500 text-[11px]">{t('header.notif.automationDesc')}</p>
                  <span className="text-[10px] text-yellow-600 font-medium mt-1 inline-block">1h ago</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">{t('header.notif.meeting')}</p>
                  <p className="text-slate-500 text-[11px]">{t('header.notif.meetingDesc')}</p>
                  <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">3h ago</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
