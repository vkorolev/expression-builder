module.exports = function () {
   function GroupSchema(node, line) {
      this.plan = [];
      this.line = line;
      this.node = node;
   }

   GroupSchema.prototype.apply = function (expressionGroup) {
      var self = this;
      this.plan.forEach(function (p) {
         p(self.node, self.line, expressionGroup);
      });
   };

   return GroupSchema;
};
