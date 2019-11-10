

/**
 * 给vnode的elm节点更新属性参数
 *
 * @export
 * @param {*} oldVnode
 * @param {*} vnode
 */
export function updateDOMProps (oldVnode, vnode) {
  if (!oldVnode.data.domProps && !vnode.data.domProps) {
    return
  }
  let key, cur
  const elm = vnode.elm
  const oldProps = oldVnode.data.domProps || {}

  let props = vnode.data.domProps || {}

  for (key in oldProps) {
    if (props[key] == null) {
      elm[key] = ''
    }
  }
  for (key in props) {
    elm[key] = props[key]
  }
}
