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
    missingProperties: string[]
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

type QualifiedNode = JSONPathQueryResult & { keySequenceNodes: JSONPathQueryResult[] }
type NodeInfo = {
  contextNode: JSONPathQueryResult,
  targetNode: JSONPathQueryResult,
  qualifiedNode: QualifiedNode | null,
  keySequence: {
    nodes: (JSONPathQueryResult | null)[],
    evaluated: (Primitive | null)[]
  }
}

type QualifiedNodeInfo = {
  contextNode: JSONPathQueryResult,
  targetNode: JSONPathQueryResult,
  qualifiedNode: QualifiedNode
  keySequence: {
    nodes: JSONPathQueryResult[],
    evaluated: Primitive[]
  }
}

type IdentityConstraint = {
  id: string,
  contextNodeSelector: string,
  selector: string,
  fieldSelectors: string[]
}

type Primitive = string | number | boolean

function validateRels(objToValidate: object, relationsSpec: any): Diagnostic[] {
  const { relations } = relationsSpec
  const relationIds = Object.keys(relations)
  const uniqueIds = relationIds.filter(id => relations[id].unique)
  const keyIds = relationIds.filter(id => relations[id].key)
  const keyrefIds = relationIds.filter(id => relations[id].keyRef)

  const uniqueContextInfos = uniqueIds.map(id => {
    const constraint = getIdentityConstraint(id, relations[id])
    return {
      id: id,
      constraint: constraint,
      contexts: collectContexts(objToValidate, constraint)
    }
  });
  const uniqueDiagnostics = uniqueContextInfos.flatMap(i => validateUniqueContexts(i.contexts, i.constraint))

  const keyContextInfos = keyIds.map(id => {
    const constraint = getIdentityConstraint(id, relations[id])
    return {
      id: id,
      constraint: constraint,
      contexts: collectContexts(objToValidate, constraint)
    }
  });
  const keyDiagnostics = keyContextInfos.flatMap(i => getKeyDiagnostics(i.contexts, i.constraint))

  const qualifiedReferNodesById = new Map(uniqueContextInfos.concat(keyContextInfos)
    .map(ci => [ci.id, ci.contexts.flatMap(c => c.nodes.filter(isQualified))]))
  const keyRefContextInfos = keyrefIds.map(id => {
      const constraint = getIdentityConstraint(id, relations[id])
      return {
        id: id,
        constraint: constraint,
        contexts: collectContexts(objToValidate, constraint)
      }
    });
  const keyrefDiagnostics = keyRefContextInfos.flatMap(i => validateKeyrefContexts(i.contexts, qualifiedReferNodesById.get(relations[i.id].keyRef.refer)!, i.constraint))

  return (<Diagnostic[]>keyDiagnostics).concat(uniqueDiagnostics).concat(keyrefDiagnostics)
}

function getIdentityConstraint(id: string, relation: any): IdentityConstraint {
  if (relation.key) {
    return {
      id: id,
      contextNodeSelector: relation.key.scope ?? "$.",
      selector: relation.key.selector,
      fieldSelectors: typeof relation.key.field === 'string' ? [relation.key.field] : relation.key.field
    }
  }

  if (relation.unique) {
    return {
      id: id,
      contextNodeSelector: relation.unique.scope ?? "$.",
      selector: relation.unique.selector,
      fieldSelectors: typeof relation.unique.field === 'string' ? [relation.unique.field] : relation.unique.field
    }
  }

  if (relation.keyRef) {
    return {
      id: id,
      contextNodeSelector: relation.keyRef.scope ?? "$.",
      selector: relation.keyRef.selector,
      fieldSelectors: typeof relation.keyRef.field === 'string' ? [relation.keyRef.field] : relation.keyRef.field
    }
  }

  throw new Error(`unknown relation ${id}: ${relation}`)
}

function validateKeyrefContexts(contexts: Context[], referNodes: QualifiedNodeInfo[], constraint: IdentityConstraint): KeyRefDiagnostic[] {
  return contexts.flatMap(({ nodes }) => validateKeyRef(constraint, referNodes, nodes.filter(isQualified)))
}

function validateKeyRef(constraint: IdentityConstraint, referNodes: QualifiedNodeInfo[], keyrefNodes: QualifiedNodeInfo[]): KeyRefDiagnostic[] {
  // use a separator that guarantees that different key sequences end up as different strings
  const separator = "°#@"
  const toKeySequenceId: (ks: Primitive[]) => string = ks => ks.join(separator)
  const keySequenceIds = new Set(referNodes.map(n => toKeySequenceId(n.keySequence.evaluated)))

  const invalidRefNodes = keyrefNodes.filter(n => !keySequenceIds.has(toKeySequenceId(n.keySequence.evaluated)))

  return invalidRefNodes.map(n => {
    return {
      instancePath: n.contextNode.pointer + n.targetNode.pointer,
      keyword: "keyRef",
      message: `invalid keyRef '${n.keySequence.evaluated.join(', ')}'`,
      params: {
        relationId: constraint.id,
        invalidRef: n.keySequence.evaluated.length === 1 ? n.keySequence.evaluated[0] : n.keySequence.evaluated
      }
    }
  })
}

function validateUniqueContexts(contexts: Context[], constraint: IdentityConstraint) : DuplicateKeyDiagnostic[] {
  return contexts.flatMap(({ nodes }) => validateUnique(nodes, constraint))
}

function validateUnique(nodes: NodeInfo[], constraint: IdentityConstraint): DuplicateKeyDiagnostic[] {
  const qualifiedNodes = nodes.filter(isQualified)
  const diagnostics = getUniqueDiagnostics(qualifiedNodes, constraint, "unique")

  return diagnostics
}

function getKeyDiagnostics(contexts: Context[], constraint: IdentityConstraint): KeyDiagnostic[] {
  return contexts.flatMap(({ contextNode, nodes }) => {
    const unqualifiedNodes = nodes.filter(n => !isQualified(n))
    const missingKeyDiagnostics: MissingKeyDiagnostic[] = unqualifiedNodes.map(node => {
      const missingFields = node.keySequence.nodes
        .map((n, index) => ({ field: n, fieldSelector: constraint.fieldSelectors[index] }))
        .filter(x => !x.field)
      const missingFieldPointers = missingFields.map(x => jp.JSONPath.toPointer(jp.JSONPath.toPathArray(x.fieldSelector)))
      // remove the leading '/'
      const missingFieldRelativePointers = missingFieldPointers.map(p => p.substring(1))
      const missingFieldDescription = missingFieldRelativePointers.map(p => `'${p}'`).join(", ")
      const message = missingFieldRelativePointers.length === 1
        ? `property ${missingFieldDescription} is required`
        : `properties ${missingFieldDescription} are required`

      return {
        instancePath: node.contextNode.pointer + node.targetNode.pointer,
        keyword: "key",
        message: message,
        params: {
          relationId: constraint.id,
          missingProperties: missingFieldPointers
        }
      }
    })

    const qualifiedNodes = nodes.filter(isQualified)
    const uniqueDiagnostics = getUniqueDiagnostics(qualifiedNodes, constraint, "key")

    return (<KeyDiagnostic[]>missingKeyDiagnostics).concat(uniqueDiagnostics)
  })
}

function isQualified(node: NodeInfo): node is QualifiedNodeInfo {
  return !!node.qualifiedNode &&
    node.keySequence.nodes.every(k => k) &&
    node.keySequence.evaluated.every(v => v !== null)
}

function getUniqueDiagnostics(nodes: QualifiedNodeInfo[], constraint: IdentityConstraint, keyword: string): DuplicateKeyDiagnostic[] {
  // when there is no value, the key is assumed to be a property name
  const groups = groupByArray(
    nodes,
    n => n.keySequence.evaluated,
    tupleEquals)

  const duplicateGroups = groups.filter(({ values }) => values.length > 1)

  const duplicateDiagnostics = duplicateGroups.map(({ key, values: nodes }) => {
    const node = nodes[0]
    const fields = node.keySequence.nodes
    let nodeIsPropertyName = false
    let message
    if (fields.length === 1 && fields[0]) {
      const field = fields[0]
      const pointerSegments = node.targetNode.pointer.split('/').concat(field.pointer.split('/')).filter(segment => segment)
      const lastSegment = pointerSegments[pointerSegments.length - 1]
      nodeIsPropertyName = lastSegment === node.targetNode.parentProperty
      if (nodeIsPropertyName) {
        const parentSegment = pointerSegments[pointerSegments.length - 2]
        message = `duplicate ${parentSegment} property '${node.targetNode.parentProperty}', property names in ${parentSegment} must be unique`
      }
    }

    if (!message) {
      const fieldDescription = toFieldDescription(node.keySequence.nodes)
      const keyDescription = toValueDescription(key)
      message = `duplicate ${fieldDescription} ${keyDescription}, ${fieldDescription} must be unique`
    }

    return {
      instancePath: node.contextNode.pointer,
      keyword: keyword,
      message: message,
      params: {
        relationId: constraint.id,
        duplicateValue: key.length === 1 ? key[0] : key,
        duplicates: nodes.map(n => n.contextNode.pointer + n.targetNode.pointer)
      }
    }
  })

  return duplicateDiagnostics
}

type Context = {
  contextNode: JSONPathQueryResult,
  nodes: NodeInfo[]
}

function collectContexts(obj: any, constraint: IdentityConstraint): Context[] {
  const contextNodes = query(obj, constraint.contextNodeSelector)
  const nodeInfos = contextNodes
    .map(contextNode => {
      const targetNodes = query(contextNode.value, constraint.selector)
      return {
        contextNode: contextNode,
        nodes: targetNodes.map(t => {
          const keySequenceNodes = constraint.fieldSelectors.map(s => queryField(t.value, s))
          const maybeQualifiedNode = keySequenceNodes.every(f => f)
            ? {
              ...t,
              keySequenceNodes: keySequenceNodes.filter((f): f is Exclude<typeof f, null> => f !== null)
            }
            : null

          return {
            contextNode: contextNode,
            targetNode: t,
            qualifiedNode: maybeQualifiedNode,
            keySequence: {
              nodes: keySequenceNodes,
              evaluated: keySequenceNodes.map(n => n === null ? null : !n.parentProperty ? t.parentProperty : n.value)
            }
          }
        })
      }
    })

  return nodeInfos
}

function queryField(obj: any, fieldSelector: string): JSONPathQueryResult | null {
  const results: JSONPathQueryResult[] = jp.JSONPath({ path: fieldSelector, resultType: 'all', json: obj })

  if (results.length > 1) {
    // see https://www.w3.org/TR/xmlschema-1/#cIdentity-constraint_Definitions
    throw new Error(`A field selector must identify a single node. "${fieldSelector}" identified ${results.map(r => r.pointer).join(", ")}.`)
  }

  if (results.length === 1) {
    return results[0]
  }

  return null;
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