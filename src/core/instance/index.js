import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { lifecycleMixin } from "./lifecycle";
import { warn } from "../util/index";

function Vue(options) {
  if (!(this instanceof Vue)) {
    warn("Vue is a constructor and should be called with the `new` keyword");
  }
  this._init(options);
}

// 向vue构建函数混入初始化方法 _init函数，new Vue实例的时候会执行_init函数
// _init函数会初始化Vue生命周期、调用钩子函数等
initMixin(Vue);
// 暴露一些方法给vue实例 $set $delete $watch
stateMixin(Vue);
// 向vue构建函数混入，执行vnode render函数时，需要的方法 例如：_c _v _s _l 等
renderMixin(Vue);
// 混入Vue的生命周期函数（Vue构造函数本真的私有函数，$开头）,例如 $destroy 函数，当实例销毁时，执行 $destroy 函数，$destroy 函数内部会调用用户的desroy回调
lifecycleMixin(Vue);

export default Vue;
