var util = require('polyline-miter-util')

module.exports = function createBuilder (size) {
  var cur = [0, 0]
  var last = [0, 0]
  var next = [0, 0]

  var curNormal = [0, 0]
  var lineA = [0, 0]
  var lineB = [0, 0]
  var tangent = [0, 0]
  var miter = [0, 0]

  var normals = new Float32Array(size * 2)
  var miters = new Float32Array(size)
  var normalIndex, miterIndex;

  function reset () {
    normalIndex = 0
    miterIndex = 0
  }

  function addNext(normal, length) {
    normals[normalIndex++] = normal[0]
    normals[normalIndex++] = normal[1]
    miters[miterIndex++] = length
  }

  function computeSegment (points, i, total) {
    var hasNext = i < total - 1;
    var aix = i * 2
    var aiy = aix + 1
    var bix = (i - 1) * 2
    var biy = bix + 1

    cur[0] = points[aix]
    cur[1] = points[aiy]
    last[0] = points[bix]
    last[1] = points[biy]

    if (hasNext) {
      cix = (i + 1) * 2
      ciy = cix + 1
      next[0] = points[cix]
      next[1] = points[ciy]
    }

    util.direction(lineA, cur, last)
    util.normal(curNormal, lineA)

    if (i === 1) //add initial normals
      addNext(curNormal, 1)

    if (!next) { //no miter, simple segment
      util.normal(curNormal, lineA) //reset normal
      addNext(curNormal, 1)
    } else { //miter with last
      //get unit dir of next line
      util.direction(lineB, next, cur)

      //stores tangent & miter
      var miterLen = util.computeMiter(tangent, miter, lineA, lineB, 1)
      addNext(miter, miterLen)
    }
  }

  function update (points, closed) {
    reset()

    if (closed) {
      // points = points.slice()
      // points.push(points[0])
    }

    var total = points.length / 2
    for (var i = 1; i < total; i++) {
      computeSegment(points, i, total)
    }

    //if the polyline is a closed loop, clean up the last normal
    if (points.length > 2 && closed) {
      // var last2 = points[total-2]
      // var cur2 = points[0]
      // var next2 = points[1]

      // util.direction(lineA, cur2, last2)
      // util.direction(lineB, next2, cur2)
      // util.normal(curNormal, lineA)

      // var miterLen2 = util.computeMiter(tangent, miter, lineA, lineB, 1)
      // out[0][0] = miter.slice()
      // out[total-1][0] = miter.slice()
      // out[0][1] = miterLen2
      // out[total-1][1] = miterLen2
      // out.pop()
    }
  }

  return {
    normals,
    miters,
    update
  }
}
