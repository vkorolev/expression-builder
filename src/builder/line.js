module.exports = Line;

var ExpressionGroup = require('../model/expression-group'),
    utility = require('../services/utils');

function Line(GroupSchema) {
   this.expressions = [];
   this.node = null;

   this.add = function (expression) {
      this.expressions.push(expression);
   };

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

      return angular.copy(this.expressions[index]);
   };

   this.put = function (id, build) {
      var index = utility.indexOf(this.expressions, function (item) {
         return item.id === id;
      });

      if (index < 0) {
         throw Error('Expression not found');
      }

      var schema = new GroupSchema(this.node, this),
          group = new ExpressionGroup();
      build(schema);
      schema.apply(group);
      group.id = id;
      this.expressions.splice(index, 1, group)
   }
}