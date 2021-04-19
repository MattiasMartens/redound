"use strict";
exports.__esModule = true;
exports.close = exports.consume = void 0;
var sink_1 = require("./sink");
var derivation_1 = require("./derivation");
function consume(emitter, consumer, event) {
    if (consumer.prototype.graphComponentType === "Sink") {
        return sink_1.consume(emitter, consumer, event);
    }
    else if (consumer.prototype.graphComponentType === "Derivation") {
        return derivation_1.consume(emitter, consumer, event);
    }
    else {
        throw new Error("Attempted consume on illegal graph component with ID " + consumer.id + " and type " + consumer.prototype.graphComponentType);
    }
}
exports.consume = consume;
function close(source, consumer, outcome) {
    if (consumer.prototype.graphComponentType === "Sink") {
        sink_1.close(source, consumer, outcome);
    }
    else {
        derivation_1.close(source, outcome);
    }
}
exports.close = close;
