import {
  direction as polyDirection,
  normal as polyNormal,
  computeMiter
} from 'polyline-miter-util'

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

function copyToVec2 (vectorOut, bufferIn, i) {
  const ix = i * 2
  const iy = ix + 1
  vectorOut[0] = bufferIn[ix]
  vectorOut[1] = bufferIn[iy]
  return vectorOut
}

function copyFromVec2 (bufferOut, vectorIn, i) {
  const ix = i * 2
  const iy = ix + 1
  bufferOut[ix] = vectorIn[0]
  bufferOut[iy] = vectorIn[1]
  return bufferOut
}

export default function createNormalizer (maxSize) {
  const cur = createVec2()
  const prev = createVec2()
  const next = createVec2()
  const curNormal = createVec2()

  const lineA = createVec2()
  const lineB = createVec2()
  const tangent = createVec2()
  const miter = createVec2()
  const miterLengths = createVec2()

  const normals = createFloatBuffer(maxSize * 2)
  const miters = createFloatBuffer(maxSize)
  let normalIndex, miterIndex

  function resetBufferIndices () {
    normalIndex = 0
    miterIndex = 0
  }

  function addNext (normal, length) {
    normals[normalIndex++] = normal[0]
    normals[normalIndex++] = normal[1]
    miters[miterIndex++] = length
  }

  function computeSegment (points, size, ai, bi, ci) {
    const hasNext = ai < size - 1

    copyToVec2(cur, points, ai)
    copyToVec2(prev, points, bi)
    polyDirection(lineA, cur, prev)
    polyNormal(curNormal, lineA)

    if (ai === 1) {
      const miterLen = 1
      addNext(curNormal, miterLen)
    }

    if (hasNext) {
      copyToVec2(next, points, ci)
      polyDirection(lineB, next, cur)
      const miterLen = computeMiter(tangent, miter, lineA, lineB, 1)
      addNext(miter, miterLen)
    } else {
      const miterLen = 1
      addNext(curNormal, miterLen)
    }
  }

  function correctClosedNormal (points, size, ai, bi, ci) {
    copyToVec2(cur, points, ai)
    copyToVec2(prev, points, bi)
    copyToVec2(next, points, ci)

    polyDirection(lineA, cur, prev)
    polyDirection(lineB, next, cur)
    polyNormal(curNormal, lineA)

    const miterLen = computeMiter(tangent, miter, lineA, lineB, 1)
    copyFromVec2(normals, miter, ai)
    miters[ai] = miterLen
  }

  function update (points, closed) {
    const size = points.length / 2
    resetBufferIndices()

    for (let i = 1; i < size; i++) {
      computeSegment(points, size, i, i - 1, i + 1)
    }
    if (size > 2 && closed) {
      correctClosedNormal(points, size, 0, size - 1, 1)
      correctClosedNormal(points, size, size - 1, size - 2, 0)
    }
  }

  return {
    normals,
    miters,
    update
  }
}
