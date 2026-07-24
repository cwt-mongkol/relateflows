import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { TextScramble } from '../ui/TextScramble';
import { Shield, Users, Briefcase, Headphones } from 'lucide-react';

const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID || '';
const LINE_LOGIN_URL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&state=login&scope=profile%20openid%20email`;

const DEMO_ROLES = [
  { role: 'admin',   label: 'Administrator',    icon: <Shield className="w-4 h-4" />,     color: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200' },
  { role: 'manager', label: 'Manager',          icon: <Users className="w-4 h-4" />,      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { role: 'sales',   label: 'Sales Rep',        icon: <Briefcase className="w-4 h-4" />,  color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
  { role: 'support', label: 'Support Agent',    icon: <Headphones className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
  { role: 'cs_admin', label: 'CS Admin',        icon: <Shield className="w-4 h-4" />,     color: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200' },
];

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithLine, loginWithFacebook, loginWithDemo, isLoading } = useAuth();
  const [scrambleDone, setScrambleDone] = React.useState(false);

  const handleGoogleLogin = () => {
    loginWithGoogle('demo');
  };

  const handleLineLogin = async () => {
    if (LINE_CLIENT_ID) {
      window.location.href = LINE_LOGIN_URL;
      return;
    }
    await loginWithLine();
  };

  const handleFacebookLogin = async () => {
    await loginWithFacebook();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-100" />
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-blue-200/30 to-blue-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-blue-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] left-[10%] w-32 h-32 border border-blue-200/30 rounded-full blur-sm pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-24 h-24 border border-blue-200/20 rounded-full blur-sm pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <img src="/rf.png?v=1" alt="RelateFlows" className="w-20 h-20 rounded-2xl object-contain shadow-lg bg-white p-2.5 ring-1 ring-slate-200/60" />
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl blur-md -z-10" />
            </div>
          </div>
          {scrambleDone ? (
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              <span className="text-blue-600">Relate</span>{' '}<span className="text-yellow-400">Flows</span>
            </h1>
          ) : (
            <TextScramble text="Relate Flows" className="text-3xl font-extrabold text-slate-900 tracking-tight inline-block" speed={40} onComplete={() => setScrambleDone(true)} />
          )}
          {scrambleDone && (
            <p className="text-slate-500 text-sm mt-1.5 font-medium">Enterprise Communication Platform</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200/60">
          <h2 className="text-lg font-bold text-slate-900 text-center">Welcome back</h2>
          <p className="text-xs text-slate-500 text-center mt-1 mb-7">Sign in to continue to your dashboard</p>

          <div className="space-y-3.5">
            {/* Google Login */}
            <button onClick={handleGoogleLogin} disabled={isLoading}
              className="btn bg-white text-slate-700 border-[#e5e5e5] hover:border-slate-300 w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs">
              {isLoading ? (
                <span className="loading loading-spinner loading-sm text-blue-600" />
              ) : (
                <svg aria-label="Google logo" width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"/><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"/><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"/><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"/><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"/></g></svg>
              )}
              <span>Login with Google</span>
            </button>

            {/* Facebook Login */}
            <button onClick={handleFacebookLogin} disabled={isLoading}
              className="btn bg-[#1A77F2] text-white border-[#005fd8] w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#166fe5] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs">
              {isLoading ? (
                <span className="loading loading-spinner loading-sm text-white" />
              ) : (
                <svg aria-label="Facebook logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z"/></svg>
              )}
              <span>Login with Facebook</span>
            </button>

            {/* Line Login */}
            <button onClick={handleLineLogin} disabled={isLoading}
              className="btn bg-[#03C755] text-white border-[#00b544] w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#02b04a] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs">
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
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${color}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3">Instant login — no credentials required</p>

          <p className="text-[10px] text-slate-400 text-center mt-7 leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};
