(function (angular, undefined) {
    
    angular.module('expression-builder')
        .provider('expressionBuilder', ExpressionBuilderProvider);
    
    ExpressionBuilderProvider.$inject = [];
        
	function ExpressionBuilderProvider () {
		var templates = [];

		return {
			register: function (type, property, template) {
				Builder.prototype[property] = function () {
                    
                    Object.create(type, {
                        
                    });
                }
			},
			$get: function () {
				return Builder;
			}
		}
	}
    
    function Builder () {
        this.plan = [];
    }
    
    Builder.prototype.apply = function (node) {
        this.plan.forEach(function (p) {
             p(node);
        });
    };
    
})(angular);