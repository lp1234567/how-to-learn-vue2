import { initState } from './state'
import { initLifecycle, callHook } from './lifecycle'

let uid = 0

/**
 * 初始化vue的mixin 暴露出给vue实例
 *
 * @export
 * @param {*} Vue
 */
export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    const vm = this
    const template = options.template

    vm._uid = uid++

    // a flag to avoid this being observed
    // 避免 vm对象 被注入订阅
    vm._isVue = true

    vm.$options = options

    // 初始化生命周期
    initLifecycle(vm)
    // 回调beforeCreate钩子
    callHook(vm, 'beforeCreate')  // see: https://cn.vuejs.org/v2/api/?#beforeCreate
    // 初始化状态，data methods等
    initState(vm)
    // 回调钩子
    callHook(vm, 'created')       // see: https://cn.vuejs.org/v2/api/?#created

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }

}