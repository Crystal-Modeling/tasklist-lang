# Task List Language

This repository contains Langium grammar for TaskList language implemented in [GLSP blueprints](git@github.com:eclipse-glsp/glsp-examples.git).

The idea is to connect Langium-based LS to GLSP server as [Source Model Server](https://www.eclipse.org/glsp/documentation/integrations/).

## Environment

This project is built under Node v16.13.1.

## Demo

// The contnent below can be pasted into .tlist file to showcase language capabilities

task "First task"
task "Second task"
task "Another task"

task "First" -> "Another task"
=> task "Second" -> "Second task"
=> task "Third" -> "First task"

/*👆 Is equivalent to 👇*/

task "First task"
task "Second task"
task "Another task"

task "First" -> "Another task", "Second"
task "Second" -> "Second task", "Third"
task "Third" -> "First task"

// Sequential tasks will look like 👇

task "1"
=> task "2"
=> task "3"
=> task "4"

// Graph of tasks will look like 👇
task "Root task" {
    task "Te" {
        task "Ne" {
            task "Reza"
        }
        task "Nor"
    }
    task "Beau" {
        task "Ty"
    }
}