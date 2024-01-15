import React from "./core/React.js";

function Counter({ num }) {
  return <div>counter: {num}</div>;
}

function CounterContainer() {
  return <Counter num={1}></Counter>;
}
// const App = React.createElement("div", { id: "app" }, "hi-", "app");
const App = (
  <div>
    hi-app
    <Counter num={1}></Counter>
    <Counter num={2}></Counter>
  </div>
);

export default App;
