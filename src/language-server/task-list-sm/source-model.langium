grammar SourceModel
import '../shared'

entry STask:
    'test' name=ID ref=[Task:ID]
    // id=ID
    // (tasks+=STask)*
;

// STask:
//     'stask'
//     id=ID
//     '->'
//     task=[Task:ID]
// ;


// terminal SEMANTIC_ID: /[0-9a-z]+/;