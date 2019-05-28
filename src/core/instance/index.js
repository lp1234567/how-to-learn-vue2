import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { warn } from '../util/index'
import Watcher from '../observer/watcher'
import patch from 'core/vdom/patch'
import compile from 'compiler/index'
import {
  noop
} from '../util/index'

const idToTemplate = (id) => {
  const el = query(id)
  return el && el.innerHTML
}

function Vue (options) {
  if (!(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 向vue实例混入init方法
initMixin(Vue)
// 暴露一些方法给vue实例 $set $delete $watch
stateMixin(Vue)
// 向vue实例混入，执行vnode render函数时，需要的方法 例如：_c _v _s _l 等
renderMixin(Vue)


/**
 * 更新dom树的方法
 * 更新其实是一个diff的过程，涉及diff算法
 *
 */
Vue.prototype._update = function () {
  const vm = this
  const vnode = vm._render()
  const prevVnode = vm._vnode

  vm._vnode = vnode

  if (!prevVnode) {
    patch(vm.$el, vnode)
  } else {
    patch(prevVnode, vnode)
  }
}


/**
 * vue的挂载方法，将vue实例挂载在哪个el上
 * 
 * 挂载前：（这部分内容其实查看一下vue的生命周期就很容易理解）
 * 1、要有template字符串模板（先取内部html，没有的话再取外部）
 * 2、编辑template字符串生成vnode render函数 _render
 * 3、 patch vnode 然后挂载到el上
 *
 * @param {*} el dom节点，会将vue挂载到这个节点上
 * @returns
 */
Vue.prototype.$mount = function (el) {
  // vm._vnode = document.getElementById(el)

  el = el ? query(el) : undefined

  const vm = this
  const options = vm.$options
  let template = options.template
  let _render = vm._render
  if (!_render) { //还没有render时，要去编译模板
    if (template) { // 直接有字符串模板传进来
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') { // template = "#id"
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (!template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        warn('invalid template option:' + template, this)
        return this
      }
    } else if (el) { // 从dom节点里边取
      template = getOuterHTML(el)
    }

    if (template) {
      const compiled = compile(template)

      vm._render = () => {
        return compiled.render.call(vm);
      }
    }
  }

  options.template = template
  return mountComponent(this, el)
}

/**
 * Query an element selector if it's not an element already.
 */
function query (el) {
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    if (!selected) {
      warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}


/**
 * 挂载
 *
 * @param {*} vm
 * @param {*} el
 * @returns
 */
function mountComponent (vm, el) {
  vm.$el = el

  // 之后只要有 vm.a = "xxx" 的set动作，自然就会触发到整条依赖链的watcher，最后触发updateComponent的调用
  let updateComponent = () => {
    vm._update()
  }

  // vm 作为 root 开始收集依赖
  // 通过vm._update()调用，开始收集整个vm组件内部的依赖
  vm._watcher = new Watcher(vm, updateComponent, noop)

  return vm
}


/**
 * vue实例内部没有template模板的时候，从el外部查找看看有没有html
 *
 * @param {*} el 挂载的dom节点
 * @returns
 */
function getOuterHTML (el) {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}


export default Vue
