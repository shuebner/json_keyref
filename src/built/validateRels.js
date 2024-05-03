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
import { createRequire as _createRequire } from "module";
var __require = _createRequire(import.meta.url);
var jp = __require("jsonpath-plus");
function query(obj, query) {
    return jp.JSONPath({ path: query, resultType: 'all', json: obj });
}
function validateRels(objToValidate, relationsSpec) {
    var relations = relationsSpec.relations;
    var relationIds = Object.keys(relations);
    var keyIds = relationIds.filter(function (id) { return relations[id].key; });
    var uniqueIds = relationIds.filter(function (id) { return relations[id].unique; });
    var keyrefIds = relationIds.filter(function (id) { return relations[id].keyRef; });
    var keyDiagnostics = keyIds.flatMap(function (id) { return validateKey(id, objToValidate, relations[id].key); });
    var uniqueDiagnostics = uniqueIds.flatMap(function (id) { return validateUnique(id, objToValidate, relations[id].unique); });
    var keyrefDiagnostics = keyrefIds.flatMap(function (id) { return validateKeyRef(id, objToValidate, relations[id].keyRef, relations[relations[id].keyRef.refer].key); });
    return keyDiagnostics.concat(uniqueDiagnostics).concat(keyrefDiagnostics);
}
function validateKeyRef(id, objToValidate, refRelation, keyRelation) {
    var refSelector = refRelation.selector, refField = refRelation.field;
    var keySelector = keyRelation.selector, keyField = keyRelation.field;
    var refNodes = query(objToValidate, refSelector);
    var refNodesWithFields = refNodes.map(function (node) {
        return __assign(__assign({}, node), { fieldNodes: query(node.value, refField) });
    });
    var refNodesWithUniqueField = refNodesWithFields.filter(function (f) { return f.fieldNodes.length > 0; });
    var keyNodes = query(objToValidate, keySelector);
    var keyNodesWithFields = keyNodes.map(function (node) {
        return __assign(__assign({}, node), { fieldNodes: query(node.value, keyField) });
    });
    var keyNodesWithUniqueField = keyNodesWithFields.filter(function (f) { return f.fieldNodes.length > 0; });
    var keys = new Set(keyNodesWithUniqueField.map(function (n) { return n.fieldNodes[0].value; }));
    var invalidRefNodes = refNodesWithUniqueField.filter(function (n) { return !keys.has(n.fieldNodes[0].value); });
    return invalidRefNodes.map(function (n) {
        return {
            instancePath: n.pointer,
            keyword: "keyRef",
            message: "invalid keyRef '".concat(n.fieldNodes[0].value, "'"),
            params: {
                relationId: id,
                invalidRef: n.fieldNodes[0].value
            }
        };
    });
}
function validateUnique(id, objToValidate, relation) {
    var _a;
    var scope = (_a = relation.scope) !== null && _a !== void 0 ? _a : "$.";
    var scopes = query(objToValidate, scope);
    var diagnostics = scopes.flatMap(function (scope) { return validateUniqueScope(id, scope, relation, "unique"); });
    return diagnostics;
}
function validateUniqueScope(id, scope, relation, keyword) {
    var selector = relation.selector;
    var fields = typeof relation.field === 'string' ? [relation.field] : relation.field;
    var selectedNodes = query(scope.value, selector);
    var nodesWithFields = selectedNodes.map(function (node) {
        return __assign(__assign({}, node), { fieldNodes: invertNestedArray(fields.map(function (field) { return query(node.value, field); })) });
    });
    var nodesWithUniqueField = nodesWithFields.filter(function (f) { return f.fieldNodes.length > 0; });
    // when there is no value, the key is assumed to be a property name
    var groups = groupByArray(nodesWithUniqueField, function (f) { return f.fieldNodes[0].length === 1 && !f.fieldNodes[0][0].value
        ? [f.parentProperty]
        : f.fieldNodes[0].map(function (f) { return f.value; }); }, tupleEquals);
    var duplicateGroups = groups.filter(function (_a) {
        var values = _a.values;
        return values.length > 1;
    });
    var duplicateDiagnostics = duplicateGroups.map(function (_a) {
        var key = _a.key, nodes = _a.values;
        var node = nodes[0];
        var fields = node.fieldNodes[0];
        var nodeIsPropertyName = false;
        var message;
        if (fields.length === 1) {
            var field = fields[0];
            var pointerSegments = node.pointer.split('/').concat(field.pointer.split('/')).filter(function (segment) { return segment; });
            var lastSegment = pointerSegments[pointerSegments.length - 1];
            nodeIsPropertyName = lastSegment === node.parentProperty;
            if (nodeIsPropertyName) {
                var parentSegment = pointerSegments[pointerSegments.length - 2];
                message = "duplicate ".concat(parentSegment, " property '").concat(node.parentProperty, "', property names in ").concat(parentSegment, " must be unique");
            }
        }
        if (!message) {
            var fieldDescription = toFieldDescription(fields);
            var keyDescription = toValueDescription(key);
            message = "duplicate ".concat(fieldDescription, " ").concat(keyDescription, ", ").concat(fieldDescription, " must be unique");
        }
        return {
            instancePath: scope.pointer,
            keyword: keyword,
            message: message,
            params: {
                relationId: id,
                duplicateValue: key.length === 1 ? key[0] : key,
                duplicates: nodes.map(function (n) { return scope.pointer + n.pointer; })
            }
        };
    });
    return duplicateDiagnostics;
}
function validateKey(id, objToValidate, relation) {
    var _a;
    var scope = (_a = relation.scope) !== null && _a !== void 0 ? _a : "$.";
    var scopes = query(objToValidate, scope);
    var diagnostics = scopes.flatMap(function (scope) { return validateKeyScope(id, scope, relation); });
    return diagnostics;
}
function validateKeyScope(id, scope, relation) {
    var selector = relation.selector, field = relation.field;
    var selectedNodes = query(scope.value, selector);
    var selectedFields = selectedNodes.map(function (node) {
        return __assign(__assign({}, node), { fieldNodes: query(node.value, field) });
    });
    var fieldsWithoutKey = selectedFields.filter(function (f) { return f.fieldNodes.length == 0; });
    var missingKeyDiagnostics = fieldsWithoutKey.map(function (node) {
        var missingFieldPointer = jp.JSONPath.toPointer(jp.JSONPath.toPathArray(field));
        // remove the leading '/'
        var missingFieldRelativePointer = missingFieldPointer.substring(1);
        return {
            instancePath: scope.pointer + node.pointer,
            keyword: "key",
            message: "property '".concat(missingFieldRelativePointer, "' is required"),
            params: {
                relationId: id,
                missingProperty: missingFieldPointer
            }
        };
    });
    var duplicateKeyDiagnostics = validateUniqueScope(id, scope, relation, "key");
    return missingKeyDiagnostics.concat(duplicateKeyDiagnostics);
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
function invertNestedArray(arr) {
    var maxInnerLength = arr.reduce(function (max, innerArr) { return Math.max(max, innerArr.length); }, 0);
    var result = new Array(maxInnerLength).fill(null).map(function () { return new Array(); });
    arr.forEach(function (innerArr, outerIndex) {
        innerArr.forEach(function (element, index) {
            result[index][outerIndex] = element;
        });
    });
    return result;
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
module.exports = validateRels;
//# sourceMappingURL=validateRels.js.map