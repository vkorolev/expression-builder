module.exports = Node; 

function Node(id) {
   this.id = id;
   this.expressions = [];
   this.children = [];
}