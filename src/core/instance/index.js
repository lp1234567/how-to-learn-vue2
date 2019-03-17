import patch from 'core/vdom/patch'
import compile from 'compiler/index'
import generate from 'compiler/codegen/index'

import { _toString } from '../util/index'
import { createTextVNode, createElementVNode, createEmptyVNode, renderList } from '../vdom/vnode'
import { observe } from '../observer/index'

import {
  warn,
  hasOwn,
  isReserved,
  isPlainObject,
  noop
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

  if (options.data) {
    this._initData()
  } else {
    observe(vm._data = {}, vm)
  }

  // 处理计算属性
  if (options.computed) initComputed(vm, options.computed)

  // 编译模板语法
  const compiled = compile(template)

  vm._render = () => {
    return compiled.render.call(vm);
  }
}
// 初始化数据
Vue.prototype._initData = function () {
  const vm = this
  let data = vm.$options.data
  data = vm._data = data || {} // 把 data 复制到 vm._data 上

  if (!isPlainObject(data)) {
    data = {}
  }
  const keys = Object.keys(data)
  const props = vm.$options.props
  let i = keys.length
  while (i--) {
    if (!isReserved(keys[i])) { // vm._xx vm.$xxx 都是vm的内部/外部方法，所以不能代理到data上
      proxy(vm, `_data`, keys[i]) // 把 vm.abc 代理到 vm._data.abc
    }
  }
  // 监听data对象
  observe(data, this)
}

// 更新方法会触发diff VNode 并更新到Dom树上
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


const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  };
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function initComputed(vm, computed) {
  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}

function defineComputed (target, key, userDef) {
  if (typeof userDef === 'function') { // computed传入function的话，不可写
    sharedPropertyDefinition.get = function () { return userDef.call(target) }
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get ? userDef.get : noop
    sharedPropertyDefinition.set = userDef.set ? userDef.set : noop
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
