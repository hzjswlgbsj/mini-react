// ---------------case: 更新 props -> children---------------------
// import React from "./core/React.js";

// let count = 10;
// let props = {
//   id: "11111",
// };
// function Counter({ num }) {
//   return (
//     <div {...props} style="display: flex">
//       <div>counter: {count}</div>
//       <button id="id" msg="点我" onClick={handleClick}>
//         点击
//       </button>
//     </div>
//   );
// }

// const handleClick = (e) => {
//   console.log("click", e);
//   count++;
//   props = {};
//   React.update();
// };
// const App = (
//   <div>
//     <span>hi-app</span>
//     <Counter num={2}></Counter>
//   </div>
// );

// export default App;

// ---------------case: 更新children，新旧节点不一致需要删除旧的添加新的的情况---------------------
import React from "./core/React.js";

let showBar = false;
function Counter() {
  // const foo = <div>foo</div>;
  function Foo() {
    return (
      <div>
        foo
        <div>foo child1</div>
        <div>foo child2</div>
      </div>
    );
  }
  const bar = <p>bar</p>;

  function handleShowBar() {
    showBar = !showBar;
    React.update();
  }

  return (
    <div>
      Counter
      <div>{showBar ? bar : <Foo></Foo>}</div>
      <button onClick={handleShowBar}>showBar</button>
    </div>
  );
}

const App = (
  <div>
    hi-app
    <Counter></Counter>
  </div>
);

export default App;
