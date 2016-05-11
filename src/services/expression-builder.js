(function (angular, undefined) {
    
    angular.module('expression-builder')
        .factory('ExpressionBuilder', Factory);
    
    Factory.$inject = ['BuilderNode'];
    
    function Factory (BuilderNode) {
        return ExpressionBuilder;

        function ExpressionBuilder (expressions) {
            function Builder () {
                this.plan = [];
                this.context = {};
            }

            Builder.prototype.apply = function (node) {
                this.plan.forEach(function (p) {
                    p(node);
                });
            };

            Builder.prototype.node = function (parameters, build) {
                var buildNode = function (node, context) {
                    var nextNode = new BuilderNode();

                    var builder = new Builder(expressions);
                    build(builder);
                    builder.apply(nextNode);

                    node.children.push(nextNode);
                };

                this.plan.push(buildNode);

                return this;
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
    }

})(angular);