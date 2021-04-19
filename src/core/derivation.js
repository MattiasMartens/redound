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
exports.consume = exports.close = exports.seal = exports.unsubscribe = exports.sealEvent = exports.siphon = exports.subscribe = exports.open = exports.scheduleEmissions = exports.emit = exports.initializeDerivationInstance = exports.declareSimpleDerivation = exports.allSources = void 0;
var async_1 = require("@/patterns/async");
var iterables_1 = require("@/patterns/iterables");
var Option_1 = require("fp-ts/lib/Option");
var Option_2 = require("fp-ts/lib/Option");
var consumer_1 = require("./consumer");
var sink_1 = require("./sink");
var tags_1 = require("./tags");
var controller_1 = require("./controller");
var options_1 = require("@/patterns/options");
var backpressure_1 = require("./backpressure");
function allSources(derivation) {
    var _a, _b, _i, role;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = [];
                for (_b in derivation)
                    _a.push(_b);
                _i = 0;
                _c.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 4];
                role = _a[_i];
                return [4 /*yield*/, derivation[role]];
            case 2:
                _c.sent();
                _c.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
exports.allSources = allSources;
/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
function declareSimpleDerivation(derivation) {
    return Object.assign(derivation, {
        sourceCapability: Option_2.none,
        graphComponentType: "Derivation"
    });
}
exports.declareSimpleDerivation = declareSimpleDerivation;
function initializeDerivationInstance(derivation, sources, _a) {
    var id = (_a === void 0 ? {} : _a).id;
    var tag = tags_1.initializeTag(derivation.name, id);
    return {
        prototype: derivation,
        lifecycle: {
            state: "READY"
        },
        aggregate: Option_2.none,
        consumers: new Set(),
        downstreamBackpressure: backpressure_1.backpressure(),
        innerBackpressure: backpressure_1.backpressure(),
        controller: Option_2.none,
        latestTickByProvenance: new Map(),
        sourcesByRole: sources,
        sealedSources: new Set(iterables_1.filterIterable(allSources(sources), function (s) { return ["SEALED", "ENDED"].includes(s.lifecycle.state); })),
        id: tag
    };
}
exports.initializeDerivationInstance = initializeDerivationInstance;
function emit(derivation, event) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // Derivations *can* emit events after they have
            // been sealed! New consumers can still query the Derivation's
            // existing aggregated data, unless and until the graph is
            // finally closed.
            if (derivation.lifecycle.state === "ACTIVE" || derivation.lifecycle.state === "SEALED") {
                return [2 /*return*/, backpressure_1.applyToBackpressure(derivation.downstreamBackpressure, function () { return async_1.voidPromiseIterable(iterables_1.mapIterable(derivation.consumers, function (c) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, genericConsume(derivation, c, event)];
                    }); }); })); })];
            }
            else {
                throw new Error("Attempted action emit() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
            }
            return [2 /*return*/];
        });
    });
}
exports.emit = emit;
function scheduleEmissions(derivation, result, sourceEvent) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (derivation.lifecycle.state === "ACTIVE" || derivation.lifecycle.state === "SEALED") {
                backpressure_1.applyToBackpressure(derivation.downstreamBackpressure, function () { return __awaiter(_this, void 0, void 0, function () {
                    var primaryEvents, secondaryConsume;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                primaryEvents = [];
                                return [4 /*yield*/, async_1.twoStepIterateOverAsyncResult(result, function (e) {
                                        primaryEvents.push(e);
                                    })];
                            case 1:
                                secondaryConsume = (_a.sent()).secondaryConsume;
                                if (!derivation.innerBackpressure.holder) return [3 /*break*/, 2];
                                // If secondary generation is occurring, don't wait
                                // for it to finish; just deposit the next events
                                // on the emission queue and resolve.
                                backpressure_1.applyToBackpressure(derivation.innerBackpressure, function () { return Promise.all(primaryEvents.map(function (e) { return emit(derivation, e); })); });
                                return [3 /*break*/, 4];
                            case 2: 
                            // If secondary generation is not occurring, apply
                            // backpressure on emissions as one normally would.
                            return [4 /*yield*/, backpressure_1.applyToBackpressure(derivation.innerBackpressure, function () { return Promise.all(primaryEvents.map(function (e) {
                                    // Skip emit() to avoid deadlock from waiting for
                                    // own Promise to resolve
                                    return async_1.voidPromiseIterable(iterables_1.mapIterable(derivation.consumers, function (c) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                        return [2 /*return*/, genericConsume(derivation, c, e)];
                                    }); }); }));
                                })); })];
                            case 3:
                                // If secondary generation is not occurring, apply
                                // backpressure on emissions as one normally would.
                                _a.sent();
                                _a.label = 4;
                            case 4:
                                if (secondaryConsume) {
                                    backpressure_1.applyToBackpressure(derivation.innerBackpressure, function () { return secondaryConsume(function (e) { return emit(derivation, e); }); });
                                }
                                return [2 /*return*/];
                        }
                    });
                }); });
            }
            else {
                throw new Error("Attempted action scheduleEmissions() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
            }
            return [2 /*return*/];
        });
    });
}
exports.scheduleEmissions = scheduleEmissions;
function open(derivation) {
    if (derivation.lifecycle.state === "READY") {
        derivation.lifecycle.state = "ACTIVE";
        var aggregate = derivation.prototype.open();
        derivation.aggregate = Option_1.some(aggregate);
    }
    else {
        throw new Error("Attempted action open() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
    }
}
exports.open = open;
function subscribe(derivation, consumer, sourceSubscribe) {
    if (derivation.lifecycle.state !== "ENDED") {
        derivation.consumers.add(consumer);
        if (derivation.lifecycle.state === "READY") {
            if (Option_1.isSome(derivation.controller)) {
                controller_1.propagateController(consumer, derivation.controller.value);
            }
            siphon(derivation, sourceSubscribe);
        }
    }
    else {
        throw new Error("Attempted action subscribe() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
    }
}
exports.subscribe = subscribe;
function siphon(derivation, sourceSubscribe) {
    open(derivation);
    iterables_1.forEachIterable(allSources(derivation.sourcesByRole), function (genericEmitter) {
        if (genericEmitter.prototype.graphComponentType === "Derivation" && genericEmitter.lifecycle.state === "READY") {
            subscribe(genericEmitter, derivation, sourceSubscribe);
            siphon(genericEmitter, sourceSubscribe);
        }
        else if (genericEmitter.prototype.graphComponentType === "Source" && genericEmitter.lifecycle.state === "READY") {
            sourceSubscribe(genericEmitter, derivation);
        }
    });
}
exports.siphon = siphon;
function sealEvent(sourceEvent) {
    return {
        type: "SEAL"
    };
}
exports.sealEvent = sealEvent;
function unsubscribe(source, consumer) {
    source.consumers["delete"](consumer);
}
exports.unsubscribe = unsubscribe;
// Copied from consumer.ts to avoid a dependency loop.
function genericConsume(emitter, consumer, event) {
    if (consumer.prototype.graphComponentType === "Sink") {
        return sink_1.consume(emitter, consumer, event);
    }
    else {
        return consume(emitter, consumer, event);
    }
}
function seal(derivation, event) {
    if (derivation.lifecycle.state === "ACTIVE") {
        derivation.lifecycle.state = "SEALED";
        backpressure_1.applyToBackpressure(derivation.innerBackpressure, function () { return async_1.voidPromiseIterable(iterables_1.mapIterable(derivation.consumers, function (consumer) { return genericConsume(derivation, consumer, event); })); });
    }
    else if (derivation.lifecycle.state === "ENDED") {
        // no-op
    }
    else {
        throw new Error("Attempted action seal() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
    }
}
exports.seal = seal;
function close(derivation, outcome) {
    if (derivation.lifecycle.state !== "ENDED" && derivation.lifecycle.state !== "READY") {
        derivation.lifecycle = {
            outcome: outcome,
            state: "ENDED"
        };
        iterables_1.forEachIterable(derivation.consumers, function (consumer) { return consumer_1.close(derivation, consumer, outcome); });
    }
    else {
        throw new Error("Attempted action close() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
    }
}
exports.close = close;
function getSourceRole(derivation, source) {
    for (var role in derivation.sourcesByRole) {
        if (derivation.sourcesByRole[role] === source) {
            return role;
        }
    }
    throw new Error("Emitter " + source.id + " yielded event to derivation " + derivation.id + " but no role had been registered for that emitter");
}
function consume(source, derivation, e) {
    return __awaiter(this, void 0, void 0, function () {
        var sealResult, inAggregate, role, _a, outAggregate, output;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(derivation.lifecycle.state === "ACTIVE")) return [3 /*break*/, 6];
                    if (!(e.type === "VOID")) return [3 /*break*/, 1];
                    return [3 /*break*/, 5];
                case 1:
                    if (!(e.type === "SEAL")) return [3 /*break*/, 3];
                    derivation.sealedSources.add(source);
                    sealResult = derivation.prototype.seal({
                        aggregate: options_1.getSome(derivation.aggregate),
                        remainingUnsealedSources: new Set(iterables_1.without(allSources(derivation.sourcesByRole), derivation.sealedSources))
                    });
                    derivation.aggregate = Option_1.some(sealResult.aggregate);
                    return [4 /*yield*/, scheduleEmissions(derivation, sealResult.output)];
                case 2:
                    _b.sent();
                    if (sealResult.seal) {
                        seal(derivation, e);
                    }
                    return [3 /*break*/, 5];
                case 3:
                    inAggregate = options_1.getSome(derivation.aggregate);
                    role = getSourceRole(derivation, source);
                    _a = derivation.prototype.consume({
                        event: e,
                        aggregate: inAggregate,
                        source: source,
                        role: role
                    }), outAggregate = _a.aggregate, output = _a.output;
                    derivation.aggregate = Option_1.some(outAggregate);
                    return [4 /*yield*/, scheduleEmissions(derivation, output)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6: throw new Error("Attempted action consume() on derivation " + derivation.id + " in incompatible lifecycle state: " + derivation.lifecycle.state);
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.consume = consume;
