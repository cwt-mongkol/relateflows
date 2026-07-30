import React, { useState, useEffect, useCallback } from 'react';

type Lang = 'en' | 'th' | 'zh';

const tocSections = [
  { id: 'tos-s1',  en: '1. Acceptance of Terms',             th: '1. การยอมรับข้อกำหนด',                         zh: '1. 条款接受' },
  { id: 'tos-s2',  en: '2. Description of Service',          th: '2. คำอธิบายบริการ',                            zh: '2. 服务说明' },
  { id: 'tos-s3',  en: '3. User Accounts',                   th: '3. บัญชีผู้ใช้',                               zh: '3. 用户账户' },
  { id: 'tos-s4',  en: '4. Acceptable Use',                  th: '4. การใช้งานที่ยอมรับได้',                     zh: '4. 可接受的使用' },
  { id: 'tos-s5',  en: '5. Data Ownership & IP',             th: '5. ความเป็นเจ้าของข้อมูลและทรัพย์สินทางปัญญา', zh: '5. 数据所有权与知识产权' },
  { id: 'tos-s6',  en: '6. Payment and Billing',             th: '6. การชำระเงินและการเรียกเก็บเงิน',            zh: '6. 付款与账单' },
  { id: 'tos-s7',  en: '7. Limitation of Liability',         th: '7. การจำกัดความรับผิด',                        zh: '7. 责任限制' },
  { id: 'tos-s8',  en: '8. Disclaimer of Warranties',        th: '8. การปฏิเสธการรับประกัน',                     zh: '8. 免责声明' },
  { id: 'tos-s9',  en: '9. Indemnification',                 th: '9. การชดเชยความเสียหาย',                       zh: '9. 赔偿' },
  { id: 'tos-s10', en: '10. Third-Party Integrations',       th: '10. การผสานรวมบุคคลที่สาม',                   zh: '10. 第三方集成' },
  { id: 'tos-s11', en: '11. Changes to Terms',               th: '11. การเปลี่ยนแปลงข้อกำหนด',                  zh: '11. 条款变更' },
  { id: 'tos-s12', en: '12. Governing Law',                  th: '12. กฎหมายที่ใช้บังคับ',                       zh: '12. 适用法律' },
  { id: 'tos-s13', en: '13. Contact',                        th: '13. ติดต่อ',                                   zh: '13. 联系方式' },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'th', label: 'TH' },
  { value: 'zh', label: '中文' },
];

export const TermsOfService: React.FC = () => {
  const [lang, setLang] = useState<Lang>('th');
  const [activeId, setActiveId] = useState('tos-s1');
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
        className="fixed top-0 left-0 z-[60] h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-100"
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
              {t('Terms of Service', 'ข้อกำหนดการให้บริการ', '服务条款')}
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
                      ? 'bg-indigo-600 text-white shadow'
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
            className="absolute top-14 right-0 left-0 bg-white border-b border-slate-200 shadow-lg p-4 max-h-[70vh] overflow-y-auto"
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
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
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
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-600 pl-[10px]'
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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                {t('Terms of Service', 'ข้อกำหนดการให้บริการ', '服务条款')}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
                {t('Terms of Service', 'ข้อกำหนดการให้บริการ', '服务条款')}
              </h1>
              <p className="text-sm text-slate-500">
                {t('Last updated: July 30, 2026', 'อัปเดตล่าสุด: 30 กรกฎาคม 2026', '最后更新：2026年7月30日')}
              </p>
            </div>

            <div className="space-y-10">

              {/* S1 */}
              <section id="tos-s1" className="scroll-mt-20">
                <SectionHeading>{t('1. Acceptance of Terms', '1. การยอมรับข้อกำหนด', '1. 条款接受')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>By accessing or using RelateFlows ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all the terms, you may not access or use the Platform.</p>
                      <p>These Terms apply to all visitors, users, and others who access or use the Platform.</p>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>การเข้าถึงหรือใช้งาน RelateFlows ("แพลตฟอร์ม") ถือว่าคุณยินยอมผูกพันตามข้อกำหนดการให้บริการเหล่านี้ ("ข้อกำหนด") หากคุณไม่เห็นด้วยกับข้อกำหนดทั้งหมด คุณจะไม่สามารถเข้าถึงหรือใช้งานแพลตฟอร์มได้</p>
                      <p>ข้อกำหนดเหล่านี้มีผลบังคับใช้กับผู้เข้าชม ผู้ใช้ และบุคคลอื่นทั้งหมดที่เข้าถึงหรือใช้งานแพลตฟอร์ม</p>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>通过访问或使用 RelateFlows（"平台"），即表示您同意受本服务条款（"条款"）的约束。如果您不同意所有条款，则不得访问或使用本平台。</p>
                      <p>本条款适用于所有访问或使用本平台的访客、用户及其他人员。</p>
                    </>
                  )}
                </div>
              </section>

              {/* S2 */}
              <section id="tos-s2" className="scroll-mt-20">
                <SectionHeading>{t('2. Description of Service', '2. คำอธิบายบริการ', '2. 服务说明')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>RelateFlows is a Customer Relationship Management (CRM) platform that provides tools for sales pipeline management, customer communication, team collaboration, workflow automation, and analytics. The Platform is accessible via web browser and may integrate with third-party services including Google, LINE, Facebook, and Instagram.</p>}
                  {lang === 'th' && <p>RelateFlows คือแพลตฟอร์มการจัดการลูกค้าสัมพันธ์ (CRM) ที่มีเครื่องมือสำหรับการจัดการ Sales Pipeline การสื่อสารกับลูกค้า การทำงานร่วมกันของทีม ระบบอัตโนมัติของ Workflow และการวิเคราะห์ข้อมูล แพลตฟอร์มเข้าถึงได้ผ่านเว็บเบราว์เซอร์ และอาจผสานรวมกับบริการของบุคคลที่สาม รวมถึง Google, LINE, Facebook และ Instagram</p>}
                  {lang === 'zh' && <p>RelateFlows 是一个客户关系管理（CRM）平台，提供销售管道管理、客户沟通、团队协作、工作流自动化和数据分析等工具。该平台可通过网络浏览器访问，并可与 Google、LINE、Facebook 和 Instagram 等第三方服务集成。</p>}
                </div>
              </section>

              {/* S3 */}
              <section id="tos-s3" className="scroll-mt-20">
                <SectionHeading>{t('3. User Accounts', '3. บัญชีผู้ใช้', '3. 用户账户')}</SectionHeading>
                <div className="prose-content space-y-5">
                  {lang === 'en' && (
                    <>
                      <SubSection title="3.1 Account Creation">
                        <p>Access to the Platform is by invitation only. Users must be invited by an existing account administrator. Each user is responsible for maintaining the confidentiality of their authentication credentials.</p>
                      </SubSection>
                      <SubSection title="3.2 Account Responsibilities">
                        <ul>
                          <li>You are responsible for all activities that occur under your account</li>
                          <li>You must notify us immediately of any unauthorized use of your account</li>
                          <li>You must provide accurate, current, and complete information during registration</li>
                          <li>You may not share your account credentials with unauthorized parties</li>
                        </ul>
                      </SubSection>
                      <SubSection title="3.3 Account Termination">
                        <p>We reserve the right to suspend or terminate accounts that violate these Terms or engage in unauthorized use of the Platform. Account administrators may remove users from their organization at any time.</p>
                      </SubSection>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <SubSection title="3.1 การสร้างบัญชี">
                        <p>การเข้าถึงแพลตฟอร์มเป็นแบบเชิญชวนเท่านั้น ผู้ใช้ต้องได้รับการเชิญจากผู้ดูแลบัญชีที่มีอยู่ ผู้ใช้แต่ละคนรับผิดชอบในการรักษาความลับของข้อมูลรับรองการตรวจสอบสิทธิ์ของตน</p>
                      </SubSection>
                      <SubSection title="3.2 ความรับผิดชอบของบัญชี">
                        <ul>
                          <li>คุณรับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ</li>
                          <li>คุณต้องแจ้งให้เราทราบทันทีหากมีการใช้งานบัญชีของคุณโดยไม่ได้รับอนุญาต</li>
                          <li>คุณต้องให้ข้อมูลที่ถูกต้อง เป็นปัจจุบัน และครบถ้วนระหว่างการลงทะเบียน</li>
                          <li>คุณจะไม่แบ่งปันข้อมูลรับรองบัญชีกับบุคคลที่ไม่ได้รับอนุญาต</li>
                        </ul>
                      </SubSection>
                      <SubSection title="3.3 การยกเลิกบัญชี">
                        <p>เราขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดเหล่านี้หรือใช้งานแพลตฟอร์มโดยไม่ได้รับอนุญาต ผู้ดูแลบัญชีสามารถลบผู้ใช้ออกจากองค์กรของตนได้ทุกเมื่อ</p>
                      </SubSection>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <SubSection title="3.1 账户创建">
                        <p>平台的访问权限仅限于受邀用户。用户必须由现有账户管理员发送邀请方可注册。每位用户负责维护其身份验证凭据的保密性。</p>
                      </SubSection>
                      <SubSection title="3.2 账户责任">
                        <ul>
                          <li>您对账户下发生的所有活动负责</li>
                          <li>如发现账户被未授权使用，须立即通知我们</li>
                          <li>注册时必须提供准确、最新且完整的信息</li>
                          <li>不得与未授权方共享账户凭据</li>
                        </ul>
                      </SubSection>
                      <SubSection title="3.3 账户终止">
                        <p>我们保留暂停或终止违反本条款或未经授权使用平台的账户的权利。账户管理员可随时将用户从其组织中移除。</p>
                      </SubSection>
                    </>
                  )}
                </div>
              </section>

              {/* S4 */}
              <section id="tos-s4" className="scroll-mt-20">
                <SectionHeading>{t('4. Acceptable Use', '4. การใช้งานที่ยอมรับได้', '4. 可接受的使用')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && (
                    <>
                      <p>You agree not to use the Platform for any unlawful purpose or in violation of these Terms. Prohibited activities include:</p>
                      <ul>
                        <li>Uploading or transmitting viruses, malware, or harmful code</li>
                        <li>Attempting to gain unauthorized access to our systems or other users' accounts</li>
                        <li>Interfering with or disrupting the integrity or performance of the Platform</li>
                        <li>Using the Platform to send spam, phishing messages, or unsolicited communications</li>
                        <li>Reverse engineering, decompiling, or disassembling the Platform</li>
                        <li>Storing or transmitting content that infringes on intellectual property rights</li>
                      </ul>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <p>คุณตกลงที่จะไม่ใช้แพลตฟอร์มเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือฝ่าฝืนข้อกำหนดเหล่านี้ กิจกรรมที่ต้องห้าม ได้แก่:</p>
                      <ul>
                        <li>การอัปโหลดหรือส่งไวรัส มัลแวร์ หรือโค้ดที่เป็นอันตราย</li>
                        <li>การพยายามเข้าถึงระบบของเราหรือบัญชีของผู้ใช้รายอื่นโดยไม่ได้รับอนุญาต</li>
                        <li>การรบกวนหรือขัดขวางความสมบูรณ์หรือประสิทธิภาพของแพลตฟอร์ม</li>
                        <li>การใช้แพลตฟอร์มเพื่อส่งสแปม ข้อความฟิชชิ่ง หรือการสื่อสารที่ไม่พึงประสงค์</li>
                        <li>การ Reverse Engineering การ Decompile หรือการถอดประกอบแพลตฟอร์ม</li>
                        <li>การจัดเก็บหรือส่งเนื้อหาที่ละเมิดสิทธิ์ทรัพย์สินทางปัญญา</li>
                      </ul>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <p>您同意不将平台用于任何违法目的或违反本条款的行为。禁止的活动包括：</p>
                      <ul>
                        <li>上传或传播病毒、恶意软件或有害代码</li>
                        <li>试图未经授权访问我们的系统或其他用户的账户</li>
                        <li>干扰或破坏平台的完整性或性能</li>
                        <li>使用平台发送垃圾邮件、网络钓鱼消息或未经请求的通信</li>
                        <li>对平台进行逆向工程、反编译或反汇编</li>
                        <li>存储或传输侵犯知识产权的内容</li>
                      </ul>
                    </>
                  )}
                </div>
              </section>

              {/* S5 */}
              <section id="tos-s5" className="scroll-mt-20">
                <SectionHeading>{t('5. Data Ownership and Intellectual Property', '5. ความเป็นเจ้าของข้อมูลและทรัพย์สินทางปัญญา', '5. 数据所有权与知识产权')}</SectionHeading>
                <div className="prose-content space-y-5">
                  {lang === 'en' && (
                    <>
                      <SubSection title="5.1 Your Data">
                        <p>You retain all rights to the business data, customer information, and content you enter into the Platform. We claim no ownership over your data.</p>
                      </SubSection>
                      <SubSection title="5.2 Platform IP">
                        <p>The RelateFlows platform, including its software, design, trademarks, and branding, is owned by RelateFlows and protected by intellectual property laws. You may not copy, modify, or create derivative works without our express consent.</p>
                      </SubSection>
                    </>
                  )}
                  {lang === 'th' && (
                    <>
                      <SubSection title="5.1 ข้อมูลของคุณ">
                        <p>คุณยังคงมีสิทธิ์ทั้งหมดในข้อมูลทางธุรกิจ ข้อมูลลูกค้า และเนื้อหาที่คุณป้อนเข้าสู่แพลตฟอร์ม เราไม่อ้างสิทธิ์ความเป็นเจ้าของข้อมูลของคุณ</p>
                      </SubSection>
                      <SubSection title="5.2 ทรัพย์สินทางปัญญาของแพลตฟอร์ม">
                        <p>แพลตฟอร์ม RelateFlows รวมถึงซอฟต์แวร์ การออกแบบ เครื่องหมายการค้า และตราสัญลักษณ์ เป็นกรรมสิทธิ์ของ RelateFlows และได้รับการคุ้มครองโดยกฎหมายทรัพย์สินทางปัญญา คุณไม่สามารถคัดลอก ดัดแปลง หรือสร้างงานดัดแปลงได้โดยไม่ได้รับความยินยอมอย่างชัดแจ้งจากเรา</p>
                      </SubSection>
                    </>
                  )}
                  {lang === 'zh' && (
                    <>
                      <SubSection title="5.1 您的数据">
                        <p>您对输入平台的业务数据、客户信息和内容保留所有权利。我们不对您的数据主张任何所有权。</p>
                      </SubSection>
                      <SubSection title="5.2 平台知识产权">
                        <p>RelateFlows 平台，包括其软件、设计、商标和品牌，均归 RelateFlows 所有，并受知识产权法律保护。未经我们明确同意，您不得复制、修改或创作衍生作品。</p>
                      </SubSection>
                    </>
                  )}
                </div>
              </section>

              {/* S6 */}
              <section id="tos-s6" className="scroll-mt-20">
                <SectionHeading>{t('6. Payment and Billing', '6. การชำระเงินและการเรียกเก็บเงิน', '6. 付款与账单')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>Certain features of the Platform may be subject to payment. Pricing and billing terms will be provided at the time of subscription. All fees are non-refundable unless otherwise stated. We reserve the right to change pricing with reasonable notice.</p>}
                  {lang === 'th' && <p>ฟีเจอร์บางอย่างของแพลตฟอร์มอาจต้องชำระเงิน รายละเอียดราคาและเงื่อนไขการเรียกเก็บเงินจะถูกระบุในเวลาที่สมัครสมาชิก ค่าธรรมเนียมทั้งหมดจะไม่มีการคืนเงิน เว้นแต่จะระบุไว้เป็นอย่างอื่น เราขอสงวนสิทธิ์ในการเปลี่ยนแปลงราคาโดยแจ้งให้ทราบล่วงหน้าอย่างสมเหตุสมผล</p>}
                  {lang === 'zh' && <p>平台的某些功能可能需要付费。订阅时将提供定价和账单条款。除非另有说明，所有费用均不予退款。我们保留在合理通知后更改定价的权利。</p>}
                </div>
              </section>

              {/* S7 */}
              <section id="tos-s7" className="scroll-mt-20">
                <SectionHeading>{t('7. Limitation of Liability', '7. การจำกัดความรับผิด', '7. 责任限制')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>To the maximum extent permitted by law, RelateFlows shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform. Our total liability for any claim arising from these Terms shall not exceed the amount paid by you to us in the twelve (12) months preceding the claim.</p>}
                  {lang === 'th' && <p>ในขอบเขตสูงสุดที่กฎหมายอนุญาต RelateFlows จะไม่รับผิดต่อความเสียหายทางอ้อม อุบัติเหตุ พิเศษ เป็นผลสืบเนื่อง หรือเป็นการลงโทษที่เกิดจากหรือเกี่ยวข้องกับการใช้งานแพลตฟอร์มของคุณ ความรับผิดทั้งหมดของเราสำหรับการเรียกร้องใด ๆ ที่เกิดจากข้อกำหนดเหล่านี้จะไม่เกินกว่าจำนวนเงินที่คุณชำระให้เราในช่วง 12 เดือนก่อนการเรียกร้อง</p>}
                  {lang === 'zh' && <p>在法律允许的最大范围内，RelateFlows 不对因使用平台而产生的任何间接、附带、特殊、后果性或惩罚性损害承担责任。我们对本条款引起的任何索赔的总责任不超过您在索赔前十二（12）个月内向我们支付的金额。</p>}
                </div>
              </section>

              {/* S8 */}
              <section id="tos-s8" className="scroll-mt-20">
                <SectionHeading>{t('8. Disclaimer of Warranties', '8. การปฏิเสธการรับประกัน', '8. 免责声明')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>The Platform is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not guarantee that the Platform will be uninterrupted, secure, or error-free. We are not responsible for any data loss or damage resulting from your use of the Platform.</p>}
                  {lang === 'th' && <p>แพลตฟอร์มให้บริการ "ตามสภาพ" และ "ตามที่มีให้บริการ" โดยไม่มีการรับประกันใด ๆ ทั้งโดยชัดแจ้งหรือโดยนัย เราไม่รับประกันว่าแพลตฟอร์มจะไม่หยุดชะงัก ปลอดภัย หรือปราศจากข้อผิดพลาด เราไม่รับผิดชอบต่อการสูญหายหรือความเสียหายของข้อมูลใด ๆ ที่เกิดจากการใช้งานแพลตฟอร์มของคุณ</p>}
                  {lang === 'zh' && <p>平台以"现状"和"可用"的方式提供，不附带任何形式的明示或暗示保证。我们不保证平台不会中断、安全或无错误。对于因使用平台而导致的任何数据丢失或损害，我们概不负责。</p>}
                </div>
              </section>

              {/* S9 */}
              <section id="tos-s9" className="scroll-mt-20">
                <SectionHeading>{t('9. Indemnification', '9. การชดเชยความเสียหาย', '9. 赔偿')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>You agree to indemnify and hold harmless RelateFlows, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your use of the Platform, violation of these Terms, or infringement of any third-party rights.</p>}
                  {lang === 'th' && <p>คุณตกลงที่จะชดเชยและปกป้อง RelateFlows เจ้าหน้าที่ กรรมการ พนักงาน และตัวแทนของเราจากการเรียกร้อง ความเสียหาย การสูญเสีย ความรับผิด และค่าใช้จ่ายใด ๆ ที่เกิดจากการใช้งานแพลตฟอร์มของคุณ การละเมิดข้อกำหนดเหล่านี้ หรือการละเมิดสิทธิ์ของบุคคลที่สาม</p>}
                  {lang === 'zh' && <p>您同意对因您使用平台、违反本条款或侵犯任何第三方权利而产生的任何索赔、损害、损失、责任和费用，向 RelateFlows 及其高管、董事、员工和代理人进行赔偿并使其免受损害。</p>}
                </div>
              </section>

              {/* S10 */}
              <section id="tos-s10" className="scroll-mt-20">
                <SectionHeading>{t('10. Third-Party Integrations', '10. การผสานรวมบุคคลที่สาม', '10. 第三方集成')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>The Platform integrates with third-party services (Google, LINE, Facebook, Instagram, Resend). Your use of these services is subject to their respective terms and privacy policies. We are not responsible for the availability, reliability, or security of third-party services.</p>}
                  {lang === 'th' && <p>แพลตฟอร์มผสานรวมกับบริการของบุคคลที่สาม (Google, LINE, Facebook, Instagram, Resend) การใช้บริการเหล่านี้ของคุณอยู่ภายใต้ข้อกำหนดและนโยบายความเป็นส่วนตัวของบริการนั้น ๆ เราไม่รับผิดชอบต่อความพร้อมใช้งาน ความน่าเชื่อถือ หรือความปลอดภัยของบริการของบุคคลที่สาม</p>}
                  {lang === 'zh' && <p>平台与第三方服务（Google、LINE、Facebook、Instagram、Resend）集成。您对这些服务的使用受其各自条款和隐私政策的约束。我们不对第三方服务的可用性、可靠性或安全性负责。</p>}
                </div>
              </section>

              {/* S11 */}
              <section id="tos-s11" className="scroll-mt-20">
                <SectionHeading>{t('11. Changes to Terms', '11. การเปลี่ยนแปลงข้อกำหนด', '11. 条款变更')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>We may modify these Terms at any time. We will notify users of material changes via email or through the Platform. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>}
                  {lang === 'th' && <p>เราอาจแก้ไขข้อกำหนดเหล่านี้ได้ตลอดเวลา เราจะแจ้งผู้ใช้เกี่ยวกับการเปลี่ยนแปลงที่สำคัญทางอีเมลหรือผ่านแพลตฟอร์ม การใช้งานแพลตฟอร์มต่อเนื่องหลังจากการเปลี่ยนแปลงถือเป็นการยอมรับข้อกำหนดใหม่</p>}
                  {lang === 'zh' && <p>我们可能随时修改本条款。我们将通过电子邮件或平台通知用户重大变更。变更后继续使用平台即表示接受新条款。</p>}
                </div>
              </section>

              {/* S12 */}
              <section id="tos-s12" className="scroll-mt-20">
                <SectionHeading>{t('12. Governing Law', '12. กฎหมายที่ใช้บังคับ', '12. 适用法律')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>These Terms shall be governed by and construed in accordance with the laws of Thailand, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Thailand.</p>}
                  {lang === 'th' && <p>ข้อกำหนดเหล่านี้จะถูกควบคุมและตีความตามกฎหมายของประเทศไทย โดยไม่คำนึงถึงบทบัญญัติความขัดแย้งทางกฎหมาย ข้อพิพาทใด ๆ ที่เกิดจากข้อกำหนดเหล่านี้จะได้รับการแก้ไขในศาลของประเทศไทย</p>}
                  {lang === 'zh' && <p>本条款应受泰国法律管辖并按其解释，不考虑法律冲突条款。因本条款引起的任何争议应在泰国法院解决。</p>}
                </div>
              </section>

              {/* S13 */}
              <section id="tos-s13" className="scroll-mt-20">
                <SectionHeading>{t('13. Contact', '13. ติดต่อ', '13. 联系方式')}</SectionHeading>
                <div className="prose-content">
                  {lang === 'en' && <p>For questions about these Terms, please contact us at:</p>}
                  {lang === 'th' && <p>หากมีคำถามเกี่ยวกับข้อกำหนดเหล่านี้ โปรดติดต่อเราที่:</p>}
                  {lang === 'zh' && <p>如对本条款有任何疑问，请通过以下方式联系我们：</p>}
                  <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-slate-800">legal@relateflows.com</span>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer nav */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('Back to RelateFlows', 'กลับสู่ RelateFlows', '返回 RelateFlows')}
              </button>
              <a href="/privacy" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                {t('← Privacy Policy', '← นโยบายความเป็นส่วนตัว', '← 隐私政策')}
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
        .prose-content ul li::before { content: ''; flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #6366f1; margin-top: 0.625rem; }
        .prose-content strong { color: #1e293b; font-weight: 600; }
      `}</style>
    </div>
  );
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
    <span className="w-1 h-5 rounded-full bg-indigo-500 flex-shrink-0 inline-block" />
    {children}
  </h2>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">{title}</h3>
    <div className="prose-content">{children}</div>
  </div>
);
