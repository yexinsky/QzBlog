# 测试工具函数
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';

// 等待元素出现
export async function waitForElement(
  callback: () => element,
  options?: { timeout?: number }
): Promise<element> {
  return waitFor(callback, options);
}

// 模拟 API 响应
export function mockApiResponse<T>(data: T, status = 200): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), 50);
  });
}

// 模拟 API 错误
export function mockApiError(message: string, status = 500): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message) as Error & { status: number };
      error.status = status;
      reject(error);
    }, 50);
  });
}

// 模拟用户输入
export function simulateUserInput(
  element: HTMLElement,
  value: string
): void {
  fireEvent.change(element, { target: { value } });
}

// 模拟点击
export function simulateClick(element: HTMLElement): void {
  fireEvent.click(element);
}

// 模拟键盘输入
export function simulateKeyPress(
  element: HTMLElement,
  key: string,
  modifiers?: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }
): void {
  fireEvent.keyPress(element, {
    key,
    ...modifiers,
  });
}

// 创建测试包装器
export function createTestWrapper(component: ReactNode) {
  return render(component);
}

// 验证元素存在
export function assertElementExists(text: string | RegExp): void {
  const element = screen.getByText(text);
  expect(element).toBeInTheDocument();
}

// 验证元素不存在
export function assertElementNotExists(text: string | RegExp): void {
  expect(screen.queryByText(text)).not.toBeInTheDocument();
}

// 模拟 localStorage
export function mockLocalStorage() {
  let store: { [key: string]: string } = {};

  const localStorageMock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null,
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
}

// 模拟 fetch
export function mockFetch(
  response: unknown,
  options?: { ok?: boolean; status?: number }
) {
  return jest.fn().mockResolvedValueOnce({
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

// 等待网络空闲
export async function waitForNetworkIdle(timeout = 1000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

// 模拟滚动事件
export function simulateScroll(element: HTMLElement, scrollTop: number) {
  Object.defineProperty(element, 'scrollTop', {
    value: scrollTop,
    configurable: true,
  });
  fireEvent.scroll(element);
}

// 模拟 IntersectionObserver
export function mockIntersectionObserver() {
  const mockIntersectionObserver = jest.fn().mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });

  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
}

// 验证加载状态
export function assertLoadingState(element: HTMLElement): void {
  expect(element).toHaveAttribute('aria-busy', 'true');
}

// 验证错误状态
export function assertErrorState(element: HTMLElement): void {
  expect(element).toHaveClass(/error/i);
}

// 模拟主题切换
export function mockTheme(theme: 'light' | 'dark' | 'system') {
  const mediaQuery = {
    matches: theme === 'dark' || (theme === 'system' && false),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => mediaQuery),
  });

  return mediaQuery;
}

// 清理测试环境
export function cleanupTestEnvironment() {
  jest.clearAllMocks();
  localStorage.clear();
}