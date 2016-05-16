module.exports = {
   indexOf: function (array, predicate) {
      for (var i = 0, length = array.length; i < length; i++) {
         if (predicate(array[i], i)) {
            return i;
         }
      }
      return -1;
   }
};