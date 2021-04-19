"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
exports.__esModule = true;
var orchestrate_1 = require("./orchestrate");
__createBinding(exports, orchestrate_1, "makeSink");
__createBinding(exports, orchestrate_1, "makeDerivation");
var source_1 = require("./source");
__createBinding(exports, source_1, "initializeSourceInstance", "makeSource");
