var ExpressionNode = require('../model/expression-node');

module.exports = function (GroupSchema, undefined) {
   function NodeSchema() {
      this.plan = [];
      this.children = [];
      this.attributes = {};
      this.context = new ExpressionNode();
   }

   NodeSchema.prototype.attr = function (key, value) {
      if (value === undefined) {
         return this.attributes[key];
      } else {
         this.attributes[key] = value;
      }
      return this;
   };

   NodeSchema.prototype.apply = function (node) {
      var context = new ExpressionNode(this, node);
      var index = 0;
      var self = this;

      this.plan.forEach(function (p) {
         var tmpNode = p(node, context);
         if (tmpNode !== node) {
            self.children[index++].apply(tmpNode);
         }
      });
   };

   NodeSchema.prototype.node = function (id, build) {
      var self = this;
      if (!build) {
         throw new Error('Build function is not defined');
      }

      var buildNode = function (node, context) {
         var newNode = new ExpressionNode(id);

         var schema = new NodeSchema();
         build(schema);
         schema.apply(newNode);

         node.children.push(newNode);
         newNode.parent = node;
         self.children.push(schema);

         return node;
      };

      this.plan.push(buildNode);

      return this;
   };

   NodeSchema.prototype.group = function (id, build) {
      if (!build) {
         throw new Error('Build function is not defined');
      }

      var buildGroup = function (node, context) {
         var schema = new GroupSchema();
         build(schema);
         schema.apply(node);

         context[id] = node.expressions[node.expressions.length - 1];

         return node;
      };

      this.plan.push(buildGroup);

      return this;
   };

   return NodeSchema;
};