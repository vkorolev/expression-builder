module.exports = GroupSchema;

function GroupSchema() {
   this.plan = [];
   this.items = [];
}

GroupSchema.prototype.apply = function (node) {
   var fakeNode = angular.copy(node);
   fakeNode.expressions = [];
   fakeNode.children = [];

   var groupExpression = new BuilderGroup();
   var context = new Context();

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
