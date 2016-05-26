describe('traverse service', function () {
    var traverse;

    beforeEach(module('expression-builder'));

    beforeEach(inject(function (_expressionBuilderTraverse_) {
        traverse = _expressionBuilderTraverse_;
    }));

    it('should inject traverse service', function () {
        expect(traverse).to.be.ok;
    });

    it('should have depth method', function () {
        expect(traverse).to.respondTo('depth');
    });

    describe('depth-first traverse', function () {
        it('should return a function', function () {
            var node = {};
            expect(traverse.depth(node)).to.be.a('Function');
        });

        it('should traverse in right order', function () {
            var node = {
                id: 0,
                line: {expressions: [{expressions: [{}]}]},
                children: [
                    {
                        id: 1,
                        line: {expressions: [{expressions: [{}]}]},
                        children: [
                            {
                                id: 2,
                                line: {expressions: [{expressions: [{}]}]},
                                children: []
                            },
                            {
                                id: 3,
                                line: {expressions: [{expressions: [{}]}]},
                                children: []
                            }
                        ]
                    },
                    {
                        id: 4,
                        line: {expressions: [{expressions: [{}]}]},
                        children: []
                    }
                ]
            };
            var result = traverse.depth(node)(function (memo, e, line, node) {
                memo.push(node.id);
                return memo;
            }, []);
            expect(result).to.be.deep.equal([0, 1, 2, 3, 4]);
        });

        it('should skip nodes without expressions', function () {
            var node = {
                id: 0,
                line: {expressions: [{expressions: []}]},
                children: [
                    {
                        id: 1,
                        line: {expressions: [{expressions: []}]},
                        children: [
                            {
                                id: 2,
                                line: {expressions: [{expressions: [{}]}]},
                                children: []
                            },
                            {
                                id: 3,
                                line: {expressions: [{expressions: []}]},
                                children: []
                            }
                        ]
                    },
                    {
                        id: 4,
                        line: {expressions: [{expressions: [{}]}]},
                        children: []
                    }
                ]
            };
            var result = traverse.depth(node)(function (memo, e, line, node) {
                memo.push(node.id);
                return memo;
            }, []);
            expect(result).to.be.deep.equal([2, 4]);
        });
    });
});