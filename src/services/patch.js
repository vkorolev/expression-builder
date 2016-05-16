module.exports = Patch;

function Patch() {
   var args = arguments;
   this.context = function (expression, key) {
      var sourceFunction = expression[key];

      expression[key] = function () {
         return sourceFunction.apply(expression, args.concat(arguments));
      };
   };
}