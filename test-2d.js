import createContext from '2d-context'
import createLoop from 'canvas-fit-loop'
import vec from 'gl-vec2'
import arc from 'arc-to'
import curve from 'adaptive-bezier-curve'
import pack from 'array-pack-2d'
import createNormalizer from './'

const paths = [
  { path: [[40, 40], [80, 30], [80, 60], [125, 33], [115, 100], [50, 120], [70, 150]] },
  { path: circle(130, 120, 25), closed: true },
  { path: curve([40, 40], [70, 100], [120, 20], [200, 40], 5) },
  { path: [ [0, 122], [0, 190], [90, 190] ], closed: true },
  { path: [ [50, 50], [100, 50], [100, 100], [50, 100] ], closed: true },
  { path: [[30, -60], [80, 10]] },
]
const pathLengths = paths.map(p => p.path.length)
const pathMaxLength = Math.max.apply(null, pathLengths)
const normalizer = createNormalizer(pathMaxLength)

const ctx = createContext()
const app = createLoop(ctx.canvas, {
  scale: window.devicePixelRatio
})

app.on('resize', () => {
  const width = app.shape[0]
  const height = app.shape[1]

  render(ctx, width, height)
})

render(ctx, window.innerWidth, window.innerHeight)
document.body.appendChild(ctx.canvas)

function circle (x, y, radius) {
  // in this case arc-to closes itself by making the
  // last point equal to the first. we want to fix this
  // to pass in a more typical polyline and get the right normals
  const c = arc(x, y, radius, 0, Math.PI*2, false)
  c.pop()
  return c
}

function render (ctx, width, height) {
  const scale = app.scale
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, width, height)

  // draw each path with a bit of an offset
  ctx.save()
  paths.forEach((data, i) => {
    const path = data.path
    const closed = !!data.closed
    const packedPath = pack(path)

    const cols = 3
    const x = i % cols
    const y = ~~(i / cols)

    ctx.translate(x * 50, y * 50)
    draw(ctx, packedPath, closed)
  })
  ctx.restore()
}

function draw (ctx, path, closed) {
  const thick = 25
  const halfThick = thick / 2
  const psize = 4

  const pos = [0, 0]
  const norm = [0, 0]
  const tmp = [0, 0]

  const top = []
  const bot = []

  // get the normals of the path
  const normals = normalizer.normals
  const miters = normalizer.miters
  normalizer.update(path, closed)

  // draw our expanded vertices for each point in the path
  ctx.globalAlpha = 0.15
  for (let i = 0, il = path.length / 2; i < il; i++) {
    const ix = i * 2
    const iy = ix + 1

    vec.set(pos, path[ix], path[iy])
    vec.set(norm, normals[ix], normals[iy])
    const len = miters[i]

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
    const len = miters[0]

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
