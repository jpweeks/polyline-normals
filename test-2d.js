var createContext = require('2d-context')
var createLoop = require('canvas-fit-loop')
var vec = require('gl-vec2')
var arc = require('arc-to')
var curve = require('adaptive-bezier-curve')
var pack = require('array-pack-2d')
var createNormalizer = require('./')

var paths = [
  { path: [[40, 40], [80, 30], [80, 60], [125, 33], [115, 100], [50, 120], [70, 150]] },
  { path: circle(130, 120, 25), closed: true },
  { path: curve([40, 40], [70, 100], [120, 20], [200, 40], 5) },
  { path: [ [0, 122], [0, 190], [90, 190] ], closed: true },
  { path: [ [50, 50], [100, 50], [100, 100], [50, 100] ], closed: true },
  { path: [[30, -60], [80, 10]] },
]

var ctx = createContext()
var app = createLoop(ctx.canvas, {
  scale: window.devicePixelRatio
})

app.on('resize', function () {
  var width = app.shape[0]
  var height = app.shape[1]

  render(ctx, width, height)
})

render(ctx, window.innerWidth, window.innerHeight)
document.body.appendChild(ctx.canvas)

function circle (x, y, radius) {
  // in this case arc-to closes itself by making the
  // last point equal to the first. we want to fix this
  // to pass in a more typical polyline and get the right normals
  var c = arc(x, y, radius, 0, Math.PI*2, false)
  c.pop()
  return c
}

function render (ctx, width, height) {
  var scale = app.scale
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, width, height)

  // draw each path with a bit of an offset
  ctx.save()
  paths.forEach(function (data, i) {
    var path = data.path
    var closed = !!data.closed
    var packedPath = pack(path)

    var cols = 3
    var x = i % cols
    var y = ~~(i / cols)

    ctx.translate(x * 50, y * 50)
    draw(ctx, packedPath, closed)
  })
  ctx.restore()
}

function draw (ctx, path, closed) {
  var thick = 25
  var halfThick = thick / 2
  var psize = 4

  var pos = [0, 0]
  var norm = [0, 0]
  var tmp = [0, 0]
  var len, ix, iy

  var top = []
  var bot = []

  // get the normals of the path
  var pointCount = path.length / 2
  var normalizer = createNormalizer(pointCount)
  var normals = normalizer.normals
  var miters = normalizer.miters
  normalizer.update(path, closed)

  // draw our expanded vertices for each point in the path
  ctx.globalAlpha = 0.15
  for (var i = 0, il = path.length / 2; i < il; i++) {
    ix = i * 2
    iy = ix + 1

    vec.set(pos, path[ix], path[iy])
    vec.set(norm, normals[ix], normals[iy])
    len = miters[i]

    ctx.fillStyle = 'black'
    ctx.fillRect(pos[0] - psize / 2, pos[1] - psize / 2, psize, psize)

    ctx.beginPath()
    vec.scaleAndAdd(tmp, pos, norm, len * halfThick)
    ctx.moveTo(pos[0], pos[1])
    ctx.lineTo(tmp[0], tmp[1])
    top.push(tmp.slice())

    vec.scaleAndAdd(tmp, pos, norm, -len * halfThick)
    ctx.moveTo(pos[0], pos[1])
    ctx.lineTo(tmp[0], tmp[1])
    ctx.stroke()
    bot.push(tmp.slice())
  }

  if (closed) {
    vec.set(pos, path[0], path[1])
    vec.set(norm, normals[0], normals[1])
    len = miters[0]

    vec.scaleAndAdd(tmp, pos, norm, len * halfThick)
    top.push(tmp.slice())

    vec.scaleAndAdd(tmp, pos, norm, -len * halfThick)
    bot.push(tmp.slice())
  }

  // edges
  ctx.globalAlpha = 1
  ctx.beginPath()
  top.forEach(function(t) {
    ctx.lineTo(t[0], t[1])
  })
  ctx.stroke()

  ctx.beginPath()
  bot.forEach(function(t) {
    ctx.lineTo(t[0], t[1])
  })
  ctx.stroke()
}
