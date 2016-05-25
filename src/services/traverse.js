module.exports = TraverseService;

function TraverseService() {
    function visitLine(reduce, memo, node, line) {
        var groups = line.expressions,
            length = groups.length;

        for (var i = 0; i < length; i++) {
            memo = visitGroup(reduce, memo, node, line, groups[i]);
        }

        return memo;
    }

    function visitGroup(reduce, memo, node, line, group) {
        var expressions = group.expressions,
            length = expressions.length;

        for (var i = 0; i < length; i++) {
            memo = reduce(memo, expressions[i], line, node);
        }

        return memo;
    }

    this.depth = function (root) {
        var self = this;

        return function (reduce, memo) {
            memo = visitLine(reduce, memo, root, root.line);

            var children = root.children,
                length = children.length;

            for (var i = 0; i < length; i++) {
                memo = self.depth(children[i])(reduce, memo);
            }

            return memo;
        };
    };

}
