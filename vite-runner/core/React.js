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
  nextWorkOfUnit = {
    dom: container,
    props: {
      children: [el],
    },
  };

  console.log(111111);
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

let nextWorkOfUnit = null;
function workLoop(deadline) {
  console.log(2222222, deadline.timeRemaining(), nextWorkOfUnit);

  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit = preFormWorkOfUnit(nextWorkOfUnit);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!shouldYield) {
    requestIdleCallback(workLoop);
  }
}

function preFormWorkOfUnit(work) {
  console.log(333333333333333, work);
  // 1. 创建dom
  if (!work.dom) {
    const dom = (work.dom =
      work.type === "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(work.type));
    work.parent.dom.appendChild(dom);

    // 2. 处理props
    const isProperty = (key) => key !== "children";
    Object.keys(work.props)
      .filter(isProperty)
      .forEach((name) => {
        dom[name] = work.props[name];
      });
  }

  // 3. 转换链表，设置好指针
  const children = work.props.children;
  let preChild = null;
  // a. 首先遍历所有的孩子节点
  children.forEach((child, index) => {
    const newWork = {
      type: child.type,
      props: child.props,
      child: null,
      sibling: null,
      dom: null,
      parent: work,
    };
    // 第一个节点应该绑定到当前节点的child上
    if (index === 0) {
      work.dom = newWork;
    } else {
      // 其他节点应该绑定到当前节点的 sibling 上
      preChild.sibling = newWork;
    }
    preChild = newWork;
  });
  // 4. 返回下一个要执行的任务
  if (work.child) {
    console.log(4444444444);
    return work.child;
  }

  if (work.sibling) {
    console.log(55555555555);

    return work.sibling;
  }

  console.log(6666666666, work.parent);

  return work.parent?.sibling;
}

requestIdleCallback(workLoop);
const React = {
  createElement,
  render,
};

export default React;
