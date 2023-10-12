import { findNodeForProperty } from 'langium'
import * as sem from '../../../../langium-model-server/semantic/model'
import { isDefined } from '../../../../langium-model-server/utils/predicates'
import type * as ast from '../../../generated/ast'
import * as identity from '../../identity/model'
import type { IdentifiedTask } from './task'

export type NewTransition = {
    name: identity.TransitionDerivativeName
    sourceTask: IdentifiedTask,
    targetTask: IdentifiedTask
}

export type Transition = sem.ArtificialIndexedAstNode & sem.Valid<NewTransition>

export namespace Transition {

    export function create(sourceTask: IdentifiedTask,
        isTaskReferenceValid: (task: sem.Valid<ast.Task>, referenceIndex: number) => boolean
    ): Transition[] {
        return TransitionData.create(sourceTask)
            .map(transition => createOne(transition, isTaskReferenceValid))
            .filter(isDefined)
    }

    export function createNew(sourceTask: IdentifiedTask, targetTask: IdentifiedTask): NewTransition {
        return {
            sourceTask,
            targetTask,
            name: identity.TransitionDerivativeName.of(sourceTask.id, targetTask.id)
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
            const name = identity.TransitionDerivativeName.of(sourceTask.id, reference.ref.id)
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

export type IdentifiedTransition = sem.Identified<Transition, identity.TransitionDerivativeName>

type TransitionData = {
    sourceTask: IdentifiedTask,
    referenceIndex: number
}

namespace TransitionData {
    export function create(sourceTask: IdentifiedTask): TransitionData[] {
        return sourceTask.references.map((_, referenceIndex) => ({ sourceTask, referenceIndex }))
    }
}
