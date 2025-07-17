"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSkip = exports.map = void 0;
exports.deepClone = deepClone;
exports.retry = retry;
exports.runWithCallback = runWithCallback;
exports.runPromiseWithCallback = runPromiseWithCallback;
const wait_1 = __importDefault(require("wait"));
var p_map_1 = require("./p-map");
Object.defineProperty(exports, "map", { enumerable: true, get: function () { return __importDefault(p_map_1).default; } });
Object.defineProperty(exports, "mapSkip", { enumerable: true, get: function () { return p_map_1.mapSkip; } });
/**
 * Deep clone a object
 * @param object The object
 */
function deepClone(object) {
    return JSON.parse(JSON.stringify(object));
}
function retry(fn, retries, delay) {
    return new Promise((resolve, reject) => {
        function attempt(retries) {
            fn()
                .then(resolve)
                .catch((err) => {
                if (retries > 0) {
                    (0, wait_1.default)(delay)
                        .then(() => attempt(retries - 1))
                        .catch(reject);
                }
                else {
                    reject(err);
                }
            });
        }
        attempt(retries);
    });
}
function runWithCallback(fn, callback) {
    const promise = fn();
    if (callback) {
        promise.then(callback.success).catch(callback.error);
    }
    return promise;
}
async function runPromiseWithCallback(p, callback) {
    return p
        .then((result) => {
        try {
            callback.success?.(result);
        }
        catch (err) {
            try {
                callback.error?.(err);
            }
            catch { }
        }
        return result;
    })
        .catch((err) => {
        try {
            callback.error?.(err);
        }
        catch { }
        throw err;
    });
}
//# sourceMappingURL=helper.js.map