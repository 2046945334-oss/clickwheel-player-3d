// react/index.js — React 版：<ClickwheelPlayer />
// 用 React.createElement 写，不需要 JSX 编译。只在浏览器端用（Next.js 等 SSR 框架请放在 client component 里或关掉 SSR）
import { createElement, useEffect, useRef } from 'react'
import { createPlayer } from '../src/index.js'
export { SKINS, DEFAULT_SKIN, skinOf, VIEW, VIEW_BODY } from '../src/config.js'

/**
 * props：
 *   THREE、RoomEnvironment、skin、earphones、stickers、menuLabel、intro、reducedMotion  同 createPlayer，改了会重建
 *   title、artist、lyric、position、duration、playing、topText                            萤幕内容，改了只重画萤幕
 *   cover、avatars                                                                         封面网址、[{ src, label }]
 *   onCommand、onMenu、onSeek、onOutsideTap、onError                                         回呼，随时可换
 *   className、style                                                                       外层 div 的样式（记得给宽高）
 */
export function ClickwheelPlayer(props) {
  const ref = useRef(null), player = useRef(null)
  const cbs = useRef({}); cbs.current = { onCommand: props.onCommand, onMenu: props.onMenu, onSeek: props.onSeek, onOutsideTap: props.onOutsideTap, onError: props.onError }
  const state = { title: props.title || '', artist: props.artist || '', lyric: props.lyric || '', position: Number(props.position) || 0, duration: Number(props.duration) || 0, playing: !!props.playing, topText: props.topText || '' }
  const avaKey = JSON.stringify(props.avatars || [])
  useEffect(() => {
    if (!ref.current || !props.THREE) return
    let p = null
    try {
      p = createPlayer(ref.current, {
        THREE: props.THREE, RoomEnvironment: props.RoomEnvironment, skin: props.skin, earphones: props.earphones, stickers: props.stickers,
        menuLabel: props.menuLabel, intro: props.intro, reducedMotion: props.reducedMotion,
        state, cover: props.cover, avatars: props.avatars,
        onCommand: c => cbs.current.onCommand && cbs.current.onCommand(c),
        onMenu: () => cbs.current.onMenu && cbs.current.onMenu(),
        onSeek: s => cbs.current.onSeek && cbs.current.onSeek(s),
        onOutsideTap: () => cbs.current.onOutsideTap && cbs.current.onOutsideTap(),
        onError: err => cbs.current.onError && cbs.current.onError(err),
      })
    } catch (err) { return }
    player.current = p
    return () => { player.current = null; p.destroy() }
    // 外观相关的选项改了才重建；skin 传物件时请自己 useMemo，不然每次都会重建
  }, [props.THREE, props.RoomEnvironment, props.skin, props.earphones, props.stickers, props.menuLabel, props.intro, props.reducedMotion])
  useEffect(() => { if (player.current) player.current.update(state) })
  useEffect(() => { if (player.current) player.current.setCover(props.cover || '') }, [props.cover])
  useEffect(() => { if (player.current) player.current.setAvatars(props.avatars || []) }, [avaKey])
  return createElement('div', { ref, className: props.className, style: props.style })
}
export default ClickwheelPlayer