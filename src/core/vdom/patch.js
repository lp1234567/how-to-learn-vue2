// 真实的dom操作
import * as nodeOps from './node-ops'
// VNode类
import VNode from './vnode'
import { updateAttrs } from './attrs'
import { updateClass } from './class'
import { updateDOMProps } from './dom-props'
import { updateDOMListeners } from './events'

export const emptyNode = new VNode('', {}, [])

function isUndef (s) {
  return s == null
}

function isDef (s) {
  return s != null
}
// 判断两个VNode的key和tag是否一致
function sameVnode (vnode1, vnode2) {
  return (
    vnode1.key === vnode2.key &&
    vnode1.tag === vnode2.tag &&
    !vnode1.data === !vnode2.data
  )
}


/**
 * 遍历children的指定区间，然后其中vnode节点的key和index
 *
 * @param {*} children 子节点
 * @param {*} beginIdx 开始指针
 * @param {*} endIdx 结束指针
 * @returns
 */
function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

/**
 *清空dom节点的属性，并创建vnode节点
 *
 * @param {*} elm dom节点
 * @returns
 */
function emptyNodeAt (elm) {
  return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
}

/**
 * 删除某个dom节点
 *
 * @param {*} el dom节点
 */
function removeNode (el) {
  const parent = nodeOps.parentNode(el)
  if (parent) {
    nodeOps.removeChild(parent, el)
  }
}

/**
 * 创建真实的DOM 并将VNode节点上属性、参数、事件添加到dom节点上
 *
 * @param {*} vnode VNode
 * @param {*} parentElm 父dom节点
 * @param {*} refElm 参考dom节点
 */
function createElm (vnode, parentElm, refElm) {
  const children = vnode.children
  const tag = vnode.tag
  if (isDef(tag)) {
    // 创建当前VNode标签的dom节点，并绑定在elm属性上
    vnode.elm = nodeOps.createElement(tag)
    // 遍历vnode的子节点，创建dom节点，并绑定的子节点的elm属性上
    createChildren(vnode, children)

    // 给vnode的elm节点添加属性
    updateAttrs(emptyNode, vnode)
    // 给vnode的elm节点添加class属性
    updateClass(emptyNode, vnode)
    // 给vnode的elm节点添加参数
    updateDOMProps(emptyNode, vnode)
    // 给vnode的elm节点添加事件
    updateDOMListeners(emptyNode, vnode)

    // 遍历到底层的子节点后，开始将子dom节点instert到父dom节点中
    insert(parentElm, vnode.elm, refElm)
  } else { // 文本节点
    vnode.elm = nodeOps.createTextNode(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  }
}

/**
 * 通过 insert 函数，可以把一个 elm dom 对象，插入到 parent dom 上
 *
 * @param {*} parent 父节点
 * @param {*} elm 新节点
 * @param {*} ref 参考节点
 */
function insert (parent, elm, ref) {
  if (parent) {
    if (ref) {
      nodeOps.insertBefore(parent, elm, ref)
    } else {
      nodeOps.appendChild(parent, elm)
    }
  }
}

/**
 * 递归创建vnode孩子的dom节点
 *
 * @param {*} vnode
 * @param {*} children
 */
function createChildren (vnode, children) {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; ++i) {
      createElm(children[i], vnode.elm, null)
    }
  }
}

/**
 * 将VNodes的指定坐标区间的vndoe添加进父类dom节点中
 *
 * @param {*} parentElm 父dom节点
 * @param {*} refElm 参考dom节点
 * @param {*} vnodes 需要添加的vnodes
 * @param {*} startIdx 开始坐标
 * @param {*} endIdx 结束坐标
 */
function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    createElm(vnodes[startIdx], parentElm, refElm)
  }
}
// 删除VNodes 们 的dom节点
function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx]
    if (isDef(ch)) {
      removeNode(ch.elm)
    }
  }
}

/**
 * patch 更新VNode的子节点
 *
 * @param {*} parentElm 父dom节点
 * @param {*} oldCh 老vnode节点
 * @param {*} newCh 新vnode节点
 * @param {*} removeOnly 这个标识干嘛用的？
 */
function updateChildren (parentElm, oldCh, newCh, removeOnly) {
  // 分别给oldCh和newCh创建开始指针和末尾的指针
  let oldStartIdx = 0
  let newStartIdx = 0
  let oldEndIdx = oldCh.length - 1
  let oldStartVnode = oldCh[0]
  let oldEndVnode = oldCh[oldEndIdx]
  let newEndIdx = newCh.length - 1
  let newStartVnode = newCh[0]
  let newEndVnode = newCh[newEndIdx]
  let oldKeyToIdx, idxInOld, elmToMove, refElm

  const canMove = !removeOnly

  // 算法核心比较新老数组，优先移动位置，然后创建新节点。
  // 详情请看：https://github.com/raphealguo/how-to-learn-vue2-blob/blob/master/articles/1.1.md
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (isUndef(oldStartVnode)) {
    // 如果oldCh的开始指针位置不存在节点则oldStartIdx向右移位
      oldStartVnode = oldCh[++oldStartIdx]
    } else if (isUndef(oldEndVnode)) {
      // 如果oldCh的结尾指针位置不存在节点则oldEndIdx向左移位
      oldEndVnode = oldCh[--oldEndIdx]
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      // 如果oldCh和oldCh的开始指针节点相同，则更新该节点的dom节点信息
      // 并将oldStartIdx和newStartIdx左移位
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      // 与上面的情况类似
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // oldCh头部指针和newCH尾部指针相同的话，更新老指针的dom节点，并调到新的顺序里面
      patchVnode(oldStartVnode, newEndVnode)
      canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // 与上面情况类似
      patchVnode(oldEndVnode, newStartVnode)
      canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]
    } else {
      // 上面更新了newCh和oldCh中相同部分的节点

      // oldKeyToIdx 为oldCh中oldStartIdx和oldEndIdx区间里面的一个key的对象 
      // 例如：{key1:index1,key2:index2}
      if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)

      // 当前newStartVnode的key在oldCh中的index，也就是oldCh中同key的index
      idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : null
      if (isUndef(idxInOld)) { 
        // 当前节点在旧VNode里边找不到相同的key 
        // 则创建这个节点的dom元素
        createElm(newStartVnode, parentElm, oldStartVnode.elm)
        newStartVnode = newCh[++newStartIdx]
      } else {
        elmToMove = oldCh[idxInOld] // 找到同key的元素

        if (!elmToMove) {
          // 同key的元素不存在则报错，但是我没看懂为什么会报key重复这种错误
          warn(
            'It seems there are duplicate keys that is causing an update error. ' +
            'Make sure each v-for item has a unique key.'
          )
        }
        if (sameVnode(elmToMove, newStartVnode)) {
          patchVnode(elmToMove, newStartVnode) // 先patch这个节点
          oldCh[idxInOld] = undefined
          canMove && nodeOps.insertBefore(parentElm, newStartVnode.elm, oldStartVnode.elm) // 然后开始移动
          newStartVnode = newCh[++newStartIdx]
        } else {
          // 虽然是同个key，但是标签等不一致。同样不能复用
          createElm(newStartVnode, parentElm, oldStartVnode.elm)
          newStartVnode = newCh[++newStartIdx]
        }
      }
    }
  }
  if (oldStartIdx > oldEndIdx) {
    // newCh循环结束后，可以添加newCh中剩下的节点了
    refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
    addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx)
  } else if (newStartIdx > newEndIdx) {
    // newCh循环结束后，可以删除oldCh中剩下的节点了
    removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
  }
}

/**
 * 更新oldVnode的elm节点
 *
 * @param {*} oldVnode
 * @param {*} vnode
 * @param {*} removeOnly
 */
function patchVnode (oldVnode, vnode, removeOnly) {
  if (oldVnode === vnode) {
    return
  }
  // data是一个属性的对象 data = { attrs: 属性key-val }
  const data = vnode.data
  const hasData = isDef(data)
  // ？？？ 将vnode.elm = oldVnode.elm 没看懂
  const elm = vnode.elm = oldVnode.elm
  const oldCh = oldVnode.children
  const ch = vnode.children

  // 更新属性
  if (hasData) {
    // 更新属性
    updateAttrs(oldVnode, vnode)
    // 更新class
    updateClass(oldVnode, vnode)
    // 更新prop参数
    updateDOMProps(oldVnode, vnode)
    // 更新事件
    updateDOMListeners(oldVnode, vnode)
  }
  // vnode.text 没有值的时候，表明vnode不是文本节点
  if (isUndef(vnode.text)) {
    if (isDef(oldCh) && isDef(ch)) {
      // 新老子节点都在，且不相等的时候，递归更新子节点
      if (oldCh !== ch) updateChildren(elm, oldCh, ch, removeOnly)
    } else if (isDef(ch)) {
      // 如果ch存在，oldCh是文本，清空elm节点的文本，并将ch节点添加进elm里面去
      if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
      addVnodes(elm, null, ch, 0, ch.length - 1)
    } else if (isDef(oldCh)) {
      // 如果ch不存在，oldCh存在，表明需要删除elm中的老节点
      removeVnodes(elm, oldCh, 0, oldCh.length - 1)
    } else if (isDef(oldVnode.text)) {
      nodeOps.setTextContent(elm, '')
    }
  } else if (oldVnode.text !== vnode.text) {
    // 新节点是文本节点，则更新文本节点内容
    nodeOps.setTextContent(elm, vnode.text)
  }
}

/**
 * 补丁 将VNode 的更新作用到对应的 DOM 树上
 *
 * @param {*} oldVnode 旧的vnode节点
 * @param {*} vnode 新的vnode的节点
 * @returns 返回更新过后的dom节点
 */
export default function patch (oldVnode, vnode) {
  if (!vnode) { // 销毁vm的时候 vnode=null
    return
  }
  let isInitialPatch = false

  const isRealElement = isDef(oldVnode.nodeType) // true：DOM
  // 不是dom节点，并且oldVnode, vnode根节点一直的情况
  if (!isRealElement && sameVnode(oldVnode, vnode)) {
    patchVnode(oldVnode, vnode)
  } else {
    if (isRealElement) {
      // 如果是DOM需要转换VNdoe，并在ele属性上赋值为真实dom
      oldVnode = emptyNodeAt(oldVnode)
    }
    //既然到了这里 就说明两个vnode的dom的根节点不一样
    //只是拿到原来的dom的容器parentElm，把当前vnode的所有dom生成进去
    //然后把以前的oldVnode全部移除掉
    const oldElm = oldVnode.elm
    const parentElm = nodeOps.parentNode(oldElm)
  
    // 把新的vnode的所有dom生成进去
    createElm(
      vnode,
      parentElm,
      nodeOps.nextSibling(oldElm)
    )

    if (parentElm !== null) {
      // 删除oldVNode的dom节点
      removeVnodes(parentElm, [oldVnode], 0, 0)
    }
  }

  return vnode.elm
}
