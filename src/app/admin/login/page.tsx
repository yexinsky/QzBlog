'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signIn('github', { callbackUrl: '/admin' });
    } catch (err) {
      setError('登录失败，请重试');
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('用户名或密码错误');
      } else {
        router.push('/admin');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1EA] dark:bg-[#1E1E1E]">
      <div className="w-full max-w-md p-8 bg-white dark:bg-[#2A2A2A] rounded-12 shadow-sm">
        <h1 className="text-2xl font-bold text-center text-[#1A1A1A] dark:text-[#E0E0E0] mb-8">
          管理后台登录
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-8 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* GitHub 登录 */}
        <button
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] dark:bg-[#E0E0E0] text-white dark:text-[#1A1A1A] rounded-8 hover:bg-[#333333] dark:hover:bg-[#CCCCCC] transition-colors duration-200 disabled:opacity-50 mb-6"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          {isLoading ? '登录中...' : '使用 GitHub 登录'}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#EBE7E0] dark:border-[#444444]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-[#2A2A2A] text-[#777777]">或使用管理员账号</span>
          </div>
        </div>

        {/* 管理员登录表单 */}
        <form onSubmit={handleAdminLogin}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
              用户名
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              className="w-full px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B] transition-colors duration-200"
              placeholder="请输入管理员用户名"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
              密码
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B] transition-colors duration-200"
              placeholder="请输入管理员密码"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#D36F2B] text-white rounded-8 hover:bg-[#B85A24] transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
