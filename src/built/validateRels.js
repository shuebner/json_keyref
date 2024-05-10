var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
import { createRequire as _createRequire } from "module";
var __require = _createRequire(import.meta.url);
import { glob } from 'glob';
var jp = __require("jsonpath-plus");
var fs = __require("fs");
function query(obj, query) {
    return jp.JSONPath({ path: query, resultType: 'all', json: obj });
}
function validateMultiFileRels(rootFolder, relationsSpec) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, scope, selector, allDiagnostics, fileContextIterator, _b, fileContextIterator_1, fileContextIterator_1_1, fileContext, fullPath, fullPosixPath, fileNames, relObjs, _c, fileNames_1, fileNames_1_1, fileName, content, obj, e_1_1, diagnostics, e_2_1;
        var _d, e_2, _e, _f, _g, e_1, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    _a = relationsSpec.multiFile, scope = _a.scope, selector = _a.selector;
                    allDiagnostics = new Array();
                    fileContextIterator = glob.iterate(scope, { cwd: rootFolder, posix: true, withFileTypes: true });
                    _k.label = 1;
                case 1:
                    _k.trys.push([1, 20, 21, 26]);
                    _b = true, fileContextIterator_1 = __asyncValues(fileContextIterator);
                    _k.label = 2;
                case 2: return [4 /*yield*/, fileContextIterator_1.next()];
                case 3:
                    if (!(fileContextIterator_1_1 = _k.sent(), _d = fileContextIterator_1_1.done, !_d)) return [3 /*break*/, 19];
                    _f = fileContextIterator_1_1.value;
                    _b = false;
                    fileContext = _f;
                    fullPath = fileContext.fullpath();
                    fullPosixPath = fullPath.replace(/\\/g, '/');
                    return [4 /*yield*/, glob.glob(selector, { cwd: fileContext.toString(), posix: true })];
                case 4:
                    fileNames = _k.sent();
                    relObjs = new Array(fileNames.length);
                    _k.label = 5;
                case 5:
                    _k.trys.push([5, 11, 12, 17]);
                    _c = true, fileNames_1 = (e_1 = void 0, __asyncValues(fileNames));
                    _k.label = 6;
                case 6: return [4 /*yield*/, fileNames_1.next()];
                case 7:
                    if (!(fileNames_1_1 = _k.sent(), _g = fileNames_1_1.done, !_g)) return [3 /*break*/, 10];
                    _j = fileNames_1_1.value;
                    _c = false;
                    fileName = _j;
                    return [4 /*yield*/, fs.promises.readFile(fileName, { encoding: 'utf-8' })];
                case 8:
                    content = _k.sent();
                    obj = JSON.parse(content);
                    relObjs.push({ name: fileName, value: obj });
                    _k.label = 9;
                case 9:
                    _c = true;
                    return [3 /*break*/, 6];
                case 10: return [3 /*break*/, 17];
                case 11:
                    e_1_1 = _k.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 17];
                case 12:
                    _k.trys.push([12, , 15, 16]);
                    if (!(!_c && !_g && (_h = fileNames_1.return))) return [3 /*break*/, 14];
                    return [4 /*yield*/, _h.call(fileNames_1)];
                case 13:
                    _k.sent();
                    _k.label = 14;
                case 14: return [3 /*break*/, 16];
                case 15:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 16: return [7 /*endfinally*/];
                case 17:
                    diagnostics = validateTreeRels(relObjs, relationsSpec);
                    allDiagnostics = allDiagnostics.concat(diagnostics);
                    _k.label = 18;
                case 18:
                    _b = true;
                    return [3 /*break*/, 2];
                case 19: return [3 /*break*/, 26];
                case 20:
                    e_2_1 = _k.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 26];
                case 21:
                    _k.trys.push([21, , 24, 25]);
                    if (!(!_b && !_d && (_e = fileContextIterator_1.return))) return [3 /*break*/, 23];
                    return [4 /*yield*/, _e.call(fileContextIterator_1)];
                case 22:
                    _k.sent();
                    _k.label = 23;
                case 23: return [3 /*break*/, 25];
                case 24:
                    if (e_2) throw e_2.error;
                    return [7 /*endfinally*/];
                case 25: return [7 /*endfinally*/];
                case 26: return [2 /*return*/, allDiagnostics];
            }
        });
    });
}
function validateRels(objToValidate, relationsSpec) {
    return validateTreeRels([{ name: '<anonymous>', value: objToValidate }], relationsSpec);
}
function validateTreeRels(objs, relationsSpec) {
    var relations = relationsSpec.relations;
    var relationIds = Object.keys(relations);
    var uniqueIds = relationIds.filter(function (id) { return relations[id].unique; });
    var keyIds = relationIds.filter(function (id) { return relations[id].key; });
    var keyrefIds = relationIds.filter(function (id) { return relations[id].keyRef; });
    var uniqueContextInfos = uniqueIds.map(function (id) {
        var constraint = getIdentityConstraint(id, relations[id]);
        return {
            id: id,
            constraint: constraint,
            contexts: objs.flatMap(function (o) { return collectContexts(o, constraint); })
        };
    });
    var uniqueDiagnostics = uniqueContextInfos.flatMap(function (i) { return validateUniqueContexts(i.contexts, i.constraint); });
    var keyContextInfos = keyIds.map(function (id) {
        var constraint = getIdentityConstraint(id, relations[id]);
        return {
            id: id,
            constraint: constraint,
            contexts: objs.flatMap(function (o) { return collectContexts(o, constraint); })
        };
    });
    var keyDiagnostics = keyContextInfos.flatMap(function (i) { return getKeyDiagnostics(i.contexts, i.constraint); });
    var qualifiedReferNodesById = new Map(uniqueContextInfos.concat(keyContextInfos)
        .map(function (ci) { return [ci.id, ci.contexts.flatMap(function (c) { return c.nodes.filter(isQualified); })]; }));
    var keyRefContextInfos = keyrefIds.map(function (id) {
        var constraint = getIdentityConstraint(id, relations[id]);
        return {
            id: id,
            constraint: constraint,
            contexts: objs.flatMap(function (o) { return collectContexts(o, constraint); })
        };
    });
    var keyrefDiagnostics = keyRefContextInfos.flatMap(function (i) { return validateKeyrefContexts(i.contexts, qualifiedReferNodesById.get(relations[i.id].keyRef.refer), i.constraint); });
    return keyDiagnostics.concat(uniqueDiagnostics).concat(keyrefDiagnostics);
}
function getIdentityConstraint(id, relation) {
    var _a, _b, _c;
    if (relation.key) {
        return {
            id: id,
            contextNodeSelector: (_a = relation.key.scope) !== null && _a !== void 0 ? _a : "$.",
            selector: relation.key.selector,
            fieldSelectors: typeof relation.key.field === 'string' ? [relation.key.field] : relation.key.field
        };
    }
    if (relation.unique) {
        return {
            id: id,
            contextNodeSelector: (_b = relation.unique.scope) !== null && _b !== void 0 ? _b : "$.",
            selector: relation.unique.selector,
            fieldSelectors: typeof relation.unique.field === 'string' ? [relation.unique.field] : relation.unique.field
        };
    }
    if (relation.keyRef) {
        return {
            id: id,
            contextNodeSelector: (_c = relation.keyRef.scope) !== null && _c !== void 0 ? _c : "$.",
            selector: relation.keyRef.selector,
            fieldSelectors: typeof relation.keyRef.field === 'string' ? [relation.keyRef.field] : relation.keyRef.field
        };
    }
    throw new Error("unknown relation ".concat(id, ": ").concat(relation));
}
function validateKeyrefContexts(contexts, referNodes, constraint) {
    return contexts.flatMap(function (_a) {
        var nodes = _a.nodes;
        return validateKeyRef(constraint, referNodes, nodes.filter(isQualified));
    });
}
function validateKeyRef(constraint, referNodes, keyrefNodes) {
    // use a separator that guarantees that different key sequences end up as different strings
    var separator = "°#@";
    var toKeySequenceId = function (ks) { return ks.join(separator); };
    var keySequenceIds = new Set(referNodes.map(function (n) { return toKeySequenceId(n.keySequence.evaluated); }));
    var invalidRefNodes = keyrefNodes.filter(function (n) { return !keySequenceIds.has(toKeySequenceId(n.keySequence.evaluated)); });
    return invalidRefNodes.map(function (n) {
        return {
            instancePath: n.contextNode.pointer + n.targetNode.pointer,
            keyword: "keyRef",
            message: "invalid keyRef '".concat(n.keySequence.evaluated.join(', '), "'"),
            params: {
                relationId: constraint.id,
                invalidRef: n.keySequence.evaluated.length === 1 ? n.keySequence.evaluated[0] : n.keySequence.evaluated
            }
        };
    });
}
function validateUniqueContexts(contexts, constraint) {
    return contexts.flatMap(function (_a) {
        var nodes = _a.nodes;
        return validateUnique(nodes, constraint);
    });
}
function validateUnique(nodes, constraint) {
    var qualifiedNodes = nodes.filter(isQualified);
    var diagnostics = getUniqueDiagnostics(qualifiedNodes, constraint, "unique");
    return diagnostics;
}
function getKeyDiagnostics(contexts, constraint) {
    return contexts.flatMap(function (_a) {
        var contextNode = _a.contextNode, nodes = _a.nodes;
        var unqualifiedNodes = nodes.filter(function (n) { return !isQualified(n); });
        var missingKeyDiagnostics = unqualifiedNodes.map(function (node) {
            var missingFields = node.keySequence.nodes
                .map(function (n, index) { return ({ field: n, fieldSelector: constraint.fieldSelectors[index] }); })
                .filter(function (x) { return !x.field; });
            var missingFieldPointers = missingFields.map(function (x) { return jp.JSONPath.toPointer(jp.JSONPath.toPathArray(x.fieldSelector)); });
            // remove the leading '/'
            var missingFieldRelativePointers = missingFieldPointers.map(function (p) { return p.substring(1); });
            var missingFieldDescription = missingFieldRelativePointers.map(function (p) { return "'".concat(p, "'"); }).join(", ");
            var message = missingFieldRelativePointers.length === 1
                ? "property ".concat(missingFieldDescription, " is required")
                : "properties ".concat(missingFieldDescription, " are required");
            return {
                instancePath: node.contextNode.pointer + node.targetNode.pointer,
                keyword: "key",
                message: message,
                params: {
                    relationId: constraint.id,
                    missingProperties: missingFieldPointers
                }
            };
        });
        var qualifiedNodes = nodes.filter(isQualified);
        var uniqueDiagnostics = getUniqueDiagnostics(qualifiedNodes, constraint, "key");
        return missingKeyDiagnostics.concat(uniqueDiagnostics);
    });
}
function isQualified(node) {
    return !!node.qualifiedNode &&
        node.keySequence.nodes.every(function (k) { return k; }) &&
        node.keySequence.evaluated.every(function (v) { return v !== null; });
}
function getUniqueDiagnostics(nodes, constraint, keyword) {
    // when there is no value, the key is assumed to be a property name
    var groups = groupByArray(nodes, function (n) { return n.keySequence.evaluated; }, tupleEquals);
    var duplicateGroups = groups.filter(function (_a) {
        var values = _a.values;
        return values.length > 1;
    });
    var duplicateDiagnostics = duplicateGroups.map(function (_a) {
        var key = _a.key, nodes = _a.values;
        var node = nodes[0];
        var fields = node.keySequence.nodes;
        var nodeIsPropertyName = false;
        var message;
        if (fields.length === 1 && fields[0]) {
            var field = fields[0];
            var pointerSegments = node.targetNode.pointer.split('/').concat(field.pointer.split('/')).filter(function (segment) { return segment; });
            var lastSegment = pointerSegments[pointerSegments.length - 1];
            nodeIsPropertyName = lastSegment === node.targetNode.parentProperty;
            if (nodeIsPropertyName) {
                var parentSegment = pointerSegments[pointerSegments.length - 2];
                message = "duplicate ".concat(parentSegment, " property '").concat(node.targetNode.parentProperty, "', property names in ").concat(parentSegment, " must be unique");
            }
        }
        if (!message) {
            var fieldDescription = toFieldDescription(node.keySequence.nodes);
            var keyDescription = toValueDescription(key);
            message = "duplicate ".concat(fieldDescription, " ").concat(keyDescription, ", ").concat(fieldDescription, " must be unique");
        }
        return {
            instancePath: node.contextNode.pointer,
            keyword: keyword,
            message: message,
            params: {
                relationId: constraint.id,
                duplicateValue: key.length === 1 ? key[0] : key,
                duplicates: nodes.map(function (n) { return n.contextNode.pointer + n.targetNode.pointer; })
            }
        };
    });
    return duplicateDiagnostics;
}
function collectContexts(obj, constraint) {
    var contextNodes = query(obj, constraint.contextNodeSelector);
    var nodeInfos = contextNodes
        .map(function (contextNode) {
        var targetNodes = query(contextNode.value, constraint.selector);
        return {
            contextNode: contextNode,
            nodes: targetNodes.map(function (t) {
                var keySequenceNodes = constraint.fieldSelectors.map(function (s) { return queryField(t.value, s); });
                var maybeQualifiedNode = keySequenceNodes.every(function (f) { return f; })
                    ? __assign(__assign({}, t), { keySequenceNodes: keySequenceNodes.filter(function (f) { return f !== null; }) }) : null;
                return {
                    contextNode: contextNode,
                    targetNode: t,
                    qualifiedNode: maybeQualifiedNode,
                    keySequence: {
                        nodes: keySequenceNodes,
                        evaluated: keySequenceNodes.map(function (n) { return n === null ? null : !n.parentProperty ? t.parentProperty : n.value; })
                    }
                };
            })
        };
    });
    return nodeInfos;
}
function queryField(obj, fieldSelector) {
    var results = jp.JSONPath({ path: fieldSelector, resultType: 'all', json: obj });
    if (results.length > 1) {
        // see https://www.w3.org/TR/xmlschema-1/#cIdentity-constraint_Definitions
        throw new Error("A field selector must identify a single node. \"".concat(fieldSelector, "\" identified ").concat(results.map(function (r) { return r.pointer; }).join(", "), "."));
    }
    if (results.length === 1) {
        return results[0];
    }
    return null;
}
function groupByArray(xs, getKey, keyEquals) {
    return xs.reduce(function (rv, x) {
        var v = getKey(x);
        var el = rv.find(function (r) { return r && keyEquals(r.key, v); });
        if (el) {
            el.values.push(x);
        }
        else {
            rv.push({ key: v, values: [x] });
        }
        return rv;
    }, []);
}
function tupleEquals(t1, t2) {
    if (t1.length !== t2.length) {
        return false;
    }
    for (var index = 0; index < t1.length; index++) {
        if (t1[index] !== t2[index]) {
            return false;
        }
    }
    return true;
}
function toFieldDescription(fields) {
    return fields.length === 1
        ? toSingleFieldDescription(fields[0])
        : "composite (".concat(fields.map(function (f) { return toSingleFieldDescription(f); }).join(', '), ")");
}
function toSingleFieldDescription(field) {
    return "'".concat(field.parentProperty, "'");
}
function toValueDescription(value) {
    return value.length === 1
        ? toSingleValueDescription(value[0])
        : "(".concat(value.map(function (k) { return toSingleValueDescription(k); }).join(', '), ")");
}
function toSingleValueDescription(value) {
    return typeof value === 'string'
        ? "'".concat(value, "'")
        : value;
}
module.exports = { validateMultiFileRels: validateMultiFileRels, validateRels: validateRels };
//# sourceMappingURL=validateRels.js.map