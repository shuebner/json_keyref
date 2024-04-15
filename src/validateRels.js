const jp = require('jsonpath')

function validateRels(objToValidate, relationsSpec) {
  const { relations } = relationsSpec
  const relationIds = Object.keys(relations)
  const keyIds = relationIds.filter(id => relations[id].key)
  const uniqueIds = relationIds.filter(id => relations[id].unique)

  const keyDiagnostics = keyIds.flatMap(id => validateKey(id, objToValidate, relations))
  const uniqueDiagnostics = uniqueIds.flatMap(id => validateUnique(id, objToValidate, relations))

  return keyDiagnostics.concat(uniqueDiagnostics)
}

function validateUnique(id, objToValidate, relations) {
  const definition = relations[id].unique
  const { selector, field } = definition
  const selectedNodes = jp.nodes(objToValidate, selector);
  const nodesWithFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: jp.nodes(node.value, field)
    }
  })
  
  const nodesWithUniqueField = nodesWithFields.filter(f => f.fieldNodes.length > 0)
  const groups = groupBy(nodesWithUniqueField, f => f.fieldNodes[0].value)

  const duplicateGroups = Object.entries(groups).filter(([, value]) => value.length > 1)

  const duplicateDiagnostics = duplicateGroups.map(([key, node]) => {return {
    instancePath: formatSelector(selector),
    keyword: "unique",
    message: `property '${node[0].fieldNodes[0].path.slice(1)}' must be unique`,
    params: {
      keyId: id,
      duplicates: node.map(formatPathToNode)
    }
  }})

  return duplicateDiagnostics
}

function validateKey(id, objToValidate, relations) {
  const keyDefinition = relations[id].key
  const { selector, field } = keyDefinition
  const selectedNodes = jp.nodes(objToValidate, selector);
  const selectedFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: jp.nodes(node.value, field)
    }
  })

  const fieldsWithoutKey = selectedFields.filter(f => f.fieldNodes.length == 0)
  const fieldWithoutKeyDiagnostics = fieldsWithoutKey.map(node => {
    const missingFieldName = formatField(field)

    return {
      instancePath: formatPathToNode(node),
      keyword: "key",
      message: `property '${missingFieldName}' is required`,
      params: {
        keyId: id,
        missingProperty: missingFieldName
      }
    }
  })
  
  const fieldsWithKey = selectedFields.filter(f => !fieldsWithoutKey.includes(f))
  const groups = groupBy(fieldsWithKey, f => f.fieldNodes[0].value)

  const duplicateGroups = Object.entries(groups).filter(([, value]) => value.length > 1)

  const duplicateKeyDiagnostics = duplicateGroups.map(([key, node]) => {return {
    instancePath: formatSelector(selector),
    keyword: "key",
    message: `property '${node[0].fieldNodes[0].path.slice(1)}' must be unique`,
    params: {
      keyId: id,
      duplicates: node.map(formatPathToNode)
    }
  }})

  return fieldWithoutKeyDiagnostics.concat(duplicateKeyDiagnostics)
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
  return xs.reduce(function(rv, x) {
    (rv[getKey(x)] = rv[getKey(x)] || []).push(x);
    return rv;
  }, {});
};

function groupByArray(xs, getKey) {
  return xs.reduce(function(rv, x) {
    (rv[getKey(x)] = rv[getKey(x)] || []).push(x);
    return rv;
  }, {});
};

module.exports = validateRels