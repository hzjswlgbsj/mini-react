const EFFECT_TAG_PLACEMENT = "PLACEMENT";
const EFFECT_TAG_UPDATE = "UPDATE";
const EFFECT_TAG_DELETION = "DELETION";
const PLACEMENT = "PLACEMENT";
const UPDATE = "UPDATE";
const DELETION = "DELETION";

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

  root = nextWorkOfUnit;
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
let root = null;
let currentRoot = null;
function workLoop(deadline) {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit = preFormWorkOfUnit(nextWorkOfUnit);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // nextWorkOfUnit 没有值的时候说明已经遍历结束了
  if (!nextWorkOfUnit && root) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

function commitRoot() {
  commitWork(root.child);
  currentRoot = root;
  root = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  // 处理当前节点，这里注意 functionComponent 没有dom，这里需要处理
  // 处理方式就是继续往上找 functionComponent 的父节点的dom
  let fiberParent = fiber.parent;

  // 但是如果父节点不存在（比如函数组件套函数组件），那么就需要继续往上找
  while (!fiberParent.dom && fiberParent.parent) {
    fiberParent = fiberParent.parent;
  }

  // 根据fiber的 effectTag 来处理
  if (fiber.effectTag === EFFECT_TAG_PLACEMENT) {
    // 新增节点
    if (fiber.dom) {
      fiberParent.dom.append(fiber.dom);
    }
  } else if (fiber.effectTag === EFFECT_TAG_UPDATE) {
    // 更新节点
    updateProps(fiber.dom, fiber.props, fiber.alternate?.props);
  } else if (fiber.effectTag === EFFECT_TAG_DELETION) {
    // 删除节点
    // commitDeletion(fiberParent, fiber);
  }

  // 处理子节点
  commitWork(fiber.child);
  // 处理兄弟节点
  commitWork(fiber.sibling);
}

function createDom(type) {
  return type === "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(type);
}

// 我们要如何做到更新所有的 props 呢，那肯定是要 新旧VDOM 对比 ，那我们需要解决三个问题 ：
// 1. 如何得到新的 DOM 树
// 2. 如何找到老的节点
// 3. 如何 diff props

// 1. 如何得到新的 DOM 树？
// 回忆一下初始化的时候是怎么得到的 DOM 树，是执行 render 的时候得到的一个的DOM树，通过给 nextWorkOfUnit 不断地赋值，在每个 Fiber 的 dom 属性上就形成了 DOM 树。那么我们更新的时候想要生成 DOM 树的话可以直接执行 render 一样的逻辑，结束后然后把此时的 dom 和 props 保存下来就是当前新的 currentRoot 了。

// 2. 如何找到老的节点？
// 最简单粗暴的方法当然是直接遍历整个 Fiber 树，然后在节点的 dom 中找到要更新的节点。

// 但是，这个效率太低了，我改一个属性也得遍历一遍树，这明显太累了。其他办法那肯定是有的。

// 之前已经在老 root 提交完后将它保存下来了，放到了 currentRoot 中了，那么我们新创建的节点在转化成新链表的时候我们可以顺便添加一个属性 alternate，把这个属性的指针指向老的 Fiber 节点。

// 首先我们有老的结构的 root （保存在 currentRoot）中的，那我们新的 root 节点在第一步创建的时候可以将 alternate 指向 currentRoot。

// 下一步到新root的下一个节点的时候，我们需要找到老节点对应的下一个节点，这里老节点的下一个节点我们可以通过 currentRoot 的 child 找到。

// 中间我们会遇到 sibling ，新的 Fiber 树在创建的时候也会有 sibling 的关系，我们查找老的树的对应节点也去 sibling 属性找就是了。

// 就这样依次创建，依次将心树的每个节点的 alternate 属性正确的指向，到最后形成的新的 Fiber 树的每一个节点都带着与之对应的老的树的节点，这样下一步就可以为每个节点做 diff 逻辑了。

// 3. 如何 diff props

// 对比新旧 fiber 对比策略：
// 1. 新老 fiber 的 type 是否相同，相同就是更新，不同就是创建
// 2. 新老 fiber 的 props 是否相同
// 对比新旧 props 对比策略
// 1. 老的有新的没有，delete
// 2. 新的有老的没有，add
// 3. 老的有新的也有，update
// 2 3可以合并为3，因为老的没有就是undefined，直接判断是否相等的时候也会被判断为不相等，就会会添加进去

function updateProps(dom, nextProps, prevProps) {
  // const isProperty = (key) => key !== "children";
  // Object.keys(nextProps)
  //   .filter(isProperty)
  //   .forEach((name) => {
  //     // 处理事件
  //     if (name.startsWith("on")) {
  //       const eventName = name.toLowerCase().substring(2);
  //       dom.addEventListener(eventName, nextProps[name]);
  //     } else if (name === "className") {
  //       dom.setAttribute("class", nextProps[name]);
  //     } else {
  //       dom[name] = nextProps[name];
  //     }
  //   });

  // 1. 老的有新的没有，delete，遍历老的 props
  Object.keys(prevProps).forEach((key) => {
    if (key !== "children") {
      if (!(key in nextProps)) {
        // 老的有新的没有，delete
        dom.removeAttribute(key);
      }
    }
  });
  // 2. 新的有老的没有，add； 3. 老的有新的也有，update
  // 2 3可以合并为3，因为老的没有就是undefined，直接判断是否相等的时候也会被判断为不相等，就会会添加进去
  // 遍历新的 props
  Object.keys(nextProps).forEach((key) => {
    if (key !== "children") {
      if (prevProps[key] !== nextProps[key]) {
        // 新的有老的没有，add
        // 处理事件
        if (key.startsWith("on")) {
          const eventName = key.toLowerCase().substring(2);
          dom.removeEventListener(eventName, nextProps[key]);
          dom.addEventListener(eventName, nextProps[key]);
        } else if (key === "className") {
          dom.setAttribute("class", nextProps[key]);
        } else {
          dom[key] = nextProps[key];
        }
      }
    }
  });
}

function initChildren(fiber, children) {
  let oldFiber = fiber.alternate?.child;
  let preChild = null;
  children.forEach((child, index) => {
    // 对比新老 fiber
    // 对比策略：1. 新老 fiber 的 type 是否相同，想通就是更新，不同就是创建 2. 新老 fiber 的 props 是否相同
    const isSameType = oldFiber && oldFiber.type === child.type;
    let newFiber = null;
    if (isSameType) {
      // 新老 fiber type 相同，表示 update
      newFiber = {
        type: child.type,
        props: child.props,
        child: null,
        sibling: null,
        dom: oldFiber.dom,
        parent: fiber,
        effectTag: EFFECT_TAG_UPDATE, // 后续再commit work的时候需要区分，所以增加这个属性，PLACEMENT 表示更新
        alternate: oldFiber, // 若果是更新的话，这里指向老的 fiber 节点，用于后面做对比
      };
    } else {
      // create
      newFiber = {
        type: child.type,
        props: child.props,
        child: null,
        sibling: null,
        dom: null,
        parent: fiber,
        effectTag: EFFECT_TAG_PLACEMENT, // 后续再commit work的时候需要区分，所以增加这个属性，PLACEMENT 表示创建
      };
    }

    // 第一个节点应该绑定到当前节点的child上
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      // 其他节点应该绑定到当前节点的 sibling 上
      preChild.sibling = newFiber;
    }

    // 更新指针
    preChild = newFiber;

    // 这里还有一个情况需要处理：就是当前节点不止一个child，那下一次遍历的时候 oldFiber 指针就要更新为当前 oldFiber 节点的 sibling
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
  });
}

function updateFunctionComponent(fiber) {
  // 3. 转换链表，设置好指针
  const children = [fiber.type(fiber.props)];
  initChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    const dom = (fiber.dom = createDom(fiber.type));
    // 这里是每次都将当前dom往父容器添加，这样会导致渲染任务太多，渲染卡顿
    // 后面我们使用 统一提交的方式在链表处理完成后，再来敌对处理dom的添加
    // fiber.parent.dom.append(dom);

    // 2. 处理props
    updateProps(dom, fiber.props, {});
  }
  // 3. 转换链表，设置好指针
  const children = fiber.props.children;

  initChildren(fiber, children);
}

function preFormWorkOfUnit(fiber) {
  const isFunctionComponent = typeof fiber.type === "function";

  // 不是函数组件的时候才需要创建dom
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 4. 返回下一个要执行的任务
  if (fiber.child) {
    return fiber.child;
  }

  // 这里fiber.parent 有可能不存在，那么就需要继续往上找，直到找到 fiber.parent
  let nextFiber = fiber;
  while (nextFiber) {
    // 看看是否有兄弟节点，如果有就返回
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

requestIdleCallback(workLoop);

function update() {
  nextWorkOfUnit = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot, // 指向上一个旧的 fiber 节点
  };

  root = nextWorkOfUnit;
}

const React = {
  update,
  createElement,
  render,
};

export default React;
