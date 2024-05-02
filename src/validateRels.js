const { JSONPath } = require('jsonpath-plus')

function validateRels(objToValidate, relationsSpec) {
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

function validateKeyRef(id, objToValidate, refRelation, keyRelation) {
  const { selector: refSelector, field: refField } = refRelation
  const { selector: keySelector, field: keyField } = keyRelation
  const refNodes = JSONPath({path: refSelector, resultType: 'all', json: objToValidate })
  const refNodesWithFields = refNodes.map(node => {
    return {
      ...node,
      fieldNodes: JSONPath({path: refField, resultType: 'all', json: node.value })
    }
  })
  const refNodesWithUniqueField = refNodesWithFields.filter(f => f.fieldNodes.length > 0)

  const keyNodes = JSONPath({path: keySelector, resultType: 'all', json: objToValidate })
  const keyNodesWithFields = keyNodes.map(node => {
    return {
      ...node,
      fieldNodes: JSONPath({path: keyField, resultType: 'all', json: node.value })
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

function validateUnique(id, objToValidate, relation) {
  const scope = relation.scope ?? "$."

  const scopes = JSONPath({path: scope, resultType: 'all', json: objToValidate})

  const diagnostics = scopes.flatMap(scope => validateUniqueScope(id, scope, relation))
  
  return diagnostics
}

function validateUniqueScope(id, scope, relation, keyword) {
  const { selector, field } = relation
  const selectedNodes = JSONPath({path: selector, resultType: 'all', json: scope.value })
  const nodesWithFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: JSONPath({path: field, resultType: 'all', json: node.value })
    }
  })

  const nodesWithUniqueField = nodesWithFields.filter(f => f.fieldNodes.length > 0)
  // when there is no value, the key is assumed to be a property name
  const groups = groupBy(nodesWithUniqueField, f => f.fieldNodes[0].value ?? f.parentProperty)

  const duplicateGroups = Object.entries(groups).filter(([, value]) => value.length > 1)

  const duplicateDiagnostics = duplicateGroups.map(([key, nodes]) => {
    const node = nodes[0]
    const field = node.fieldNodes[0]
    const pointerSegments = node.pointer.split('/').concat(field.pointer.split('/')).filter(segment => segment)
    const lastSegment = pointerSegments[pointerSegments.length - 1]

    const nodeIsPropertyName = lastSegment === node.parentProperty
    let message
    if (nodeIsPropertyName) {      
      const parentSegment = pointerSegments[pointerSegments.length - 2]
      message = `duplicate ${parentSegment} property '${node.parentProperty}', property names in ${parentSegment} must be unique`
    } else {
      message = `duplicate ${field.parentProperty} '${key}', property '${field.parentProperty}' must be unique`
    }

    return {
      instancePath: scope.pointer,
      keyword: keyword ?? "unique",
      message: message,
      params: {
        relationId: id,
        duplicateValue: key,
        duplicates: nodes.map(n => scope.pointer + n.pointer)
      }
    }
  })

  return duplicateDiagnostics
}

function validateKey(id, objToValidate, relation) {
  const scope = relation.scope ?? "$."

  const scopes = JSONPath({path: scope, resultType: 'all', json: objToValidate})

  const diagnostics = scopes.flatMap(scope => validateKeyScope(id, scope, relation))
  
  return diagnostics
}

function validateKeyScope(id, scope, relation) {
  const { selector, field } = relation
  const selectedNodes = JSONPath({path: selector, resultType: 'all', json: scope.value })
  const selectedFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: JSONPath({path: field, resultType: 'all', json: node.value })
    }
  })

  const fieldsWithoutKey = selectedFields.filter(f => f.fieldNodes.length == 0)
  const missingKeyDiagnostics = fieldsWithoutKey.map(node => {
    const missingFieldPointer = JSONPath.toPointer(JSONPath.toPathArray(field))
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

function groupBy(xs, getKey) {
  return xs.reduce(function (rv, x) {
    (rv[getKey(x)] = rv[getKey(x)] || []).push(x);
    return rv;
  }, {});
};

module.exports = validateRels