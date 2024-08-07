#!/usr/bin/env node

import { validateMultiFileRels } from './validateRels.js'
import { Command } from 'commander'
import fs from 'fs-extra'

try {
  const program = new Command();

  program
    .requiredOption('-r, --root <directory>', 'The root directory for relative paths and globs')
    .requiredOption('-s, --settings <file>', 'The JSON relations definition file')
    .requiredOption('-o, --out-errors <file>', 'The validation error output file')

  program.parse();
  const options = program.opts();

  const settingsFilePath = <string>(options.settings)
  const rootPath = <string>(options.root)
  const outErrorFilePath = <string>(options.outErrors)

  let relationDefinition

  try {
    const relationsFileContent = await fs.readFile(settingsFilePath)
    relationDefinition = relationsFileContent.toJSON()
  }
  catch (error) {
    process.exitCode = 1
    console.error(`could not read file ${settingsFilePath}: ${error.message}` )
  }

  if (!(await fs.exists(rootPath))) {
    process.exitCode = 1
    console.error(`directory ${rootPath} does not exist`)
  }

  const diagnostics = await validateMultiFileRels(rootPath, relationDefinition)

  await fs.outputFile(outErrorFilePath, JSON.stringify(diagnostics, null, 2))

  if (diagnostics.length > 0) {
    process.exitCode = 4
  }
}
catch (error) {
  console.error(error.message)
  process.exitCode = 1
}