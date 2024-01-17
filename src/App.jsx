import React from "./core/React.js";

let count = 10;
let props = {
  id: "11111",
};
function Counter({ num }) {
  return (
    <div {...props} style="display: flex">
      <div>counter: {count}</div>
      <button id="id" msg="点我" onClick={handleClick}>
        点击
      </button>
    </div>
  );
}

const handleClick = (e) => {
  console.log("click", e);
  count++;
  props = {};
  React.update();
};
// const App = React.createElement("div", { id: "app" }, "hi-", "app");
const App = (
  <div>
    <span>hi-app</span>
    <Counter num={2}></Counter>
  </div>
);

export default App;
