import '@testing-library/jest-dom/vitest';

// Polyfill window.matchMedia for jsdom
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Polyfill ResizeObserver for recharts / layout
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

  // Polyfill FileReader for jsdom testing
  class MockFileReader {
    onload: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;

    readAsText(file: any) {
      const trigger = (text: string) => {
        setTimeout(() => {
          if (typeof this.onload === 'function') {
            this.onload({ target: { result: text } });
          }
        }, 0);
      };

      if (file && typeof file.text === 'function') {
        file.text().then((t: string) => trigger(t)).catch((err: any) => {
          if (typeof this.onerror === 'function') this.onerror(err);
        });
      } else if (file && typeof file._content === 'string') {
        trigger(file._content);
      } else {
        trigger(String(file));
      }
    }

    readAsDataURL(file: any) {
      setTimeout(() => {
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: 'data:application/octet-stream;base64,' } });
        }
      }, 0);
    }
  }

  (window as any).FileReader = MockFileReader;
  (globalThis as any).FileReader = MockFileReader;
}


