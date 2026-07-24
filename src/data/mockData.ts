import type { Deal, Contact, CompanyAccount, Activity, WorkflowRule, MetricCardData, PipelineStage, Lead, ChatMessage, Product, Category, SocialAccount, Appointment, Task, CustomerTag, AllocationRecord } from '../types/crm';

export const STAGE_COLORS = [
  '#94a3b8', // slate-400
  '#60a5fa', // blue-400
  '#2563eb', // blue-600
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#fb7185', // rose-400
  '#8b5cf6', // violet-400
  '#14b8a6', // teal-400
  '#f97316', // orange-400
  '#22d3ee', // cyan-400
  '#ec4899', // pink-400
  '#6366f1', // indigo-400
];

export const INITIAL_STAGES: PipelineStage[] = [
  { id: 'lead_in', label: 'Lead In', color: '#94a3b8' },
  { id: 'contacted', label: 'Contacted', color: '#60a5fa' },
  { id: 'proposal', label: 'Proposal', color: '#2563eb' },
  { id: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { id: 'closed_won', label: 'Closed Won', color: '#10b981' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#fb7185' },
];

export const INITIAL_SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: 'fb-main', channel: 'facebook', name: 'RelateFlops Official', avatar: 'https://i.pravatar.cc/150?u=relateflops', connected: true },
  { id: 'fb-th', channel: 'facebook', name: 'RelateFlops Thailand', avatar: 'https://i.pravatar.cc/150?u=relateflops-th', connected: true },
  { id: 'line-main', channel: 'line', name: 'RelateFlops LINE OA', avatar: 'https://i.pravatar.cc/150?u=line-rf', connected: true },
  { id: 'line-sales', channel: 'line', name: 'RelateFlops Sales', avatar: 'https://i.pravatar.cc/150?u=line-sales', connected: true },
  { id: 'ig-main', channel: 'instagram', name: '@relateflops', avatar: 'https://i.pravatar.cc/150?u=ig-rf', connected: true },
];

export const INITIAL_LEADS: Lead[] = [
  { id: 'LD-001', name: 'สมชาย ใจดี', avatar: 'https://i.pravatar.cc/150?u=samchai', channel: 'line', socialAccountId: 'line-main', lastMessage: 'หรือมีโปรโมชั่นช่วงนี้ไหมครับ', lastMessageTime: '2 min ago', unreadCount: 3, isAllocated: true, assignedTo: 'demo-sales-001', createdAt: '2026-07-20' },
  { id: 'LD-002', name: 'Jennifer Wong', avatar: 'https://i.pravatar.cc/150?u=jwong', channel: 'facebook', socialAccountId: 'fb-main', lastMessage: 'Also, does the enterprise plan include SSO and custom integrations?', lastMessageTime: '14 min ago', unreadCount: 2, isAllocated: false, createdAt: '2026-07-21' },
  { id: 'LD-003', name: 'mika_insta', avatar: 'https://i.pravatar.cc/150?u=mika', channel: 'instagram', socialAccountId: 'ig-main', lastMessage: 'Sounds great! Let me check with my team and get back to you', lastMessageTime: '40 min ago', unreadCount: 0, isAllocated: true, assignedTo: 'demo-sales-001', createdAt: '2026-07-19' },
  { id: 'LD-004', name: 'ประสิทธิ์ มีทรัพย์', avatar: 'https://i.pravatar.cc/150?u=prasit', channel: 'line', socialAccountId: 'line-sales', lastMessage: 'ได้รับใบเสนอราคาแล้วครับ ขอบคุณมาก', lastMessageTime: '1.5 hours ago', unreadCount: 0, isAllocated: false, createdAt: '2026-07-18' },
  { id: 'LD-005', name: 'Emily Chen', avatar: 'https://i.pravatar.cc/150?u=emily', channel: 'facebook', socialAccountId: 'fb-th', lastMessage: 'Please help ASAP, this is blocking our deployment', lastMessageTime: 'Yesterday at 9:36 PM', unreadCount: 5, isAllocated: true, assignedTo: 'demo-sales-001', createdAt: '2026-07-17' },
  { id: 'LD-006', name: 'travel_with_me', avatar: 'https://i.pravatar.cc/150?u=travel', channel: 'instagram', socialAccountId: 'ig-main', lastMessage: 'Thanks for the info! Will consider', lastMessageTime: 'Yesterday at 6:16 PM', unreadCount: 0, isAllocated: false, createdAt: '2026-07-16' },
  { id: 'LD-007', name: 'วนิดา รักดี', avatar: 'https://i.pravatar.cc/150?u=wanida', channel: 'line', socialAccountId: 'line-main', lastMessage: 'อยากได้แบบ 3 ห้องนอน 2 ห้องน้ำ ค่ะ', lastMessageTime: '28 min ago', unreadCount: 2, isAllocated: false, createdAt: '2026-07-22' },
  { id: 'LD-008', name: 'somchai_p', avatar: 'https://i.pravatar.cc/150?u=somchai_p', channel: 'facebook', socialAccountId: 'fb-th', lastMessage: 'ราคาห้องแบบ 2 Bedroom เท่าไหร่ครับ', lastMessageTime: '42 min ago', unreadCount: 1, isAllocated: false, createdAt: '2026-07-22' },
  { id: 'LD-009', name: 'คุณหญิงรัตนา', avatar: 'https://i.pravatar.cc/150?u=ratana', channel: 'line', socialAccountId: 'line-sales', lastMessage: 'ดิฉันสะดวกเข้าชมโครงการวันเสาร์นี้ค่ะ', lastMessageTime: '50 min ago', unreadCount: 3, isAllocated: true, assignedTo: 'demo-mgr-001', createdAt: '2026-07-21' },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // === LD-001: สมชาย ใจดี (LINE) — full conversation ===
  { id: 'MSG-001', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'สวัสดีครับ สนใจสินค้าของคุณครับ', timestamp: '10 min ago', isRead: true },
  { id: 'MSG-002', channel: 'line', leadId: 'LD-001', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'สวัสดีค่ะคุณสมชาย สนใจสินค้าตัวไหนเป็นพิเศษไหมคะ?', timestamp: '8 min ago', isRead: true },
  { id: 'MSG-003', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'สนใจแพ็คเกจ Enterprise ครับ อยากทราบราคาและฟีเจอร์', timestamp: '5 min ago', isRead: true },
  { id: 'MSG-004', channel: 'line', leadId: 'LD-001', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'แพ็คเกจ Enterprise ราคา 99,000 บาท/ปี ค่ะ รวมฟีเจอร์ทั้งหมด ไม่ว่าจะเป็นการจัดการทีมได้ถึง 50 คน, รายงานขั้นสูง, และ API แบบไม่จำกัด', timestamp: '4 min ago', isRead: true },
  { id: 'MSG-005', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'รวมเทรนนิ่งด้วยไหมครับ', timestamp: '3 min ago', isRead: true },
  { id: 'MSG-006', channel: 'line', leadId: 'LD-001', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'รวมเทรนนิ่งออนไลน์ 2 ชั่วโมงให้ทีมงาน และสิทธิ์เข้าใช้งาน Help Center ตลอดอายุสัญญาค่ะ', timestamp: '3 min ago', isRead: true },
  { id: 'MSG-007', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'ขอใบเสนอราคาด้วยครับ', timestamp: '2 min ago', isRead: false },
  { id: 'MSG-008', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'แล้วถ้าซื้อ 2 ปีมีส่วนลดไหมครับ', timestamp: '2 min ago', isRead: false },
  { id: 'MSG-009', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'หรือมีโปรโมชั่นช่วงนี้ไหมครับ', timestamp: '2 min ago', isRead: false },

  // === LD-002: Jennifer Wong (Facebook) ===
  { id: 'MSG-010', channel: 'facebook', leadId: 'LD-002', from: 'contact', senderName: 'Jennifer Wong', senderAvatar: 'https://i.pravatar.cc/150?u=jwong', content: 'Hi! I saw your ad on Facebook. Interested in the enterprise plan.', timestamp: '15 min ago', isRead: true },
  { id: 'MSG-011', channel: 'facebook', leadId: 'LD-002', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'Hi Jennifer! Happy to help. The Enterprise plan starts at $75,000/year with full features. Would you like a personalized demo?', timestamp: '13 min ago', isRead: true },
  { id: 'MSG-012', channel: 'facebook', leadId: 'LD-002', from: 'contact', senderName: 'Jennifer Wong', senderAvatar: 'https://i.pravatar.cc/150?u=jwong', content: 'Yes please! Can we schedule something this week? Also, do you offer a discount for annual commitment?', timestamp: '11 min ago', isRead: true },
  { id: 'MSG-013', channel: 'facebook', leadId: 'LD-002', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'Absolutely! We have a 15% discount for annual commitment. Let me check our calendar and get back to you with available slots.', timestamp: '10 min ago', isRead: true },
  { id: 'MSG-014', channel: 'facebook', leadId: 'LD-002', from: 'contact', senderName: 'Jennifer Wong', senderAvatar: 'https://i.pravatar.cc/150?u=jwong', content: 'Great, please send over the proposal. My email is j.wong@apex.com', timestamp: '15 min ago', isRead: false },
  { id: 'MSG-015', channel: 'facebook', leadId: 'LD-002', from: 'contact', senderName: 'Jennifer Wong', senderAvatar: 'https://i.pravatar.cc/150?u=jwong', content: 'Also, does the enterprise plan include SSO and custom integrations?', timestamp: '15 min ago', isRead: false },

  // === LD-003: mika_insta (Instagram) ===
  { id: 'MSG-016', channel: 'instagram', leadId: 'LD-003', from: 'contact', senderName: 'mika_insta', senderAvatar: 'https://i.pravatar.cc/150?u=mika', content: 'Hey! Love your product. Want to discuss collaboration opportunities 🚀', timestamp: '1 hour ago', isRead: true },
  { id: 'MSG-017', channel: 'instagram', leadId: 'LD-003', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'Hi Mika! Thanks for reaching out. Would love to chat about collab! What kind of partnership did you have in mind?', timestamp: '50 min ago', isRead: true },
  { id: 'MSG-018', channel: 'instagram', leadId: 'LD-003', from: 'contact', senderName: 'mika_insta', senderAvatar: 'https://i.pravatar.cc/150?u=mika', content: 'I run a tech blog with 50k followers. I could review your product and share it with my audience. Looking for affiliate or sponsored content partnership.', timestamp: '45 min ago', isRead: true },
  { id: 'MSG-019', channel: 'instagram', leadId: 'LD-003', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'That sounds perfect! We offer 20% commission on all referrals through affiliate links. Let me set up an affiliate account for you.', timestamp: '40 min ago', isRead: true },
  { id: 'MSG-020', channel: 'instagram', leadId: 'LD-003', from: 'contact', senderName: 'mika_insta', senderAvatar: 'https://i.pravatar.cc/150?u=mika', content: 'Sounds great! Let me check with my team and get back to you', timestamp: '1 hour ago', isRead: false },

  // === LD-004: ประสิทธิ์ มีทรัพย์ (LINE) ===
  { id: 'MSG-021', channel: 'line', leadId: 'LD-004', from: 'contact', senderName: 'ประสิทธิ์ มีทรัพย์', senderAvatar: 'https://i.pravatar.cc/150?u=prasit', content: 'ขอใบเสนอราคาหน่อยครับ', timestamp: '3 hours ago', isRead: true },
  { id: 'MSG-022', channel: 'line', leadId: 'LD-004', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'สวัสดีค่ะคุณประสิทธิ์ ช่วยแจ้งรายละเอียดว่าสนใจสินค้าประเภทไหน และต้องการจำนวนเท่าไหร่คะ?', timestamp: '2.5 hours ago', isRead: true },
  { id: 'MSG-023', channel: 'line', leadId: 'LD-004', from: 'contact', senderName: 'ประสิทธิ์ มีทรัพย์', senderAvatar: 'https://i.pravatar.cc/150?u=prasit', content: 'สนใจห้องแบบ 1 Bedroom ค่ะ ราคาเท่าไหร่', timestamp: '2 hours ago', isRead: true },
  { id: 'MSG-024', channel: 'line', leadId: 'LD-004', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'ห้อง 1 Bedroom ราคาเริ่มต้น 2.5 ล้านบาท ค่ะ มีโปรโมชั่นส่วนลด 10% สำหรับการจองวันนี้ด้วยนะคะ', timestamp: '2 hours ago', isRead: true },
  { id: 'MSG-025', channel: 'line', leadId: 'LD-004', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'ขอส่งใบเสนอราคาให้ทางอีเมลได้ไหมคะ หรือจะให้ส่งทาง LINE ดีคะ?', timestamp: '1.5 hours ago', isRead: true },
  { id: 'MSG-026', channel: 'line', leadId: 'LD-004', from: 'contact', senderName: 'ประสิทธิ์ มีทรัพย์', senderAvatar: 'https://i.pravatar.cc/150?u=prasit', content: 'ได้รับใบเสนอราคาแล้วครับ ขอบคุณมาก', timestamp: '3 hours ago', isRead: false },

  // === LD-005: Emily Chen (Facebook) — long thread ===
  { id: 'MSG-027', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'Hi there! We just purchased the enterprise plan and I am trying to set up the API integration.', timestamp: 'Yesterday at 9:30 PM', isRead: true },
  { id: 'MSG-028', channel: 'facebook', leadId: 'LD-005', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'Hi Emily! Welcome aboard! What kind of issues are you running into with the API?', timestamp: 'Yesterday at 9:35 PM', isRead: true },
  { id: 'MSG-029', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'I followed the docs but still getting 401 errors when trying to authenticate. I generated an API key from the dashboard.', timestamp: 'Yesterday at 9:31 PM', isRead: false },
  { id: 'MSG-030', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'Here is the code snippet I am using... (screenshot attached)', timestamp: 'Yesterday at 9:32 PM', isRead: false },
  { id: 'MSG-031', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'I think it might be a CORS issue on your end?', timestamp: 'Yesterday at 9:33 PM', isRead: false },
  { id: 'MSG-032', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'Also, the webhook is not receiving any events. I set up the endpoint but nothing is coming through.', timestamp: 'Yesterday at 9:35 PM', isRead: false },
  { id: 'MSG-033', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'Please help ASAP, this is blocking our deployment', timestamp: 'Yesterday at 9:36 PM', isRead: false },

  // === LD-006: travel_with_me (Instagram) ===
  { id: 'MSG-034', channel: 'instagram', leadId: 'LD-006', from: 'contact', senderName: 'travel_with_me', senderAvatar: 'https://i.pravatar.cc/150?u=travel', content: 'How much for premium?', timestamp: 'Yesterday at 6:15 PM', isRead: true },
  { id: 'MSG-035', channel: 'instagram', leadId: 'LD-006', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'Hi! Premium plan is $49/month or $499/year (save 15%). Features include unlimited projects, advanced analytics, and priority support!', timestamp: 'Yesterday at 6:16 PM', isRead: true },
  { id: 'MSG-036', channel: 'instagram', leadId: 'LD-006', from: 'contact', senderName: 'travel_with_me', senderAvatar: 'https://i.pravatar.cc/150?u=travel', content: 'Thanks for the info! Will consider', timestamp: 'Yesterday at 6:15 PM', isRead: false },

  // === LD-007: วนิดา รักดี (LINE) — new ===
  { id: 'MSG-037', channel: 'line', leadId: 'LD-007', from: 'contact', senderName: 'วนิดา รักดี', senderAvatar: 'https://i.pravatar.cc/150?u=wanida', content: 'สวัสดีค่ะ สนใจโครงการบ้านจัดสรรของทางบริษัท', timestamp: '30 min ago', isRead: true },
  { id: 'MSG-038', channel: 'line', leadId: 'LD-007', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'สวัสดีค่ะคุณวนิดา มีโปรเจคใหม่ที่กำลังจะเปิดตัวเดือนหน้านะคะ สนใจบ้านแบบไหนคะ', timestamp: '28 min ago', isRead: true },
  { id: 'MSG-039', channel: 'line', leadId: 'LD-007', from: 'contact', senderName: 'วนิดา รักดี', senderAvatar: 'https://i.pravatar.cc/150?u=wanida', content: 'สนใจดูแบบห้องเพิ่มเติมค่ะ มีโปรเจคใหม่ไหมคะ', timestamp: '30 min ago', isRead: false },
  { id: 'MSG-040', channel: 'line', leadId: 'LD-007', from: 'contact', senderName: 'วนิดา รักดี', senderAvatar: 'https://i.pravatar.cc/150?u=wanida', content: 'อยากได้แบบ 3 ห้องนอน 2 ห้องน้ำ ค่ะ', timestamp: '30 min ago', isRead: false },

  // === LD-008: somchai_p (Facebook) — new ===
  { id: 'MSG-041', channel: 'facebook', leadId: 'LD-008', from: 'contact', senderName: 'somchai_p', senderAvatar: 'https://i.pravatar.cc/150?u=somchai_p', content: 'สวัสดีครับ ผมสนใจซื้อคอนโด', timestamp: '45 min ago', isRead: true },
  { id: 'MSG-042', channel: 'facebook', leadId: 'LD-008', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'สวัสดีครับคุณสมชาย คอนโดของเรามีหลายแบบให้เลือกครับ สนใจแบบไหนเป็นพิเศษไหมครับ', timestamp: '42 min ago', isRead: true },
  { id: 'MSG-043', channel: 'facebook', leadId: 'LD-008', from: 'contact', senderName: 'somchai_p', senderAvatar: 'https://i.pravatar.cc/150?u=somchai_p', content: 'ราคาห้องแบบ 2 Bedroom เท่าไหร่ครับ', timestamp: '45 min ago', isRead: false },

  // === LD-009: คุณหญิงรัตนา (LINE) — new ===
  { id: 'MSG-044', channel: 'line', leadId: 'LD-009', from: 'contact', senderName: 'คุณหญิงรัตนา', senderAvatar: 'https://i.pravatar.cc/150?u=ratana', content: 'สวัสดีค่ะ ดิฉันสนใจโครงการบ้านเดี่ยวของทางบริษัท', timestamp: '1 hour ago', isRead: true },
  { id: 'MSG-045', channel: 'line', leadId: 'LD-009', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'สวัสดีคุณหญิงรัตนา ยินดีต้อนรับค่ะ บ้านเดี่ยวของเรามีหลายแบบให้เลือก มีแบบที่สนใจเป็นพิเศษไหมคะ?', timestamp: '55 min ago', isRead: true },
  { id: 'MSG-046', channel: 'line', leadId: 'LD-009', from: 'contact', senderName: 'คุณหญิงรัตนา', senderAvatar: 'https://i.pravatar.cc/150?u=ratana', content: 'สนใจแบบ Bali Style ค่ะ อยากทราบรายละเอียดเพิ่มเติม ราคา และโปรโมชั่น', timestamp: '52 min ago', isRead: true },
  { id: 'MSG-047', channel: 'line', leadId: 'LD-009', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'Bali Style ของเราเป็นแบบ 4 ห้องนอน 3 ห้องน้ำ พื้นที่ใช้สอย 250 ตร.ม. ราคาเริ่ม 5.8 ล้านบาทค่ะ ช่วงนี้มีโปรฯ เปิดตัวโครงการ ลด 15% ค่ะ', timestamp: '50 min ago', isRead: true },
  { id: 'MSG-048', channel: 'line', leadId: 'LD-009', from: 'contact', senderName: 'คุณหญิงรัตนา', senderAvatar: 'https://i.pravatar.cc/150?u=ratana', content: 'สนใจมากค่ะ ขอเอกสารเพิ่มเติมเกี่ยวกับสิทธิประโยชน์ค่ะ', timestamp: '1 hour ago', isRead: false },
  { id: 'MSG-049', channel: 'line', leadId: 'LD-009', from: 'contact', senderName: 'คุณหญิงรัตนา', senderAvatar: 'https://i.pravatar.cc/150?u=ratana', content: 'และขอใบเสนอราคาอย่างเป็นทางการด้วยนะคะ', timestamp: '1 hour ago', isRead: false },
  { id: 'MSG-050', channel: 'line', leadId: 'LD-009', from: 'contact', senderName: 'คุณหญิงรัตนา', senderAvatar: 'https://i.pravatar.cc/150?u=ratana', content: 'ดิฉันสะดวกเข้าชมโครงการวันเสาร์นี้ค่ะ', timestamp: '1 hour ago', isRead: false },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'Software License', description: 'Annual/monthly software subscriptions', createdAt: '2026-07-01T00:00:00Z' },
  { id: 2, name: 'Integration Service', description: 'API and system integration services', createdAt: '2026-07-01T00:00:00Z' },
  { id: 3, name: 'Support Package', description: 'Technical support and maintenance', createdAt: '2026-07-01T00:00:00Z' },
  { id: 4, name: 'Consulting', description: 'Business and technical consulting', createdAt: '2026-07-01T00:00:00Z' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, leadId: 'LD-001', categoryId: 1, name: 'Enterprise License (Annual)', quantity: 1, price: 99000, description: 'Full enterprise plan with all features', notes: 'ต้องการใช้งานทั้งทีม 50 คน', status: 0, createdAt: '2026-07-22T10:00:00Z', updatedAt: '2026-07-22T10:00:00Z' },
  { id: 2, leadId: 'LD-001', categoryId: 2, name: 'API Integration Package', quantity: 1, price: 25000, description: 'Custom API integration service', notes: 'เชื่อมต่อกับระบบ ERP เดิม', status: 0, createdAt: '2026-07-22T10:05:00Z', updatedAt: '2026-07-22T10:05:00Z' },
  { id: 3, leadId: 'LD-002', categoryId: 1, name: 'Enterprise Plan', quantity: 1, price: 75000, description: 'Monthly enterprise subscription', notes: 'Needs custom onboarding', status: 1, createdAt: '2026-07-21T14:00:00Z', updatedAt: '2026-07-21T16:30:00Z' },
  { id: 4, leadId: 'LD-005', categoryId: 3, name: 'Technical Support Add-on', quantity: 1, price: 15000, description: 'Premium tech support - 24/7', notes: 'Having API integration issues', status: 0, createdAt: '2026-07-22T09:00:00Z', updatedAt: '2026-07-22T09:00:00Z' },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 1, leadId: 'LD-001', title: 'Product Demo', description: 'สาธิตฟีเจอร์ Enterprise ให้สมชายดู', startTime: '2026-07-24T10:00:00Z', endTime: '2026-07-24T11:00:00Z', type: 'activity', status: 0, location: 'Video Call', googleEventId: '', createdBy: 'sales-1', createdAt: '2026-07-22T00:00:00Z', updatedAt: '2026-07-22T00:00:00Z' },
  { id: 2, leadId: 'LD-002', title: 'Proposal Review', description: 'Review enterprise plan proposal with Jennifer', startTime: '2026-07-25T14:00:00Z', endTime: '2026-07-25T15:00:00Z', type: 'meeting', status: 0, location: 'Google Meet', googleEventId: '', createdBy: 'sales-1', createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z' },
  { id: 3, leadId: 'LD-005', title: 'Technical Call', description: 'Help Emily with API integration issue', startTime: '2026-07-23T09:00:00Z', endTime: '2026-07-23T09:30:00Z', type: 'activity', status: 0, location: 'Phone', googleEventId: '', createdBy: 'sales-1', createdAt: '2026-07-22T00:00:00Z', updatedAt: '2026-07-22T00:00:00Z' },
  { id: 4, leadId: 'LD-003', title: 'Follow-up Meeting', description: 'Discuss collab details with Mika', startTime: '2026-07-26T11:00:00Z', endTime: '2026-07-26T11:45:00Z', type: 'appointment', status: 0, location: 'Instagram DM', googleEventId: '', createdBy: 'sales-2', createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z' },
  { id: 5, leadId: 'LD-001', title: 'Price Negotiation', description: 'เจรจาราคา Enterprise License', startTime: '2026-07-28T13:00:00Z', endTime: '2026-07-28T14:00:00Z', type: 'meeting', status: 0, location: 'LINE Call', googleEventId: '', createdBy: 'sales-1', createdAt: '2026-07-22T00:00:00Z', updatedAt: '2026-07-22T00:00:00Z' },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'DEAL-101',
    title: 'Enterprise Cloud License',
    company: 'Apex Global Logistics',
    value: 125000,
    stage: 'negotiation',
    probability: 85,
    owner: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Inbound Website',
    priority: 'high',
    contactName: 'David Miller',
    contactEmail: 'david.m@apexglobal.com',
    createdAt: '2026-07-01',
    expectedCloseDate: '2026-07-30',
    tags: ['Enterprise', 'Cloud', 'Q3-Target'],
    notes: 'Legal reviewing custom SLA agreement. Follow up scheduled on Thursday.'
  },
  {
    id: 'DEAL-102',
    title: 'CRM Workflows Expansion',
    company: 'Nexus Dynamics',
    value: 48000,
    stage: 'proposal',
    probability: 60,
    owner: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Partner Referral',
    priority: 'high',
    contactName: 'Elena Rostova',
    contactEmail: 'elena@nexusdynamics.io',
    createdAt: '2026-07-05',
    expectedCloseDate: '2026-08-15',
    tags: ['Workflows', 'SaaS'],
    notes: 'Sent updated proposal with 50 workflow seat tier discounts.'
  },
  {
    id: 'DEAL-103',
    title: 'Fintech Automation Suite',
    company: 'Vanguard Pay Solutions',
    value: 210000,
    stage: 'closed_won',
    probability: 100,
    owner: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Outbound Campaign',
    priority: 'high',
    contactName: 'Marcus Vance',
    contactEmail: 'm.vance@vanguardpay.com',
    createdAt: '2026-06-12',
    expectedCloseDate: '2026-07-18',
    tags: ['Fintech', 'Automation', 'Strategic'],
    notes: 'Contract signed! Kickoff call set for next Tuesday.'
  },
  {
    id: 'DEAL-104',
    title: 'Data Integration Connector',
    company: 'Starlight Retail Tech',
    value: 28000,
    stage: 'contacted',
    probability: 40,
    owner: {
      name: 'Marcus Brody',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Webinar Attendee',
    priority: 'medium',
    contactName: 'Jessica Wu',
    contactEmail: 'jessica.wu@starlightretail.com',
    createdAt: '2026-07-12',
    expectedCloseDate: '2026-08-30',
    tags: ['Integration', 'Retail'],
    notes: 'Initial discovery call went great. Technical demo scheduled.'
  },
  {
    id: 'DEAL-105',
    title: 'AI Insights Engine Module',
    company: 'Hyperion AI Labs',
    value: 95000,
    stage: 'lead_in',
    probability: 20,
    owner: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'LinkedIn Campaign',
    priority: 'medium',
    contactName: 'Dr. Aris Thorne',
    contactEmail: 'thorne@hyperionai.co',
    createdAt: '2026-07-19',
    expectedCloseDate: '2026-09-15',
    tags: ['AI Engine', 'Inbound'],
    notes: 'New lead from AI demo request form on product landing page.'
  },
  {
    id: 'DEAL-106',
    title: 'Custom API Connector Package',
    company: 'Bluefin Tech Corp',
    value: 34000,
    stage: 'proposal',
    probability: 70,
    owner: {
      name: 'Marcus Brody',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Direct Sales',
    priority: 'low',
    contactName: 'Liam O\'Connor',
    contactEmail: 'liam@bluefintech.com',
    createdAt: '2026-07-08',
    expectedCloseDate: '2026-08-05',
    tags: ['API', 'DevOps'],
    notes: 'Proposal delivered. Awaiting CFO signoff.'
  },
  {
    id: 'DEAL-107',
    title: 'Customer Success Platform Tier',
    company: 'AeroJet Aviation Systems',
    value: 175000,
    stage: 'negotiation',
    probability: 90,
    owner: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Executive Network',
    priority: 'high',
    contactName: 'Catherine Hayes',
    contactEmail: 'chayes@aerojet.com',
    createdAt: '2026-06-25',
    expectedCloseDate: '2026-07-28',
    tags: ['Enterprise', 'CSM'],
    notes: 'Final contract terms under review by VP of Procurement.'
  },
  {
    id: 'DEAL-108',
    title: 'Legacy CRM Migration Service',
    company: 'Quantum Media Group',
    value: 62000,
    stage: 'closed_lost',
    probability: 0,
    owner: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Cold Outreach',
    priority: 'low',
    contactName: 'Robert Vance',
    contactEmail: 'rvance@quantummedia.net',
    createdAt: '2026-05-14',
    expectedCloseDate: '2026-07-10',
    tags: ['Migration'],
    notes: 'Decided to defer migration budget to fiscal Q4.'
  }
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'CNT-001',
    name: 'David Miller',
    email: 'david.m@apexglobal.com',
    phone: '+1 (555) 234-8910',
    company: 'Apex Global Logistics',
    role: 'VP of Operations',
    lifecycleStage: 'opportunity',
    leadScore: 92,
    status: 0,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Yesterday at 3:45 PM',
    totalDealsValue: 125000,
    tags: ['Decision Maker', 'High Priority', 'VIP'],
    notes: 'Key buyer for the $125k Enterprise Cloud License.'
  },
  {
    id: 'CNT-002',
    name: 'Elena Rostova',
    email: 'elena@nexusdynamics.io',
    phone: '+1 (555) 876-1234',
    company: 'Nexus Dynamics',
    role: 'Head of Sales Operations',
    lifecycleStage: 'opportunity',
    leadScore: 84,
    status: 0,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    lastContacted: '3 days ago',
    totalDealsValue: 48000,
    tags: ['SalesOps', 'Power User'],
    notes: 'Loves our visual RelateFlows workflow builder.'
  },
  {
    id: 'CNT-003',
    name: 'Marcus Vance',
    email: 'm.vance@vanguardpay.com',
    phone: '+1 (555) 901-2345',
    company: 'Vanguard Pay Solutions',
    role: 'Chief Technology Officer',
    lifecycleStage: 'customer',
    leadScore: 98,
    status: 0,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Today at 10:15 AM',
    totalDealsValue: 210000,
    tags: ['CTO', 'Signed Customer', 'Champion'],
    notes: 'Champion lead. Promised to provide a testimonial video.'
  },
  {
    id: 'CNT-004',
    name: 'Jessica Wu',
    email: 'jessica.wu@starlightretail.com',
    phone: '+1 (555) 432-7890',
    company: 'Starlight Retail Tech',
    role: 'Senior IT Manager',
    lifecycleStage: 'mql',
    leadScore: 68,
    status: 0,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Jul 15, 2026',
    totalDealsValue: 28000,
    tags: ['Retail', 'Webinar Lead'],
    notes: 'Attended the retail omnichannel integration webinar.'
  },
  {
    id: 'CNT-005',
    name: 'Dr. Aris Thorne',
    email: 'thorne@hyperionai.co',
    phone: '+1 (555) 654-3210',
    company: 'Hyperion AI Labs',
    role: 'Director of AI Research',
    lifecycleStage: 'lead',
    leadScore: 55,
    status: 2,
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Jul 19, 2026',
    totalDealsValue: 95000,
    tags: ['AI Tech', 'Inbound'],
    notes: 'Submitted demo request for custom AI integration.'
  },
  {
    id: 'CNT-006',
    name: 'Catherine Hayes',
    email: 'chayes@aerojet.com',
    phone: '+1 (555) 321-6549',
    company: 'AeroJet Aviation Systems',
    role: 'SVP of Global Sales',
    lifecycleStage: 'opportunity',
    leadScore: 95,
    status: 0,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Today at 2:00 PM',
    totalDealsValue: 175000,
    tags: ['Executive', 'Aero', 'Enterprise'],
    notes: 'Key decision maker for global aviation CRM deployment.'
  }
];

export const INITIAL_COMPANIES: CompanyAccount[] = [
  {
    id: 'CMP-01',
    name: 'Apex Global Logistics',
    domain: 'apexglobal.com',
    industry: 'Supply Chain & Logistics',
    size: '1,000 - 5,000 employees',
    annualRevenue: 450000000,
    location: 'Chicago, IL',
    contactsCount: 12,
    totalDealsValue: 125000,
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'CMP-02',
    name: 'Vanguard Pay Solutions',
    domain: 'vanguardpay.com',
    industry: 'Financial Technology',
    size: '500 - 1,000 employees',
    annualRevenue: 180000000,
    location: 'New York, NY',
    contactsCount: 8,
    totalDealsValue: 210000,
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'CMP-03',
    name: 'Nexus Dynamics',
    domain: 'nexusdynamics.io',
    industry: 'Software & SaaS',
    size: '250 - 500 employees',
    annualRevenue: 65000000,
    location: 'Austin, TX',
    contactsCount: 5,
    totalDealsValue: 48000,
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'ACT-01',
    type: 'deal_won',
    title: 'Deal Closed Won!',
    description: 'Sarah Connor closed Fintech Automation Suite with Vanguard Pay Solutions.',
    timestamp: '2 hours ago',
    user: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    targetName: '$210,000 ARR'
  },
  {
    id: 'ACT-02',
    type: 'meeting',
    title: 'Executive Contract Review',
    description: 'Meeting completed with Catherine Hayes (AeroJet Aviation Systems).',
    timestamp: '4 hours ago',
    user: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    targetName: 'AeroJet Deal'
  },
  {
    id: 'ACT-03',
    type: 'stage_change',
    title: 'Stage Advanced',
    description: 'Alex Rivera moved CRM Workflows Expansion to Proposal stage.',
    timestamp: '5 hours ago',
    user: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    targetName: 'Nexus Dynamics'
  },
  {
    id: 'ACT-04',
    type: 'email',
    title: 'Workflow Automation Triggered',
    description: 'RelateFlows automatically emailed onboarding checklist to Marcus Vance.',
    timestamp: 'Yesterday at 5:30 PM',
    user: {
      name: 'RelateFlows Bot',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'
    },
    targetName: 'Auto Workflow #12'
  }
];

export const INITIAL_WORKFLOWS: WorkflowRule[] = [
  {
    id: 'WF-101',
    title: 'High-Score Lead Escalation',
    description: 'When a contact lead score exceeds 80, automatically notify Senior Account Exec and move stage to Qualified.',
    trigger: 'Lead Score > 80',
    action: 'Assign Senior AE + Stage: Qualified',
    status: 0,
    executionsCount: 142,
    lastExecuted: '10 minutes ago',
    category: 'Lead Nurturing',
    accentColor: '#2563EB' // Blue
  },
  {
    id: 'WF-102',
    title: 'Closed-Won Onboarding Kickoff',
    description: 'When a deal enters Closed Won, trigger Slack notification, generate contract PDF, and invite customer to Portal.',
    trigger: 'Deal Stage = Closed Won',
    action: 'Slack Alert + Customer Portal Invite',
    status: 0,
    executionsCount: 89,
    lastExecuted: '2 hours ago',
    category: 'Sales Operations',
    accentColor: '#1D4ED8'
  },
  {
    id: 'WF-104',
    title: 'VIP Customer VIP Nurture Flow',
    description: 'Send personalized quarterly executive check-in email to accounts with > $100k annual contract value.',
    trigger: 'Account Value > $100,000',
    action: 'Schedule Exec Email + CSM Notification',
    status: 1,
    executionsCount: 45,
    lastExecuted: 'Jul 10, 2026',
    category: 'Customer Success',
    accentColor: '#1D4ED8'
  }
];

export const INITIAL_TASKS: Task[] = [
  { id: 'TSK-1', title: 'Follow up with Enterprise leads', description: 'Call Samchai and Jennifer about the enterprise plan pricing', priority: 'high', status: 'in_progress', dueDate: '2026-07-28', assignee: { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' }, relatedTo: { type: 'deal', id: 'DEAL-1', label: 'Enterprise License - Samchai Corp' }, createdAt: '2026-07-20' },
  { id: 'TSK-2', title: 'Prepare Q3 proposal deck', description: 'Create the slide deck for the quarterly review with stakeholders', priority: 'high', status: 'todo', dueDate: '2026-08-01', assignee: { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' }, createdAt: '2026-07-21' },
  { id: 'TSK-3', title: 'Schedule demo with Acme Corp', description: 'Contact John from Acme to set up a product demonstration', priority: 'medium', status: 'todo', dueDate: '2026-07-26', assignee: { name: 'Mike Johnson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' }, relatedTo: { type: 'contact', id: 'CNT-1', label: 'John Smith' }, createdAt: '2026-07-19' },
  { id: 'TSK-4', title: 'Update contract terms for GlobalTech', description: 'Revise the payment terms section per legal feedback', priority: 'medium', status: 'in_progress', dueDate: '2026-07-29', assignee: { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' }, relatedTo: { type: 'deal', id: 'DEAL-2', label: 'Integration Package - GlobalTech' }, createdAt: '2026-07-18' },
  { id: 'TSK-5', title: 'Onboard new customer - Apex Global', description: 'Complete the onboarding checklist and send welcome package', priority: 'high', status: 'done', dueDate: '2026-07-25', assignee: { name: 'Lisa Park', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' }, relatedTo: { type: 'contact', id: 'CNT-4', label: 'David Miller' }, createdAt: '2026-07-15' },
  { id: 'TSK-6', title: 'Review weekly sales metrics', description: 'Go through the pipeline dashboard and prepare notes for the standup', priority: 'low', status: 'done', dueDate: '2026-07-24', assignee: { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' }, createdAt: '2026-07-14' },
];

export const INITIAL_TAGS: CustomerTag[] = [
  { id: 1, name: 'สอบถามข้อมูล', color: '#3b82f6', createdAt: '2026-07-01T00:00:00Z' },
  { id: 2, name: 'ต้องการใบเสนอราคา', color: '#f59e0b', createdAt: '2026-07-01T00:00:00Z' },
  { id: 3, name: 'นัดดูห้อง', color: '#10b981', createdAt: '2026-07-01T00:00:00Z' },
  { id: 4, name: 'ต่อรองราคา', color: '#ef4444', createdAt: '2026-07-01T00:00:00Z' },
  { id: 5, name: 'ลูกค้าใหม่', color: '#8b5cf6', createdAt: '2026-07-01T00:00:00Z' },
  { id: 6, name: 'ลูกค้าเก่า', color: '#ec4899', createdAt: '2026-07-01T00:00:00Z' },
  { id: 7, name: 'สนใจโครงการอื่น', color: '#06b6d4', createdAt: '2026-07-01T00:00:00Z' },
  { id: 8, name: 'ต้องการสัญญา', color: '#84cc16', createdAt: '2026-07-01T00:00:00Z' },
];

export const INITIAL_ALLOCATIONS: AllocationRecord[] = [
  { id: 1, leadId: 'LD-001', salesPersonId: 'demo-sales-001', salesPersonName: 'Marcus Brody (Sales Rep)', salesPersonAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', projectName: 'RelateFlows Enterprise', status: 'active', notes: 'สนใจ Enterprise License ต้องการส่วนลด 2 ปี', isReallocation: false, createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-07-22T14:00:00Z' },
  { id: 2, leadId: 'LD-003', salesPersonId: 'demo-sales-001', salesPersonName: 'Marcus Brody (Sales Rep)', salesPersonAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', projectName: 'Collaboration Program', status: 'active', notes: 'Tech blog affiliate partnership - 20% commission', isReallocation: false, createdAt: '2026-07-19T08:00:00Z', updatedAt: '2026-07-19T08:00:00Z' },
  { id: 3, leadId: 'LD-005', salesPersonId: 'demo-sales-001', salesPersonName: 'Marcus Brody (Sales Rep)', salesPersonAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', projectName: 'API Integration Support', status: 'active', notes: 'API 401 errors + webhook issues - urgent', isReallocation: false, createdAt: '2026-07-17T09:30:00Z', updatedAt: '2026-07-22T11:00:00Z' },
  { id: 4, leadId: 'LD-009', salesPersonId: 'demo-mgr-001', salesPersonName: 'Alex Rivera (Manager)', salesPersonAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', projectName: 'Bali Style Villa', status: 'active', notes: 'สนใจ Bali Style 4BR ต้องการเอกสารสิทธิประโยชน์', isReallocation: false, createdAt: '2026-07-21T14:00:00Z', updatedAt: '2026-07-22T09:00:00Z' },
];

// Add tags to mock leads
export const LEAD_TAGS: Record<string, CustomerTag[]> = {
  'LD-001': [INITIAL_TAGS[0], INITIAL_TAGS[1], INITIAL_TAGS[4], INITIAL_TAGS[3]],
  'LD-002': [INITIAL_TAGS[0], INITIAL_TAGS[4], INITIAL_TAGS[7]],
  'LD-003': [INITIAL_TAGS[5], INITIAL_TAGS[6]],
  'LD-004': [INITIAL_TAGS[1], INITIAL_TAGS[2]],
  'LD-005': [INITIAL_TAGS[0], INITIAL_TAGS[6]],
  'LD-007': [INITIAL_TAGS[2], INITIAL_TAGS[4]],
  'LD-008': [INITIAL_TAGS[0], INITIAL_TAGS[1], INITIAL_TAGS[4]],
  'LD-009': [INITIAL_TAGS[2], INITIAL_TAGS[5], INITIAL_TAGS[7]],
};

// Enrich leads with tags and allocation history
export function enrichLeads(leads: Lead[]): Lead[] {
  return leads.map(lead => ({
    ...lead,
    tags: LEAD_TAGS[lead.id] || [],
    allocationHistory: INITIAL_ALLOCATIONS.filter(a => a.leadId === lead.id),
  }));
}

export const INITIAL_METRICS: MetricCardData[] = [
  {
    id: 'MET-1',
    title: 'Total Pipeline Value',
    value: '$777,000',
    subtext: 'vs $680,000 last month',
    change: '+14.2%',
    isPositive: true,
    iconName: 'TrendingUp'
  },
  {
    id: 'MET-2',
    title: 'Closed Won (Q3)',
    value: '$210,000',
    subtext: 'Goal: $350,000 (60% reached)',
    change: '+28.5%',
    isPositive: true,
    iconName: 'Award'
  },
  {
    id: 'MET-3',
    title: 'Active Qualified Deals',
    value: '7 Deals',
    subtext: 'Avg deal size: $97.1k',
    change: '+2 Deals',
    isPositive: true,
    iconName: 'Briefcase'
  },
  {
    id: 'MET-4',
    title: 'RelateFlows Executions',
    value: '586 Automations',
    subtext: 'Saved ~42 team hours',
    change: '+34%',
    isPositive: true,
    iconName: 'Zap'
  }
];
