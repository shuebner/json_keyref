import jp = require('jsonpath-plus')

function validateRels(objToValidate: object, relationsSpec: any) {
  const { relations } = relationsSpec
  const relationIds = Object.keys(relations)
  const keyIds = relationIds.filter(id => relations[id].key)
  const uniqueIds = relationIds.filter(id => relations[id].unique)
  const keyrefIds = relationIds.filter(id => relations[id].keyRef)

  const keyDiagnostics = keyIds.flatMap(id => validateKey(id, objToValidate, relations[id].key))
  const uniqueDiagnostics = uniqueIds.flatMap(id => validateUnique(id, objToValidate, relations[id].unique))
  const keyrefDiagnostics = keyrefIds.flatMap(id => validateKeyRef(id, objToValidate, relations[id].keyRef, relations[relations[id].keyRef.refer].key))

  return keyDiagnostics.concat(uniqueDiagnostics).concat(keyrefDiagnostics)
}

function validateKeyRef(id: string, objToValidate: object, refRelation: any, keyRelation: any) {
  const { selector: refSelector, field: refField } = refRelation
  const { selector: keySelector, field: keyField } = keyRelation
  const refNodes = jp.JSONPath({ path: refSelector, resultType: 'all', json: objToValidate })
  const refNodesWithFields = refNodes.map(node => {
    return {
      ...node,
      fieldNodes: jp.JSONPath({ path: refField, resultType: 'all', json: node.value })
    }
  })
  const refNodesWithUniqueField = refNodesWithFields.filter(f => f.fieldNodes.length > 0)

  const keyNodes = jp.JSONPath({ path: keySelector, resultType: 'all', json: objToValidate })
  const keyNodesWithFields = keyNodes.map(node => {
    return {
      ...node,
      fieldNodes: jp.JSONPath({ path: keyField, resultType: 'all', json: node.value })
    }
  })
  const keyNodesWithUniqueField = keyNodesWithFields.filter(f => f.fieldNodes.length > 0)
  const keys = new Set(keyNodesWithUniqueField.map(n => n.fieldNodes[0].value))

  const invalidRefNodes = refNodesWithUniqueField.filter(n => !keys.has(n.fieldNodes[0].value))

  return invalidRefNodes.map(n => {
    return {
      instancePath: n.pointer,
      keyword: "keyRef",
      message: `invalid keyRef '${n.fieldNodes[0].value}'`,
      params: {
        relationId: id,
        invalidRef: n.fieldNodes[0].value
      }
    }
  })
}

function validateUnique(id: string, objToValidate: object, relation: any) {
  const scope = relation.scope ?? "$."

  const scopes = jp.JSONPath({ path: scope, resultType: 'all', json: objToValidate })

  const diagnostics = scopes.flatMap(scope => validateUniqueScope(id, scope, relation, "unique"))

  return diagnostics
}

function validateUniqueScope(id, scope, relation, keyword) {
  const selector = relation.selector
  const fields = typeof relation.field === 'string' ? [relation.field] : relation.field
  const selectedNodes = jp.JSONPath({ path: selector, resultType: 'all', json: scope.value })
  const nodesWithFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: invertNestedArray(fields.map(field => jp.JSONPath({ path: field, resultType: 'all', json: node.value })))
    }
  })

  const nodesWithUniqueField = nodesWithFields.filter(f => f.fieldNodes.length > 0)
  // when there is no value, the key is assumed to be a property name
  const groups = groupByArray<any, any>(nodesWithUniqueField, f => f.fieldNodes[0].length === 1 && !f.fieldNodes[0][0].value
    ? f.parentProperty
    : f.fieldNodes[0].map(f => f.value),
    tupleEquals)

  const duplicateGroups = groups.filter(({ values }) => values.length > 1)

  const duplicateDiagnostics = duplicateGroups.map(({ key, values: nodes }) => {
    const node = nodes[0]
    const fields = node.fieldNodes[0]
    let nodeIsPropertyName = false
    let message
    if (fields.length === 1) {
      const field = fields[0]
      const pointerSegments = node.pointer.split('/').concat(field.pointer.split('/')).filter(segment => segment)
      const lastSegment = pointerSegments[pointerSegments.length - 1]
      nodeIsPropertyName = lastSegment === node.parentProperty
      if (nodeIsPropertyName) {
        const parentSegment = pointerSegments[pointerSegments.length - 2]
        message = `duplicate ${parentSegment} property '${node.parentProperty}', property names in ${parentSegment} must be unique`
      }
    }

    if (!message) {
      const fieldDescription = toFieldDescription(fields)
      const keyDescription = toValueDescription(key)
      message = `duplicate ${fieldDescription} ${keyDescription}, ${fieldDescription} must be unique`      
    }

    return {
      instancePath: scope.pointer,
      keyword: keyword,
      message: message,
      params: {
        relationId: id,
        duplicateValue: key.length === 1 ? key[0] : key,
        duplicates: nodes.map(n => scope.pointer + n.pointer)
      }
    }
  })

  return duplicateDiagnostics
}

function validateKey(id, objToValidate, relation) {
  const scope = relation.scope ?? "$."

  const scopes = jp.JSONPath({ path: scope, resultType: 'all', json: objToValidate })

  const diagnostics = scopes.flatMap(scope => validateKeyScope(id, scope, relation))

  return diagnostics
}

function validateKeyScope(id, scope, relation) {
  const { selector, field } = relation
  const selectedNodes = jp.JSONPath({ path: selector, resultType: 'all', json: scope.value })
  const selectedFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: jp.JSONPath({ path: field, resultType: 'all', json: node.value })
    }
  })

  const fieldsWithoutKey = selectedFields.filter(f => f.fieldNodes.length == 0)
  const missingKeyDiagnostics = fieldsWithoutKey.map(node => {
    const missingFieldPointer = jp.JSONPath.toPointer(jp.JSONPath.toPathArray(field))
    // remove the leading '/'
    const missingFieldRelativePointer = missingFieldPointer.substring(1)

    return {
      instancePath: scope.pointer + node.pointer,
      keyword: "key",
      message: `property '${missingFieldRelativePointer}' is required`,
      params: {
        relationId: id,
        missingProperty: missingFieldPointer
      }
    }
  })

  const duplicateKeyDiagnostics = validateUniqueScope(id, scope, relation, "key")

  return missingKeyDiagnostics.concat(duplicateKeyDiagnostics)
}


function groupByArray<TValue, TKey>(xs: TValue[], getKey: (o: TValue) => TKey, keyEquals: (one: TKey, other: TKey) => boolean): {key: TKey, values: TValue[]}[] {
  return xs.reduce<{key: TKey, values: TValue[]}[]>(
    function (rv, x) {
      const v = getKey(x);
      const el = rv.find((r) => r && keyEquals(r.key, v));
      if (el) {
        el.values.push(x);
      } else {
        rv.push({ key: v, values: [x] });
      }
      return rv;
    },
    []);
  }

function invertNestedArray(arr: [[]]) {
  const maxInnerLength = arr.reduce((max, innerArr) => Math.max(max, innerArr.length), 0);  
  const result = new Array(maxInnerLength).fill(null).map(() => []);

  arr.forEach((innerArr, outerIndex) => {
    innerArr.forEach((element, index) => {
      result[index][outerIndex] = element;
    });
  });

  return result;
}

function tupleEquals(t1: [], t2: []) {
  if (t1.length !== t2.length) {
    return false
  }

  for (let index = 0; index < t1.length; index++) {
    if (t1[index] !== t2[index]) {
      return false;
    }
  }

  return true;
}

function toFieldDescription(fields: any[]) {
  return fields.length === 1
    ? toSingleFieldDescription(fields[0])
    : `composite (${fields.map(f => toSingleFieldDescription(f)).join(', ')})`
}

function toSingleFieldDescription(field: any) {
  return `'${field.parentProperty}'`
}

function toValueDescription(value) {
  return value.length === 1
    ? toSingleValueDescription(value[0])
    : `(${value.map(k => toSingleValueDescription(k)).join(', ')})`
}

function toSingleValueDescription(value) {  
  return typeof value === 'string'
    ? `'${value}'`
    : value
}

module.exports = validateRels