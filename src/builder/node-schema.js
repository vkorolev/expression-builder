module.exports = NodeSchema;

var Node = require('./node');

function NodeSchema() {
   this.plan = [];
   this.children = [];
   this.context = new Node();
}

NodeSchema.prototype.apply = function (node) {
   var context = new Node(this, node);
   var index = 0;
   var self = this;

   this.plan.forEach(function (p) {
      var tmpNode = p(node, context);
      if (tmpNode !== node) {
         self.children[index++].apply(tmpNode);
      }
   });
};

NodeSchema.prototype.node = function (parameters, build) {
   var self = this;

   var buildNode = function (node, context) {
      var newNode = angular.extend(new Node(), parameters);

      function Node(node) {
         this.parent = node;
      }

      Node.prototype = context.constructor;

      var builder = new NodeSchema(expressions);
      build(builder);
      builder.apply(newNode);

      node.children.push(newNode);
      newNode.parent = node;
      newNode.remove = function () {
         var index = node.children.indexOf(newNode);
         node.children.splice(index, 1);
      };

      self.children.push(builder);

      return node;
   };

   this.plan.push(buildNode);

   return this;
};

NodeSchema.prototype.group = function (id, build) {
   var buildGroup = function (node, context) {
      var builder = new GroupSchema();
      build(builder);
      builder.apply(node);

      context[id] = node.expressions[node.expressions.length - 1];

      return node;
   };

   this.plan.push(buildGroup);

   return this;
};
