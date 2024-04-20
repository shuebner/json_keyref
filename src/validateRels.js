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

function validateUnique(id, objToValidate, relation, keyword) {
  const { selector, field } = relation
  const selectedNodes = JSONPath({path: selector, resultType: 'all', json: objToValidate })
  const nodesWithFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: JSONPath({path: field, resultType: 'all', json: node.value })
    }
  })

  const nodesWithUniqueField = nodesWithFields.filter(f => f.fieldNodes.length > 0)
  const groups = groupBy(nodesWithUniqueField, f => f.fieldNodes[0].value)

  const duplicateGroups = Object.entries(groups).filter(([, value]) => value.length > 1)

  const duplicateDiagnostics = duplicateGroups.map(([key, nodes]) => {
    return {
      instancePath: formatSelector(selector),
      keyword: keyword ?? "unique",
      message: `duplicate ${nodes[0].fieldNodes[0].parentProperty} '${key}', property '${nodes[0].fieldNodes[0].parentProperty}' must be unique`,
      params: {
        relationId: id,
        duplicateValue: key,
        duplicates: nodes.map(n => n.pointer)
      }
    }
  })

  return duplicateDiagnostics
}

function validateKey(id, objToValidate, relation) {
  const { selector, field } = relation
  const selectedNodes = JSONPath({path: selector, resultType: 'all', json: objToValidate })
  const selectedFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: JSONPath({path: field, resultType: 'all', json: node.value })
    }
  })

  const fieldsWithoutKey = selectedFields.filter(f => f.fieldNodes.length == 0)
  const missingKeyDiagnostics = fieldsWithoutKey.map(node => {
    const missingFieldName = formatField(field)

    return {
      instancePath: node.pointer,
      keyword: "key",
      message: `property '${missingFieldName}' is required`,
      params: {
        relationId: id,
        missingProperty: missingFieldName
      }
    }
  })

  const duplicateKeyDiagnostics = validateUnique(id, objToValidate, relation, "key")

  return missingKeyDiagnostics.concat(duplicateKeyDiagnostics)
}

function formatPathToNode(node) {
  return '/' + node.path.slice(1).join('/')
}

function formatSelector(selector) {
  const converted = selector.replace('$', '').replace('.', '/').replace(/\[\d*?:\d*?(:\d*?)?\]/, '/')
  if (converted[converted.length - 1] === '/') {
    return converted.substring(0, converted.length - 1);
  }

  return converted;
}

function formatField(field) {
  const fieldFromParent = formatSelector(field);
  if (fieldFromParent[0] === '/') {
    return fieldFromParent.substring(1)
  }

  return fieldFromParent;

}

function groupBy(xs, getKey) {
  return xs.reduce(function (rv, x) {
    (rv[getKey(x)] = rv[getKey(x)] || []).push(x);
    return rv;
  }, {});
};

module.exports = validateRels