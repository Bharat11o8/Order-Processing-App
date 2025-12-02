'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ASM' | 'Admin'>('ASM');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login logic
    if (role === 'ASM') {
      router.push('/asm/dashboard');
    } else {
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Order Processing System</h1>
          <p className="text-slate-500 mt-2">Internal Portal</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setRole('ASM')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              role === 'ASM'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ASM Login
          </button>
          <button
            type="button"
            onClick={() => setRole('Admin')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              role === 'Admin'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Admin Login
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder={role === 'ASM' ? 'e.g., asm_south' : 'e.g., admin'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2.5 rounded-lg font-semibold text-white shadow-md transition-all hover:opacity-90 ${
              role === 'ASM' ? 'bg-blue-600' : 'bg-indigo-600'
            }`}
          >
            Login as {role}
          </button>
        </form>
      </div>
    </div>
  );
}
