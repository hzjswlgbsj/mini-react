// // ---------------case: 更新 props -> children---------------------
// // import React from "./core/React.js";

// // let count = 10;
// // let props = {
// //   id: "11111",
// // };
// // function Counter({ num }) {
// //   return (
// //     <div {...props} style="display: flex">
// //       <div>counter: {count}</div>
// //       <button id="id" msg="点我" onClick={handleClick}>
// //         点击
// //       </button>
// //     </div>
// //   );
// // }

// // const handleClick = (e) => {
// //   console.log("click", e);
// //   count++;
// //   props = {};
// //   React.update();
// // };
// // const App = (
// //   <div>
// //     <span>hi-app</span>
// //     <Counter num={2}></Counter>
// //   </div>
// // );

// // export default App;

// ---------------case: 优化更新减少不必要的计算---------------------
// 有一个情况是一个页面中的其中一个子组件更新了会导致其他组件也会更新
// import React from "./core/React.js";

// let countFoo = 1;
// function Foo() {
//   console.log("foo rerun");
//   const update = React.update();
//   function handleClick() {
//     countFoo++;
//     update();
//   }

//   return (
//     <div>
//       <h1>foo</h1>
//       {countFoo}
//       <button onClick={handleClick}>click</button>
//     </div>
//   );
// }

// let countBar = 1;
// function Bar() {
//   console.log("bar rerun");
//   const update = React.update();
//   function handleClick() {
//     countBar++;
//     update();
//   }

//   return (
//     <div>
//       <h1>bar</h1>
//       {countBar}
//       <button onClick={handleClick}>click</button>
//     </div>
//   );
// }

// let countRoot = 1;
// function App() {
//   console.log("app rerun");

//   const update = React.update();
//   function handleClick() {
//     countRoot++;
//     update();
//   }

//   return (
//     <div>
//       hi-mini-react count: {countRoot}
//       <button onClick={handleClick}>click</button>
//       <Foo></Foo>
//       <Bar></Bar>
//     </div>
//   );
// }

// export default App;

// // ---------------case: 实现useState---------------------
// import React from "./core/React.js";

// function Foo() {
//   const [count, setCount] = React.useState(10);
//   const [msg, setMsg] = React.useState("msg");

//   function addCount() {
//     setCount((count) => count + 1);
//     setMsg((msg) => msg + "+");
//   }

//   return (
//     <div>
//       count: {count}
//       <div></div>
//       msg: {msg}
//       <button onClick={addCount}>click</button>
//     </div>
//   );
// }

// function App() {
//   return (
//     <div>
//       hi app
//       <Foo></Foo>
//     </div>
//   );
// }
// export default App;

// // ---------------case: 实现useEffect---------------------
import React from "./core/React.js";

function Foo() {
  const [count, setCount] = React.useState(10);
  const [count2, setCount2] = React.useState(10);

  React.useEffect(() => {
    console.log("count发生了改变", count);
  }, [count]);

  React.useEffect(() => {
    console.log("count2发生了改变", count);
  }, [count2]);

  function addCount() {
    setCount((count) => count + 1);
    setCount2(count + 1);
  }

  return (
    <div>
      count: {count}
      <div></div>
      count2: {count2}
      <div></div>
      <button onClick={addCount}>click</button>
    </div>
  );
}

function App() {
  return (
    <div>
      hi app
      <Foo></Foo>
    </div>
  );
}
export default App;
