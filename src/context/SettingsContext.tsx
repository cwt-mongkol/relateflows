import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'en' | 'th' | 'zn';

export interface IntegrationKeys {
  googleClientId: string;
  googleClientSecret: string;
  lineChannelAccessToken: string;
  lineChannelSecret: string;
  fbAppId: string;
  fbAppSecret: string;
  fbPageAccessToken: string;
  fbPageId: string;
  instagramBusinessId: string;
  instagramAccessToken: string;
}

interface UserSettings {
  theme: ThemeMode;
  language: Language;
  primaryColor: string;
  accentColor: string;
  integrations: IntegrationKeys;
}

interface SettingsContextType {
  settings: UserSettings;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  language: Language;
  setLanguage: (lang: Language) => void;
  primaryColor: string;
  setPrimaryColor: (c: string) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  integrations: IntegrationKeys;
  setIntegrationKey: (key: keyof IntegrationKeys, value: string) => void;
  t: (key: string) => string;
  saveSettings: () => void;
  savedSuccess: boolean;
}

const DEFAULT_INTEGRATIONS: IntegrationKeys = {
  googleClientId: '',
  googleClientSecret: '',
  lineChannelAccessToken: '',
  lineChannelSecret: '',
  fbAppId: '',
  fbAppSecret: '',
  fbPageAccessToken: '',
  fbPageId: '',
  instagramBusinessId: '',
  instagramAccessToken: '',
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'en',
  primaryColor: '#1D4ED8',
  accentColor: '#EAB308',
  integrations: { ...DEFAULT_INTEGRATIONS },
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',
    'settings.subtitle': 'Configure your preferences, language, and appearance.',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.system': 'System',
    'settings.save': 'Save Settings',
    'settings.saved': 'Preferences saved successfully!',
    'settings.appearance': 'Appearance',
    'brand.primary': 'Primary Base Color',
    'brand.accent': 'Accent Color',
    'brand.palette': 'Brand Color Palette',
    'theme.light': 'Light Mode',
    'theme.dark': 'Dark Mode',
    'theme.system': 'System Default',
    'nav.stages': 'Sales Pipeline Stages',
    'page.dashboard': 'Executive Overview',
    'page.dashboard.desc': 'Welcome back, Sarah. Here is your sales pipeline status.',
    'page.inbox': 'Social Inbox',
    'page.inbox.desc': 'Unified inbox — Facebook, Instagram, LINE messages in one place.',
    'page.pipeline': 'Sales Pipeline & Kanban',
    'page.pipeline.desc': 'Manage deals, drag across stages, and close opportunities.',
    'page.contacts': 'Contacts & Accounts',
    'page.contacts.desc': 'Comprehensive CRM customer list and lead qualification.',
    'page.workflows': 'RelateFlows Automation Engine',
    'page.workflows.desc': 'Active triggers, automated email rules, and lead routing.',
    'page.analytics': 'Sales Analytics & Reports',
    'page.analytics.desc': 'Revenue breakdowns, win-rate metrics, and performance charts.',
    'page.calendar': 'Calendar',
    'page.calendar.desc': 'Manage appointments, meetings, and events.',
    'page.settings': 'System Settings',
    'page.settings.desc': 'Configure brand theme, user roles, integrations, and API keys.',
    'page.default': 'RelateFlows CRM',
    'page.default.desc': 'Customer Relationship Management',
    'status.scheduled': 'Scheduled',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    'status.pending': 'Pending',
    'status.quoted': 'Quoted',
    'status.ordered': 'Ordered',
    'status.delivered': 'Delivered',
    'status.active': 'Active',
    'status.paused': 'Paused',
    'status.inactive': 'Inactive',
    'guest.yes': 'Yes',
    'guest.no': 'No',
    'guest.awaiting': 'Awaiting',
    'guest.maybe': 'Maybe',
    'type.activity': 'Activity',
    'type.meeting': 'Meeting',
    'type.appointment': 'Appointment',
    'calendar.month': 'Month',
    'calendar.week': 'Week',
    'calendar.day': 'Day',
    'calendar.newEvent': 'New Event',
    'calendar.today': 'Today',
    'calendar.eventDetails': 'Event Details',
    'calendar.aboutEvent': 'About this event',
    'calendar.markCompleted': 'Mark as Completed',
    'calendar.copyDetails': 'Copy event details',
    'calendar.editEvent': 'Edit event',
    'calendar.deleteEvent': 'Delete event',
    'calendar.title': 'Title',
    'calendar.dateTime': 'Date & Time',
    'calendar.start': 'Start',
    'calendar.end': 'End',
    'calendar.eventType': 'Event Type',
    'calendar.status': 'Status',
    'calendar.location': 'Location',
    'calendar.description': 'Description',
    'calendar.assignMembers': 'Assign Team Members',
    'calendar.searchMembers': 'Search by name...',
    'calendar.cancel': 'Cancel',
    'calendar.create': 'Create Event',
    'calendar.update': 'Update Event',
    'calendar.guests': 'guests',
    'calendar.noGuests': 'No guests yet',
    'calendar.invitingTo': '{organizer} is inviting you to a scheduled {type}.',
    'calendar.linkedLead': 'Linked lead',
    'calendar.viewInGoogle': 'View in Google Calendar',
    'calendar.willSync': 'Will sync to Google Calendar',
    'calendar.syncOff': 'Google Calendar auto-sync is off',
    'calendar.membersAssigned': '{count} members assigned',
    'calendar.inviteGuests': 'Invite guests',
    'calendar.newEventDesc': 'Schedule a new appointment',
    'calendar.editEventDesc': 'Update appointment details',
    'calendar.noEvents': 'No events scheduled for this day',
    'calendar.upcomingFor': 'upcoming events for',
    'calendar.noMembers': 'No members found',
    'calendar.reminder': '10 min before',
    'calendar.nEvents': '{count} events',
    'calendar.invitedBy': 'is inviting you to a scheduled',
    'calendar.noLinkedLead': 'No linked lead',
    'calendar.linkLead': 'Link Lead',
    'integrations.title': 'Integrations & API Keys',
    'integrations.subtitle': 'Configure API credentials for external services. Saved keys are used by the backend at runtime.',
    'integrations.google': 'Google API',
    'integrations.google.desc': 'Client ID & Secret for Google Calendar sync',
    'integrations.google.clientId': 'Client ID',
    'integrations.google.clientSecret': 'Client Secret',
    'integrations.line': 'LINE Messaging API',
    'integrations.line.desc': 'Channel Access Token & Secret for LINE inbox',
    'integrations.line.token': 'Channel Access Token',
    'integrations.line.secret': 'Channel Secret',
    'integrations.facebook': 'Facebook Graph API',
    'integrations.facebook.desc': 'App credentials & Page token for Facebook inbox',
    'integrations.facebook.appId': 'App ID',
    'integrations.facebook.appSecret': 'App Secret',
    'integrations.facebook.pageToken': 'Page Access Token',
    'integrations.facebook.pageId': 'Page ID',
    'integrations.instagram': 'Instagram Graph API',
    'integrations.instagram.desc': 'Business Account ID & token for Instagram inbox',
    'integrations.instagram.businessId': 'Business Account ID',
    'integrations.instagram.token': 'Access Token',
    'integrations.saved': 'API keys saved securely with your settings.',
  },
  th: {
    'settings.title': 'ตั้งค่า',
    'settings.subtitle': 'กำหนดค่ากำหนด ภาษา และลักษณะที่ปรากฏ',
    'settings.language': 'ภาษา',
    'settings.theme': 'ธีม',
    'settings.light': 'สว่าง',
    'settings.dark': 'มืด',
    'settings.system': 'ตามระบบ',
    'settings.save': 'บันทึกการตั้งค่า',
    'settings.saved': 'บันทึกการตั้งค่าเรียบร้อยแล้ว!',
    'settings.appearance': 'ลักษณะที่ปรากฏ',
    'brand.primary': 'สีหลัก',
    'brand.accent': 'สีเน้น',
    'brand.palette': 'จานสีแบรนด์',
    'theme.light': 'โหมดสว่าง',
    'theme.dark': 'โหมดมืด',
    'theme.system': 'ค่าเริ่มต้นของระบบ',
    'nav.stages': 'ขั้นตอนการขาย',
    'page.dashboard': 'ภาพรวมผู้บริหาร',
    'page.dashboard.desc': 'ยินดีต้อนรับกลับ Sarah นี่คือสถานะไปป์ไลน์การขายของคุณ',
    'page.inbox': 'กล่องข้อความรวม',
    'page.inbox.desc': 'กล่องข้อความรวม — Facebook, Instagram, LINE ข้อความทั้งหมดในที่เดียว',
    'page.pipeline': 'ไปป์ไลน์การขาย & Kanban',
    'page.pipeline.desc': 'จัดการดีล ลากข้ามขั้นตอน และปิดการขาย',
    'page.contacts': 'ผู้ติดต่อและบัญชี',
    'page.contacts.desc': 'รายชื่อลูกค้า CRM และการคัดกรองลีด',
    'page.workflows': 'RelateFlows อัตโนมัติ',
    'page.workflows.desc': 'ทริกเกอร์ กฎอีเมลอัตโนมัติ และการจัดเส้นทางลีด',
    'page.analytics': 'รายงานการวิเคราะห์การขาย',
    'page.analytics.desc': 'รายละเอียดรายได้ เมตริกอัตราชนะ และกราฟประสิทธิภาพ',
    'page.calendar': 'ปฏิทิน',
    'page.calendar.desc': 'จัดการการนัดหมาย การประชุม และกิจกรรมต่างๆ',
    'page.settings': 'การตั้งค่าระบบ',
    'page.settings.desc': 'กำหนดค่าธีมแบรนด์ บทบาทผู้ใช้ การเชื่อมต่อ และคีย์ API',
    'page.default': 'RelateFlows CRM',
    'page.default.desc': 'การจัดการความสัมพันธ์ลูกค้า',
    'status.scheduled': 'นัดหมายแล้ว',
    'status.completed': 'เสร็จสิ้น',
    'status.cancelled': 'ยกเลิก',
    'status.pending': 'รอดำเนินการ',
    'status.quoted': 'เสนอราคา',
    'status.ordered': 'สั่งซื้อแล้ว',
    'status.delivered': 'ส่งแล้ว',
    'status.active': 'กำลังทำงาน',
    'status.paused': 'หยุดชั่วคราว',
    'status.inactive': 'ไม่ได้ใช้งาน',
    'guest.yes': 'ใช่',
    'guest.no': 'ไม่',
    'guest.awaiting': 'รอตอบรับ',
    'guest.maybe': 'บางที',
    'type.activity': 'กิจกรรม',
    'type.meeting': 'ประชุม',
    'type.appointment': 'นัดหมาย',
    'calendar.month': 'เดือน',
    'calendar.week': 'สัปดาห์',
    'calendar.day': 'วัน',
    'calendar.newEvent': 'กิจกรรมใหม่',
    'calendar.today': 'วันนี้',
    'calendar.eventDetails': 'รายละเอียดกิจกรรม',
    'calendar.aboutEvent': 'เกี่ยวกับกิจกรรมนี้',
    'calendar.markCompleted': 'ทำเครื่องหมายว่าเสร็จสิ้น',
    'calendar.copyDetails': 'คัดลอกรายละเอียด',
    'calendar.editEvent': 'แก้ไขกิจกรรม',
    'calendar.deleteEvent': 'ลบกิจกรรม',
    'calendar.title': 'ชื่อ',
    'calendar.dateTime': 'วันที่และเวลา',
    'calendar.start': 'เริ่ม',
    'calendar.end': 'สิ้นสุด',
    'calendar.eventType': 'ประเภทกิจกรรม',
    'calendar.status': 'สถานะ',
    'calendar.location': 'สถานที่',
    'calendar.description': 'คำอธิบาย',
    'calendar.assignMembers': 'กำหนดสมาชิกทีม',
    'calendar.searchMembers': 'ค้นหาด้วยชื่อ...',
    'calendar.cancel': 'ยกเลิก',
    'calendar.create': 'สร้างกิจกรรม',
    'calendar.update': 'อัปเดตกิจกรรม',
    'calendar.guests': 'คน',
    'calendar.noGuests': 'ยังไม่มีผู้เข้าร่วม',
    'calendar.invitingTo': '{organizer} กำลังเชิญคุณเข้าร่วม {type}',
    'calendar.linkedLead': 'ลีดที่เกี่ยวข้อง',
    'calendar.viewInGoogle': 'ดูใน Google ปฏิทิน',
    'calendar.willSync': 'จะซิงค์กับ Google ปฏิทิน',
    'calendar.syncOff': 'ปิดการซิงค์อัตโนมัติกับ Google ปฏิทิน',
    'calendar.membersAssigned': '{count} คนที่ได้รับมอบหมาย',
    'calendar.inviteGuests': 'เชิญผู้เข้าร่วม',
    'calendar.newEventDesc': 'กำหนดการนัดหมายใหม่',
    'calendar.editEventDesc': 'อัปเดตรายละเอียดการนัดหมาย',
    'calendar.noEvents': 'ไม่มีกิจกรรมในวันนี้',
    'calendar.upcomingFor': 'กิจกรรมที่จะมาถึงของ',
    'calendar.noMembers': 'ไม่พบสมาชิก',
    'calendar.reminder': '10 นาทีก่อน',
    'calendar.nEvents': '{count} กิจกรรม',
    'calendar.invitedBy': 'กำลังเชิญคุณเข้าร่วม',
    'calendar.noLinkedLead': 'ไม่มีลีดที่เกี่ยวข้อง',
    'calendar.linkLead': 'เชื่อมโยงลีด',
    'integrations.title': 'การเชื่อมต่อและคีย์ API',
    'integrations.subtitle': 'กำหนดค่า API สำหรับบริการภายนอก คีย์จะถูกใช้โดยระบบหลังบ้าน',
    'integrations.google': 'Google API',
    'integrations.google.desc': 'Client ID และ Secret สำหรับซิงค์ Google ปฏิทิน',
    'integrations.google.clientId': 'Client ID',
    'integrations.google.clientSecret': 'Client Secret',
    'integrations.line': 'LINE Messaging API',
    'integrations.line.desc': 'Channel Access Token และ Secret สำหรับ LINE inbox',
    'integrations.line.token': 'Channel Access Token',
    'integrations.line.secret': 'Channel Secret',
    'integrations.facebook': 'Facebook Graph API',
    'integrations.facebook.desc': 'App ID, Secret, และ Page Token สำหรับ Facebook inbox',
    'integrations.facebook.appId': 'App ID',
    'integrations.facebook.appSecret': 'App Secret',
    'integrations.facebook.pageToken': 'Page Access Token',
    'integrations.facebook.pageId': 'Page ID',
    'integrations.instagram': 'Instagram Graph API',
    'integrations.instagram.desc': 'Business Account ID และ Token สำหรับ Instagram inbox',
    'integrations.instagram.businessId': 'Business Account ID',
    'integrations.instagram.token': 'Access Token',
    'integrations.saved': 'บันทึกคีย์ API เรียบร้อยแล้ว',
  },
  zn: {
    'settings.title': '设置',
    'settings.subtitle': '配置您的偏好、语言和外观。',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.light': '明亮',
    'settings.dark': '深色',
    'settings.system': '跟随系统',
    'settings.save': '保存设置',
    'settings.saved': '设置已成功保存！',
    'settings.appearance': '外观',
    'brand.primary': '主色调',
    'brand.accent': '强调色',
    'brand.palette': '品牌调色板',
    'theme.light': '浅色模式',
    'theme.dark': '深色模式',
    'theme.system': '系统默认',
    'nav.stages': '销售阶段',
    'page.dashboard': '高管概览',
    'page.dashboard.desc': '欢迎回来，Sarah。这是您的销售管道状态。',
    'page.inbox': '社交收件箱',
    'page.inbox.desc': '统一收件箱 — Facebook, Instagram, LINE 消息汇总一处。',
    'page.pipeline': '销售管道与看板',
    'page.pipeline.desc': '管理交易，拖拽跨越阶段，并关闭机会。',
    'page.contacts': '联系人与账户',
    'page.contacts.desc': '全面的CRM客户列表和潜在客户资格认定。',
    'page.workflows': 'RelateFlows 自动化引擎',
    'page.workflows.desc': '活跃触发器、自动邮件规则和潜在客户路由。',
    'page.analytics': '销售分析与报告',
    'page.analytics.desc': '收入细分、胜率指标和绩效图表。',
    'page.calendar': '日历',
    'page.calendar.desc': '管理约会、会议和活动。',
    'page.settings': '系统设置',
    'page.settings.desc': '配置品牌主题、用户角色、集成和API密钥。',
    'page.default': 'RelateFlows CRM',
    'page.default.desc': '客户关系管理',
    'status.scheduled': '已安排',
    'status.completed': '已完成',
    'status.cancelled': '已取消',
    'status.pending': '待处理',
    'status.quoted': '已报价',
    'status.ordered': '已订购',
    'status.delivered': '已交付',
    'status.active': '活跃中',
    'status.paused': '已暂停',
    'status.inactive': '未激活',
    'guest.yes': '是',
    'guest.no': '否',
    'guest.awaiting': '待回复',
    'guest.maybe': '可能',
    'type.activity': '活动',
    'type.meeting': '会议',
    'type.appointment': '约会',
    'calendar.month': '月',
    'calendar.week': '周',
    'calendar.day': '日',
    'calendar.newEvent': '新活动',
    'calendar.today': '今天',
    'calendar.eventDetails': '活动详情',
    'calendar.aboutEvent': '关于此活动',
    'calendar.markCompleted': '标记为已完成',
    'calendar.copyDetails': '复制活动详情',
    'calendar.editEvent': '编辑活动',
    'calendar.deleteEvent': '删除活动',
    'calendar.title': '标题',
    'calendar.dateTime': '日期和时间',
    'calendar.start': '开始',
    'calendar.end': '结束',
    'calendar.eventType': '活动类型',
    'calendar.status': '状态',
    'calendar.location': '地点',
    'calendar.description': '描述',
    'calendar.assignMembers': '分配团队成员',
    'calendar.searchMembers': '按名称搜索...',
    'calendar.cancel': '取消',
    'calendar.create': '创建活动',
    'calendar.update': '更新活动',
    'calendar.guests': '人',
    'calendar.noGuests': '暂无参与者',
    'calendar.invitingTo': '{organizer} 邀请您参加{type}',
    'calendar.linkedLead': '关联线索',
    'calendar.viewInGoogle': '在Google日历中查看',
    'calendar.willSync': '将同步到Google日历',
    'calendar.syncOff': 'Google日历自动同步已关闭',
    'calendar.membersAssigned': '已分配{count}人',
    'calendar.inviteGuests': '邀请参与者',
    'calendar.newEventDesc': '安排新的预约',
    'calendar.editEventDesc': '更新预约详情',
    'calendar.noEvents': '今天没有活动',
    'calendar.upcomingFor': '即将到来的活动',
    'calendar.noMembers': '未找到成员',
    'calendar.reminder': '10分钟前',
    'calendar.nEvents': '{count} 个活动',
    'calendar.invitedBy': '邀请您参加',
    'calendar.noLinkedLead': '无关联线索',
    'calendar.linkLead': '关联线索',
    'integrations.title': '集成和API密钥',
    'integrations.subtitle': '配置外部服务的API凭据。保存的密钥将在运行时由后端使用。',
    'integrations.google': 'Google API',
    'integrations.google.desc': '用于Google日历同步的Client ID和Secret',
    'integrations.google.clientId': 'Client ID',
    'integrations.google.clientSecret': 'Client Secret',
    'integrations.line': 'LINE Messaging API',
    'integrations.line.desc': '用于LINE收件箱的Channel Access Token和Secret',
    'integrations.line.token': 'Channel Access Token',
    'integrations.line.secret': 'Channel Secret',
    'integrations.facebook': 'Facebook Graph API',
    'integrations.facebook.desc': '用于Facebook收件箱的App凭据和Page Token',
    'integrations.facebook.appId': 'App ID',
    'integrations.facebook.appSecret': 'App Secret',
    'integrations.facebook.pageToken': 'Page Access Token',
    'integrations.facebook.pageId': 'Page ID',
    'integrations.instagram': 'Instagram Graph API',
    'integrations.instagram.desc': '用于Instagram收件箱的Business Account ID和Token',
    'integrations.instagram.businessId': 'Business Account ID',
    'integrations.instagram.token': 'Access Token',
    'integrations.saved': 'API密钥已成功保存',
  },
};

const storageKey = (userId: string) => `rf-settings-${userId}`;

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  const [prevUserId, setPrevUserId] = useState(userId);

  const loadSettings = (uid: string): UserSettings => {
    try {
      const saved = localStorage.getItem(storageKey(uid));
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          integrations: { ...DEFAULT_INTEGRATIONS, ...(parsed.integrations || {}) },
        };
      }
    } catch {/* ignore corrupt data */}
    return DEFAULT_SETTINGS;
  };

  const [settings, setSettings] = useState<UserSettings>(() => loadSettings(userId));

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Reload settings when user changes (during render, not effect)
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setSettings(loadSettings(userId));
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateResolved = () => {
      const resolved = settings.theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : settings.theme;
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : 'light');
    };
    updateResolved();
    mediaQuery.addEventListener('change', updateResolved);
    return () => mediaQuery.removeEventListener('change', updateResolved);
  }, [settings.theme]);

  const persist = (updated: UserSettings) => {
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
  };

  const setTheme = (theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setLanguage = (language: Language) => {
    setSettings((prev) => ({ ...prev, language }));
  };

  const setPrimaryColor = (primaryColor: string) => {
    setSettings((prev) => ({ ...prev, primaryColor }));
  };

  const setAccentColor = (accentColor: string) => {
    setSettings((prev) => ({ ...prev, accentColor }));
  };

  const setIntegrationKey = (key: keyof IntegrationKeys, value: string) => {
    setSettings((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, [key]: value },
    }));
  };

  const saveSettings = () => {
    persist(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const t = (key: string): string => {
    return translations[settings.language][key] || translations.en[key] || key;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        theme: settings.theme,
        setTheme,
        resolvedTheme,
        language: settings.language,
        setLanguage,
        primaryColor: settings.primaryColor,
        setPrimaryColor,
        accentColor: settings.accentColor,
        setAccentColor,
        integrations: settings.integrations,
        setIntegrationKey,
        t,
        saveSettings,
        savedSuccess,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
