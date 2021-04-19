"use strict";
exports.__esModule = true;
exports.makeUnaryDerivation = exports.makeDerivation = exports.derivationSubscribe = exports.makeSink = void 0;
var derivation_1 = require("./derivation");
exports.makeDerivation = derivation_1.initializeDerivationInstance;
var sink_1 = require("./sink");
var source_1 = require("./source");
var derivation_2 = require("./derivation");
function makeSink(sourceInstance, sink, params) {
    if (params === void 0) { params = {}; }
    var sinkInstance = sink_1.initializeSinkInstance(sink, sourceInstance, params);
    if (sourceInstance.prototype.graphComponentType === "Source") {
        source_1.subscribe(sourceInstance, sinkInstance);
    }
    else {
        derivationSubscribe(sourceInstance, sinkInstance);
    }
    return sinkInstance;
}
exports.makeSink = makeSink;
function derivationSubscribe(derivation, consumer) {
    return derivation_2.subscribe(derivation, consumer, source_1.subscribe);
}
exports.derivationSubscribe = derivationSubscribe;
function makeUnaryDerivation(source, derivation, params) {
    if (params === void 0) { params = {}; }
    return derivation_1.initializeDerivationInstance(derivation, { main: source }, params);
}
exports.makeUnaryDerivation = makeUnaryDerivation;
