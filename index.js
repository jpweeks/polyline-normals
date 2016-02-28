var util = require('polyline-miter-util')

function createFloatBuffer (size) {
  return new Float32Array(size)
}

function createVec2 () {
  return new Float32Array(2)
}

function setVec2 (out, x, y) {
  out[0] = x
  out[1] = y
  return out
}

function copyToVec2 (out, buffer, i) {
  var ix = i * 2
  var iy = ix + 1
  out[0] = buffer[ix]
  out[1] = buffer[iy]
  return out
}

function copyFromVec2 (out, vec, i) {
  var ix = i * 2
  var iy = ix + 1
  out[ix] = vec[0]
  out[iy] = vec[1]
  return out
}

module.exports = function createBuilder (size) {
  var cur = createVec2()
  var prev = createVec2()
  var next = createVec2()
  var curNormal = createVec2()

  var lineA = createVec2()
  var lineB = createVec2()
  var tangent = createVec2()
  var miter = createVec2()
  var miterLengths = createVec2()

  var normals = createFloatBuffer(size * 2)
  var miters = createFloatBuffer(size * 2)
  var normalIndex, miterIndex

  function resetBufferIndices () {
    normalIndex = 0
    miterIndex = 0
  }

  function addNext (normal, length) {
    normals[normalIndex++] = normal[0]
    normals[normalIndex++] = normal[1]
    miters[miterIndex++] = length
    miters[miterIndex++] = -length
  }

  function computeSegment (points, ai, bi, ci) {
    var hasNext = ai < size - 1
    var miterLen

    copyToVec2(cur, points, ai)
    copyToVec2(prev, points, bi)
    util.direction(lineA, cur, prev)
    util.normal(curNormal, lineA)

    if (ai === 1) {
      miterLen = 1
      addNext(curNormal, miterLen)
    }

    if (hasNext) {
      copyToVec2(next, points, ci)
      util.direction(lineB, next, cur)
      miterLen = util.computeMiter(tangent, miter, lineA, lineB, 1)
      addNext(miter, miterLen)
    } else {
      miterLen = 1
      addNext(curNormal, miterLen)
    }
  }

  function correctClosedNormal (points, ai, bi, ci) {
    copyToVec2(cur, points, ai)
    copyToVec2(prev, points, bi)
    copyToVec2(next, points, ci)

    util.direction(lineA, cur, prev)
    util.direction(lineB, next, cur)
    util.normal(curNormal, lineA)

    var miterLen = util.computeMiter(tangent, miter, lineA, lineB, 1)
    setVec2(miterLengths, miterLen, -miterLen)
    copyFromVec2(normals, miter, ai)
    copyFromVec2(miters, miterLengths, ai)
  }

  function update (points, closed) {
    resetBufferIndices()

    for (var i = 1; i < size; i++) {
      computeSegment(points, i, i - 1, i + 1)
    }
    if (size > 2 && closed) {
      correctClosedNormal(points, 0, size - 1, 1)
      correctClosedNormal(points, size - 1, size - 2, 0)
    }
  }

  return {
    normals: normals,
    miters: miters,
    update: update
  }
}
