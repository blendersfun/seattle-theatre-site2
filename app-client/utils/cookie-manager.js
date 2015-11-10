
import cookie from 'cookie';

class CookieManager {
  static get = (name) => cookie.parse(document.cookie)[name] || null
  static set = (name, value, options) => {
    document.cookie = cookie.serialize(name, value, { maxAge: 24 * 60 * 60, path: '/' });
    if (!options || !options.silent) CookieManager.trigger(name, value);
  }
  static remove = (name, options) => {
    document.cookie = cookie.serialize(name, "", { expires: new Date(0), path: '/' });
    if (!options || !options.silent) CookieManager.trigger(name, null);
  }

  static handlers = {};
  static registerHandler = (name, handler) => {
    if (!CookieManager.handlers[name]) CookieManager.handlers[name] = [];
    if (CookieManager.handlers[name].indexOf(handler) === -1) CookieManager.handlers[name].push(handler);
  };
  static removeHandler = (name, handler) => {
    if (CookieManager.handlers[name]) {
      var i = CookieManager.handlers[name].indexOf(handler);
      if (i !== -1) CookieManager.handlers[name].splice(i, 1);
    }
  };
  static trigger = (name, value) => {
    if (!CookieManager.handlers[name]) return;
    for (var i = 0; i < CookieManager.handlers[name].length; i++) {
      CookieManager.handlers[name][i](value);
    }
  };
}

export default CookieManager;
