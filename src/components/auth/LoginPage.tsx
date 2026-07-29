import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

import { Shield, Users, Briefcase, Headphones, MessageCircle, Globe, BarChart3, Zap, ChevronDown, ChevronUp } from 'lucide-react';

const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID || '';

// Build LINE OAuth URL dynamically so redirect_uri always matches current origin
function buildLineLoginUrl(): string {
  const redirectUri = encodeURIComponent(window.location.origin);
  return `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${redirectUri}&state=line-login&scope=profile%20openid%20email`;
}

const DEMO_ROLES = [
  { role: 'admin',   label: 'Administrator',    icon: <Shield className="w-4 h-4" />,     color: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200' },
  { role: 'manager', label: 'Manager',          icon: <Users className="w-4 h-4" />,      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { role: 'cs_admin', label: 'CS Admin',        icon: <Headphones className="w-4 h-4" />, color: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200' },
  { role: 'sales',   label: 'Sales Rep',        icon: <Briefcase className="w-4 h-4" />,  color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
];

const FEATURES = [
  { icon: <MessageCircle className="w-5 h-5" />, label: 'Omni-Channel Inbox', desc: 'Facebook, LINE, Instagram in one place' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'CRM & Pipeline', desc: 'Track leads, deals, and allocations' },
  { icon: <Zap className="w-5 h-5" />, label: 'Automation', desc: 'Quick replies, tags, and smart workflows' },
];

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithFacebook, loginWithDemo, isLoading } = useAuth();
  const leftRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [showDevTools, setShowDevTools] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: tokenResponse => loginWithGoogle(tokenResponse.access_token),
    onError: () => console.error('Google Sign In failed'),
    flow: 'implicit',
  });

  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  const handleLineLogin = () => {
    if (!LINE_CLIENT_ID) {
      alert('LINE Client ID is not configured.');
      return;
    }
    // Redirect to LINE authorization page — LINE will redirect back to origin?code=xxx&state=line-login
    window.location.href = buildLineLoginUrl();
  };

  const handleFacebookLogin = async () => {
    await loginWithFacebook();
  };

  return (
    <div className="min-h-screen bg-white flex">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .anim-float { animation: float 8s ease-in-out infinite; }
        .anim-float-slow { animation: float-slow 12s ease-in-out infinite; }
        .anim-float-delayed { animation: float 10s ease-in-out 2s infinite; }
        .anim-fade-up { animation: fade-up 0.6s ease-out both; }
        .anim-scale-in { animation: scale-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .anim-slide-right { animation: slide-right 0.6s ease-out both; }
        .anim-glow-pulse { animation: glow-pulse 2s ease-in-out 1.5s infinite; }
        .btn-lift { transition: all 0.2s ease; }
        .btn-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
      `}</style>

      {/* Left: Brand Panel */}
      <div ref={leftRef} className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 items-center justify-center relative overflow-hidden">
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `radial-gradient(circle at 25% 50%, white 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

        {/* Floating orbs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none anim-float"
          style={{ left: `${10 + mousePos.x * 5}%`, top: `${-15 + mousePos.y * 5}%` }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-3xl pointer-events-none anim-float-slow"
          style={{ right: `${5 + (1 - mousePos.x) * 5}%`, bottom: `${-5 + (1 - mousePos.y) * 5}%` }}
        />
        <div className="absolute top-[30%] right-[15%] w-20 h-20 bg-blue-300/10 rounded-full blur-xl pointer-events-none anim-float-delayed" />
        <div className="absolute bottom-[25%] left-[10%] w-32 h-32 bg-indigo-300/10 rounded-full blur-xl pointer-events-none anim-float" />

        <div className="relative max-w-md text-center">
          {/* Background network graphic */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08]">
            <svg viewBox="0 0 400 400" className="w-full h-full" fill="none" stroke="white" strokeWidth="1.5">
              <circle cx="200" cy="200" r="180" strokeOpacity="0.3" />
              <circle cx="200" cy="200" r="120" strokeOpacity="0.2" />
              <circle cx="200" cy="200" r="60" strokeOpacity="0.15" />
              <line x1="20" y1="20" x2="180" y2="80" strokeOpacity="0.3" />
              <line x1="380" y1="20" x2="220" y2="80" strokeOpacity="0.3" />
              <line x1="20" y1="380" x2="180" y2="320" strokeOpacity="0.3" />
              <line x1="380" y1="380" x2="220" y2="320" strokeOpacity="0.3" />
              <line x1="200" y1="20" x2="200" y2="380" strokeOpacity="0.15" />
              <line x1="20" y1="200" x2="380" y2="200" strokeOpacity="0.15" />
              <circle cx="180" cy="80" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="220" cy="80" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="180" cy="320" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="220" cy="320" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="80" cy="180" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="320" cy="180" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="80" cy="220" r="4" fill="white" fillOpacity="0.4" />
              <circle cx="320" cy="220" r="4" fill="white" fillOpacity="0.4" />
              <line x1="180" y1="80" x2="80" y2="180" strokeOpacity="0.2" />
              <line x1="220" y1="80" x2="320" y2="180" strokeOpacity="0.2" />
              <line x1="180" y1="320" x2="80" y2="220" strokeOpacity="0.2" />
              <line x1="220" y1="320" x2="320" y2="220" strokeOpacity="0.2" />
            </svg>
          </div>
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <img src="/rf.png?v=1" alt="RelateFlows" className="w-36 h-36 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 anim-scale-in" />
              <div className="absolute -inset-4 bg-blue-400/30 rounded-full blur-2xl -z-10 anim-glow-pulse" />
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3 group cursor-default anim-fade-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-white transition-all duration-500 group-hover:text-blue-200">Relate</span>
            <span className="text-yellow-300 transition-all duration-500 group-hover:text-yellow-200">Flows</span>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-300/50 to-transparent mt-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
          </h1>

          <p className="text-blue-100/80 text-base font-medium mb-10 transition-all duration-500 hover:text-blue-100 cursor-default anim-fade-up" style={{ animationDelay: '0.35s' }}>
            Enterprise Communication Platform
          </p>

          <div className="space-y-5 text-left">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-4 anim-fade-up group hover:bg-white/5 rounded-xl p-2 -mx-2 transition-all duration-300" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-blue-200 shrink-0 backdrop-blur-sm group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-white transition-colors">{f.label}</p>
                  <p className="text-xs text-blue-200 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center justify-center gap-6 text-blue-200/60">
              {[Globe, MessageCircle].map((Icon, i) => (
                <Icon key={i} className="w-5 h-5 hover:text-blue-200 hover:scale-110 transition-all duration-300 cursor-default" />
              ))}
              <svg viewBox="0 0 24 24" className="w-5 h-5 hover:text-blue-200 hover:scale-110 transition-all duration-300 cursor-default" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm anim-slide-right" style={{ animationDelay: '0.3s' }}>
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/rf.png?v=1" alt="RelateFlows" className="w-24 h-24 object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              <span className="text-blue-600">Relate</span>{' '}<span className="text-yellow-400">Flows</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Enterprise Communication Platform</p>
          </div>

          <h2 className="text-xl font-bold text-slate-900 text-center">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1 mb-8 text-center">Sign in to continue to your dashboard</p>

          <div className="space-y-3.5">
            {/* Google Login — custom styled button */}
            <button
              onClick={() => googleLogin()}
              disabled={isLoading}
              className="btn-lift w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <svg aria-label="Google logo" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <g>
                    <path d="m0 0H512V512H0" fill="#fff"/>
                    <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"/>
                    <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"/>
                    <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"/>
                    <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"/>
                  </g>
                </svg>
              )}
              <span>Login with Google</span>
            </button>

            {/* Facebook Login */}
            <button onClick={handleFacebookLogin} disabled={isLoading}
              className="btn-lift w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold bg-[#1A77F2] text-white hover:bg-[#166fe5] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {isLoading ? (
                <span className="loading loading-spinner loading-sm text-white" />
              ) : (
                <svg aria-label="Facebook logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z"/></svg>
              )}
              <span>Login with Facebook</span>
            </button>

            {/* Line Login */}
            <button onClick={handleLineLogin} disabled={isLoading}
              className="btn-lift w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold bg-[#03C755] text-white hover:bg-[#02b04a] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {isLoading ? (
                <span className="loading loading-spinner loading-sm text-white" />
              ) : (
                <svg aria-label="Line logo" width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fillRule="evenodd" strokeLinejoin="round" fill="white"><path fillRule="nonzero" d="M12.91 6.57c.232 0 .42.19.42.42 0 .23-.188.42-.42.42h-1.17v.75h1.17a.42.42 0 1 1 0 .84h-1.59a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42h1.59a.42.42 0 0 1-.002.84h-1.17v.75h1.17zm-2.57 2.01a.421.421 0 0 1-.757.251l-1.63-2.217V8.58a.42.42 0 0 1-.42.42.42.42 0 0 1-.418-.42V5.4a.418.418 0 0 1 .755-.249L9.5 7.366V5.4c0-.23.188-.42.42-.42.23 0 .42.19.42.42v3.18zm-3.828 0c0 .23-.188.42-.42.42a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42.23 0 .418.19.418.42v3.18zM4.868 9h-1.59c-.23 0-.42-.19-.42-.42V5.4c0-.23.19-.42.42-.42.232 0 .42.19.42.42v2.76h1.17a.42.42 0 1 1 0 .84M16 6.87C16 3.29 12.41.376 8 .376S0 3.29 0 6.87c0 3.208 2.846 5.896 6.69 6.405.26.056.615.172.705.394.08.2.053.518.026.722 0 0-.092.565-.113.685-.035.203-.16.79.693.432.854-.36 4.607-2.714 6.285-4.646C15.445 9.594 16 8.302 16 6.87"/></g></svg>
              )}
              <span>LINEでログイン</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demo Access</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Role Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_ROLES.map(({ role, label, icon, color }) => (
              <button
                key={role}
                onClick={() => loginWithDemo(role)}
                disabled={isLoading}
                className={`btn-lift flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${color}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3">Instant login — no credentials required</p>

          {/* Dev Tools Toggle */}
          <div className="mt-4 text-center">
            <button onClick={() => setShowDevTools(!showDevTools)} className="text-[10px] text-slate-300 hover:text-slate-500 font-medium transition-colors flex items-center justify-center gap-1 mx-auto">
              {showDevTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Developer Access
            </button>
            {showDevTools && (
              <div className="mt-3">
                <button onClick={() => loginWithDemo('super')} disabled={isLoading}
                  className="btn-lift w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  <Shield className="w-4 h-4" />
                  Super Admin
                </button>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-7 leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};
