var ExpressionNode = require('../model/expression-node');

module.exports = function () {
   function GroupSchema(line) {
      this.plan = [];
      this.line = line;
   }

   GroupSchema.prototype.apply = function (expressionGroup) {
      var self = this,
          fakeNode = new ExpressionNode();

      this.plan.forEach(function (p) {
         p(fakeNode, self.line.node, self.line);
      });

      var count = this.plan.length,
          from = this.line.expressions.length - count;

      expressionGroup.expressions = self.line.expressions.splice(from, count);
      fakeNode.expressions = [];
   };

   return GroupSchema;
};
