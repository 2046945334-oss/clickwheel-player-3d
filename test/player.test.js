// test/player.test.js — 纯逻辑 + 不开 WebGL 搭场景、画萤幕
// 跑法：npm install && npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import * as C from '../src/config.js'
import * as X from '../src/textures.js'
import { makeScene, FZ } from '../src/engine.js'

test('配色：四种，栏位齐全；不认识的 id 用预设；自订物件缺的栏位会补', () => {
  assert.equal(C.SKINS.length, 4)
  for (const s of C.SKINS) {
    for (const k of ['body', 'wheel', 'label', 'center', 'bezel', 'groove']) assert.match(s[k], /^#[0-9a-f]{6}$/i, s.id + ' ' + k)
    for (const k of ['bg', 'top', 'ink', 'sub', 'accent', 'bar']) assert.match(s.screen[k], /^#[0-9a-f]{6}$/i, s.id + ' screen.' + k)
    assert.ok(s.ink.length >= 6)
  }
  assert.equal(C.skinOf('nope').id, C.DEFAULT_SKIN)
  assert.equal(C.skinOf(undefined).id, C.DEFAULT_SKIN)
  const custom = C.skinOf({ body: '#123456', screen: { accent: '#ff0000' } })
  assert.equal(custom.body, '#123456')
  assert.equal(custom.screen.accent, '#ff0000')
  assert.equal(custom.screen.bg, C.skinOf('lime').screen.bg, '萤幕其他颜色用预设补上')
  assert.equal(custom.ink.length, 6)
})

test('转轮分区：上 menu、左 prev、右 next、下 play、正中 center、圈外 null', () => {
  const r = C.WHEEL.r * 0.7
  assert.equal(C.wheelZone(0, r), 'menu')
  assert.equal(C.wheelZone(-r, 0), 'prev')
  assert.equal(C.wheelZone(r, 0), 'next')
  assert.equal(C.wheelZone(0, -r), 'play')
  assert.equal(C.wheelZone(0, 0), 'center')
  assert.equal(C.wheelZone(C.WHEEL.r * 1.2, 0), null)
})

test('转圈：顺时针为正、跨过 ±π 不跳；拖进度夹在 0 和歌长之间', () => {
  assert.ok(Math.abs(C.angDelta(Math.PI / 2, 0) - Math.PI / 2) < 1e-9)
  assert.ok(C.angDelta(0, Math.PI / 2) < 0)
  assert.ok(Math.abs(C.angDelta(Math.PI - 0.1, -Math.PI + 0.1) + 0.2) < 1e-9)
  assert.equal(C.secPerTurn(240), 60)
  assert.equal(C.secPerTurn(30), 20)
  assert.equal(C.secPerTurn(1000), 90)
  assert.equal(C.scrubTo(100, 2 * Math.PI, 240), 160)
  assert.equal(C.scrubTo(10, -4 * Math.PI, 240), 0)
  assert.equal(C.scrubTo(230, 4 * Math.PI, 240), 240)
  assert.equal(C.fmt(250), '4:10')
  assert.equal(C.fmt(-3), '0:00')
})

test('贴纸：都在机身正面平的那块里，不压萤幕、不压转轮', () => {
  const inCap = (x, y, r) => {
    const { hw, hh, r: cr } = C.CAP
    if (Math.abs(x) + r > hw || Math.abs(y) + r > hh) return false
    const cx = hw - cr, cy = hh - cr, ax = Math.abs(x), ay = Math.abs(y)
    if (ax > cx && ay > cy) return Math.hypot(ax - cx, ay - cy) + r <= cr
    return true
  }
  const sw = C.SCREEN.w / 2, sh = C.SCREEN.h / 2
  for (const k of C.STICKERS) {
    const r = k.s / 2
    assert.ok(inCap(k.x, k.y, r), k.kind + ' 贴到倒角上')
    const dx = Math.max(0, Math.abs(k.x) - sw), dy = Math.max(0, Math.abs(k.y - C.SCREEN.y) - sh)
    assert.ok(Math.hypot(dx, dy) >= r - 1e-9, k.kind + ' 压到萤幕')
    assert.ok(Math.hypot(k.x, k.y - C.WHEEL.y) >= C.WHEEL.r + r, k.kind + ' 压到转轮')
    assert.ok(X.STICKER_KINDS.includes(k.kind), k.kind + ' 没有画法')
  }
})

test('耳机：线接在耳塞柄底下；耳塞在机身上面、不互相压；镜头装得下', () => {
  const E = C.EAR
  assert.ok(Math.abs(E.trunk[0][1] - (C.POD.h / 2 + E.plugH)) < 1e-9)
  for (let i = 0; i < 2; i++) {
    const br = C.branchPts(i)
    assert.deepEqual(br[br.length - 1], C.budStemBottom(E.buds[i]))
    assert.deepEqual(br[0], E.trunk[E.trunk.length - 1])
  }
  const [a, b] = E.buds
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r + 0.05)
  const V = C.VIEW
  for (const u of E.buds) { assert.ok(Math.abs(u.x) + u.r < V.w / 2); assert.ok(u.y + u.r < V.cy + V.h / 2) }
  assert.ok(-C.POD.h / 2 > V.cy - V.h / 2)
  const B = C.VIEW_BODY
  assert.ok(C.POD.h / 2 < B.cy + B.h / 2 && -C.POD.h / 2 > B.cy - B.h / 2 && C.POD.w / 2 < B.w / 2, '不要耳机时镜头装得下机身')
})

test('头像字母：取第一个字，英文转大写，空的不写', () => {
  assert.equal(X.initialOf('alice'), 'A')
  assert.equal(X.initialOf('  小明'), '小')
  assert.equal(X.initialOf(''), '')
  assert.equal(X.initialOf(null), '')
})

// 假的 canvas 2D：记下画了哪些字、清了几次
function fakeDoc() {
  const drawn = []
  let clears = 0
  const ctx = new Proxy({ font: '30px x' }, {
    get(t, k) {
      if (k in t) return t[k]
      if (k === 'measureText') return s => ({ width: String(s).length * parseFloat(t.font.match(/(\d+(\.\d+)?)px/)[1]) * 0.6 })
      if (k === 'fillText') return s => drawn.push(String(s))
      if (k === 'clearRect') return () => { clears++ }
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} })
      return () => {}
    },
    set(t, k, v) { t[k] = v; return true },
  })
  return { drawn, clears: () => clears, doc: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) } }
}

test('场景：每种配色都搭得起来，尺寸对，耳塞不跟著机身歪', () => {
  for (const s of C.SKINS) {
    const { doc } = fakeDoc()
    const M = makeScene(THREE, { skin: s.id, doc })
    assert.ok(M.body && M.screen && M.face && M.cFace && M.shadow)
    assert.equal(M.stickers.length, C.STICKERS.length)
    assert.ok(M.ear.parent === M.root && M.buds.length === 2 && M.plugG.parent === M.model)
    M.body.geometry.computeBoundingBox()
    const b = M.body.geometry.boundingBox
    assert.ok(Math.abs(b.max.x - b.min.x - C.POD.w) < 1e-6 && Math.abs(b.max.y - b.min.y - C.POD.h) < 1e-6 && Math.abs(b.max.z - b.min.z - C.POD.d) < 1e-6)
    assert.ok(Math.abs(b.max.z - FZ) < 1e-6)
    const bud0 = M.buds[0].getWorldPosition(new THREE.Vector3()).toArray()
    const head = () => Array.from(M.cables[0].geometry.attributes.position.array.slice(0, 3))
    const p0 = head()
    M.model.rotation.set(0.35, -0.3, 0); M.syncCable(1)
    const p1 = head()
    assert.ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) > 0.05, '机身歪了，线头跟著挪')
    M.root.updateMatrixWorld(true)
    assert.deepEqual(M.buds[0].getWorldPosition(new THREE.Vector3()).toArray(), bud0, '耳塞不动')
    let n = 0; M.model.rotation.set(0, 0, 0); while (M.syncCable(0.2) && n < 400) n++
    assert.ok(n < 400, '线弹回来会停')
    M.dispose()
  }
})

test('场景：可以不要耳机、不要贴纸，镜头范围跟著换', () => {
  const { doc } = fakeDoc()
  const M = makeScene(THREE, { skin: 'ink', doc, earphones: false, stickers: false })
  assert.equal(M.ear, null)
  assert.equal(M.buds.length, 0)
  assert.equal(M.stickers.length, 0)
  assert.equal(M.syncCable(0.2), false)
  assert.deepEqual(M.view, C.VIEW_BODY)
  M.dispose()
})

test('萤幕：画出歌名、歌手、歌词、顶栏文字、时间；同一秒不重画；拖进度显示拖到哪', () => {
  const f = fakeDoc()
  const M = makeScene(THREE, { skin: 'lime', doc: f.doc })
  f.drawn.length = 0
  assert.equal(M.setState({ title: '示范曲目', artist: '某位歌手', lyric: '一句歌词', position: 19, duration: 250, playing: true, topText: '顶栏的字', avatars: [{ label: 'a' }, { label: 'b' }] }), true)
  for (const t of ['示范曲目', '某位歌手', '一句歌词', '顶栏的字', '0:19', '-3:51', 'A', 'B']) assert.ok(f.drawn.includes(t), '萤幕上没有 ' + t)
  assert.ok(!f.drawn.includes('池') && !f.drawn.includes('我'), '没有写死的名字')
  const n = f.clears()
  assert.equal(M.setState({ position: 19.4 }), false, '同一秒不重画')
  assert.equal(f.clears(), n)
  assert.equal(M.setState({ position: 20.1 }), true)
  f.drawn.length = 0
  M.setState({ scrub: 80 })
  assert.ok(f.drawn.includes('1:20'))
  assert.equal(M.setImg(0, { width: 64, height: 64 }), true, '头像载入后重画')
  M.dispose()
})

test('萤幕：没有头像、没有顶栏文字时不画多余的字；没歌名显示未知歌曲', () => {
  const f = fakeDoc()
  const M = makeScene(THREE, { skin: 'milk', doc: f.doc, menuLabel: '选单' })
  assert.ok(f.drawn.includes('选单'), '转轮上方的字可以换')
  f.drawn.length = 0
  M.redraw(true)
  assert.ok(f.drawn.includes('未知歌曲'))
  assert.ok(f.drawn.includes('--:--'), '没有歌长时显示 --:--')
  assert.equal(f.drawn.filter(s => s.length === 1).length, 0, '没有头像就没有字母')
  M.dispose()
})