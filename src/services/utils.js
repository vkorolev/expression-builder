module.exports = {
   indexOf: function (array, predicate) {
      for (var i = 0, length = array.length; i < length; i++) {
         if (predicate(array[i], i)) {
            return i;
         }
      }
      return -1;
   },
   asArray: function (args) {
      return Array.prototype.slice.call(args);
   },
   clone: function (object) {
      var result = {},
          keys = Object.keys(object);
      for(var i = 0, length = keys.length; i < length; i++) {
         var key = keys[i];
         result[key] = object[key]
      }

      return result;
   }
};