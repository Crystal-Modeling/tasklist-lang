grammar TaskList

entry Model:
    tasks+=Task*;

Task:
    'task'
    (name=NAME)
    content=STRING
    ('->' transitions+=Transition (',' transitions+=Transition )* )?
;

Transition:
    targetTaskRef=[Task:NAME]
;


hidden terminal WS: /\s+/;
terminal NAME: /[0-9_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
