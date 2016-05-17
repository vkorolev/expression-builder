var utility = require('./utils');

module.exports = Patch;

function Patch() {
   var args = utility.asArray(arguments);
   this.context = function (expression, key) {
      var sourceFunction = expression[key];

      expression[key] = function () {
         return sourceFunction.apply(expression, args.concat(utility.asArray(arguments)));
      };
   };
}