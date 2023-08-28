const Ajv2019 = require("ajv/dist/2019")
const addFormats = require('ajv-formats')
const glob = require("glob")
const fs = require('fs')

const validateRels = require('../src/validateRels')

const schemaBaseFolder = "../schemas"
const schema = glob.sync(`${schemaBaseFolder}/shop.schema.json`)
  .map((schemaFileName) => JSON.parse(fs.readFileSync(schemaFileName)))

const relations = JSON.parse(fs.readFileSync(`${schemaBaseFolder}/shop.relations.json`))

const sampleBaseFolder = '../samples'
const validSamplesFolder = `${sampleBaseFolder}/shop/valid`
const invalidSamplesFolder = `${sampleBaseFolder}/shop/invalid`

const validSampleFiles = glob.sync(`${validSamplesFolder}/**/*.json`)
const invalidSampleFiles = glob.sync(`${invalidSamplesFolder}/**/*.json`)

let validate

beforeEach(() => {
  const ajv = new Ajv2019({ schemas: [schema], allErrors: true })
  addFormats(ajv)
  // used by jsonschema2md for enum documentation
  ajv.addKeyword("meta:enum")
  validate = ajv.getSchema("urn:shop.schema.json")
})

describe("examples in schema are valid against their regex patterns", () => {
  expect(schema).toBeDefined()

  if (!schema.definitions) {
    return;
  }

  const patternStringDefinitions = Object.fromEntries(
    Object.entries(schema.definitions)
      .filter(e => e[1].type === "string" && e[1].pattern && e[1].examples))

  test.each(Object.getOwnPropertyNames(patternStringDefinitions))('%s', (name) => {
    const { pattern, examples } = patternStringDefinitions[name]
    const regex = new RegExp(pattern)
    examples.forEach(example => {
      const isMatch = regex.test(example)
      expect(isMatch).toBe(true)
    });
  })
})

describe("sample in 'valid' folder is valid", () => {
  test.each(validSampleFiles)('%s', (sampleFileName) => {
    const data = JSON.parse(fs.readFileSync(sampleFileName))
    const valid = validate(data)

    if (validate.errors) {
      expect(validate.errors).toHaveLength(0)
    }
    expect(valid).toBe(true)
  })
})

describe("sample in 'invalid' folder is invalid", () => {
  test.each(invalidSampleFiles)('%s', (sampleFileName) => {
    const data = JSON.parse(fs.readFileSync(sampleFileName))
    const { sample, expectedErrors } = data;
    const valid = validate(sample)
    const schemaErrors = valid ? [] : validate.errors
    const relationsErrors = validateRels(sample, relations);
    const errors = schemaErrors.concat(relationsErrors);

    expect(errors.length).toBeGreaterThan(0)
    if (expectedErrors) {
      expect(errors).toEqual(
        expect.arrayContaining(expectedErrors.map(expect.objectContaining)))
    }
  })
})