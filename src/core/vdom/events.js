import { warn } from 'core/util/index'


let target

// 添加监听事件
function add (event, handler, once, capture) {
  if (once) {
    const oldHandler = handler
    const _target = target // save current target element in closure
    handler = function (ev) {
      const res = arguments.length === 1
        ? oldHandler(ev)
        : oldHandler.apply(null, arguments)

      if (res !== null) {
        // 执行一次之后就remove掉
        // 但是有个例外，例如存在keydown等keyCode的修饰符时：
        // oldHandler = function($event) { if($event.keyCode != 13) return null; blabla($event); }
        // 在没触发过的话真正的handler:blabla前，我们不应该移除监听，于是加多一个null的返回值干扰流程
        remove(event, handler, capture, _target)
      }
    }
  }
  target.addEventListener(event, handler, capture)
}

// 移除监听事件
function remove (event, handler, capture, _target) {
  (_target || target).removeEventListener(event, handler, capture)
}

// 包装一下事件的回调函数
function createFnInvoker (fns) {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      for (let i = 0; i < fns.length; i++) {
        fns[i].apply(null, arguments)
      }
    } else {
      // return handler return value for single handlers
      return fns.apply(null, arguments)
    }
  }
  invoker.fns = fns
  return invoker
}

// name = "~!click"  其中 ~表示once ， !表示capture
const normalizeEvent = (name) => {
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture
  }
}

// 更新监听事件
function updateListeners (on, oldOn) {
  // on 为 on: { "click": clickme } 
  let name, cur, old, event
  for (name in on) {
    // listenerCb
    cur = on[name]
    // old listenerCb
    old = oldOn[name]
    event = normalizeEvent(name)
    if (!cur) { // v-on:click="clickme" 找不到clickme同名方法定义
      warn(
        `Invalid handler for event "${event.name}": got ` + String(cur)
      )
    } else if (!old) { // 旧vnode没有on此事件
      if (!cur.fns) { // 下次 patch 时就不用重新再包装 listenerCb
        cur = on[name] = createFnInvoker(cur)
      }
      add(event.name, cur, event.once, event.capture)
    } else if (cur !== old) { // 旧vnode和新vnode都有on同个事件，并且listenerCb指向不同，只要把当前的listenerCb指向cur的即可
      old.fns = cur
      on[name] = old
    }
  }

  // 把旧的监听移除掉
  for (name in oldOn) {
    if (!on[name]) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}

export function updateDOMListeners (oldVnode, vnode) {
  // 新老node任意一个不在，跳出更新
  if (!oldVnode.data.on && !vnode.data.on) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  // target标识了当前处理的节点
  target = vnode.elm
  // 更新监听事件，on 为 on: { "click": clickme } 
  updateListeners(on, oldOn)
}