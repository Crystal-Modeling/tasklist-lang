# Task List Language

This repository contains Langium grammar for TaskList language implemented in [GLSP blueprints](https://github.com/eclipse-glsp/glsp-examples/tree/master/project-templates/node-json-theia).

The idea is to connect Langium-based LS to GLSP server as [Source Model Server](https://www.eclipse.org/glsp/documentation/integrations/) into [tasklist-theia-glsp](https://github.com/Crystal-VPL/tasklist-theia-glsp).

## Environment

This project is built with Node v16.20.0.

## Implementation considerations

This language is connected to GLSP through Langium Model Server (LMS) API, so need to identify corresponding graphical and textual elements.
In the example, demoed here [Langium + Sirius Web = Heart](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&ved=2ahUKEwjtjeHY1Mz9AhVUlFwKHRICDKQQwqsBegQIFxAE&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dt-BISMWMtwc&usg=AOvVaw2oh1_5SVKkUAzkYOwXrWvU), they used so called "Semantic ID" to locate an element bidirectionally.

That is why, Langium LS enriches AST nodes with semantic *identity*. It is stored in a separate JSON file, and updated on every changes made to the correspondent Langium Document.  
The mapping between AST nodes and their IDs is done by the `name` of the AstNode, or by the IDs of the parent AstNode and the referenced AST node(s) for the `ArtificialAstNode` (Langium `Reference`).  
The `AstNode` or `ArtificialAstNode` mapped to their *identity* is called an `Identified` node.

SourceModel is defined separately from the autogenerated AST (e.g., to have semantic IDs added), and Langium service should do bidirectional mapping. This is done in order not to overload the textual DSL user with irrelevant not language-domain information.

LMS server exposes SourceModel (LMS model) to the outer world (e.g., to be consumed by GLSP server).

## Plans

📃 Learn how to test Langium-based LS and services

## Thoughts for the future

- Formatter will be needed to apply formatting after making text changes in the source model.
