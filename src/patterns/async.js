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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.twoStepIterateOverAsyncResult = exports.isPromise = exports.ms = exports.wrapAsync = exports.never = exports.defer = exports.encapsulatePromise = exports.voidPromiseIterable = exports.end = void 0;
function end(promise) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promise];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.end = end;
function voidPromiseIterable(iterable) {
    var iterable_1, iterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function () {
        var i, e_2_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 11]);
                    iterable_1 = __asyncValues(iterable);
                    _b.label = 1;
                case 1: return [4 /*yield*/, iterable_1.next()];
                case 2:
                    if (!(iterable_1_1 = _b.sent(), !iterable_1_1.done)) return [3 /*break*/, 4];
                    i = iterable_1_1.value;
                    i;
                    _b.label = 3;
                case 3: return [3 /*break*/, 1];
                case 4: return [3 /*break*/, 11];
                case 5:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 11];
                case 6:
                    _b.trys.push([6, , 9, 10]);
                    if (!(iterable_1_1 && !iterable_1_1.done && (_a = iterable_1["return"]))) return [3 /*break*/, 8];
                    return [4 /*yield*/, _a.call(iterable_1)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    if (e_2) throw e_2.error;
                    return [7 /*endfinally*/];
                case 10: return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.voidPromiseIterable = voidPromiseIterable;
function encapsulatePromise(promise) {
    return function (fn) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var eventual;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, promise];
                        case 1:
                            eventual = _a.sent();
                            return [2 /*return*/, fn.apply(void 0, __spreadArrays([eventual], args))];
                    }
                });
            });
        };
    };
}
exports.encapsulatePromise = encapsulatePromise;
function defer() {
    var resolve, reject;
    var promise = new Promise(function (_resolve, _reject) {
        resolve = _resolve, reject = _reject;
    });
    return {
        promise: promise,
        resolve: resolve,
        reject: reject
    };
}
exports.defer = defer;
var neverPromise = new Promise(function () { });
function never() {
    return neverPromise;
}
exports.never = never;
function wrapAsync(fn) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fn()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.wrapAsync = wrapAsync;
function ms(milliseconds) {
    if (milliseconds === void 0) { milliseconds = 0; }
    return new Promise(function (resolve) {
        setTimeout(resolve, milliseconds);
    });
}
exports.ms = ms;
function isPromise(p) {
    if (p === null || p === undefined) {
        return false;
    }
    else {
        return ("then" in p) && (typeof p === "function");
    }
}
exports.isPromise = isPromise;
/**
 * @param result A value, Iterable of values, mixed Iterable of values and Promises of values, Async Iterable, or Promise wrapping any of the above.
 * @param primaryConsumer The async function to be called for every value yielded within the span of the result's returned Promise
 * @param secondaryConsumer The async function to be called for every value yielded after the returned Promise ends
 * @returns A Promise with an optional embedded function 'secondaryConsume'. When called, this function will resume iterating over async values. It resolves when all secondaryConsumer invocations are finished.
 */
function twoStepIterateOverAsyncResult(result, primaryConsumer) {
    return __awaiter(this, void 0, void 0, function () {
        var awaited, iterator_1, iteratorResult, _loop_1, state_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, result];
                case 1:
                    awaited = _a.sent();
                    if (!(awaited !== undefined)) return [3 /*break*/, 6];
                    if (!(Symbol.asyncIterator in awaited)) return [3 /*break*/, 2];
                    return [2 /*return*/, {
                            secondaryConsume: function (secondaryConsumer) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b, t, e_3_1;
                                var e_3, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 6, 7, 12]);
                                            _a = __asyncValues(awaited);
                                            _d.label = 1;
                                        case 1: return [4 /*yield*/, _a.next()];
                                        case 2:
                                            if (!(_b = _d.sent(), !_b.done)) return [3 /*break*/, 5];
                                            t = _b.value;
                                            return [4 /*yield*/, secondaryConsumer(t)];
                                        case 3:
                                            _d.sent();
                                            _d.label = 4;
                                        case 4: return [3 /*break*/, 1];
                                        case 5: return [3 /*break*/, 12];
                                        case 6:
                                            e_3_1 = _d.sent();
                                            e_3 = { error: e_3_1 };
                                            return [3 /*break*/, 12];
                                        case 7:
                                            _d.trys.push([7, , 10, 11]);
                                            if (!(_b && !_b.done && (_c = _a["return"]))) return [3 /*break*/, 9];
                                            return [4 /*yield*/, _c.call(_a)];
                                        case 8:
                                            _d.sent();
                                            _d.label = 9;
                                        case 9: return [3 /*break*/, 11];
                                        case 10:
                                            if (e_3) throw e_3.error;
                                            return [7 /*endfinally*/];
                                        case 11: return [7 /*endfinally*/];
                                        case 12: return [2 /*return*/];
                                    }
                                });
                            }); }
                        }];
                case 2:
                    if (!(Symbol.iterator in awaited)) return [3 /*break*/, 3];
                    iterator_1 = awaited[Symbol.iterator]();
                    iteratorResult = void 0;
                    _loop_1 = function () {
                        var value = iteratorResult.value;
                        if (isPromise(value)) {
                            return { value: {
                                    secondaryConsume: function (secondaryConsumer) { return __awaiter(_this, void 0, void 0, function () {
                                        var triggeringValue, secondaryIteratorResult, secondaryValue;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, value];
                                                case 1:
                                                    triggeringValue = _a.sent();
                                                    return [4 /*yield*/, secondaryConsumer(triggeringValue)];
                                                case 2:
                                                    _a.sent();
                                                    _a.label = 3;
                                                case 3:
                                                    if (!!(secondaryIteratorResult = iterator_1.next()).done) return [3 /*break*/, 6];
                                                    return [4 /*yield*/, secondaryIteratorResult.value];
                                                case 4:
                                                    secondaryValue = _a.sent();
                                                    return [4 /*yield*/, secondaryConsumer(secondaryValue)];
                                                case 5:
                                                    _a.sent();
                                                    return [3 /*break*/, 3];
                                                case 6: return [2 /*return*/];
                                            }
                                        });
                                    }); }
                                } };
                        }
                    };
                    while (!(iteratorResult = iterator_1.next()).done) {
                        state_1 = _loop_1();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                    }
                    return [2 /*return*/, {}];
                case 3: return [4 /*yield*/, primaryConsumer(awaited)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, {}];
                case 5: return [3 /*break*/, 7];
                case 6: return [2 /*return*/, {}];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.twoStepIterateOverAsyncResult = twoStepIterateOverAsyncResult;
