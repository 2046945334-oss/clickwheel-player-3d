# clickwheel-player-3d

用 three.js 做的转轮播放器外观：烤漆机身、封面屏幕、转轮手势、手绘涂鸦贴纸、两个能贴头像的耳机。

**在线示范**：<https://2046945334-oss.github.io/clickwheel-player-3d/>（手机打开效果最好）

这个库**只有外观和手势，不播放声音**。按键、转圈拖进度都通过回调交给你自己的播放器（`<audio>`、网页音乐 SDK、别的 App 都行），播放状态再用 `update()` 传回来显示在屏幕上。

## 能做什么

- 四种配色：青柠绿、樱花粉、奶白、墨黑，也可以传自己的颜色
- 屏幕：专辑封面、歌名、歌手、一句副标（比如当前歌词）、进度条、顶栏一行字、最多两个头像
- 转轮：上面 MENU、左右切歌、下面和中间按钮播放暂停
- 手指沿着转轮转圈拖进度，顺时针往后，松手才跳过去，拖的时候会轻轻震动
- 按住机身别的地方拖一下会跟着歪，松手弹回来，耳机线会被扯着晃
- 耳机和贴纸都可以关掉
- 读屏软件能用：容器里有看不见的「上一首 / 播放 / 下一首 / MENU」按钮
- 系统开了「减少动态效果」时自动关掉动画
- 只在画面有变化时才重画，不会一直占着 GPU

## 安装

还没发到 npm，先直接用这个仓库：

```bash
npm install three
npm install github:2046945334-oss/clickwheel-player-3d
```

或者把 `src/` 文件夹复制到你的项目里。需要 three.js 0.160 或更新的版本。

## 用法（纯 JS）

```html
<div id="player" style="width: 280px; aspect-ratio: 1.32 / 2.7"></div>
<audio id="audio" src="song.mp3"></audio>

<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
} }
</script>
<script type="module">
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createPlayer } from './src/index.js'

const audio = document.getElementById('audio')
const player = createPlayer(document.getElementById('player'), {
  THREE,
  RoomEnvironment,          // 可选，传了机身才有清漆反光
  skin: 'sakura',
  cover: 'cover.jpg',
  avatars: [{ src: 'a.jpg', label: 'A' }, { label: 'B' }],
  state: { title: '歌名', artist: '歌手' },
  onCommand: cmd => {
    if (cmd === 'play') audio.paused ? audio.play() : audio.pause()
    // 'prev'、'next' 换成你自己的切歌逻辑
  },
  onSeek: sec => { audio.currentTime = sec },
  onMenu: () => { /* 比如收起播放器 */ },
})

// 播放状态变了就告诉它
audio.addEventListener('timeupdate', () => player.update({ position: audio.currentTime, duration: audio.duration || 0 }))
audio.addEventListener('play', () => player.update({ playing: true }))
audio.addEventListener('pause', () => player.update({ playing: false }))
</script>
```

容器一定要有宽高。带耳机时宽高比 `1.32 : 2.7` 最合适，不要耳机时 `1.18 : 1.78`。播放器会跟着容器大小自动调整。

## 用法（React）

```jsx
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { ClickwheelPlayer } from 'clickwheel-player-3d/react'

<ClickwheelPlayer
  THREE={THREE}
  RoomEnvironment={RoomEnvironment}
  skin="lime"
  title={song.name}
  artist={song.artist}
  position={time}
  duration={song.duration}
  playing={playing}
  cover={song.cover}
  avatars={[{ label: 'A' }, { label: 'B' }]}
  onCommand={cmd => ...}
  onSeek={sec => ...}
  style={{ width: 280, aspectRatio: '1.32 / 2.7' }}
/>
```

在 Next.js 这类服务端渲染的框架里，要放在 client component 里，或者用 `dynamic(() => import(...), { ssr: false })` 加载。

## 选项

| 选项 | 说明 | 默认 |
| --- | --- | --- |
| `THREE` | 必填，`import * as THREE from 'three'` | |
| `RoomEnvironment` | 可选，three.js addons 里的环境光，机身反光用 | 无 |
| `skin` | `'lime'` `'sakura'` `'milk'` `'ink'`，或自定义配色对象 | `'lime'` |
| `earphones` | 显示耳机 | `true` |
| `stickers` | 贴涂鸦贴纸 | `true` |
| `menuLabel` | 转轮上方的字 | `'MENU'` |
| `intro` | 进场动画 | `true` |
| `reducedMotion` | 关掉动画；不传就跟着系统设置 | 跟系统 |
| `state` | 屏幕初始内容，字段同 `update()` | |
| `cover` | 封面图片网址 | 渐变加音符 |
| `avatars` | `[{ src, label }]`，最多两个。没有图或图加载失败时显示 `label` 的第一个字 | 不显示 |
| `onCommand(cmd)` | 按了转轮：`'prev'` `'next'` `'play'` | |
| `onMenu()` | 按了 MENU | |
| `onSeek(sec)` | 转圈拖进度后松手。不传就不能转圈拖进度 | |
| `onOutsideTap()` | 点到播放器外面的空白处 | |
| `onError(err)` | 浏览器不支持 WebGL，或 WebGL 中途断掉 | |

`createPlayer` 返回的对象：

- `update({ title, artist, lyric, position, duration, playing, topText })`：只传要改的字段，内容没变不会重画
- `setCover(src)`：换封面，传空字符串回到默认
- `setAvatars([{ src, label }])`：换头像
- `setCallbacks({ onCommand, ... })`：换回调
- `state`：当前屏幕上的内容
- `destroy()`：拆掉，释放 WebGL

## 自定义配色

```js
createPlayer(el, {
  THREE,
  skin: {
    body: '#7ab8ff',        // 机身
    wheel: '#ffffff',       // 转轮、耳机线
    center: '#7ab8ff',      // 中间按钮
    groove: '#4c86c9',      // 中间按钮上的螺旋
    label: '#9aa0a5',       // 转轮上的字和图示
    bezel: '#1b1d22',       // 屏幕黑边
    metal: 0.2, rough: 0.3, // 机身材质
    screen: { bg: '#f6f8fb', top: '#e3ebf5', ink: '#1d2633', sub: '#6b7584', accent: '#3a7bd5', bar: '#d8e1ec' },
    ink: ['#ff5a36', '#ffd23f', '#35c3e0', '#1b1b1b', '#ffffff', '#ff8fb1'], // 贴纸的六种颜色
  },
})
```

没写的字段用青柠绿补上。

## 注意

- **跨域图片**：封面和头像如果放在别的网站，那个网站要返回 `Access-Control-Allow-Origin`，不然 WebGL 不让画，会显示默认的渐变或字母。同站、`data:`、`blob:` 地址没有这个问题。
- **字体**：屏幕上的字用系统字体（苹方、Noto Sans CJK、微软雅黑），没有打包字体文件。
- **商标**：外观参考了经典的转轮 MP3 播放器。这个项目跟任何播放器厂商都没有关系。

## 测试

```bash
npm install
npm test
```

测试在 Node 里跑，不开 WebGL：检查配色、转轮分区、转圈换算、贴纸位置、耳机线，并用假的 canvas 搭起整个场景，确认屏幕上画的字对。

## 文件

- `src/config.js`：配色、尺寸、转轮分区、转圈换算、贴纸位置、耳机线，纯逻辑
- `src/textures.js`：用 canvas 2D 画屏幕、转轮、贴纸、耳塞
- `src/engine.js`：three.js 场景、动画、手势
- `src/index.js`：`createPlayer`
- `react/index.js`：`<ClickwheelPlayer />`
- `index.html`：示范页

## 许可

[CC BY-NC 4.0](LICENSE)：可以自由使用、修改、转载，要注明出处，**不能用于商业用途**。

用到的 [three.js](https://github.com/mrdoob/three.js) 是 MIT 许可，不在这个仓库里，需要自己安装。