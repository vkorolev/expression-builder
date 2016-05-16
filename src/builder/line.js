module.exports = Line;

function Line() {
   this.expressions = [];

   this.remove = function (expression) {
      var index = this.expressions.indexOf(expression);
      if (index < 0) {
         throw Error('Expression not found');
      }

      this.expressions[index].expressions = [];
   };

   this.clone = function (expression) {
      var index = this.expressions.indexOf(expression);
      if (index < 0) {
         throw Error('Expression not found');
      }

      return angular.copy(expression);
   };

   this.put = function (expression, build) {
      var index = this.expressions.indexOf(expression);
      if (index < 0) {
         throw Error('Expression not found');
      }

      var schema = new GroupSchema(),
          group = new ExpressionGroup();
      // TODO: modify group, id inheritance etc
      build(schema);
      schema.apply(group);
      return angular.copy(this.expressions[index]);
   }
}