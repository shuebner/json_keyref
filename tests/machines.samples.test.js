const glob = require("glob")
const fs = require('fs')

const { validateRels } = require('../src/validateRels')

const schemaBaseFolder = "../schemas"

const relations = JSON.parse(fs.readFileSync(`${schemaBaseFolder}/machines.relations.json`))

const sampleBaseFolder = '../samples'
const validSamplesFolder = `${sampleBaseFolder}/machines/valid`
const invalidSamplesFolder = `${sampleBaseFolder}/machines/invalid`

const validSampleFiles = glob.sync(`${validSamplesFolder}/**/*.json`)
const invalidSampleFiles = glob.sync(`${invalidSamplesFolder}/**/*.json`)

describe("sample in 'valid' folder is valid", () => {
  test.each(validSampleFiles)('%s', (sampleFileName) => {
    const data = JSON.parse(fs.readFileSync(sampleFileName))
    const relationsErrors = validateRels(data, relations);

    expect(relationsErrors).toHaveLength(0)
  })
})

describe("sample in 'invalid' folder is invalid", () => {
  test.each(invalidSampleFiles)('%s', (sampleFileName) => {
    const data = JSON.parse(fs.readFileSync(sampleFileName))
    const { sample, expectedErrors } = data;
    const errors = validateRels(sample, relations);

    expect(errors.length).toBeGreaterThan(0)
    if (expectedErrors) {
      expect(errors).toEqual(
        expect.arrayContaining(expectedErrors.map(expect.objectContaining)))
    }
  })
})