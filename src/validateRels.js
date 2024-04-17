const jp = require('jsonpath')

function validateRels(objToValidate, relationsSpec) {
  const { relations } = relationsSpec
  const relationIds = Object.keys(relations)
  const keyIds = relationIds.filter(id => relations[id].key)
  const uniqueIds = relationIds.filter(id => relations[id].unique)

  const keyDiagnostics = keyIds.flatMap(id => validateKey(id, objToValidate, relations[id].key))
  const uniqueDiagnostics = uniqueIds.flatMap(id => validateUnique(id, objToValidate, relations[id].unique))

  return keyDiagnostics.concat(uniqueDiagnostics)
}

function validateUnique(id, objToValidate, relation, keyword) {
  const { selector, field } = relation
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

  const duplicateDiagnostics = duplicateGroups.map(([key, nodes]) => {
    return {
      instancePath: formatSelector(selector),
      keyword: keyword ?? "unique",
      message: `duplicate ${nodes[0].fieldNodes[0].path.slice(1)} '${key}', property '${nodes[0].fieldNodes[0].path.slice(1)}' must be unique`,
      params: {
        relationId: id,
        duplicateValue: key,
        duplicates: nodes.map(formatPathToNode)
      }
    }
  })

  return duplicateDiagnostics
}

function validateKey(id, objToValidate, relation) {
  const { selector, field } = relation
  const selectedNodes = jp.nodes(objToValidate, selector);
  const selectedFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: jp.nodes(node.value, field)
    }
  })

  const fieldsWithoutKey = selectedFields.filter(f => f.fieldNodes.length == 0)
  const missingKeyDiagnostics = fieldsWithoutKey.map(node => {
    const missingFieldName = formatField(field)

    return {
      instancePath: formatPathToNode(node),
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

function groupByArray(xs, getKey) {
  return xs.reduce(function (rv, x) {
    (rv[getKey(x)] = rv[getKey(x)] || []).push(x);
    return rv;
  }, {});
};

module.exports = validateRels