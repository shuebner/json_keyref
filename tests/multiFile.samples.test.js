const glob = require("glob")
const fs = require('fs')
const path = require('path')

const { validateMultiFileRels } = require('../src/validateRels')

const schemaBaseFolder = "../schemas"

const relations = JSON.parse(fs.readFileSync(`${schemaBaseFolder}/multiFile.relations.json`))

const sampleBaseFolder = '../samples'
const validSampleBaseFolder = `${sampleBaseFolder}/multiFile/valid`
const invalidSampleBaseFolder = `${sampleBaseFolder}/multiFile/invalid`

const validSampleFolders = glob.sync(`${validSampleBaseFolder}/*/`)
const invalidSampleFolders = glob.sync(`${invalidSampleBaseFolder}/*/`)

describe("sample in 'valid' folder is valid", () => {
  test.each(validSampleFolders)('%s', async (sampleFolder) => {
    const relationsErrors = await validateMultiFileRels(sampleFolder, relations);

    expect(relationsErrors).toHaveLength(0)
  })
})

describe("sample in 'invalid' folder is invalid", () => {
  test.each(invalidSampleFolders)('%s', async (sampleFolderName) => {
    const expectedErrorsFileName = "expectedErrors.json"
    const expectedErrorsFilePath = path.posix.join(sampleFolderName, expectedErrorsFileName)
    const expectedErrors = fs.existsSync(expectedErrorsFilePath)
      ? JSON.parse(fs.readFileSync(expectedErrorsFilePath))
      : null

    const relationsErrors = await validateMultiFileRels(path.posix.join(sampleFolderName, 'sample'), relations)

    expect(relationsErrors.length).toBeGreaterThan(0)
    if (expectedErrors) {
      expect(relationsErrors).toEqual(
        expect.arrayContaining(expectedErrors.map(expect.objectContaining)))
    }
  })
})