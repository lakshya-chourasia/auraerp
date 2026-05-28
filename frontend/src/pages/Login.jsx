import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, GraduationCap, Users, ShieldAlert, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login(email, password);
      if (data.role === 'admin') navigate('/admin');
      else if (data.role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>

      <div className="w-full max-w-md dark-glass-panel rounded-2xl shadow-2xl p-8 relative z-10 animate-fade-in border border-slate-700/50">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-500/10 rounded-xl mb-3 border border-brand-500/20 text-brand-400">
            <GraduationCap size={40} className="animate-bounce" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            Aura<span className="text-brand-400">ERP</span>
            <Sparkles size={18} className="text-yellow-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">Smart Enterprise Resource Planning System</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg p-3 text-sm mb-6 flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="e.g. admin@college.edu"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-xs">
            Student without an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold underline transition-colors">
              Register Here
            </Link>
          </p>
        </div>

        {/* Demo Accounts - highly valuable for college interviews to demonstrate quickly! */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-slate-500 text-xxs uppercase tracking-wider font-bold mb-3 text-center">Demo Administrator Login</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleQuickLogin('admin@college.edu', 'adminpassword123')}
              className="text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
            >
              <Users size={12} className="text-brand-400" />
              <span>Load Admin Credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
