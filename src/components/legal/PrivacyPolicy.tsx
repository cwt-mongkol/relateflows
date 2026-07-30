import React, { useState, useEffect, useCallback } from 'react';

type Lang = 'en' | 'th' | 'zh';

const tocSections = [
  { id: 'pp-s1',  en: '1. Introduction',                    th: '1. บทนำ',                              zh: '1. 简介' },
  { id: 'pp-s2',  en: '2. Information We Collect',          th: '2. ข้อมูลที่เราเก็บรวบรวม',             zh: '2. 我们收集的信息' },
  { id: 'pp-s3',  en: '3. How We Use Your Information',     th: '3. วิธีที่เราใช้ข้อมูลของคุณ',          zh: '3. 我们如何使用您的信息' },
  { id: 'pp-s4',  en: '4. Data Sharing & Disclosure',       th: '4. การแบ่งปันและเปิดเผยข้อมูล',         zh: '4. 数据共享与披露' },
  { id: 'pp-s5',  en: '5. Data Security',                   th: '5. ความปลอดภัยของข้อมูล',               zh: '5. 数据安全' },
  { id: 'pp-s6',  en: '6. Data Retention',                  th: '6. การเก็บรักษาข้อมูล',                 zh: '6. 数据保留' },
  { id: 'pp-s7',  en: '7. Your Rights',                     th: '7. สิทธิ์ของคุณ',                       zh: '7. 您的权利' },
  { id: 'pp-s8',  en: '8. Third-Party Services',            th: '8. บริการของบุคคลที่สาม',               zh: '8. 第三方服务' },
  { id: 'pp-s9',  en: '9. Changes to This Policy',          th: '9. การเปลี่ยนแปลงนโยบาย',              zh: '9. 政策变更' },
  { id: 'pp-s10', en: '10. Contact Us',                     th: '10. ติดต่อเรา',                         zh: '10. 联系我们' },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'th', label: 'TH' },
  { value: 'zh', label: '中文' },
];

export const PrivacyPolicy: React.FC = () => {
  const [lang, setLang] = useState<Lang>('th');
  const [activeId, setActiveId] = useState('pp-s1');
  const [progress, setProgress] = useState(0);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const handleBack = () => { window.location.href = '/'; };

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );
    tocSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileTocOpen(false);
  }, []);

  const t = (en: string, th: string, zh: string) =>
    lang === 'en' ? en : lang === 'th' ? th : zh;

  return (
    <div className="min-h-screen bg-slate-50 font-sans" style={{ fontFamily: "'Inter', 'Noto Sans SC', 'Sarabun', sans-serif" }}>

      {/* Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 z-[60] h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/rf.png?v=1" alt="RelateFlows" className="w-7 h-7 object-contain flex-shrink-0" />
              <span className="text-base font-extrabold tracking-tight">
                <span className="text-blue-600">Relate</span><span className="text-yellow-400">Flows</span>
              </span>
            </div>
            <span className="hidden sm:block text-slate-300 text-lg font-thin">|</span>
            <span className="hidden sm:block text-sm font-semibold text-slate-600 truncate">
              {t('Privacy Policy', 'นโยบายความเป็นส่วนตัว', '隐私政策')}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setMobileTocOpen((v) => !v)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
              </svg>
            </button>

            {/* Language Toggle */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 gap-0.5">
              {LANGS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLang(value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                    lang === value
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile TOC Drawer */}
      {mobileTocOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileTocOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute top-14 right-0 left-0 bg-white border-b border-slate-200 shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {t('Contents', 'สารบัญ', '目录')}
            </p>
            <nav className="grid grid-cols-1 gap-0.5">
              {tocSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeId === s.id
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t(s.en, s.th, s.zh)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex pt-14">
        {/* Sidebar TOC */}
        <aside className="hidden lg:flex flex-col fixed left-0 top-14 bottom-0 w-64 xl:w-72 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-5 flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              {t('Contents', 'สารบัญ', '目录')}
            </p>
            <nav className="space-y-0.5">
              {tocSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    activeId === s.id
                      ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 pl-[10px]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  {t(s.en, s.th, s.zh)}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('Last updated: July 30, 2026', 'อัปเดตล่าสุด: 30 กรกฎาคม 2026', '最后更新：2026年7月30日')}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 xl:ml-72">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 pb-24">

            {/* Page Title */}
            <div className="mb-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t('Privacy Policy', 'นโยบายความเป็นส่วนตัว', '隐私政策')}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
                {t('Privacy Policy', 'นโยบายความเป็นส่วนตัว', '隐私政策')}
              </h1>
              <p className="text-sm text-slate-500">
                {t('Last updated: July 30, 2026', 'อัปเดตล่าสุด: 30 กรกฎาคม 2026', '最后更新：2026年7月30日')}
              </p>
            </div>

            <div className="space-y-10">

              {/* S1 */}
              <section id="pp-s1" className="scroll-mt-20">
                <SectionHeading>{t('1. Introduction', '1. บทนำ', '1. 简介')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>RelateFlows ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Customer Relationship Management (CRM) platform and related services.</p>
                      <p>By accessing or using RelateFlows, you agree to the collection and use of information in accordance with this policy.</p>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>RelateFlows ("เรา" หรือ "ของเรา") มุ่งมั่นในการปกป้องความเป็นส่วนตัวของคุณ นโยบายความเป็นส่วนตัวนี้อธิบายถึงวิธีที่เราเก็บรวบรวม ใช้ เปิดเผย และปกป้องข้อมูลของคุณเมื่อคุณใช้แพลตฟอร์มการจัดการลูกค้าสัมพันธ์ (CRM) และบริการที่เกี่ยวข้องของเรา</p>
                      <p>การเข้าถึงหรือใช้งาน RelateFlows ถือว่าคุณยินยอมให้เราเก็บรวบรวมและใช้ข้อมูลตามนโยบายนี้</p>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>RelateFlows（"我们"或"我方"）致力于保护您的隐私。本隐私政策说明了当您使用我们的客户关系管理（CRM）平台及相关服务时，我们如何收集、使用、披露和保护您的信息。</p>
                      <p>通过访问或使用 RelateFlows，即表示您同意按照本政策收集和使用信息。</p>
                    </>
                  )}
                </div>
              </section>

              {/* S2 */}
              <section id="pp-s2" className="scroll-mt-20">
                <SectionHeading>{t('2. Information We Collect', '2. ข้อมูลที่เราเก็บรวบรวม', '2. 我们收集的信息')}</SectionHeading>
                <div className="prose-content space-y-5">
                  {lang === 'en' && (
                    <>
                      <SubSection title="2.1 Personal Information">
                        <p>We may collect personally identifiable information such as:</p>
                        <ul>
                          <li>Name, email address, and phone number</li>
                          <li>Profile picture and avatar</li>
                          <li>Job title and company affiliation</li>
                          <li>Account credentials (via Google OAuth, LINE, or email-based authentication)</li>
                        </ul>
                      </SubSection>
                      <SubSection title="2.2 Business Data">
                        <p>As a CRM platform, we store business-related data you input, including:</p>
                        <ul>
                          <li>Contact and lead information</li>
                          <li>Sales pipeline data and deal details</li>
                          <li>Communication history and chat messages</li>
                          <li>Customer support queue records</li>
                          <li>Workflow configurations and automation rules</li>
                        </ul>
                      </SubSection>
                      <SubSection title="2.3 Automatically Collected Information">
                        <p>When you access our platform, we automatically collect:</p>
                        <ul>
                          <li>Browser type and version</li>
                          <li>Usage patterns and feature interactions</li>
                          <li>Device information and IP address</li>
                          <li>Session duration and page views</li>
                        </ul>
                      </SubSection>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <SubSection title="2.1 ข้อมูลส่วนบุคคล">
                        <p>เราอาจเก็บรวบรวมข้อมูลที่สามารถระบุตัวตนได้ เช่น:</p>
                        <ul>
                          <li>ชื่อ ที่อยู่อีเมล และหมายเลขโทรศัพท์</li>
                          <li>รูปโปรไฟล์และอวาตาร์</li>
                          <li>ตำแหน่งงานและบริษัทที่สังกัด</li>
                          <li>ข้อมูลประจำตัวบัญชี (ผ่าน Google OAuth, LINE หรือการตรวจสอบสิทธิ์ทางอีเมล)</li>
                        </ul>
                      </SubSection>
                      <SubSection title="2.2 ข้อมูลทางธุรกิจ">
                        <p>ในฐานะแพลตฟอร์ม CRM เราจัดเก็บข้อมูลทางธุรกิจที่คุณป้อนเข้ามา รวมถึง:</p>
                        <ul>
                          <li>ข้อมูลผู้ติดต่อและผู้มีแนวโน้มเป็นลูกค้า</li>
                          <li>ข้อมูล Sales Pipeline และรายละเอียดดีล</li>
                          <li>ประวัติการสื่อสารและข้อความแชท</li>
                          <li>บันทึกคิวการสนับสนุนลูกค้า</li>
                          <li>การกำหนดค่า Workflow และกฎระบบอัตโนมัติ</li>
                        </ul>
                      </SubSection>
                      <SubSection title="2.3 ข้อมูลที่เก็บรวบรวมโดยอัตโนมัติ">
                        <p>เมื่อคุณเข้าถึงแพลตฟอร์มของเรา เราจะเก็บรวบรวมข้อมูลโดยอัตโนมัติ ได้แก่:</p>
                        <ul>
                          <li>ประเภทและเวอร์ชันของเบราว์เซอร์</li>
                          <li>รูปแบบการใช้งานและการโต้ตอบกับฟีเจอร์ต่าง ๆ</li>
                          <li>ข้อมูลอุปกรณ์และที่อยู่ IP</li>
                          <li>ระยะเวลาเซสชันและจำนวนหน้าที่เข้าชม</li>
                        </ul>
                      </SubSection>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <SubSection title="2.1 个人信息">
                        <p>我们可能收集可识别身份的信息，例如：</p>
                        <ul>
                          <li>姓名、电子邮件地址和电话号码</li>
                          <li>个人头像和头像图片</li>
                          <li>职位和所属公司</li>
                          <li>账户凭据（通过 Google OAuth、LINE 或基于电子邮件的身份验证）</li>
                        </ul>
                      </SubSection>
                      <SubSection title="2.2 业务数据">
                        <p>作为 CRM 平台，我们存储您输入的业务相关数据，包括：</p>
                        <ul>
                          <li>联系人和潜在客户信息</li>
                          <li>销售管道数据和交易详情</li>
                          <li>沟通历史记录和聊天消息</li>
                          <li>客户支持队列记录</li>
                          <li>工作流配置和自动化规则</li>
                        </ul>
                      </SubSection>
                      <SubSection title="2.3 自动收集的信息">
                        <p>当您访问我们的平台时，我们会自动收集：</p>
                        <ul>
                          <li>浏览器类型和版本</li>
                          <li>使用模式和功能交互情况</li>
                          <li>设备信息和 IP 地址</li>
                          <li>会话时长和页面浏览量</li>
                        </ul>
                      </SubSection>
                    </>
                  )}
                </div>
              </section>

              {/* S3 */}
              <section id="pp-s3" className="scroll-mt-20">
                <SectionHeading>{t('3. How We Use Your Information', '3. วิธีที่เราใช้ข้อมูลของคุณ', '3. 我们如何使用您的信息')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>We use the collected information for the following purposes:</p>
                      <ul>
                        <li>To provide, maintain, and improve our CRM services</li>
                        <li>To authenticate users and manage access permissions</li>
                        <li>To facilitate team collaboration and communication</li>
                        <li>To generate analytics and performance reports</li>
                        <li>To send service-related notifications and updates</li>
                        <li>To comply with legal obligations and enforce our Terms of Service</li>
                      </ul>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>เราใช้ข้อมูลที่เก็บรวบรวมเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
                      <ul>
                        <li>เพื่อให้บริการ ดูแลรักษา และปรับปรุงบริการ CRM ของเรา</li>
                        <li>เพื่อตรวจสอบสิทธิ์ผู้ใช้และจัดการสิทธิ์การเข้าถึง</li>
                        <li>เพื่ออำนวยความสะดวกในการทำงานร่วมกันและการสื่อสารของทีม</li>
                        <li>เพื่อสร้างรายงานการวิเคราะห์และประสิทธิภาพ</li>
                        <li>เพื่อส่งการแจ้งเตือนและอัปเดตที่เกี่ยวข้องกับบริการ</li>
                        <li>เพื่อปฏิบัติตามข้อผูกพันทางกฎหมายและบังคับใช้ข้อกำหนดการให้บริการของเรา</li>
                      </ul>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>我们将收集的信息用于以下目的：</p>
                      <ul>
                        <li>提供、维护和改进我们的 CRM 服务</li>
                        <li>对用户进行身份验证并管理访问权限</li>
                        <li>促进团队协作与沟通</li>
                        <li>生成分析报告和绩效报告</li>
                        <li>发送与服务相关的通知和更新</li>
                        <li>遵守法律义务并执行我们的服务条款</li>
                      </ul>
                    </>
                  )}
                </div>
              </section>

              {/* S4 */}
              <section id="pp-s4" className="scroll-mt-20">
                <SectionHeading>{t('4. Data Sharing and Disclosure', '4. การแบ่งปันและเปิดเผยข้อมูล', '4. 数据共享与披露')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>We do not sell your personal information. We may share data in the following circumstances:</p>
                      <ul>
                        <li><strong>With your consent:</strong> We share information when you explicitly authorize us to do so.</li>
                        <li><strong>Service providers:</strong> We engage trusted third parties to assist with hosting, email delivery, and analytics (e.g., PostgreSQL, Vercel, Resend).</li>
                        <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our rights.</li>
                        <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred.</li>
                      </ul>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>เราไม่ขายข้อมูลส่วนบุคคลของคุณ เราอาจแบ่งปันข้อมูลในกรณีดังต่อไปนี้เท่านั้น:</p>
                      <ul>
                        <li><strong>ด้วยความยินยอมของคุณ:</strong> เราแบ่งปันข้อมูลเมื่อคุณให้อนุญาตอย่างชัดเจน</li>
                        <li><strong>ผู้ให้บริการ:</strong> เราร่วมงานกับบุคคลที่สามที่เชื่อถือได้เพื่อช่วยด้านการโฮสต์ การส่งอีเมล และการวิเคราะห์ข้อมูล (เช่น PostgreSQL, Vercel, Resend)</li>
                        <li><strong>ข้อกำหนดทางกฎหมาย:</strong> เราอาจเปิดเผยข้อมูลหากกฎหมายกำหนด หรือเพื่อปกป้องสิทธิ์ของเรา</li>
                        <li><strong>การโอนกิจการ:</strong> ในกรณีที่มีการควบรวม การซื้อกิจการ หรือการขายสินทรัพย์ ข้อมูลของคุณอาจถูกโอน</li>
                      </ul>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>我们不出售您的个人信息。我们仅在以下情况下共享数据：</p>
                      <ul>
                        <li><strong>经您同意：</strong>当您明确授权时，我们会共享信息。</li>
                        <li><strong>服务提供商：</strong>我们与可信赖的第三方合作，协助提供托管、电子邮件投递和分析服务（如 PostgreSQL、Vercel、Resend）。</li>
                        <li><strong>法律要求：</strong>如果法律要求或为保护我们的权利，我们可能披露信息。</li>
                        <li><strong>业务转让：</strong>在合并、收购或资产出售的情况下，您的数据可能被转移。</li>
                      </ul>
                    </>
                  )}
                </div>
              </section>

              {/* S5 */}
              <section id="pp-s5" className="scroll-mt-20">
                <SectionHeading>{t('5. Data Security', '5. ความปลอดภัยของข้อมูล', '5. 数据安全')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>We implement appropriate technical and organizational measures to protect your data, including:</p>
                      <ul>
                        <li>Encryption of sensitive data at rest (AES-256) and in transit (TLS)</li>
                        <li>Role-based access control and permission management</li>
                        <li>Regular security audits and vulnerability assessments</li>
                        <li>Secure authentication via OAuth 2.0 and JWT tokens</li>
                      </ul>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>เราดำเนินมาตรการทางเทคนิคและองค์กรที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ ซึ่งรวมถึง:</p>
                      <ul>
                        <li>การเข้ารหัสข้อมูลที่ละเอียดอ่อนขณะจัดเก็บ (AES-256) และขณะส่ง (TLS)</li>
                        <li>การควบคุมการเข้าถึงตามบทบาทและการจัดการสิทธิ์</li>
                        <li>การตรวจสอบความปลอดภัยและการประเมินช่องโหว่เป็นประจำ</li>
                        <li>การตรวจสอบสิทธิ์ที่ปลอดภัยผ่าน OAuth 2.0 และ JWT token</li>
                      </ul>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>我们采取适当的技术和组织措施来保护您的数据，包括：</p>
                      <ul>
                        <li>对静态敏感数据（AES-256）和传输中数据（TLS）进行加密</li>
                        <li>基于角色的访问控制和权限管理</li>
                        <li>定期安全审计和漏洞评估</li>
                        <li>通过 OAuth 2.0 和 JWT 令牌进行安全身份验证</li>
                      </ul>
                    </>
                  )}
                </div>
              </section>

              {/* S6 */}
              <section id="pp-s6" className="scroll-mt-20">
                <SectionHeading>{t('6. Data Retention', '6. การเก็บรักษาข้อมูล', '6. 数据保留')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>We retain your personal information and business data for as long as your account is active or as needed to provide services. You may request deletion of your data by contacting us. Upon account termination, we will delete or anonymize your data within 90 days, except where retention is required by law.</p>}
                  {lang === 'th' && <p>เราเก็บรักษาข้อมูลส่วนบุคคลและข้อมูลทางธุรกิจของคุณตราบเท่าที่บัญชีของคุณยังใช้งานอยู่ หรือตามที่จำเป็นในการให้บริการ คุณสามารถขอให้ลบข้อมูลของคุณได้โดยติดต่อเรา เมื่อยกเลิกบัญชี เราจะลบหรือทำให้ข้อมูลของคุณไม่สามารถระบุตัวตนได้ภายใน 90 วัน ยกเว้นในกรณีที่กฎหมายกำหนดให้เก็บรักษา</p>}
                  {lang === 'zh' && <p>只要您的账户处于活跃状态或提供服务所需，我们将保留您的个人信息和业务数据。您可以通过联系我们来请求删除您的数据。账户终止后，我们将在 90 天内删除或匿名化您的数据，法律要求保留的情况除外。</p>}
                </div>
              </section>

              {/* S7 */}
              <section id="pp-s7" className="scroll-mt-20">
                <SectionHeading>{t('7. Your Rights', '7. สิทธิ์ของคุณ', '7. 您的权利')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>Depending on your jurisdiction, you may have the right to:</p>
                      <ul>
                        <li>Access the personal data we hold about you</li>
                        <li>Request correction of inaccurate data</li>
                        <li>Request deletion of your data</li>
                        <li>Object to or restrict processing of your data</li>
                        <li>Data portability</li>
                        <li>Withdraw consent at any time where processing is based on consent</li>
                      </ul>
                      <p>To exercise these rights, please contact us at <strong>privacy@relateflows.com</strong>.</p>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>ขึ้นอยู่กับเขตอำนาจศาลของคุณ คุณอาจมีสิทธิ์ดังต่อไปนี้:</p>
                      <ul>
                        <li>เข้าถึงข้อมูลส่วนบุคคลที่เราเก็บไว้เกี่ยวกับคุณ</li>
                        <li>ขอให้แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
                        <li>ขอให้ลบข้อมูลของคุณ</li>
                        <li>คัดค้านหรือจำกัดการประมวลผลข้อมูลของคุณ</li>
                        <li>ความสามารถในการพกพาข้อมูล (Data Portability)</li>
                        <li>ถอนความยินยอมได้ทุกเมื่อในกรณีที่การประมวลผลอาศัยความยินยอม</li>
                      </ul>
                      <p>เพื่อใช้สิทธิ์เหล่านี้ โปรดติดต่อเราที่ <strong>privacy@relateflows.com</strong></p>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>根据您所在的司法管辖区，您可能享有以下权利：</p>
                      <ul>
                        <li>访问我们持有的关于您的个人数据</li>
                        <li>请求更正不准确的数据</li>
                        <li>请求删除您的数据</li>
                        <li>反对或限制对您数据的处理</li>
                        <li>数据可携带性</li>
                        <li>在基于同意的处理中随时撤回同意</li>
                      </ul>
                      <p>如需行使上述权利，请通过 <strong>privacy@relateflows.com</strong> 联系我们。</p>
                    </>
                  )}
                </div>
              </section>

              {/* S8 */}
              <section id="pp-s8" className="scroll-mt-20">
                <SectionHeading>{t('8. Third-Party Services', '8. บริการของบุคคลที่สาม', '8. 第三方服务')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>Our platform integrates with third-party services:</p>
                      <ul>
                        <li><strong>Google:</strong> Authentication and Google Calendar sync</li>
                        <li><strong>LINE:</strong> Messaging integration for social inbox</li>
                        <li><strong>Facebook / Instagram:</strong> Social media messaging integration</li>
                        <li><strong>Resend:</strong> Email delivery for notifications and invites</li>
                        <li><strong>Vercel:</strong> Application hosting and deployment</li>
                      </ul>
                      <p>These services have their own privacy policies governing data handling.</p>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>แพลตฟอร์มของเราผสานรวมกับบริการของบุคคลที่สาม ได้แก่:</p>
                      <ul>
                        <li><strong>Google:</strong> การตรวจสอบสิทธิ์และการซิงค์ Google Calendar</li>
                        <li><strong>LINE:</strong> การผสานรวมการส่งข้อความสำหรับ Social Inbox</li>
                        <li><strong>Facebook / Instagram:</strong> การผสานรวมการส่งข้อความโซเชียลมีเดีย</li>
                        <li><strong>Resend:</strong> การส่งอีเมลสำหรับการแจ้งเตือนและคำเชิญ</li>
                        <li><strong>Vercel:</strong> การโฮสต์และการ Deploy แอปพลิเคชัน</li>
                      </ul>
                      <p>บริการเหล่านี้มีนโยบายความเป็นส่วนตัวของตนเองที่ควบคุมการจัดการข้อมูล</p>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>我们的平台与以下第三方服务集成：</p>
                      <ul>
                        <li><strong>Google：</strong>身份验证和 Google 日历同步</li>
                        <li><strong>LINE：</strong>社交收件箱的消息集成</li>
                        <li><strong>Facebook / Instagram：</strong>社交媒体消息集成</li>
                        <li><strong>Resend：</strong>通知和邀请的电子邮件投递</li>
                        <li><strong>Vercel：</strong>应用程序托管和部署</li>
                      </ul>
                      <p>上述服务均有各自的隐私政策来管理数据处理。</p>
                    </>
                  )}
                </div>
              </section>

              {/* S9 */}
              <section id="pp-s9" className="scroll-mt-20">
                <SectionHeading>{t('9. Changes to This Policy', '9. การเปลี่ยนแปลงนโยบาย', '9. 政策变更')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.</p>}
                  {lang === 'th' && <p>เราอาจอัปเดตนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบเกี่ยวกับการเปลี่ยนแปลงที่สำคัญโดยการโพสต์นโยบายใหม่บนหน้านี้และอัปเดตวันที่ "อัปเดตล่าสุด" เราขอแนะนำให้คุณตรวจสอบนโยบายนี้เป็นระยะ</p>}
                  {lang === 'zh' && <p>我们可能会不时更新本隐私政策。我们将通过在此页面发布新政策并更新"最后更新"日期来通知您重大变更。我们鼓励您定期查阅本政策。</p>}
                </div>
              </section>

              {/* S10 */}
              <section id="pp-s10" className="scroll-mt-20">
                <SectionHeading>{t('10. Contact Us', '10. ติดต่อเรา', '10. 联系我们')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>If you have questions about this Privacy Policy, please contact us:</p>}
                  {lang === 'th' && <p>หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ โปรดติดต่อเราที่:</p>}
                  {lang === 'zh' && <p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>}
                  <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-slate-800">privacy@relateflows.com</span>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer nav */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('Back to RelateFlows', 'กลับสู่ RelateFlows', '返回 RelateFlows')}
              </button>
              <a href="/terms" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                {t('Terms of Service →', 'ข้อกำหนดการให้บริการ →', '服务条款 →')}
              </a>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .prose-content { color: #475569; font-size: 0.9375rem; line-height: 1.8; }
        .prose-content p { margin-bottom: 0.75rem; }
        .prose-content p:last-child { margin-bottom: 0; }
        .prose-content ul { list-style: none; padding: 0; margin: 0.5rem 0 0.75rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .prose-content ul li { display: flex; align-items: flex-start; gap: 0.625rem; }
        .prose-content ul li::before { content: ''; flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; margin-top: 0.625rem; }
        .prose-content strong { color: #1e293b; font-weight: 600; }
      `}</style>
    </div>
  );
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
    <span className="w-1 h-5 rounded-full bg-blue-500 flex-shrink-0 inline-block" />
    {children}
  </h2>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">{title}</h3>
    <div className="prose-content">{children}</div>
  </div>
);
