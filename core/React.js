function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextNode(child)
      ),
    },
  };
}

function createTextNode(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function render(el, container) {
  const dom =
    el.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(el.type);

  // 处理 id class
  // 要判断一下是不是children，我们只处理真正的属性
  const isProperty = (key) => key !== "children";
  Object.keys(el.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = el.props[name];
    });

  // 递归处理 children
  el.props.children.forEach((child) => render(child, dom));

  // 将 dom 添加到 container
  container.appendChild(dom);
}

// 实现Fiber
// 因为我们之前实现render的时候是直接递归一直寻找然后不断createNode，这样会导致渲染任务太多，渲染卡顿，所以我们需要实现像react的fiber。

// 如何做到每次只渲染几个节点？在下次执行的时候依然从之前的位置开始执行？
// 把树转化为链表结构，这个链表结构的节点包含的数据为：
// - child（孩子节点）
// - sibling（兄弟节点）
// - parent（父节点，用于拿到回溯找到当前节点的叔叔节点）

// 使用深度优先遍历不断地返回下一个节点，我们不用先将整棵树先转化为链表再执行渲染任务，而是当前节点任务执行完后，直接就返回下一个节点的渲染任务。
// 然后使用 requestIdleCallback API来检测是否能继续执行任务，如果不能继续执行任务，则会在下一次空闲时执行。

const React = {
  createElement,
  render,
};

export default React;
