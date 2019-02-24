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
  const ast = parse(template.trim())
  const code = generate(ast)
  return {
    ast,
    render: makeFunction(code.render)
  }
}
