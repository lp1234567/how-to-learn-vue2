import patch from 'core/vdom/patch'
import compile from 'compiler/index'
import generate from 'compiler/codegen/index'

import { _toString } from '../util/index'
import { createTextVNode, createElementVNode, createEmptyVNode, renderList } from '../vdom/vnode'

import {
  warn,
  hasOwn,
  isPlainObject,
} from '../util/index'

export default function Vue (options) {
  if (!(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this.$options = options
  this._init(options)
}

Vue.prototype._c = createElementVNode // 创建Dom节点
Vue.prototype._v = createTextVNode // 创建文本节点
Vue.prototype._s = _toString // 解析文本节点中的变量
Vue.prototype._l = renderList // 渲染list v-for
Vue.prototype._e = createEmptyVNode // 创建空节点
// 初始化 数据、VNode
Vue.prototype._init = function (options) {
  const vm = this
  const template = options.template

  this._initData(options.data)
  const compiled = compile(template)

  vm._render = () => {
    return compiled.render.call(vm);
  }
}
// 初始化数据
Vue.prototype._initData = function (data) {
  const vm = this
  if (!isPlainObject(data)) {
    data = {}
  }

  for (let key in data) {
    if (hasOwn(data, key)) {
      vm[key] = data[key]
    }
  }
}

// 更新VNode
Vue.prototype._update = function () {
  const vm = this
  const vnode = vm._render()
  const prevVnode = vm._vnode

  vm._vnode = vnode
  patch(prevVnode, vnode)
}

// 初始化数据并更新VNode
Vue.prototype.setData = function (data) {
  this._initData(data)
  this._update()
}

// 挂载当前vm到父元素上面
// 疑问vm._vnode是dom元素不是VNode
Vue.prototype.$mount = function (el) {
  const vm = this
  vm._vnode = document.getElementById(el)
  this._update()
}