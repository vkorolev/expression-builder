var Node = require('./node');
var Line = require('./line');
var ExpressionNode = require('../model/expression-node');
var ExpressionGroup = require('../model/expression-group');
var utility = require('../services/utils');
var serialize = require('../services/serialization');

module.exports = function (GroupSchema, undefined) {
   function NodeSchema() {
      this.plan = [];
      this.attributes = {};
      this.serialization = {
         serialize: serialize
      }
   }

   NodeSchema.prototype.attr = function (key, value) {
      if (value === undefined) {
         return this.attributes[key];
      } else {
         this.attributes[key] = value;
      }
      return this;
   };

   NodeSchema.prototype.apply = function (expressionNode) {
      var nodeContext = new Node(this, expressionNode);
      var lineContext = new Line(GroupSchema, nodeContext);

      this.plan.forEach(function (p) {
         p(expressionNode, nodeContext, lineContext);
      });

      nodeContext.attributes = utility.clone(this.attributes);

      return nodeContext;
   };

   NodeSchema.prototype.node = function (id, build) {
      if (!build) {
         throw new Error('Build function is not defined');
      }

      var buildNode = function (expressionNode, nodeContext, line) {
         var newNode = new ExpressionNode(id);

         var schema = new NodeSchema();
         build(schema);

         var newContext = schema.apply(newNode);
         newContext.parent = nodeContext;
         newContext.level = nodeContext.level + 1;

         expressionNode.children.push(newNode);

         return expressionNode;
      };

      this.plan.push(buildNode);

      return this;
   };

   NodeSchema.prototype.group = function (id, build) {
      if (!build) {
         throw new Error('Build function is not defined');
      }

      var buildGroup = function (expressionNode, nodeContext, line) {
         var expressionGroup = new ExpressionGroup();
         expressionGroup.id = id;

         var schema = new GroupSchema(line);
         build(schema);
         schema.apply(expressionGroup);

         line.add(expressionGroup);

         return expressionNode;
      };

      this.plan.push(buildGroup);

      return this;
   };

   return NodeSchema;
};