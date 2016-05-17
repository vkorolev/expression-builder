module.exports = Line;

var utility = require('../services/utils');

function Line() {
   this.expressions = [];

   this.remove = function (id) {
      var index = utility.indexOf(this.expressions, function (item) {
         return item.id === id;
      });
      if (index < 0) {
         throw Error('Expression not found');
      }

      this.expressions[index].expressions = [];
   };

   this.clone = function (id) {
      var index = utility.indexOf(this.expressions, function (item) {
         return item.id === id;
      });

      if (index < 0) {
         throw Error('Expression not found');
      }

      return angular.copy(expression);
   };

   this.put = function (id, build) {
      var index = utility.indexOf(this.expressions, function (item) {
         return item.id === id;
      });

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