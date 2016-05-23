var utils = require('../services/utils');

module.exports = function (angular) {
    angular.module('expression-builder').directive('ebClass', Directive);

    Directive.$inject = ['$parse'];

    function Directive($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var getter = $parse(attr.ebClass),
                    classes = [];

                var unbind = scope.$watch(evaluateClassObject, function (value) {
                    var classesToRemove = classes.join(' ');

                    classes = [];

                    setClasses(value);

                    element.removeClass(classesToRemove);
                    element.addClass(classes.join(' '));
                }, true);

                scope.$on('$destroy', function () {
                    unbind();
                });

                function evaluateClassObject() {
                    var classObject = getter(scope),
                        result = {};

                    if (!classObject) {
                        return result;
                    }

                    var keys = Object.keys(classObject),
                        length = keys.length;

                    for (var i = 0; i < length; i++) {
                        var key = keys[i],
                            value = classObject[key];
                        if (utils.isFunction(value)) {
                            result[key] = value(scope.node);
                        } else {
                            result[key] = value;
                        }
                    }

                    return result;
                }

                function setClasses(object) {
                    var keys = Object.keys(object),
                        length = keys.length;

                    for (var i = 0; i < length; i++) {
                        var key = keys[i];
                        if (object[key]) {
                            classes.push(key);
                        }
                    }
                }
            }
        }
    }
};