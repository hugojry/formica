import { GlobalRegistrator } from '@happy-dom/global-registrator';

if (typeof globalThis.document === 'undefined') {
  GlobalRegistrator.register();
}
