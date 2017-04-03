# expression-builder 1.0 + angularjs
Simple extensible framework for compact markup building with fluent interface.

`Expression builder` tries to encapsulate the most of logic that can be happen while building complex tree based
UI. It tries to collect imperative instructrion under the declarative containers. Tries to be pretty, but extensible, powerfull, but not sophisticated.We believe that expression builder can dramatically help to connect UI and hierarchical structures.On the first step you say what elements you want to use in yours UI(buttons, lists etc.)
On the second step you tell about instuctions that should be applied in your UI(add button and list, add element, remove element etc.). On the third step you just bind your instructions to UI, thats it!

## How it can look like
![alt tag](https://github.com/vkorolev/expression-builder/blob/master/assets/example.png?raw=true)
## Licence
Code licensed under MIT license.
## Examples
https://github.com/vkorolev/expression-builder/blob/master/test/index.html
## Installing via Bower
`bower install expression-builder`
## Get Started
###Module
Don't forget to include expression-builder module!
```javascript
anuglar.module('some-module-name', ['expression-builder',...])
```
### ExpressionBuilder service
Use **ExpressionBuilder** servcie to create entry point for markup building. Further settings that you pass to expression builder will be accessable in the `schema` - the core component of this framework.Usually instantiation is incapsulated by some special factory.
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
        // default settings that will be applied if they are missed in user definitions
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
### Schema
Schema is key interface to create markup with help of ExpressionBuilder.
There are two main concepts: node and line. 

### Node API
Node API populates operations to manipulate with hierarchy structure of markup.

**node**
```javascript
/**
  * Declare new node model. 
  * In UI node will be presented as a new hierarchical element.
  * @param {id} uniq identifier for the node.
  * @param {build} function that populate schema/node argument.
  * @returns NodeSchema instance.
  */
function node(id, build);
schema.node('#logical-group', function (schema) {
    schema.attr('placeholder', true)
          .list('#logical-op-list', {
            options: ['AND', 'OR'],
            value: 'AND'
        })});
```
**groups** 
```javascript        
/**
  * Declare group of expressions.
  * This primitive allows to operate with group of expressions, 
  * also it allows to dynamicly change content of the group
  * @param {id} uniq identifier for the group.
  * @param {build} function that populate schema/node argument.
  * @returns NodeSchema instance.
  */
function group(id, build);
schema.group('#operand', angular.noop)
      .list('#operator', {
          options: ['BETWEEN', 'EQUALS'],
          change: function (node, line) {
             switch (this.value) {
                case 'EQUALS':
                    line.put('#operand', node, function (group) {
                        group.input('#equals', {value: ''});
                    });
                break;
                case 'BETWEEN':
                    line.put('#operand', node, function (group) {
                        group.input('#from', {})
                             .label({text: 'AND'})
                             .input('#to', {value: ''});
                        });
                        break;
                    }
               }
        });
```
 **attributes**
```javascript
/**
  * Attributes - node level properties.
  * Attributes are accessable in all expressions throught the node.attr function, also
  * there are 2 system attributes
  * 'class' - defines css classes for the node
  * 'serialize' - defines wat properties should be serialized (id: [values from id expressions/attributes])
  * @param {key} name of the attribute.
  * @param {value} any.
  * @returns NodeSchema instance.
 */
function attr(key, value);
schema.attr('placeholder', true)
      .attr('serialize', {
           '#field': ['value'],
           '#operator': ['value'],
           '#value': ['value'],
           '@attr': ['placeholder']
      })
      .attr('class', {
           'condition-group': true,
           'placeholder': function (node) {
               return node.attr('placeholder');
           }
       });
```
**expressions/controls**
```javascript
/**
  * Inlined user defined expressions (e.g. button, list, input)
  * @param {id} uniq identifier of the attribute.
  * @param {settings} any property of this object is accessable 
                      from user defined template through expression property
  * @returns NodeSchema instance.
 */
function <expression_type>(id, settings);
schema.autocomplete('#from', {
  $watch: {
    'value': function (newValue, oldValue, node, line) {
    }
  },
  classes: {
    'invalid': function (node) {
      return !this.isValid(node);
    },
    'has-value': function () {
      return !!this.value;
    }
  },
  isValid: function (node, line) {
    return node.attr('placeholder') ||
      (!this.state || !this.state.length);
  },
  options: [],
  value: null,
  change: function(){
  };
  placeholderText: 'Select value'
});
```
```html
<span ng-if="expression.isVisible()">
    <autocomplete class="condition-builder-autocomplete"
                  eb-class="expression.classes"
                  eb-class-context="expression"
                  items="item in expression.options()"
                  selected-item="expression.value"
                  selected-item-change="expression.change()"
                  placeholder="{{expression.placeholderText}}"
                  title="{{expression.value}}">
    </autocomplete>
```
**get**
```javascript
/**
  * Searchs for the node schema with particular id, if not found throws Exception
  * @param {id} id of desired node schema
  * @returns running node model
 */
function get(id);
```
**apply**
```javascript
/**
  * Create a node model from schema
  * @returns running node model that can be bind to UI
 */
function apply();
```
**materialize**
```javascript
/**
  * Search for a node schema and create a node model with desired id
  * @param {id} id of desired node schema
  * @returns running node model
 */
function materialize(id);
```
**in-expression**
```javascript
function attr(key, value);
function addChildAfter(child, after);
function addChildBefore(child, before);
function addAfter(child);
function addBefore(child);
function clone();
function remove();
function clear();
function toString();
function toTraceString();

schema.autocomplete('#value', {
    change: function (node, line, other) {
    if (node.attr('placeholder')) {
      node.addAfter(node.clone());
        node.attr('placeholder', false);
    }
  }
});
```
### Line API
Line API gives access to the user defined controls for a given node context.
**add**
```javascript
/** Add expression to the line
  * @param {expression} expression to add
 */
function add(expression);
```
**clone**
```javascript
/** Clone expression with appropriate id.
  * @param {id} identifier of expression to clone.
  * @returns copy of expression.
 */
function clone(id);
```
**get**
```javascript
/** Find and return expression in the line.
  * @param {expression}  identifier of expression to find.
  * @returns expression.
 */
function get(id);
```
**put**
```javascript
/** Replace group with appropriate id with build output.
  * @param {id} identifier of the group.
  * @param {node} node instance.
  * @param {build} function that populate schema/node argument.
 */
function put(id, node, build);
```
**remove**
```javascript
/** Remove expression from the line with appropriate id.
  * @param {expression}  identifier of expression to find.
 */function remove(id);
```
### Serialization
End user works with declarative syntax that allows to have serialization/deserialization out of the box.
You just need to use `expressionBuilderSerializer` service.
```javascript
/**
  * Function to get serialized state of schema node state.    
  * @param {node} schema node instance.
  * @returns serialized json model of schema node state.
 */
function serialize(node);
/**
  * Function to get node from serialized model.   
  * @param {schema} to what deserialized behaviours will be applied.
  * @returns node model that can be binded to eb-node directive.
 */
function deserialize(schema, data);
```
Example.
```javascript
var data = serializer.serialize(model);
var model = serializer.deserialize(schema, data);
```
### HTML markup
* Add **eb-node** directive to an element where you want to have expression in your markup.
* Bind **eb-node** to expression builder model.
```html
<div eb-node="model"></eb-node>
```
## Development
To setup development environment make sure that npm is installed on your machine, after that just execute npm command for the project.  
`npm install`
## Testing
We use phantomjs and jasmine to ensure quality of the code.
The easiest way to run these asserts is to use npm command for the project.  
`npm test`
## How it works
* Expression exposure - user defined expressions/templates
* Schema patching - provide access for the user defined expressions
* Line patching - provide bindings for the user defined templates
* Context propogation - comunication in a line and between nodes
* Schema application - build a running model that can be bind to UI

`expression builder` core principles:
* Powerfull but not complicated
* Extensible but gentle
* Declarative under imperative preassure

## Angular Compatibility
Expression builder was tested with anuglar 1.3+.
