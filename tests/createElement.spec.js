import { describe, it, expect } from "vitest";
import React from "../src/core/React.js";
// 模拟 requestIdleCallback
globalThis.requestIdleCallback = (callback, options) => {
  const start = Date.now();
  return setTimeout(() => {
    const elapsedTime = Date.now() - start;
    callback({
      timeRemaining: () => Math.max(0, options.timeout - elapsedTime),
      didTimeout: options.timeout != null && elapsedTime >= options.timeout,
    });
  }, 1);
};
describe("createElement", () => {
  it("should return a vdom for element", () => {
    const element = React.createElement("div", { id: "app" }, "hello", "world");
    expect(element).toEqual({
      type: "div",
      props: {
        id: "app",
        children: [
          {
            type: "TEXT_ELEMENT",
            props: {
              nodeValue: "hello",
              children: [],
            },
          },
          {
            type: "TEXT_ELEMENT",
            props: {
              nodeValue: "world",
              children: [],
            },
          },
        ],
      },
    });
  });
});
