(function (angular, undefined) {
    
    angular.module('expression-builder')
        .factory('expressionBuilder', Factory);
    
    Factory.$inject = [];
    
    function Factory () {
        return ExpressionBuilder;
    }
    
    function ExpressionBuilder (expressions) {
        function Builder () {
            this.plan = [];
        };
        
        Builder.prototype.apply = function (node) {
            plan.forEach(function (p) {
                p(node); 
            });
        };
        
        expressions.forEach(function (expression) {
            Builder.prototype[expression.property] = function (id, parameters) {
                var build = function (node, context) {
                    var expression = Object.create(expression.prototype);
                    angular.extend(model, parameters);
                    node.add(model);
                };             
                
                this.plan.push(build);
                
                return this;
            };
        });
        
        return new Builder();
    }
    
})(angular);