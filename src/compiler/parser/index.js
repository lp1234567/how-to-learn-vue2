import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { warn } from 'core/util/debug'
import { mustUseProp } from 'core/vdom/attrs'

export const dirRE = /^v-|^@|^:/
export const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/
export const forIteratorRE = /\((\{[^}]*\}|[^,]*),([^,]*)(?:,([^,]*))?\)/
const bindRE = /^:|^v-bind:/
const onRE = /^@|^v-on:/
const modifierRE = /\.[^.]+/g


/**
 * 遍历属性数组得到属性map
 *
 * @param {*} attrs 属性数组
 * @returns
 */
function makeAttrsMap (attrs){
  const map = {}
  for (let i = 0, l = attrs.length; i < l; i++) {
    map[attrs[i].name] = attrs[i].value
  }
  return map
}

function decode (html) {
  let decoder = document.createElement('div')
  decoder.innerHTML = html
  return decoder.textContent
}

const isPreTag = (tag) => tag === 'pre'

/**
 * 把HTML字符串转成AST结构
 * ast = { attrsList, attrsMap, children, parent, tag, type=1 } // 非文本节点
 * ast = { text, type=3 } // 文本节点
 *
 * 在AST树 ： if else-if else的多个token节点会合成一个节点，if节点里边包含 [{exp:'if判断条件', block:<if的ast节点>}, {exp:'else-if判断条件', block:<else-if的ast节点>, {block:<else的ast节点>}]
 *
 * @export
 * @param {*} template
 * @returns
 */
export function parse (template) {
  const stack = []
  let root // ast的根节点
  let currentParent // 当前节点的父亲节点
  let inPre = false


  function endPre (element) {
    if (isPreTag(element.tag)) {
      inPre = false
    }
  }


/**
 * 解析template字符串，以root为ast跟根节点，生成语法树
 *
 * @export
 * @param {*} template html字符串
 * @returns
 */
  parseHTML(template, {
    warn,
    start (tag, attrs, unary) {
      // type 1：普通tag节点 2：表达式节点 3：文本节点
      // ast节点
      const element = {
        type: 1,
        tag,
        attrsList: attrs,
        attrsMap: makeAttrsMap(attrs),
        parent: currentParent,
        children: []
      }

      if (isPreTag(element.tag)) {
        inPre = true
      }

      element.plain = !element.key && !attrs.length
      // 处理v-for指令
      processFor(element)
      // 处理v-if指令
      processIf(element)
      // 处理key关键字
      processKey(element)
      // 处理:class属性语法
      processClass(element)
      // 处理属性
      processAttrs(element)

      if (!root) {
        root = element
      } else if (!stack.length) {
        if (root.if && (element.elseif || element.else)) {
          // root = <div v-if=""></div><div v-else-if=""></div><div v-else></div>
          // 允许root是由if else-if else组织的多节点
          addIfCondition(root, {
            exp: element.elseif,
            block: element
          })
        } else {// 否则根节点只能有一个，给出warn
          warn(
            `Component template should contain exactly one root element. ` +
            `If you are using v-if on multiple elements, ` +
            `use v-else-if to chain them instead.`
          )
        }
      }
      if (currentParent) {
        if (element.elseif || element.else) { // 处理非root节点的 else-if else
          processIfConditions(element, currentParent)
        } else {
          currentParent.children.push(element)
          element.parent = currentParent
        }
      }
      if (!unary) { // 如果不是单标签，就压入堆栈
        currentParent = element
        stack.push(element)
      } else { // 闭合一下pre标签
        endPre(element)
      }
    },
    end () {
      // 从堆栈里面取出上一个处理的节点
      const element = stack[stack.length - 1]
      const lastNode = element.children[element.children.length - 1]
      if (lastNode && lastNode.type === 3 && lastNode.text === ' ' && !inPre) { // 把孩子节点中最后一个空白节点删掉
        element.children.pop()
      }

      stack.length -= 1
      currentParent = stack[stack.length - 1]
      endPre(element)
    },
    chars (text) {
      if (!currentParent) {
        if (text === template) { // 传入的template不应该是纯文本节点
          warn(
            'Component template requires a root element, rather than just text.'
          )
        }
        return
      }
      const children = currentParent.children
      text = inPre || text.trim() ?
        decode(text) :
        (children.length ? ' ' : '') // 如果文本节点为多个空格，同时所在的父亲节点含有其他孩子节点，那么要生成一个单空格的文本节点
      if (text) {
        let expression
        if (text !== ' ' && (expression = parseText(text))) { // 表达式节点
          children.push({
            type: 2,
            expression,
            text
          })
        } else { // 文本节点
          children.push({
            type: 3,
            text
          })
        }
      }
    }
  })
  return root
}
// 处理key关键字
function processKey (el) {
  const exp = getBindingAttr(el, 'key')
  if (exp) {
    el.key = exp
  }
}
// 处理v-for指令
function processFor (el) {
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const inMatch = exp.match(forAliasRE)
    // v-for="item in list"             =>     ["item in list", "item", "list"]
    // v-for="(item, index) in list"    =>     ["(item, index) in list", "(item, index)", "list"]
    // v-for="(value, key, index) in object"    =>     ["(value, key, index) in object", "(value, key, index)", "object"]

    if (!inMatch) { // v-for语法有错误的时候，提示编译错误
      warn(
        `Invalid v-for expression: ${exp}`
      )
      return
    }
    el.for = inMatch[2].trim()
    const alias = inMatch[1].trim()
    const iteratorMatch = alias.match(forIteratorRE)
    if (iteratorMatch) { // v-for="(item, index) in list"  或者 // v-for="(value, key, index) in object"
      el.alias = iteratorMatch[1].trim()
      el.iterator1 = iteratorMatch[2].trim()
      if (iteratorMatch[3]) {
        el.iterator2 = iteratorMatch[3].trim()
      }
    } else {
      el.alias = alias // alias = "item"
    }
  }
}
// 处理v-if相关指令
function processIf (el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}

// v-else-if v-else要找到上一个if节点
// 把当前的表达式插入到
function processIfConditions (el, parent) {
  const prev = findPrevElement(parent.children)
  if (prev && prev.if) { //上个节点是if节点，把表达式插入到该节点的ifCondition队列去
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    })
  } else { // 找不到上一个if节点，需要报错
    warn(
      `v-${el.elseif ? ('else-if="' + el.elseif + '"') : 'else'} ` +
      `used on element <${el.tag}> without corresponding v-if.`
    )
  }
}

function findPrevElement (children) {
  let i = children.length
  while (i--) {
    if (children[i].type === 1) {
      return children[i]
    } else {
      if (children[i].text !== ' ') { // 在if和else几点中间不要有其他非空白的文本节点
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) ` +
          `will be ignored.`
        )
      }
      children.pop()
    }
  }
}

function addIfCondition (el, condition) {
  if (!el.ifConditions) {
    el.ifConditions = []
  }
  el.ifConditions.push(condition)
}

/**
 * 处理节点的:class属性
 *
 * @param {*} el ast节点
 */
function processClass (el) {
  const staticClass = getAndRemoveAttr(el, 'class')
  if (staticClass) {
    el.staticClass = JSON.stringify(staticClass)
  }
  const classBinding = getBindingAttr(el, 'class', false /* getStatic */)
  if (classBinding) {
    el.classBinding = classBinding
  }
}

/**
 * 处理节点的属性
 *
 * @param {*} el ast节点
 */
function processAttrs (el) {
  // 获取节点的属性列表
  const list = el.attrsList
  let i, l, name, value, modifiers
  for (i = 0, l = list.length; i < l; i++) {
    name  = list[i].name
    value = list[i].value
    
    // v-xxx :xxx @ 开头的属性
    if (dirRE.test(name)) { 
      // mark element as dynamic 该属性为动态属性
      el.hasBindings = true
      // modifiers 修饰符，解析动态属性中的修饰符,例如 :name.sync=""
      modifiers = parseModifiers(name)
      if (modifiers) {
        name = name.replace(modifierRE, '')
      }

      if (bindRE.test(name)) { // :xxx 或者 v-bind:xxx
        name = name.replace(bindRE, '')

        // 判断参数是不是html标签自带的属性 例如option标签的select属性就是自带的
        if (mustUseProp(el.tag, el.attrsMap.type, name)) {
          addProp(el, name, value)
        } else {
          addAttr(el, name, value)
        }
      } else if (onRE.test(name)) { 
        // v-on开头  v-on:click="xxxx"
        name = name.replace(onRE, '') // name='click'  value="xxxx"
        // 添加事件处理信息
        addHandler(el, name, value, modifiers)
      }
    } else {
      // 非动态的一些属性，直接作为属性添加到节点上
      addAttr(el, name, JSON.stringify(value))
    }
  }
}

/**
 * 添加参数
 *
 * @param {*} el ast节点
 * @param {*} name 参数名称
 * @param {*} value 参数值
 */
function addProp (el, name, value) {
  (el.props || (el.props = [])).push({ name, value })
}

/**
 * 添加属性
 *
 * @param {*} el ast节点
 * @param {*} name 属性名称
 * @param {*} value 属性值
 */
function addAttr (el, name, value) {
  (el.attrs || (el.attrs = [])).push({ name, value })
}

/**
 * 
 *
 * @param {*} el
 * @param {*} name 如key
 * @param {*} getStatic
 * @returns
 */
function getBindingAttr (el, name, getStatic) {
  // 获取动态的某个属性的值 例如:  :key="${index}"
  const dynamicValue = getAndRemoveAttr(el, ':' + name)
  if (dynamicValue != null) {
    return dynamicValue
  } else if (getStatic !== false) {
    // 获取静态的某个属性的值 例如:   key="1"
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      return JSON.stringify(staticValue)
    }
  }
}

/**
 * 获取ast节点上的某个属性的值，并从节点上删除这个属性
 *
 * @param {*} el ast节点
 * @param {*} name 属性名
 * @returns 某个属性的值
 */
function getAndRemoveAttr (el, name) {
  let val
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  return val
}

/**
 * 添加事件处理信息
 *
 * @param {*} el  ast节点
 * @param {*} name event 的名称 例如：click
 * @param {*} value envent 的值（事件触发时需要执行的函数） 例如：handleclick
 */
function addHandler (el, name, value, modifiers) {
  // check capture modifier
  if (modifiers && modifiers.capture) {
    delete modifiers.capture
    name = '!' + name // mark the event as captured
  }
  if (modifiers && modifiers.once) {
    delete modifiers.once
    name = '~' + name // mark the event as once
  }

  let events
  // 获取当前节点的事件
  events = el.events || (el.events = {})
  const newHandler = { value, modifiers }
  const handlers = events[name]
  /* istanbul ignore if */
  // 将事件记录在当前节点的events属性里面
  if (Array.isArray(handlers)) {
    handlers.push(newHandler)
  } else if (handlers) {
    events[name] = [handlers, newHandler]
  } else {
    events[name] = newHandler
  }
}

/**
 * 解析动态属性中的修饰符
 *
 * @param {*} name 例如 :name.sync.stop
 * @returns {} {sync:true, stop:true,}
 */
function parseModifiers (name) {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}