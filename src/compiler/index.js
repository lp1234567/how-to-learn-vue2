import { parse } from './parser/index'
import { warn } from 'core/util/debug'
import { noop } from 'shared/util'
import { generate } from './codegen/index'
// generate函数产生的code经过makeFunction函数包装成可以调用的render函数
function makeFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}
// compile函数讲html字符串转换成html ast 并生成一个带有上下文环境的render函数
// 后续只需要在渲染 VNode 树阶段，render.call(vm) 即可。巧妙~

export default function compile (template) {
  // 生成抽象语法树
  const ast = parse(template.trim())
  // 生成vnode树
  const code = generate(ast)
  // 通过makeFunction函数，将code.render包装成可以获取上下文环境执行的环境
  // 例如：new Function("with(this){return " + code + "}")
  return {
    ast,
    render: makeFunction(code.render)
  }
}
