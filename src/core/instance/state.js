import Watcher from '../observer/watcher'

import {
  set,
  del,
  observe
} from '../observer/index'

import {
  warn,
  hasOwn,
  isReserved,
  isPlainObject,
  bind,
  noop
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  };
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}


/**
 * 初始化vue实例的时候，先初始话vue实例中的data（数据）和methods（方法），并监听数据，
 *
 * @export
 * @param {*} vm vue实例的this
 */
export function initState (vm) {
  vm._watchers = []
  const opts = vm.$options
  // 方法
  if (opts.methods) initMethods(vm, opts.methods)
  // 数据model
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, vm)
  }
  // 初始化计算属性
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch) initWatch(vm, opts.watch)
}


/**
 * 初始化数据:代理vm._data里面的数据
 * 遍历vm._data，监听数据的get和set
 *
 * @param {*} vm
 */
function initData (vm) {
  let data = vm.$options.data
  data = vm._data = data || {} // 把 data 所有属性代理到 vm._data 上

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
  // 遍历vm._data，监听数据的get和set
  observe(data, this)
}


/**
 * 初始化计算属性
 *
 * @param {*} vm
 * @param {*} computed
 */
function initComputed (vm, computed) {
  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}


/**
 * 定义计算属性，然后监听这个属性
 *
 * @param {*} target
 * @param {*} key
 * @param {*} userDef
 */
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


/**
 * 初始化方法，其实就是做了代理绑定到vm上
 *
 * @param {*} vm
 * @param {*} methods
 */
function initMethods (vm, methods) {
  for (const key in methods) {
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
  }
}

/**
 * 初始化监听函数，创建watcher
 *
 * @param {*} vm
 * @param {*} watch
 */
function initWatch (vm, watch) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

/**
 * 创建watcher,
 *
 * @param {*} vm
 * @param {*} key
 * @param {*} handler
 */
function createWatcher (vm, key, handler) {
  let options
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  vm.$watch(key, handler, options)
}

/**
 * 混入状态相关方法？ 其实就是暴露了一些外部可以访问的方法
 *
 * @export
 * @param {*} Vue
 */
export function stateMixin (Vue) {
  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (expOrFn, cb, options) {
    const vm = this
    options = options || {}
    options.user = true // 标记用户主动监听的Watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
    return function unwatchFn () { // 返回取消watch的接口
      watcher.teardown()
    }
  }
}