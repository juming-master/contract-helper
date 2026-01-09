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
exports.getDeadline = getDeadline;
exports.ensureNotTimedOut = ensureNotTimedOut;
const wait_1 = __importDefault(require("wait"));
var p_map_1 = require("./p-map");
Object.defineProperty(exports, "map", { enumerable: true, get: function () { return __importDefault(p_map_1).default; } });
Object.defineProperty(exports, "mapSkip", { enumerable: true, get: function () { return p_map_1.mapSkip; } });
const errors_1 = require("./errors");
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
            Promise.resolve()
                .then(fn)
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
        promise
            .then((value) => {
            try {
                callback.success?.(value);
            }
            catch (err) {
                callback.error?.(err);
            }
        })
            .catch(callback.error);
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
function getDeadline(timeoutMs) {
    if (!timeoutMs || timeoutMs <= 0) {
        return null;
    }
    return Date.now() + timeoutMs;
}
function ensureNotTimedOut(txId, deadline, message = "Transaction check timeout") {
    if (deadline !== null && Date.now() > deadline) {
        throw new errors_1.TransactionReceiptError(message, { txId });
    }
}
//# sourceMappingURL=helper.js.map