import { config } from '@vue/test-utils';
import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// ========== Tauri v2 核心 API ==========

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: vi.fn((path: string) => path),
  Channel: vi.fn(),
  PluginListener: vi.fn(),
  transformCallback: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  once: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
  emitTo: vi.fn().mockResolvedValue(undefined),
  TauriEvent: {},
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    listen: vi.fn().mockResolvedValue(() => {}),
    once: vi.fn().mockResolvedValue(() => {}),
    emit: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn(),
    setSize: vi.fn(),
    setPosition: vi.fn(),
    setFocus: vi.fn(),
    innerSize: vi.fn().mockResolvedValue({ width: 380, height: 80 }),
    outerSize: vi.fn().mockResolvedValue({ width: 380, height: 80 }),
    scaleFactor: vi.fn().mockResolvedValue(1),
  })),
  getAllWindows: vi.fn().mockResolvedValue([]),
  Window: vi.fn(),
}));

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: vi.fn(),
  WebviewWindow: vi.fn(),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: vi.fn(),
  getCurrentWebviewWindow: vi.fn(),
}));

vi.mock('@tauri-apps/api/dpi', () => ({
  LogicalSize: vi
    .fn()
    .mockImplementation((width: number, height: number) => ({ width, height, type: 'Logical' })),
  PhysicalSize: vi.fn(),
  LogicalPosition: vi.fn(),
  PhysicalPosition: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/mock/data'),
  appConfigDir: vi.fn().mockResolvedValue('/mock/config'),
  appLocalDataDir: vi.fn().mockResolvedValue('/mock/local'),
  appCacheDir: vi.fn().mockResolvedValue('/mock/cache'),
  appLogDir: vi.fn().mockResolvedValue('/mock/log'),
  resolveResource: vi.fn(),
}));

vi.mock('@tauri-apps/api/menu', () => ({
  Menu: vi.fn(),
  MenuItem: vi.fn(),
}));

vi.mock('@tauri-apps/api/tray', () => ({
  TrayIcon: vi.fn(),
}));

// ========== Tauri v2 插件 ==========

vi.mock('@tauri-apps/plugin-notification', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  isPermissionGranted: vi.fn().mockResolvedValue(true),
}));

vi.mock('@tauri-apps/plugin-autostart', () => ({
  enable: vi.fn().mockResolvedValue(undefined),
  disable: vi.fn().mockResolvedValue(undefined),
  isEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: vi.fn().mockResolvedValue(undefined),
  openUrl: vi.fn().mockResolvedValue(undefined),
  revealItemInDir: vi.fn().mockResolvedValue(undefined),
}));

// ========== Browser API Mocks ==========

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(window as any).ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
(window as any).IntersectionObserver = IntersectionObserverMock;

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// ========== Vue Test Utils 全局配置 ==========

config.global.mocks = {
  $t: (key: string) => key,
  $tc: (key: string) => key,
  $te: () => true,
  $d: (value: Date) => value.toLocaleDateString(),
  $n: (value: number) => value.toString(),
};

config.global.stubs = {
  teleport: true,
  transition: false,
};

// ========== 测试清理 ==========

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
