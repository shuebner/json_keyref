import jp = require('jsonpath-plus')

type JSONPathQueryResult =
  {
    value: any,
    parent: any,
    parentProperty: string,
    pointer: string,
  }

type Diagnostic =
  | KeyRefDiagnostic
  | KeyDiagnostic

type KeyDiagnostic =
  | MissingKeyDiagnostic
  | DuplicateKeyDiagnostic

type DiagnosticBase = {
  instancePath: string,
  keyword: string,
  message: string,
  params: {
    relationId: string
  }
}

type KeyRefDiagnostic = DiagnosticBase & {
  params: {
    invalidRef: any
  }
}

type MissingKeyDiagnostic = DiagnosticBase & {
  params: {
    missingProperty: string
  }
}

type DuplicateKeyDiagnostic = DiagnosticBase & {
  params: {
    duplicateValue: any,
    duplicates: string[]
  }
}

function query(obj: any, query: string): JSONPathQueryResult[] {
  return jp.JSONPath({ path: query, resultType: 'all', json: obj })
}

function validateRels(objToValidate: object, relationsSpec: any): Diagnostic[] {
  const { relations } = relationsSpec
  const relationIds = Object.keys(relations)
  const keyIds = relationIds.filter(id => relations[id].key)
  const uniqueIds = relationIds.filter(id => relations[id].unique)
  const keyrefIds = relationIds.filter(id => relations[id].keyRef)

  const keyDiagnostics = keyIds.flatMap(id => validateKey(id, objToValidate, relations[id].key))
  const uniqueDiagnostics = uniqueIds.flatMap(id => validateUnique(id, objToValidate, relations[id].unique))
  const keyrefDiagnostics = keyrefIds.flatMap(id => validateKeyRef(id, objToValidate, relations[id].keyRef, relations[relations[id].keyRef.refer].key))

  return (<Diagnostic[]>keyDiagnostics).concat(uniqueDiagnostics).concat(keyrefDiagnostics)
}

function validateKeyRef(id: string, objToValidate: any, refRelation: any, keyRelation: any): KeyRefDiagnostic[] {
  const { selector: refSelector, field: refField } = refRelation
  const { selector: keySelector, field: keyField } = keyRelation
  const refNodes = query(objToValidate, refSelector)
  const refNodesWithFields = refNodes.map(node => {
    return {
      ...node,
      fieldNodes: query(node.value, refField)
    }
  })
  const refNodesWithUniqueField = refNodesWithFields.filter(f => f.fieldNodes.length > 0)

  const keyNodes = query(objToValidate, keySelector)
  const keyNodesWithFields = keyNodes.map(node => {
    return {
      ...node,
      fieldNodes: query(node.value, keyField)
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

  const scopes = query(objToValidate, scope)

  const diagnostics = scopes.flatMap(scope => validateUniqueScope(id, scope, relation, "unique"))

  return diagnostics
}

function validateUniqueScope(id: string, scope: JSONPathQueryResult, relation: any, keyword: string): DuplicateKeyDiagnostic[] {
  const selector = relation.selector
  const fields: string[] = typeof relation.field === 'string' ? [relation.field] : relation.field
  const selectedNodes = query(scope.value, selector)
  const nodesWithFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: invertNestedArray(fields.map(field => query(node.value, field)))
    }
  })

  const nodesWithUniqueField = nodesWithFields.filter(f => f.fieldNodes.length > 0)
  // when there is no value, the key is assumed to be a property name
  const groups = groupByArray(
    nodesWithUniqueField,
    f => f.fieldNodes[0].length === 1 && !f.fieldNodes[0][0].value
      ? [f.parentProperty]
      : f.fieldNodes[0].map(f => f.value),
    tupleEquals)

  const duplicateGroups = groups.filter(({ values }) => values.length > 1)

  const duplicateDiagnostics = duplicateGroups.map(({ key, values: nodes }) => {
    const node = nodes[0]
    const fields = node.fieldNodes[0]
    let nodeIsPropertyName = false
    let message
    if (fields.length === 1 && fields[0]) {
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

function validateKey(id: string, objToValidate: any, relation: any) {
  const scope = relation.scope ?? "$."

  const scopes = query(objToValidate, scope)

  const diagnostics = scopes.flatMap(scope => validateKeyScope(id, scope, relation))

  return diagnostics
}

function validateKeyScope(id: string, scope: JSONPathQueryResult, relation: any): KeyDiagnostic[] {
  const { selector, field } = relation
  const selectedNodes = query(scope.value, selector)
  const selectedFields = selectedNodes.map(node => {
    return {
      ...node,
      fieldNodes: query(node.value, field)
    }
  })

  const fieldsWithoutKey = selectedFields.filter(f => f.fieldNodes.length == 0)
  const missingKeyDiagnostics: MissingKeyDiagnostic[] = fieldsWithoutKey.map(node => {
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

  return (<KeyDiagnostic[]>missingKeyDiagnostics).concat(duplicateKeyDiagnostics)
}


function groupByArray<TValue, TKey>(xs: TValue[], getKey: (o: TValue) => TKey, keyEquals: (one: TKey, other: TKey) => boolean): { key: TKey, values: TValue[] }[] {
  return xs.reduce<{ key: TKey, values: TValue[] }[]>(
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

function invertNestedArray<T>(arr: T[][]): (T | undefined)[][] {
  const maxInnerLength = arr.reduce((max, innerArr) => Math.max(max, innerArr.length), 0);
  const result = new Array(maxInnerLength).fill(null).map(() => new Array<T>());

  arr.forEach((innerArr, outerIndex) => {
    innerArr.forEach((element, index) => {
      result[index][outerIndex] = element;
    });
  });

  return result;
}

function tupleEquals(t1: any[], t2: any[]) {
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

function toFieldDescription(fields: JSONPathQueryResult[]) {
  return fields.length === 1
    ? toSingleFieldDescription(fields[0])
    : `composite (${fields.map(f => toSingleFieldDescription(f)).join(', ')})`
}

function toSingleFieldDescription(field: JSONPathQueryResult) {
  return `'${field.parentProperty}'`
}

function toValueDescription(value: any[]) {
  return value.length === 1
    ? toSingleValueDescription(value[0])
    : `(${value.map(k => toSingleValueDescription(k)).join(', ')})`
}

function toSingleValueDescription(value: any[]) {
  return typeof value === 'string'
    ? `'${value}'`
    : value
}

module.exports = validateRels