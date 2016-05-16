module.exports = Node;

function Node(builder, node) {
   this.add = function (child) {
      node.children.push(child);
   };

   this.create = function (build) {

   };

   this.clone = function () {
      var newNode = new ExpressionNode();
      builder.apply(newNode);

      return newNode;
   };

   this.remove = function () {
      node.remove();
   };

   this.replace = function (id, build) {
      var builder = new GroupBuilder();
      var fakeNode = new ExpressionNode();
      build(builder);
      builder.apply(fakeNode);

      var index = node.expressions.indexOf(this[id]);
      var groupExpression = fakeNode.expressions[0];
      groupExpression.id = id;
      groupExpression.parent = node;
      groupExpression.remove = function () {
         var index = node.expressions.indexOf(groupExpression);
         node.expressions.splice(index, 1);
      };

      this[id] = groupExpression;
      node.expressions.splice(index, 1, groupExpression);
   };
}
