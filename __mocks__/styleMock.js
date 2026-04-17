// CSS 模块模拟
module.exports = new Proxy(
  {},
  {
    get: function (target, prop) {
      return prop
    },
  }
)