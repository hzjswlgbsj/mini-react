const EFFECT_TAG_PLACEMENT = "PLACEMENT";
const EFFECT_TAG_UPDATE = "UPDATE";
const EFFECT_TAG_DELETION = "DELETION";

function createTextNode(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        const isTextNode =
          typeof child === "string" || typeof child === "number";
        return isTextNode ? createTextNode(child) : child;
      }),
    },
  };
}

function render(el, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [el],
    },
  };

  nextWorkOfUnit = wipRoot;
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

/** root一直在被更新，所以叫wipRoot */
let wipRoot = null;
let currentRoot = null;
let nextWorkOfUnit = null;
let deletions = [];
let wipFiber = null;
function workLoop(deadline) {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit = preFormWorkOfUnit(nextWorkOfUnit);

    // 优化：本次workLoop的当前节点被更新，那他的兄弟节点肯定就不需要更新，减少计算将nextWorkOfUnit置空跳出循环
    if (wipRoot?.sibling?.type === nextWorkOfUnit?.type) {
      nextWorkOfUnit = null;
    }
    shouldYield = deadline.timeRemaining() < 1;
  }

  // nextWorkOfUnit 没有值的时候说明已经遍历结束了
  if (!nextWorkOfUnit && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

function commitRoot() {
  deletions.forEach(commitDeletion);
  commitWork(wipRoot.child);
  commitEffectHooks();
  currentRoot = wipRoot;
  wipRoot = null;
  deletions = [];
}

function commitEffectHooks() {
  function run(fiber) {
    if (!fiber) return;

    // 判断是初始化还是因为depends变化，更新
    // 如果Fiber节点上不存在alternate属性，则说明是初始化,否则是更新了
    if (!fiber.alternate) {
      // init
      fiber.effectHooks?.forEach((effectHook) => {
        effectHook.cleanup = effectHook.callback();
      });
    } else {
      // update
      // 对比依赖
      fiber.effectHooks?.forEach((newEffectHook, index) => {
        if (newEffectHook.dependencies.length) {
          const oldEffectHook = fiber.alternate?.effectHooks[index];
          const needUpdate = oldEffectHook?.dependencies.some(
            (oldDep, i) => oldDep !== newEffectHook?.dependencies[i]
          );
          needUpdate && (newEffectHook.cleanup = newEffectHook?.callback());
        }
      });
    }

    if (fiber.child) {
      run(fiber.child);
    }

    if (fiber.sibling) {
      run(fiber.sibling);
    }
  }

  function cleanup(fiber) {
    if (!fiber) return;
    // 去执行之前的节点，去执行之前节点的cleanup，cleanup的执行时机是useEffect执行完了后
    // 下一次再来执行的时候，所以当前正执行的Fiber，应该去执行之前一个Fiber的cleanup
    fiber.alternate?.effectHooks?.forEach((effectHook) => {
      // 当依赖是空数组的时候不需要执行cleanup
      if (effectHook.dependencies.length && effectHook.cleanup) {
        effectHook.cleanup();
      }
    });

    // 然后去执行孩子节点
    if (fiber.child) {
      cleanup(fiber.child);
    }

    // 然后去执行兄弟节点
    if (fiber.sibling) {
      cleanup(fiber.sibling);
    }
  }

  cleanup(wipRoot);
  run(wipRoot);
}

function commitDeletion(fiber) {
  if (fiber.dom) {
    let fiberParent = fiber.parent;
    while (!fiberParent.dom) {
      fiberParent = fiberParent.parent;
    }
    fiberParent.dom.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child);
  }
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
      if (nextProps[key] !== prevProps[key]) {
        // 新的有老的没有，add
        // 处理事件
        if (key.startsWith("on")) {
          const eventName = key.toLowerCase().substring(2);
          dom.removeEventListener(eventName, prevProps[key]);
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

/**
 * 调和Fiber结构，包含更新时候做的diff
 * @param {*} fiber Fiber链表节点
 * @param {*} children 子DOM或者子组件
 */
function reconcileChildren(fiber, children) {
  let oldFiber = fiber.alternate?.child;
  let prevChild = null;

  children.forEach((child, index) => {
    // 对比新老 fiber
    // 对比策略：1. 新老 fiber 的 type 是否相同，相同就是更新，不同就是创建 2. 新老 fiber 的 props 是否相同
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
      if (child) {
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

      // delete
      if (oldFiber) {
        // 收集需要被删除的fiber
        deletions.push(oldFiber);
      }
    }

    // 这里还有一个情况需要处理：就是当前节点不止一个child，那下一次遍历的时候 oldFiber 指针就要更新为当前 oldFiber 节点的 sibling
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // 第一个节点应该绑定到当前节点的child上
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      // 其他节点应该绑定到当前节点的 sibling 上
      prevChild.sibling = newFiber;
    }

    // 更新指针
    if (newFiber) {
      prevChild = newFiber;
    }
  });

  // 新的比老的短，那么老的删除不全，所以需要继续收集老的长出来的那一段
  while (oldFiber) {
    deletions.push(oldFiber);
    oldFiber = oldFiber.sibling;
  }
}

function updateFunctionComponent(fiber) {
  // 初始化stateHooks
  stateHooks = [];
  stateHookIndex = 0;

  // 初始化effectHooks
  effectHooks = [];

  // 保存一下当前更新的Fiber
  wipFiber = fiber;

  const children = [fiber.type(fiber.props)];

  // 3. 转换链表，设置好指针
  reconcileChildren(fiber, children);
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
  reconcileChildren(fiber, children);
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
  // 拿到此时需要被更新的Fiber
  let currentFiber = wipFiber;

  // 使用闭包将 wipRoot 保存起来，这样就得到了一个update的方法，包含了当前需要更新的fiber
  return () => {
    wipRoot = {
      ...currentFiber,
      alternate: currentFiber, // 指向上一个旧的 fiber 节点
    };

    nextWorkOfUnit = wipRoot;
  };
}

let stateHooks;
let stateHookIndex;
function useState(initialState) {
  let currentFiber = wipFiber;
  const oldHook = currentFiber.alternate?.stateHooks[stateHookIndex];
  const stateHook = {
    state: oldHook ? oldHook.state : initialState,
    queue: oldHook ? oldHook.queue : [],
  };

  // 批量执行action
  stateHook.queue.forEach((action) => {
    stateHook.state = action(stateHook.state);
  });

  // 执行完后清空
  stateHook.queue = [];

  // 保存stateHook
  stateHookIndex++;
  stateHooks.push(stateHook);
  currentFiber.stateHooks = stateHooks;

  function setState(action) {
    // 提前检测一下state是否改变，如果没有改变的话就不再继续
    const eagerState =
      typeof action === "function" ? action(stateHook.state) : action;
    if (eagerState === stateHook.state) {
      return;
    }

    // 将更新state任务收集起来
    stateHook.queue.push(typeof action === "function" ? action : () => action);

    wipRoot = {
      ...currentFiber,
      alternate: currentFiber,
    };

    nextWorkOfUnit = wipRoot;
  }

  return [stateHook.state, setState];
}

let effectHooks;
/**
 * useEffect的渲染时机应该是 React 完成对 DOM 的渲染后，并且浏览器完成绘制之前，也就是commitWork之后
 * @param {() => () => void} callback 回调函数，可以返回一个cleanup函数
 * @param {*} dependencies 依赖项
 */
function useEffect(callback, dependencies) {
  const effectHook = {
    callback,
    dependencies,
    cleanup: null,
  };

  effectHooks.push(effectHook);
  wipFiber.effectHooks = effectHooks;
}

const React = {
  useEffect,
  useState,
  update,
  createElement,
  render,
};

export default React;
