import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

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
// 混入vue生命周期函数
lifecycleMixin(Vue)

export default Vue
