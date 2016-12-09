#expression-builder 1.0 + angularjs
Simple extensible framework for compact markup building with fluent interface

`Expression builder` tries to encapsulate the most of logic that can be happen while building complex tree based
UI. It tries to collect imperative instructrion under the declarative containers. Tries to be pretty, but extensible, powerfull, but not sophisticated.
We believe that expression builder can dramatically help to connect UI and hierarchical structures.
On the first step you say what elements you want to use in yours UI(buttons, lists etc.)
On the second step you tell about instuctions that should be applied in your UI(add button and list, add element, remove element etc.)
On the third step you just bind your instructions to UI, thats it!
##Licence
Code licensed under MIT license.
##Examples
https://github.com/vkorolev/expression-builder/blob/master/test/index.html
##Licence
Code licensed under MIT license.
## Examples
https://vkorolev.github.io/expression-builder
##Installing via Bower
`bower install expression-builder`
## Get Started
###Module
Don't forget to include expression-builder module!
```javascript
anuglar.module('some-module-name', ['expression-builder',...])
```
###Schema
Schema is key interface to create markup with help of ExpressionBuilder.
There are two main concepts: node and line. 
* Node API populates create/copy/remove operations to manipulate with hierarchy structure of markup.
* Line API gives access to the user defined controls for a given node context.
```javascript

```
###ExpressionBuilder service
Use **ExpressionBuilder** servcie to create entry point for markup building. 
Usually instantiation is incapsulated by some special factory.
```javascript
/**
  * ExpressionBuilder/schema constructor.   
  * @param {expressions} list of pairs(type, template) that will be available as controls on markup creation.
  * @param {globalSettings} global settings that will be available on markup creation.
  * @returns ExpressionBuilder instance that we call 'schema' by convention.
  */
constructor ExpressionBuilder(expressions, globalSettings)
```
Example of creating ExpressionBuilder instance.
```javascript
ConditionBuilderFactory.$inject = ['ExpressionBuilder'];
function ConditionBuilderFactory(ExpressionBuilder) {
    return function ConditionBuilder() {
        var builder = new ExpressionBuilder([
        {
          type: 'label',
          templateUrl: 'condition.builder.label.html'
        },
        {
          type: 'input',
          templateUrl: 'condition.builder.input.html'
        },
        {
          type: 'select',
          templateUrl: 'condition.builder.select.html',
          defaults: {
            trackBy: function (node, line, value) {
              return value;
            }
          }
        },
        {
          type: 'button',
          templateUrl: 'condition.builder.button.html'
        }
      ], {
        // default settings that will be applied if they are missed in user defined settings
        defaults: { 
          isVisible: function () {
            return true;
          }
        }
      });
      return builder;
    }
}
```
###Serialization
End user works with declarative syntax that allows to make serialization/deserialization out of the box.
You just need to use `expressionBuilderSerializer` service.
```javascript
/**
  * Function to get serialized state of schema node state.    
  * @param {node} schema node instance.
  * @returns serialized json model of schema node state.
 */
function serialize(node)
/**
  * Function to get node from serialized model.   
  * @param {schema} to what deserialized behaviours will be applied.
  * @returns node model that can be binded to eb-node directive.
 */
function deserialize(schema, data)
```
Example.
```javascript
var data = serializer.serialize(model);
var model = serializer.deserialize(schema, data);
```
###HTML markup
* Add **eb-node** directive to an element where you want to have expression in your markup.
* Bind **eb-node** to expression builder model.
```html
<div eb-node="model"></eb-node>
```
## Development
To setup development environment make sure that npm is installed on your machine, after that just execute npm command for the project.  
`npm install`
##Testing
We use phantomjs and jasmine to ensure quality of the code.
The easiest way to run these asserts is to use npm command for the project.  
`npm test`
##How it works
`expression builder` core principles:
* Powerfull but not complicated
* Extensible but gentle
* Declarative under imperative preassure
## Angular Compatibility
Expression builder was tested with anuglar 1.3+.