// v1
// const dom = document.createElement("div");
// dom.id = "app";
// document.querySelector("#app").appendChild(dom);

// const textNode = document.createTextNode("app");
// dom.appendChild(textNode);

// v2 react  -> vDom -> js object

// type
// children
// props

// const textEl = {
//   type: "TEXT_ELEMENT",
//   props: {
//     nodeValue: "app",
//     children: [],
//   },
// };
// const el = {
//   type: "div",
//   props: {
//     id: "app",
//     children: [textEl],
//   },
// };

// function createTextNode(text) {
//   return {
//     type: "TEXT_ELEMENT",
//     props: {
//       nodeValue: text,
//       children: [],
//     },
//   };
// }

// function createElement(type, props, ...children) {
//   return {
//     type,
//     props: {
//       ...props,
//       children: children.map((child) =>
//         typeof child === "object" ? child : createTextNode(child)
//       ),
//     },
//   };
// }

// const textEl = createTextNode("app");
// const App = createElement("div", { id: "app" }, "hi-", textEl);
// const dom = document.createElement(App.type);
// dom.id = App.props.id;
// document.querySelector("#app").appendChild(dom);

// const textNode = document.createTextNode("");
// textNode.nodeValue = textEl.props.nodeValue;
// dom.appendChild(textNode);

// 总结一下上面的代码，可以看出，虚拟DOM中的每一个节点都是一个对象，主要有两个属性，type和props。
// 而 dom 和 textNode 的创建过程都是三个步骤：
// - 第一步是创建节点
// - 第二步是创建文本节点
// - 第三步是将文本节点添加到节点中。
// 我们如何抽象这个过程就是下一步要做的事情。

// v3

// function render(el, container) {
//   const dom =
//     el.type === "TEXT_ELEMENT"
//       ? document.createTextNode("")
//       : document.createElement(el.type);

// 处理 id class
// 要判断一下是不是children，我们只处理真正的属性
//   const isProperty = (key) => key !== "children";
//   Object.keys(el.props)
//     .filter(isProperty)
//     .forEach((name) => {
//       dom[name] = el.props[name];
//     });

//   // 递归处理 children
//   el.props.children.forEach((child) => render(child, dom));

//   // 将 dom 添加到 container
//   container.appendChild(dom);
// }

// render(App, document.querySelector("#app"));

// 功能基本完成了，但是我们还要做到像react那样来渲染

// v4
// const ReactDom = {
//   createRoot(container) {
//     return {
//       render(el) {
//         render(el, container);
//       },
//     };
//   },
// };

// const App = createElement("div", { id: "app" }, "hi-", textEl);

// ReactDom.createRoot(document.querySelector("#app")).render(App);

// 现在API很像 react 的方式了，现在我们要拆分代码，将业务的代码和这个mini react 的核心代码分开
// v5
import ReactDom from "./core/ReactDom.js";
import App from "./App.js";

ReactDom.createRoot(document.querySelector("#app")).render(App);
