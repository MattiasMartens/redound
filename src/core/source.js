"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.close = exports.seal = exports.unsubscribe = exports.sealEvent = exports.subscribe = exports.open = exports.emit = exports.initializeSourceInstance = exports.declareSimpleSource = void 0;
var async_1 = require("@/patterns/async");
var iterables_1 = require("@/patterns/iterables");
var functions_1 = require("@/patterns/functions");
var Option_1 = require("fp-ts/lib/Option");
var Option_2 = require("fp-ts/lib/Option");
var clock_1 = require("./clock");
var consumer_1 = require("./consumer");
var tags_1 = require("./tags");
var controller_1 = require("./controller");
var backpressure_1 = require("./backpressure");
// Dependency Map:
// source imports sink
// source imports consumer
// source imports controller
// consumer imports sink
// consumer imports derivation
// derivation imports sink
// (there is no need for a generic "emitter")
/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
function declareSimpleSource(source) {
    return Object.assign(source, {
        graphComponentType: "Source",
        pull: functions_1.noop
    });
}
exports.declareSimpleSource = declareSimpleSource;
function initializeSourceInstance(source, _a) {
    var _b = _a === void 0 ? {} : _a, id = _b.id, tick = _b.tick, controller = _b.controller;
    var tag = tags_1.initializeTag(source.name, id);
    return {
        clock: clock_1.clock(tick),
        prototype: source,
        lifecycle: {
            state: "READY"
        },
        consumers: new Set(),
        references: Option_2.none,
        backpressure: backpressure_1.backpressure(),
        controller: Option_2.fromNullable(controller),
        id: tag
    };
}
exports.initializeSourceInstance = initializeSourceInstance;
function emit(source, event) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (source.lifecycle.state === "ACTIVE") {
                async_1.voidPromiseIterable(iterables_1.mapIterable(source.consumers, function (c) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, consumer_1.consume(source, c, event)];
                }); }); }));
            }
            else {
                throw new Error("Attempted action emit() on source " + source.id + " in incompatible lifecycle state: " + source.lifecycle.state);
            }
            return [2 /*return*/];
        });
    });
}
exports.emit = emit;
function open(source) {
    if (source.lifecycle.state === "READY") {
        var sourceEmit_1 = function (e) {
            clock_1.tick(source.clock);
            return emit(source, e);
        };
        source.lifecycle.state = "ACTIVE";
        var references_1 = source.prototype.open();
        source.references = Option_1.some(references_1);
        // TODO Pass failure here to controller if any
        async_1.wrapAsync(function () { return source.prototype.generate(sourceEmit_1, references_1); }).then(function (doNotSeal) { return doNotSeal || seal(source); });
    }
    else {
        throw new Error("Attempted action open() on source " + source.id + " in incompatible lifecycle state: " + source.lifecycle.state);
    }
}
exports.open = open;
function subscribe(source, consumer) {
    if (source.lifecycle.state !== "ENDED") {
        source.consumers.add(consumer);
        if (Option_1.isSome(source.controller)) {
            controller_1.propagateController(consumer, source.controller.value);
        }
        if (source.lifecycle.state === "READY") {
            console.log('opening');
            open(source);
        }
    }
    else {
        throw new Error("Attempted action subscribe() on source " + source.id + " in incompatible lifecycle state: " + source.lifecycle.state);
    }
}
exports.subscribe = subscribe;
function sealEvent() {
    return {
        type: "SEAL"
    };
}
exports.sealEvent = sealEvent;
function unsubscribe(source, consumer) {
    source.consumers["delete"](consumer);
}
exports.unsubscribe = unsubscribe;
function seal(source) {
    if (source.lifecycle.state === "ACTIVE") {
        source.lifecycle.state = "SEALED";
        clock_1.tick(source.clock);
        var e_1 = sealEvent();
        iterables_1.forEachIterable(source.consumers, function (consumer) { return consumer_1.consume(source, consumer, e_1); });
    }
    else if (source.lifecycle.state === "ENDED") {
        // no-op
    }
    else {
        throw new Error("Attempted action seal() on source " + source.id + " in incompatible lifecycle state: " + source.lifecycle.state);
    }
}
exports.seal = seal;
function close(source, outcome) {
    if (source.lifecycle.state !== "ENDED" && source.lifecycle.state !== "READY") {
        source.lifecycle = {
            outcome: outcome,
            state: "ENDED"
        };
        iterables_1.forEachIterable(source.consumers, function (consumer) { return consumer_1.close(source, consumer, outcome); });
    }
    else {
        throw new Error("Attempted action close() on source " + source.id + " in incompatible lifecycle state: " + source.lifecycle.state);
    }
}
exports.close = close;
