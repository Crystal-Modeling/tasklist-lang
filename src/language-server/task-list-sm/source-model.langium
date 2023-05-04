grammar SourceModel
import '../shared'

entry SModel:
    id=ID
    'tasks:'
    (tasks+=STask)*
;

STask:
    id=ID
    task=[Task:ID]
;