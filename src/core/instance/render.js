import { _toString } from '../util/index'
import { createTextVNode, createElementVNode, createEmptyVNode } from '../vdom/vnode'

import { renderList } from './render-helpers/render-list'
import { checkKeyCodes } from './render-helpers/check-keycodes'

export function renderMixin (Vue) {
  // 创建Dom节点
  Vue.prototype._c = createElementVNode
  // 创建文本节点
  Vue.prototype._v = createTextVNode
  // 解析文本节点中的变量
  Vue.prototype._s = _toString
  // 渲染list v-for
  Vue.prototype._l = renderList
  Vue.prototype._k = checkKeyCodes
  // 创建空节点
  Vue.prototype._e = createEmptyVNode
}