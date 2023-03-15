grammar TaskList

entry Model:
    tasks+=Task*;

Task:
    'task'
    TaskProperties
    ;

NextTask infers Task:
    'next'
    TaskProperties
    ;

fragment TaskProperties:
    (name=ID)?
    content=STRING
    ('->' references+=[Task:ID] (',' references+=[Task:ID] )* )?
    (next=NextTask)?
    ;


hidden terminal WS: /\s+/;
terminal ID: /[0-9_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
