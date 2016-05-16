var Line = require('./line');

module.exports = function () {
   function GroupSchema() {
      this.plan = [];
      this.items = [];
   }

   GroupSchema.prototype.apply = function (node) {
      var fakeNode = angular.copy(node);
      fakeNode.expressions = [];
      fakeNode.children = [];

      var groupExpression = new GroupSchema();
      var context = new Line();

      this.plan.forEach(function (p) {
         p(fakeNode, context);
      });

      fakeNode.expressions.forEach(function (expression) {
         groupExpression.expressions.push(expression);
         expression.parent = groupExpression;
         expression.remove = function () {
            var index = groupExpression.expressions.indexOf(expression);
            groupExpression.expressions.splice(index, 1);
         };
      });

      fakeNode.expressions = [];

      node.expressions.push(groupExpression);
   };

   return GroupSchema;
};
