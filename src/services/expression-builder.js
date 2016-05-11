(function (angular, undefined) {
    
    angular.module('expression-builder')
        .factory('ExpressionBuilder', Factory);
    
    Factory.$inject = [];
    
    function Factory () {
        return ExpressionBuilder;
    }
    
    function ExpressionBuilder (expressions) {
        function Builder () {
            this.plan = [];
        }
        
        Builder.prototype.apply = function (node) {
            this.plan.forEach(function (p) {
                p(node); 
            });
        };
        
        expressions.forEach(function (expression) {
            Builder.prototype[expression.property] = function (id, parameters) {
                var build = function (node, context) {
                    var model = new expression.constructor();
                    angular.extend(model, parameters);
                    model.template = expression.templateUrl;
                    node.expressions.push(model);
                };             
                
                this.plan.push(build);
                
                return this;
            };
        });
        
        return new Builder();
    }
    
})(angular);