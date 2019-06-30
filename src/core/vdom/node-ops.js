// 真实的dom操作
// 创建dom标签节点
export function createElement (tagName) {
  return document.createElement(tagName)
}

// 创建文本节点
export function createTextNode (text) {
  return document.createTextNode(text)
}

// 创建注释节点
export function createComment (text) {
  return document.createComment(text)
}

// 在某节点之前插入dom节点
export function insertBefore (parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode)
}

// 移除孩子节点
export function removeChild (node, child) {
  node.removeChild(child)
}

// 添加孩子节点
export function appendChild (node, child) {
  node.appendChild(child)
}

// 获取父节点
export function parentNode (node) {
  return node.parentNode
}

// 返回下一个相邻节点
export function nextSibling (node) {
  return node.nextSibling
}

// 返回tag名称
export function tagName (node) {
  return node.tagName
}

// 设置节点text
export function setTextContent (node, text) {
  node.textContent = text
}

// 设置节点属性
export function setAttribute (node, key, val) {
  node.setAttribute(key, val)
}
