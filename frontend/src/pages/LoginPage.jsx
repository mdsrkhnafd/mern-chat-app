import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  MessageSquare,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Left Form Section */}
      <div className="flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Header Branding */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Secure Workspace
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-400">
              Enter your credentials to access your real-time chat dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-indigo-400 transition" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="relative group">
                <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-indigo-400 transition" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In to Workspace"
              )}
            </button>
          </form>

          <div className="text-center text-sm text-slate-400 pt-2">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-indigo-400 font-semibold hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* Right Decorative Banner */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-slate-900/60 to-slate-950 p-12 border-l border-slate-800/60 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md text-center space-y-6 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Real-Time Team Synergy
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Communicate securely with end-to-end encryption, live typing
            indicators, and lightning-fast web socket delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
