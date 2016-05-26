describe('eb-expression directive', function () {
	var $compile,
		$rootScope,
		$templateCache;

	beforeEach(function () {
		module('expression-builder');

		inject(function (_$compile_, _$rootScope_, _$templateCache_) {
			$compile = _$compile_;
			$rootScope = _$rootScope_;
			$templateCache = _$templateCache_;
		});
	});

	afterEach(function () {
		$templateCache.removeAll();
	});

	it('should append correct markup', function () {
		$rootScope.expression = {
			template: 'template.html'
		};

		$templateCache.put('template.html', '<div>Hello</div>')

		var element = $compile('<div eb-expression="expression"></div>')($rootScope);
		$rootScope.$digest();
		expect(element.html()).to.be.equal('<div class="ng-scope">Hello</div>');
	});

	it('should bind expression value', function () {
		var scope = $rootScope.$new();

		scope.expression = {
			value: 'Hello',
			template: 'template.html'
		};

		$templateCache.put('template.html', '<div>{{ expression.value }}</div>');

		var element = $compile('<div eb-expression="expression"></div>')(scope);
		scope.$digest();
		expect(element.children()[0].className.split(' ')).to.be.deep.equal(['ng-binding', 'ng-scope']);
		expect(element.children()[0].innerText).to.be.equal('Hello');
	});

	it('should change watched value', function () {
		var scope = $rootScope.$new();
		scope.expression = {
			$watch: {
				value: function (newVal, oldVal) {
					this.watchedValue = newVal;
				}
			},
			watchedValue: 'Old',
			value: 'watched',
			template: 'template.html'
		};

		$templateCache.put('template.html', '<div>{{ expression.watchedValue }}</div>');

		var element = $compile('<div eb-expression="expression"></div>')(scope);
		scope.$digest();
		expect(element.children()[0].innerText).to.be.equal('watched');

		scope.expression.value = 'new watched';
		scope.$digest();
		expect(element.children()[0].innerText).to.be.equal('new watched');
	});

	it('should watch deep properties', function () {
		var scope = $rootScope.$new();
		scope.expression = {
			$watch: {
				'value.deep': function (newVal, oldVal) {
					this.watchedValue = newVal;
				}
			},
			watchedValue: 'watched',
			value: {
				deep: 'old'
			},
			template: 'template.html'
		};

		$templateCache.put('template.html', '<div>{{ expression.watchedValue }}</div>');

		var element = $compile('<div eb-expression="expression"></div>')(scope);
		scope.$digest();
		expect(element.children()[0].innerText).to.be.equal('old');

		scope.expression.value.deep = 'new';
		scope.$digest();
		expect(element.children()[0].innerText).to.be.equal('new');
	});
});