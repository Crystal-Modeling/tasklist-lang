import { EmptyFileSystem } from 'langium'
import { expectError, validationHelper } from 'langium/test'
import { describe, expect, test } from 'vitest'
import type * as ast from '../../../src/language-server/generated/ast'
import { createTaskListLangServices } from '../../../src/language-server/task-list-lang-module'

const services = createTaskListLangServices(EmptyFileSystem)
// const parse = parseHelper(services.TaskList)
// const locator = services.TaskList.workspace.AstNodeLocator
const validate = validationHelper<ast.Model>(services.TaskList)

describe('TaskList validation', () => {

    test('Task content should begin with an uppercase', async () => {
        // arrange
        const grammarText = `
        task t1 "do something with your Shift, buddy!"        
        `

        // act
        const validationResult = await validate(grammarText)

        expect(validationResult.diagnostics[0], 'Expect diagnostics').not.toBeUndefined()
        // assert
        expectError(validationResult, 'Task content should start with a capital.', {
            node: (validationResult.document.parseResult.value.tasks[0]),
            property: 'content'
        })
    })

})
