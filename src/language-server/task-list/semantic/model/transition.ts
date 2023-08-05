import { findNodeForProperty } from 'langium'
import * as sem from '../../../../langium-model-server/semantic/model'
import { isDefined } from '../../../../langium-model-server/utils/predicates'
import type * as ast from '../../../generated/ast'

export type TransitionDerivativeName = [sourceTaskId: string, targetTaskId: string]

export namespace TransitionDerivativeName {
    export function of(sourceTaskId: string, targetTaskId: string): TransitionDerivativeName {
        return [sourceTaskId, targetTaskId]
    }
}

export type NewTransition = {
    name: TransitionDerivativeName
    sourceTask: sem.Identified<ast.Task>,
    targetTask: sem.Identified<ast.Task>
}

export type Transition = sem.ArtificialIndexedAstNode & sem.Valid<NewTransition>

export namespace Transition {

    export function create(sourceTask: sem.Identified<ast.Task>,
        isTaskReferenceValid: (task: sem.Valid<ast.Task>, referenceIndex: number) => boolean
    ): Transition[] {
        return TransitionData.create(sourceTask)
            .map(transition => createOne(transition, isTaskReferenceValid))
            .filter(isDefined)
    }

    export function createNew(sourceTask: sem.Identified<ast.Task>, targetTask: sem.Identified<ast.Task>): NewTransition {
        return {
            sourceTask,
            targetTask,
            name: TransitionDerivativeName.of(sourceTask.id, targetTask.id)
        }
    }

    function createOne(
        { sourceTask, referenceIndex }: TransitionData,
        isTaskReferenceValid: (task: sem.Valid<ast.Task>, referenceIndex: number) => boolean
    ): Transition | undefined {
        const reference = sourceTask.references[referenceIndex]
        if (sem.ResolvedReference.is(reference)
            && isTaskReferenceValid(sourceTask, referenceIndex)
            && sem.Identified.is(reference.ref)) {
            const name = TransitionDerivativeName.of(sourceTask.id, reference.ref.id)
            return {
                __semantic: 'valid',
                name,
                sourceTask,
                targetTask: reference.ref,
                $container: sourceTask,
                $containerIndex: referenceIndex,
                $containerProperty: 'references',
                get $cstNode() {
                    return findNodeForProperty(sourceTask.$cstNode, 'references', referenceIndex)
                }
            }
        }
        return undefined
    }
}

type TransitionData = {
    sourceTask: sem.Identified<ast.Task>,
    referenceIndex: number
}

namespace TransitionData {
    export function create(sourceTask: sem.Identified<ast.Task>): TransitionData[] {
        return sourceTask.references.map((_, referenceIndex) => ({ sourceTask, referenceIndex }))
    }
}
