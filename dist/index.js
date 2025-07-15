"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToEthAddress = exports.formatBase58Address = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./helper"), exports);
__exportStar(require("./errors"), exports);
var contract_utils_1 = require("./contract-utils");
Object.defineProperty(exports, "formatBase58Address", { enumerable: true, get: function () { return contract_utils_1.formatBase58Address; } });
Object.defineProperty(exports, "formatToEthAddress", { enumerable: true, get: function () { return contract_utils_1.formatToEthAddress; } });
__exportStar(require("./contract-helper"), exports);
//# sourceMappingURL=index.js.map