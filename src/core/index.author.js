"use strict";
/**
 * Exports from core for authors of component templates, i.e., components that must
 * be written at a lower level due to how they interface with core features of the
 * framework.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
exports.__esModule = true;
var source_1 = require("./source");
__createBinding(exports, source_1, "declareSimpleSource");
var sink_1 = require("./sink");
__createBinding(exports, sink_1, "declareSimpleSink");
var derivation_1 = require("./derivation");
__createBinding(exports, derivation_1, "declareSimpleDerivation");
