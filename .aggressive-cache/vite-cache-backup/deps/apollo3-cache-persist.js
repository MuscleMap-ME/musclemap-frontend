import "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/Log.js
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var Log = function() {
  function Log2(options) {
    var _a = options.debug, debug = _a === void 0 ? false : _a;
    this.debug = debug;
    this.lines = [];
  }
  Log2.prototype.emit = function(level, message) {
    if (level in console) {
      var prefix = Log2.prefix;
      console[level].apply(console, __spreadArray([prefix], message, false));
    }
  };
  Log2.prototype.tailLogs = function() {
    var _this = this;
    this.lines.forEach(function(_a) {
      var level = _a[0], message = _a[1];
      return _this.emit(level, message);
    });
  };
  Log2.prototype.getLogs = function() {
    return this.lines;
  };
  Log2.prototype.write = function(level, message) {
    var buffer = Log2.buffer;
    this.lines = __spreadArray(__spreadArray([], this.lines.slice(1 - buffer), true), [[level, message]], false);
    if (this.debug || level !== "log") {
      this.emit(level, message);
    }
  };
  Log2.prototype.info = function() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      message[_i] = arguments[_i];
    }
    this.write("log", message);
  };
  Log2.prototype.warn = function() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      message[_i] = arguments[_i];
    }
    this.write("warn", message);
  };
  Log2.prototype.error = function() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      message[_i] = arguments[_i];
    }
    this.write("error", message);
  };
  Log2.buffer = 30;
  Log2.prefix = "[apollo-cache-persist]";
  return Log2;
}();
var Log_default = Log;

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/Cache.js
var Cache = function() {
  function Cache2(options) {
    var cache = options.cache, _a = options.serialize, serialize = _a === void 0 ? true : _a;
    this.cache = cache;
    this.serialize = serialize;
  }
  Cache2.prototype.extract = function() {
    var data = this.cache.extract();
    if (this.serialize) {
      data = JSON.stringify(data);
    }
    return data;
  };
  Cache2.prototype.restore = function(data) {
    if (this.serialize && typeof data === "string") {
      data = JSON.parse(data);
    }
    if (data != null) {
      this.cache.restore(data);
    }
  };
  return Cache2;
}();
var Cache_default = Cache;

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/Storage.js
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
};
var Storage = function() {
  function Storage2(options) {
    var storage = options.storage, _a = options.key, key = _a === void 0 ? "apollo-cache-persist" : _a;
    this.storage = storage;
    this.key = key;
  }
  Storage2.prototype.read = function() {
    return __awaiter(this, void 0, void 0, function() {
      return __generator(this, function(_a) {
        return [2, this.storage.getItem(this.key)];
      });
    });
  };
  Storage2.prototype.write = function(data) {
    return __awaiter(this, void 0, void 0, function() {
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.storage.setItem(this.key, data)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    });
  };
  Storage2.prototype.purge = function() {
    return __awaiter(this, void 0, void 0, function() {
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.storage.removeItem(this.key)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    });
  };
  Storage2.prototype.getSize = function() {
    return __awaiter(this, void 0, void 0, function() {
      var data;
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.storage.getItem(this.key)];
          case 1:
            data = _a.sent();
            if (data == null) {
              return [2, 0];
            } else {
              return [2, typeof data === "string" ? data.length : null];
            }
            return [2];
        }
      });
    });
  };
  return Storage2;
}();
var Storage_default = Storage;

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/Persistor.js
var __awaiter2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator2 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
};
var Persistor = function() {
  function Persistor2(_a, options) {
    var log = _a.log, cache = _a.cache, storage = _a.storage;
    var _b = options.maxSize, maxSize = _b === void 0 ? 1024 * 1024 : _b, persistenceMapper = options.persistenceMapper;
    this.log = log;
    this.cache = cache;
    this.storage = storage;
    this.paused = false;
    if (persistenceMapper) {
      this.persistenceMapper = persistenceMapper;
    }
    if (maxSize) {
      this.maxSize = maxSize;
    }
  }
  Persistor2.prototype.persist = function() {
    return __awaiter2(this, void 0, void 0, function() {
      var data, error_1;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 6, , 7]);
            data = this.cache.extract();
            if (!(!this.paused && this.persistenceMapper)) return [3, 2];
            return [4, this.persistenceMapper(data)];
          case 1:
            data = _a.sent();
            _a.label = 2;
          case 2:
            if (!(this.maxSize != null && typeof data === "string" && data.length > this.maxSize && !this.paused)) return [3, 4];
            return [4, this.purge()];
          case 3:
            _a.sent();
            this.paused = true;
            return [2];
          case 4:
            if (this.paused) {
              return [2];
            }
            return [4, this.storage.write(data)];
          case 5:
            _a.sent();
            this.log.info(typeof data === "string" ? "Persisted cache of size ".concat(data.length, " characters") : "Persisted cache");
            return [3, 7];
          case 6:
            error_1 = _a.sent();
            this.log.error("Error persisting cache", error_1);
            throw error_1;
          case 7:
            return [2];
        }
      });
    });
  };
  Persistor2.prototype.restore = function() {
    return __awaiter2(this, void 0, void 0, function() {
      var data, error_2;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 5, , 6]);
            return [4, this.storage.read()];
          case 1:
            data = _a.sent();
            if (!(data != null)) return [3, 3];
            return [4, this.cache.restore(data)];
          case 2:
            _a.sent();
            this.log.info(typeof data === "string" ? "Restored cache of size ".concat(data.length, " characters") : "Restored cache");
            return [3, 4];
          case 3:
            this.log.info("No stored cache to restore");
            _a.label = 4;
          case 4:
            return [3, 6];
          case 5:
            error_2 = _a.sent();
            this.log.error("Error restoring cache", error_2);
            throw error_2;
          case 6:
            return [2];
        }
      });
    });
  };
  Persistor2.prototype.purge = function() {
    return __awaiter2(this, void 0, void 0, function() {
      var error_3;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            return [4, this.storage.purge()];
          case 1:
            _a.sent();
            this.log.info("Purged cache storage");
            return [3, 3];
          case 2:
            error_3 = _a.sent();
            this.log.error("Error purging cache storage", error_3);
            throw error_3;
          case 3:
            return [2];
        }
      });
    });
  };
  return Persistor2;
}();
var Persistor_default = Persistor;

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/onCacheWrite.js
var onCacheWrite_default = function(_a) {
  var cache = _a.cache;
  return function(persist) {
    var write = cache.write;
    var evict = cache.evict;
    var modify = cache.modify;
    var gc = cache.gc;
    cache.write = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var result = write.apply(cache, args);
      persist();
      return result;
    };
    cache.evict = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var result = evict.apply(cache, args);
      persist();
      return result;
    };
    cache.modify = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var result = modify.apply(cache, args);
      persist();
      return result;
    };
    cache.gc = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var result = gc.apply(cache, args);
      persist();
      return result;
    };
    return function() {
      cache.write = write;
      cache.evict = evict;
      cache.modify = modify;
      cache.gc = gc;
    };
  };
};

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/onAppBackground.js
var onAppBackground_default = function(_a) {
  var log = _a.log, cache = _a.cache;
  return function(persist) {
    log.warn("Trigger option `background` not available on web; using `write` trigger");
    return onCacheWrite_default({ cache })(persist);
  };
};

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/Trigger.js
var Trigger = function() {
  function Trigger2(_a, options) {
    var log = _a.log, persistor = _a.persistor;
    var _this = this;
    this.fire = function() {
      if (!_this.debounce) {
        _this.persist();
        return;
      }
      if (_this.timeout != null) {
        clearTimeout(_this.timeout);
      }
      _this.timeout = setTimeout(_this.persist, _this.debounce);
    };
    this.persist = function() {
      if (_this.paused) {
        return;
      }
      _this.persistor.persist();
    };
    var defaultDebounce = Trigger2.defaultDebounce;
    var cache = options.cache, debounce = options.debounce, _b = options.trigger, trigger = _b === void 0 ? "write" : _b;
    if (!trigger) {
      return;
    }
    this.debounce = debounce != null ? debounce : defaultDebounce;
    this.persistor = persistor;
    this.paused = false;
    switch (trigger) {
      case "write":
        this.uninstall = onCacheWrite_default({ cache })(this.fire);
        break;
      case "background":
        if (debounce) {
          log.warn("Debounce is not recommended with `background` trigger");
        }
        this.debounce = debounce;
        this.uninstall = onAppBackground_default({ cache, log })(this.fire);
        break;
      default:
        if (typeof trigger === "function") {
          this.uninstall = trigger(this.fire);
        } else {
          throw Error("Unrecognized trigger option: ".concat(trigger));
        }
    }
  }
  Trigger2.prototype.pause = function() {
    this.paused = true;
  };
  Trigger2.prototype.resume = function() {
    this.paused = false;
  };
  Trigger2.prototype.remove = function() {
    if (this.uninstall) {
      this.uninstall();
      this.uninstall = null;
      this.paused = true;
    }
  };
  Trigger2.defaultDebounce = 1e3;
  return Trigger2;
}();
var Trigger_default = Trigger;

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/CachePersistor.js
var CachePersistor = function() {
  function CachePersistor2(options) {
    if (!options.cache) {
      throw new Error("In order to persist your Apollo Cache, you need to pass in a cache. Please see https://www.apollographql.com/docs/react/basics/caching.html for our default InMemoryCache.");
    }
    if (!options.storage) {
      throw new Error("In order to persist your Apollo Cache, you need to pass in an underlying storage provider. Please see https://github.com/apollographql/apollo-cache-persist#storage-providers");
    }
    var log = new Log_default(options);
    var cache = new Cache_default(options);
    var storage = new Storage_default(options);
    var persistor = new Persistor_default({ log, cache, storage }, options);
    var trigger = new Trigger_default({ log, persistor }, options);
    this.log = log;
    this.cache = cache;
    this.storage = storage;
    this.persistor = persistor;
    this.trigger = trigger;
  }
  CachePersistor2.prototype.persist = function() {
    return this.persistor.persist();
  };
  CachePersistor2.prototype.restore = function() {
    return this.persistor.restore();
  };
  CachePersistor2.prototype.purge = function() {
    return this.persistor.purge();
  };
  CachePersistor2.prototype.pause = function() {
    this.trigger.pause();
  };
  CachePersistor2.prototype.resume = function() {
    this.trigger.resume();
  };
  CachePersistor2.prototype.remove = function() {
    this.trigger.remove();
  };
  CachePersistor2.prototype.getLogs = function(print) {
    if (print === void 0) {
      print = false;
    }
    if (print) {
      this.log.tailLogs();
    } else {
      return this.log.getLogs();
    }
  };
  CachePersistor2.prototype.getSize = function() {
    return this.storage.getSize();
  };
  return CachePersistor2;
}();
var CachePersistor_default = CachePersistor;

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/persistCache.js
var persistCache_default = function(options) {
  var persistor = new CachePersistor_default(options);
  return persistor.restore();
};

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/persistCacheSync.js
var __extends = /* @__PURE__ */ function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();
var persistCacheSync = function(options) {
  var cachePersistor = new SynchronousCachePersistor(options);
  cachePersistor.restoreSync();
};
var SynchronousCachePersistor = function(_super) {
  __extends(SynchronousCachePersistor2, _super);
  function SynchronousCachePersistor2(options) {
    var _this = _super.call(this, options) || this;
    _this.storage = new SynchronousStorage(options);
    _this.persistor = new SynchronousPersistor({ log: _this.log, cache: _this.cache, storage: _this.storage }, options);
    return _this;
  }
  SynchronousCachePersistor2.prototype.restoreSync = function() {
    this.persistor.restoreSync();
  };
  return SynchronousCachePersistor2;
}(CachePersistor_default);
var SynchronousPersistor = function(_super) {
  __extends(SynchronousPersistor2, _super);
  function SynchronousPersistor2(_a, options) {
    var log = _a.log, cache = _a.cache, storage = _a.storage;
    return _super.call(this, { log, cache, storage }, options) || this;
  }
  SynchronousPersistor2.prototype.restoreSync = function() {
    this.cache.restore(this.storage.readSync());
  };
  return SynchronousPersistor2;
}(Persistor_default);
var SynchronousStorage = function(_super) {
  __extends(SynchronousStorage2, _super);
  function SynchronousStorage2(options) {
    return _super.call(this, options) || this;
  }
  SynchronousStorage2.prototype.readSync = function() {
    return this.storage.getItem(this.key);
  };
  return SynchronousStorage2;
}(Storage_default);

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/AsyncStorageWrapper.js
var AsyncStorageWrapper = function() {
  function AsyncStorageWrapper2(storage) {
    this.storage = storage;
  }
  AsyncStorageWrapper2.prototype.getItem = function(key) {
    return this.storage.getItem(key);
  };
  AsyncStorageWrapper2.prototype.removeItem = function(key) {
    return this.storage.removeItem(key);
  };
  AsyncStorageWrapper2.prototype.setItem = function(key, value) {
    return this.storage.setItem(key, value);
  };
  return AsyncStorageWrapper2;
}();

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/IonicStorageWrapper.js
var IonicStorageWrapper = function() {
  function IonicStorageWrapper2(storage) {
    this.storage = storage;
  }
  IonicStorageWrapper2.prototype.getItem = function(key) {
    return this.storage.get(key);
  };
  IonicStorageWrapper2.prototype.removeItem = function(key) {
    return this.storage.remove(key);
  };
  IonicStorageWrapper2.prototype.setItem = function(key, value) {
    return this.storage.set(key, value);
  };
  return IonicStorageWrapper2;
}();

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/LocalForageWrapper.js
var LocalForageWrapper = function() {
  function LocalForageWrapper2(storage) {
    this.storage = storage;
  }
  LocalForageWrapper2.prototype.getItem = function(key) {
    return this.storage.getItem(key);
  };
  LocalForageWrapper2.prototype.removeItem = function(key) {
    return this.storage.removeItem(key);
  };
  LocalForageWrapper2.prototype.setItem = function(key, value) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.storage.setItem(key, value).then(function() {
        return resolve();
      }).catch(function() {
        return reject();
      });
    });
  };
  return LocalForageWrapper2;
}();

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/LocalStorageWrapper.js
var LocalStorageWrapper = function() {
  function LocalStorageWrapper2(storage) {
    this.storage = storage;
  }
  LocalStorageWrapper2.prototype.getItem = function(key) {
    return this.storage.getItem(key);
  };
  LocalStorageWrapper2.prototype.removeItem = function(key) {
    return this.storage.removeItem(key);
  };
  LocalStorageWrapper2.prototype.setItem = function(key, value) {
    if (value !== null) {
      return this.storage.setItem(key, value);
    } else {
      return this.removeItem(key);
    }
  };
  return LocalStorageWrapper2;
}();

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/MMKVStorageWrapper.js
var MMKVStorageWrapper = function() {
  function MMKVStorageWrapper2(storage) {
    this.storage = storage;
  }
  MMKVStorageWrapper2.prototype.getItem = function(key) {
    return this.storage.getItem(key) || null;
  };
  MMKVStorageWrapper2.prototype.removeItem = function(key) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      Promise.resolve(_this.storage.removeItem(key)).then(function() {
        return resolve();
      }).catch(function() {
        return reject();
      });
    });
  };
  MMKVStorageWrapper2.prototype.setItem = function(key, value) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.storage.setItem(key, value).then(function() {
        return resolve();
      }).catch(function() {
        return reject();
      });
    });
  };
  return MMKVStorageWrapper2;
}();

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/MMKVWrapper.js
var MMKVWrapper = function() {
  function MMKVWrapper2(storage) {
    this.storage = storage;
  }
  MMKVWrapper2.prototype.getItem = function(key) {
    return this.storage.getString(key) || null;
  };
  MMKVWrapper2.prototype.removeItem = function(key) {
    return this.storage.delete(key);
  };
  MMKVWrapper2.prototype.setItem = function(key, value) {
    if (value !== null) {
      return this.storage.set(key, value);
    }
    return this.removeItem(key);
  };
  return MMKVWrapper2;
}();

// node_modules/.pnpm/apollo3-cache-persist@0.15.0_@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@_866afe53e768927dbd22c81568b4e66e/node_modules/apollo3-cache-persist/lib/storageWrappers/SessionStorageWrapper.js
var SessionStorageWrapper = function() {
  function SessionStorageWrapper2(storage) {
    this.storage = storage;
  }
  SessionStorageWrapper2.prototype.getItem = function(key) {
    return this.storage.getItem(key);
  };
  SessionStorageWrapper2.prototype.removeItem = function(key) {
    return this.storage.removeItem(key);
  };
  SessionStorageWrapper2.prototype.setItem = function(key, value) {
    if (value !== null) {
      return this.storage.setItem(key, value);
    } else {
      return this.removeItem(key);
    }
  };
  return SessionStorageWrapper2;
}();
export {
  AsyncStorageWrapper,
  CachePersistor_default as CachePersistor,
  IonicStorageWrapper,
  LocalForageWrapper,
  LocalStorageWrapper,
  MMKVStorageWrapper,
  MMKVWrapper,
  SessionStorageWrapper,
  SynchronousCachePersistor,
  SynchronousPersistor,
  SynchronousStorage,
  persistCache_default as persistCache,
  persistCacheSync
};
//# sourceMappingURL=apollo3-cache-persist.js.map
