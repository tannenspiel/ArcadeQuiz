/**
 * Утилита для перехвата и сохранения логов из браузера в файл
 * НЕ запускается автоматически — вызывается явно при необходимости
 */

class BrowserLogger {
  private logs: string[] = [];
  private maxLogs: number = 50000; // Максимальное количество логов
  private originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
  };
  private isIntercepting: boolean = false;

  constructor() {
    // Сохраняем оригинальные методы console
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console)
    };
  }

  /**
   * Начать перехват логов
   */
  public startIntercepting(): void {
    if (this.isIntercepting) {
      console.warn('BrowserLogger: Already intercepting logs');
      return;
    }

    this.isIntercepting = true;
    const self = this;

    // Перехватываем console.log
    console.log = (...args: any[]) => {
      self.originalConsole.log(...args);
      self.addLog('LOG', args);
    };

    // Перехватываем console.error
    console.error = (...args: any[]) => {
      self.originalConsole.error(...args);
      self.addLog('ERROR', args);
    };

    // Перехватываем console.warn
    console.warn = (...args: any[]) => {
      self.originalConsole.warn(...args);
      self.addLog('WARN', args);
    };

    // Перехватываем console.info
    console.info = (...args: any[]) => {
      self.originalConsole.info(...args);
      self.addLog('INFO', args);
    };

    console.log('✅ BrowserLogger: Started intercepting console logs');
  }

  /**
   * Остановить перехват логов
   */
  public stopIntercepting(): void {
    if (!this.isIntercepting) {
      return;
    }

    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;

    this.isIntercepting = false;
    console.log('✅ BrowserLogger: Stopped intercepting console logs');
  }

  /**
   * Добавить лог
   */
  private addLog(level: string, args: any[]): void {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const logEntry = `[${timestamp}] [${level}] ${message}`;
    this.logs.push(logEntry);

    // Ограничиваем размер массива логов
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Удаляем самый старый лог
    }

    // Автоматически сохраняем в localStorage (последние 1000 логов)
    try {
      const recentLogs = this.logs.slice(-1000);
      localStorage.setItem('browser_logs', JSON.stringify(recentLogs));
    } catch (e) {
      // Игнорируем ошибки localStorage (может быть переполнен)
    }
  }

  /**
   * Получить все логи
   */
  public getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Очистить логи
   */
  public clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('browser_logs');
    console.log('✅ BrowserLogger: Logs cleared');
  }

  /**
   * Скачать логи как файл
   */
  public downloadLogs(filename: string = 'browser_logs.log'): void {
    const content = this.logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`✅ BrowserLogger: Logs downloaded as ${filename}`);
  }

  /**
   * Сохранить логи в указанный путь (через fetch на сервер)
   * Требует настройки серверного endpoint
   */
  public async saveLogsToServer(path: string = '/api/logs'): Promise<void> {
    const content = this.logs.join('\n');
    try {
      await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: content
      });
      console.log('✅ BrowserLogger: Logs saved to server');
    } catch (error) {
      console.error('❌ BrowserLogger: Failed to save logs to server:', error);
    }
  }

  /**
   * Получить логи как строку
   */
  public getLogsAsString(): string {
    return this.logs.join('\n');
  }

  /**
   * Получить количество логов
   */
  public getLogCount(): number {
    return this.logs.length;
  }
}

// Создаем singleton
export const browserLogger = new BrowserLogger();

// ✅ НЕ запускаем автоматически — инициализация должна быть явной
// Импортирующий код сам вызывает browserLogger.startIntercepting() когда нужно

// Добавляем в window для доступа из консоли браузера (DEV только)
if (typeof window !== 'undefined') {
  (window as any).browserLogger = browserLogger;
  (window as any).downloadLogs = () => browserLogger.downloadLogs('browser_logs.log');
  (window as any).clearLogs = () => browserLogger.clearLogs();
  (window as any).getLogCount = () => browserLogger.getLogCount();
}
